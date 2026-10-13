/**
 * Everything a training plan does, in one place, so two surfaces cannot
 * disagree about it (A1 of the plan-page work).
 *
 * WHY THIS EXISTS. The plan is about to be shown in two places at once — a
 * compact card in the trainer's right panel and a page of its own at
 * `/puzzles/plan`. `PlanPanel` currently owns the plan's entire life: loading
 * it, retrying after sign-in, catching the calendar up, deriving which day is
 * owed, generating, committing, starting and ending. Two components each doing
 * that would be two answers to "which session is next", and the first day they
 * disagreed would be a support question nobody could reproduce.
 *
 * THIS IS AN EXTRACTION, NOT A REWRITE. Every effect, guard, race and comment
 * below came out of `PlanPanel` unchanged, because moving and changing at once
 * is how a deletion took an unrelated bug fix with it earlier on 2026-08-06.
 * The behaviour that is here was found by driving the product, mostly by the
 * owner, and most of it is not obvious from the outside — the reason each guard
 * exists travels with it.
 *
 * WHAT IS DELIBERATELY NOT HERE. No rendering, no copy, no telemetry naming.
 * The hook reports what happened; the surfaces decide what to say and which
 * `surface` a GA4 event carries.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createPlan,
  endPlan,
  fetchActivePlan,
  generatePlan,
  localToday,
  PlanApiError,
  reflowPlan,
  startPlanItem,
  type GeneratedPlan,
  type PlanItem,
  type TrainingPlan,
} from '../services/PlanApi';

export interface UsePlanOptions {
  /**
   * The run the trainer currently has, or null.
   *
   * The plan re-reads whenever this changes — started, finished or abandoned —
   * because an item's status IS its session's status, derived server-side. The
   * trainer is the only thing that knows the run changed.
   */
  activeSessionId?: string | null;
  /** Called after a plan session starts, so the trainer can adopt the run. */
  onSessionStarted?: () => void;
}

export interface UsePlanResult {
  plan: TrainingPlan | null;
  /**
   * The FIRST read has not come back yet.
   *
   * The trainer's card never needed this — it renders the standing entry either
   * way and the entry is true of both states. A page is different: it says "you
   * do not have a training plan yet" in so many words, and saying that to
   * someone who does, for as long as a round trip takes, is a lie the page tells
   * about the thing it exists to show.
   *
   * Distinct from `busy`, which is an action in flight.
   */
  loading: boolean;
  preview: GeneratedPlan | null;
  busy: boolean;
  error: string | null;
  /** True from the moment a plan is committed until the surface clears it. */
  justCreated: boolean;

  /** The run under way, if one of this plan's items is it. */
  activeItem: PlanItem | null;
  /**
   * The one day the player is being asked about — see `deriveNext`. Null when
   * there is no plan, or when every day is done.
   */
  nextItem: PlanItem | null;
  /** Days still owed, earliest first: pending or abandoned, never completed. */
  owedItems: PlanItem[];
  /**
   * What is left of `nextItem`'s DAY, not of its block.
   *
   * A review day is three blocks — one per area — and a short plan's days are
   * too, so `nextItem.total` announced "Review, 9 positions" over a day the
   * preview had just described as 25. Derived here for the same reason
   * `deriveNext` is: the card said the block and the page's details said the
   * day, which is one number telling a player two things on two screens.
   */
  nextDayTotal: number;

  generate: (input: { sessionsPerWeek: number; positionsPerSession: number; weeks: number })
    => Promise<GeneratedPlan | null>;
  commit: () => Promise<TrainingPlan | null>;
  start: (itemId: string) => Promise<boolean>;
  abandon: () => Promise<boolean>;
  clearPreview: () => void;
  clearError: () => void;
  clearJustCreated: () => void;
  /** Re-read the plan from the server. Exposed for the page's Back behaviour. */
  refresh: () => Promise<void>;
}

/**
 * WHICH DAY THE PLAYER IS BEING ASKED ABOUT.
 *
 * Two bugs, both reported by the owner driving it (2026-08-05), both from
 * picking "the first PENDING item":
 *
 *   - a run that is UNDER WAY was skipped, so the page offered to start the
 *     next day while one was already going. Pressing it is refused by the
 *     server, which is right — but the page should not have offered.
 *   - a day whose run was ABANDONED was skipped for good. Three days the player
 *     never finished became unreachable while the plan quietly moved on.
 *
 * So: the run in progress if there is one, otherwise the earliest day still
 * owed — pending or abandoned, in schedule order. A missed day stays in front
 * of the player until they do it or the plan ends.
 *
 * Exported because it is the single derivation both surfaces use. A card and a
 * page each computing "next" from the same items is exactly how they come to
 * name different days.
 */
export function deriveNext(plan: TrainingPlan | null): {
  activeItem: PlanItem | null;
  nextItem: PlanItem | null;
  owedItems: PlanItem[];
  nextDayTotal: number;
} {
  if (!plan) return { activeItem: null, nextItem: null, owedItems: [], nextDayTotal: 0 };
  const activeItem = plan.items.find(i => i.status === 'active') ?? null;
  const owedItems = plan.items.filter(i => i.status === 'pending' || i.status === 'abandoned');
  const nextItem = activeItem ?? owedItems[0] ?? null;
  const nextDayTotal = nextItem
    ? plan.items
      .filter(i => i.scheduledOn === nextItem.scheduledOn && i.status !== 'completed')
      .reduce((sum, i) => sum + i.total, 0)
    : 0;
  return { activeItem, nextItem, owedItems, nextDayTotal };
}

export function usePlan({
  activeSessionId = null, onSessionStarted,
}: UsePlanOptions = {}): UsePlanResult {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [preview, setPreview] = useState<GeneratedPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  /*
    A RE-READ IS AUTHORITATIVE, INCLUDING WHEN IT SAYS "NONE" (Codex, 2026-08-06).

    The old shape only ever assigned a truthy result, so a plan stopped in
    another tab — or finished, or abandoned — left this one showing stale start
    and stop controls until a full reload.

    The distinction that makes it safe: a plan genuinely absent CLEARS, a lookup
    that FAILED does not. Both used to arrive here as `null` through a
    swallowing `.catch`, and clearing on a network blip would delete a player's
    plan from the screen for no reason at all.
  */
  const refresh = useCallback(async () => {
    try {
      setPlan(await fetchActivePlan());
    } catch {
      /* The plan on screen is the last thing we actually knew. Keep it. */
    }
  }, []);

  /*
    Re-read when the identity changes, not only on mount (Codex, 2026-08-05).

    Signing in transfers the guest's rows to the account in the background —
    `AuthContext` fires it and does not await it — while this had already asked
    and been told `null`. So a player who built a plan as a guest signed in,
    came back, and saw no plan until they reloaded, under a surface that had
    just promised it would follow them.

    Keyed on the user id so it runs again the moment sign-in resolves. The retry
    exists because the transfer is a race we do not control: one late look is the
    difference between "your plan is here" and a promise that visibly failed.
  */
  useEffect(() => {
    let alive = true;
    const read = () => fetchActivePlan()
      .then(active => { if (alive && active) setPlan(active); return active; })
      .catch(() => {
        /*
          Silent. Almost nobody has a plan, and an error about a feature they
          have never used is worse than no answer — the same rule the session
          hook follows on its own lookup.
        */
        return null;
      });
    read().then(active => {
      if (active || !user) {
        if (alive) setLoading(false);
        return;
      }
      /*
        Signed in and nothing found: the transfer may still be in flight, so the
        page stays in its loading state across the retry rather than flashing
        "no plan" and then contradicting itself 1.5s later.
      */
      setTimeout(() => { if (alive) read().finally(() => { if (alive) setLoading(false); }); }, 1500);
    });
    return () => { alive = false; };
  }, [user?.userId]);   // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Re-read whenever the trainer's run changes — started, finished or abandoned.
    Skipped on the first pass, which the mount effect above has already done.
  */
  const seenSessionRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seenSessionRef.current === undefined) {
      seenSessionRef.current = activeSessionId;
      return;
    }
    if (seenSessionRef.current === activeSessionId) return;
    seenSessionRef.current = activeSessionId;
    if (!plan) return;
    let alive = true;
    fetchActivePlan()
      // Assigned whatever comes back, `null` included: the run ending is exactly
      // when a plan can have completed, and holding the old object would keep
      // offering a session that is finished.
      .then(fresh => { if (alive) setPlan(fresh); })
      .catch(() => { /* the plan still reads; only its day states are stale */ });
    return () => { alive = false; };
  }, [activeSessionId]);   // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Catch the calendar up on mount, once, when something has been missed.

    Placement only — the plan itself is untouched. Doing it here rather than on
    a schedule means a player who comes back after a fortnight finds their plan
    waiting rather than a wall of overdue days, and a player who never returns is
    never quietly rearranged.
  */
  useEffect(() => {
    if (!plan || plan.status !== 'active') return;
    /*
      The PLAYER'S today, not UTC's (Codex, 2026-08-05).

      `reflowPlan` sends `localToday()`, and this pre-check used the UTC date —
      so for anyone ahead of UTC a day missed last night was not recognised as
      missed until UTC caught up, and the reflow they needed simply did not run.
      Two dates for one question, which is the defect this codebase keeps
      finding.
    */
    const today = localToday();
    if (!plan.items.some(i => i.status === 'pending' && i.scheduledOn < today)) return;
    let alive = true;
    reflowPlan(plan.id)
      .then(result => { if (alive && result.moved > 0) setPlan(result.plan); })
      .catch(() => { /* the plan still reads correctly; the dates are just stale */ });
    return () => { alive = false; };
    // Deliberately keyed on the plan ID alone: re-running on every plan object
    // would reflow again on the state this very call produced.
  }, [plan?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useCallback(async (input: {
    sessionsPerWeek: number; positionsPerSession: number; weeks: number;
  }) => {
    setBusy(true);
    setError(null);
    try {
      const generated = await generatePlan(input);
      setPreview(generated);
      return generated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build a plan');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const commit = useCallback(async () => {
    if (!preview) return null;
    setBusy(true);
    setError(null);
    try {
      const created = await createPlan(preview);
      setPlan(created);
      setPreview(null);
      setJustCreated(true);
      return created;
    } catch (err) {
      /*
        A 409 MEANS THERE IS ALREADY A PLAN, and the server hands it back (A8).

        `PlanApiError.active` carries it deliberately — the route returns the
        blocker rather than just refusing — and this used to throw it away and
        print a generic "could not save the plan". So a player with a plan in
        another tab, or one who pressed the button twice, was told a lie about
        why: nothing failed, they already had what they were asking for.

        Adopting it also RESOLVES the state. The surface flips to showing the
        plan they have, which is the honest answer to the click, and the message
        explains why what they built was not saved.
      */
      if (err instanceof PlanApiError && err.status === 409 && err.active) {
        setPlan(err.active);
        setPreview(null);
        setError('You already have a training plan, so this one was not saved. Stop the current one first if you want to replace it.');
        return null;
      }
      setError(err instanceof Error ? err.message : 'Could not save the plan');
      return null;
    } finally {
      setBusy(false);
    }
  }, [preview]);

  const start = useCallback(async (itemId: string) => {
    if (!plan) return false;
    setBusy(true);
    setError(null);
    try {
      setPlan(await startPlanItem(plan.id, itemId));
      onSessionStarted?.();
      return true;
    } catch (err) {
      // The common refusal is "finish or stop your current run first", which is
      // the server declining to guess which run the player meant. It is shown
      // as-is rather than rephrased, because it names the thing they have to do.
      setError(err instanceof Error ? err.message : 'Could not start that session');
      return false;
    } finally {
      setBusy(false);
    }
  }, [plan, onSessionStarted]);

  const abandon = useCallback(async () => {
    if (!plan) return false;
    setBusy(true);
    try {
      await endPlan(plan.id);
      setPlan(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop the plan');
      return false;
    } finally {
      setBusy(false);
    }
  }, [plan]);

  const { activeItem, nextItem, owedItems, nextDayTotal } = deriveNext(plan);

  return {
    plan, preview, busy, error, justCreated, loading,
    activeItem, nextItem, owedItems, nextDayTotal,
    generate, commit, start, abandon, refresh,
    clearPreview: useCallback(() => setPreview(null), []),
    clearError: useCallback(() => setError(null), []),
    clearJustCreated: useCallback(() => setJustCreated(false), []),
  };
}

export default usePlan;
