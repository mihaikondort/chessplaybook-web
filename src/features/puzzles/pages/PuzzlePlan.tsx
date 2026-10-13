/**
 * The training plan, on a page of its own (A3/A4 of the plan-page work).
 *
 * WHY IT IS A PAGE, in the owner's words: *"this is an important commitment
 * from the user, should indicate the seriousness of it, and makes the user feel
 * it is involved in a proper serious training."* A multi-week schedule shown in
 * a 200px box inside a solving panel tells the player it is a widget. The PRD
 * calls the plan "the centre of the product, and the main reason a player
 * returns" (§6.4), and this is the first surface on the site that treats it
 * that way.
 *
 * NOT behind `ProtectedRoute`, for the same reason as `/puzzles/progress`:
 * every plan route uses `requireIdentity`, which an anonymous UUID satisfies.
 * Most traffic has no account, and gating this would show nothing to the
 * majority of the people who have a plan.
 *
 * NOT in the sitemap, and NOT `noindex` either — the two are different
 * decisions and the codebase is explicit about it. `SeoHead` cannot emit a
 * robots tag by design, because a client-injected `noindex` is exactly what hid
 * three live pages from Google for four months. This page is simply registered
 * in `DELIBERATELY_UNSITEMAPPED` with its reason: it is one person's plan and it
 * renders empty to a crawler. It still carries real meta so it never inherits
 * the homepage's.
 *
 * TODAY'S SESSION COMES FIRST, above everything else on the page. Someone
 * arriving here on a phone may well have landed on the page rather than the
 * trainer, and a plan page whose first screen is management rather than "here
 * is what to do now" would bury the only thing most visits need.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import SeoHead from '@/components/SeoHead';
import { useAuth } from '@/features/auth/AuthContext';
import { logGA4Event } from '@/services/analytics';
import { usePlan } from '../hooks/usePlan';
import { PlanDetails } from '../components/plan/PlanDetails';
import { PlanPreview } from '../components/plan/PlanPreview';
import { PlanSetup } from '../components/plan/PlanSetup';

export default function PuzzlePlan() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();

  const {
    plan, preview, busy, error,
    justCreated, clearJustCreated, clearPreview, loading,
    activeItem, nextItem, nextDayTotal,
    generate, commit, start, abandon, refresh,
  } = usePlan();

  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [positionsPerSession, setPositionsPerSession] = useState(25);
  const [weeks, setWeeks] = useState(4);
  const [configuring, setConfiguring] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  /*
    `?mode=setup` opens the three questions directly.

    It is what the plan card links to when there is no plan, and what the offer
    will accept into (A6). The parameter is CONSUMED — replaced out of the URL
    once it has been acted on — so a reload or a Back does not silently reopen
    a form the player already closed. The same defect, in the other direction,
    destroyed a friend-invitation link on 2026-08-01 by clearing it on mount.
  */
  useEffect(() => {
    if (params.get('mode') !== 'setup') return;
    setConfiguring(true);
    /*
      COUNTED ONCE, HERE, AND THE SOURCE TRAVELS IN THE URL.

      Two bugs in one line, both found by driving it. It was not counted at all
      when someone reached setup by URL — a bookmark, a shared link — although
      `analytics.ts` declares `from: 'page'` for exactly that. And when the
      linkers each fired their own event, the offer path produced TWO
      `plan_setup_opened` for one intent: one from the click, one from this
      effect. A denominator that double-counts its most interesting path is
      worse than one that misses a quiet one.

      So the linkers say who they are in `?from=`, and the arrival is the single
      thing that reports. A URL with no `from` is someone who came on their own,
      which is what `page` means.
    */
    const from = params.get('from');
    logGA4Event({
      name: 'plan_setup_opened',
      params: { from: from === 'offer' || from === 'card' ? from : 'page' },
    });
    const next = new URLSearchParams(params);
    next.delete('mode');
    next.delete('from');
    setParams(next, { replace: true });
  }, [params, setParams]);

  /*
    RE-READ WHEN THE TAB COMES BACK (Codex, 2026-08-06).

    This page has no `activeSessionId` to watch — the trainer does, and they are
    never mounted together — so nothing told it that the plan had changed. A
    player who starts a session in the trainer, or stops the plan in a second
    tab, would come back to a page still offering to start what is already
    running, or to stop what is already stopped.

    `visibilitychange` rather than `focus`: a tab restored from the back/forward
    cache fires no focus event, and returning by Back is the likeliest way to
    arrive here with a stale plan.
  */
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [refresh]);

  const onGenerate = useCallback(async () => {
    const generated = await generate({ sessionsPerWeek, positionsPerSession, weeks });
    if (!generated) return;
    setConfiguring(false);
    logGA4Event({
      name: 'plan_shown',
      params: {
        sessions: generated.summary.sessions,
        positions: generated.summary.positions,
        weeks: generated.summary.weeks,
        mixed: generated.summary.mixed,
        emphasis: generated.summary.emphasis ?? 'none',
        surface: 'plan_page',
      },
    });
  }, [generate, sessionsPerWeek, positionsPerSession, weeks]);

  const onCommit = useCallback(async () => {
    const summary = preview?.summary;
    const created = await commit();
    if (!created || !summary) return;
    logGA4Event({
      name: 'plan_created',
      params: {
        sessions: summary.sessions,
        positions: summary.positions,
        weeks: summary.weeks,
        mixed: summary.mixed,
        emphasis: summary.emphasis ?? 'none',
        surface: 'plan_page',
      },
    });
  }, [commit, preview]);

  /*
    STARTING A SESSION FROM HERE ENDS UP IN THE TRAINER, and it has to.

    The plan's start endpoint creates the run and attaches it as ONE backend
    act, so afterwards there IS an active session — and the trainer adopts
    whatever active session exists when it mounts. A page that started a run and
    stayed put would leave the player looking at a schedule while their run sat
    on another route.

    Navigated only on success. A refusal (the common one is "finish or stop your
    current run first") leaves them here, where the message is.
  */
  const onStart = useCallback(async (
    itemId: string, area: string, total: number, kind: string,
  ) => {
    if (!await start(itemId)) return;
    logGA4Event({
      name: 'plan_session_started',
      params: { area, total, kind, surface: 'plan_page' },
    });
    navigate('/puzzles');
  }, [start, navigate]);

  const onAbandon = useCallback(async () => { await abandon(); }, [abandon]);

  return (
    <div className="bg-background">
      <SeoHead routeKey="puzzles/plan" />

      <main className="container mx-auto max-w-6xl px-4 py-4 sm:py-5">
        <div className="mb-2">
          <Link
            to="/puzzles"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to training
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-1">Your training plan</h1>
        <p className="mb-3 text-sm text-muted-foreground">
          What to train, and when. Built around the time you actually have.
        </p>

        {/*
          THE HEADLINE, and it is only ever one of three sentences: here is what
          to do now, here is what is under way, or you have finished. It sits
          above the schedule because most visits need nothing else.
        */}
        {preview ? (
          <PlanPreview
            preview={preview}
            onCommit={onCommit}
            onChange={() => { clearPreview(); setConfiguring(true); }}
            busy={busy}
            error={error}
          />
        ) : configuring ? (
          <PlanSetup
            sessionsPerWeek={sessionsPerWeek}
            positionsPerSession={positionsPerSession}
            weeks={weeks}
            onSessionsPerWeek={setSessionsPerWeek}
            onPositionsPerSession={setPositionsPerSession}
            onWeeks={setWeeks}
            onGenerate={onGenerate}
            onCancel={() => setConfiguring(false)}
            busy={busy}
            error={error}
          />
        ) : plan ? (
          <PlanDetails
            plan={plan}
            activeItem={activeItem}
            nextItem={nextItem}
            nextDayTotal={nextDayTotal}
            onStart={onStart}
            onAbandon={onAbandon}
            busy={busy}
            error={error}
            justCreated={justCreated}
            onDismissJustCreated={clearJustCreated}
            signedIn={Boolean(user)}
            returnTo="/puzzles/plan"
            confirmStop={confirmStop}
            onConfirmStop={setConfirmStop}
          />
        ) : loading ? (
          /*
            THE FIRST READ IS NOT "NO PLAN".

            Without this the page states "you do not have a training plan yet"
            to a player who has one, for as long as the round trip takes, and
            then replaces it — which is worse than saying nothing, because the
            sentence it printed was false and specific.

            Reserved to the height of the block it becomes, so the answer
            arriving does not move the page (B10) — and wearing the same
            surface as that block, so it does not change APPEARANCE either.
            A skeleton on a different card treatment from the card it becomes
            is a layout shift the reserved height cannot catch.
          */
          <div
            className="rounded-lg surface-card p-6 h-[248px] animate-pulse"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">Loading your training plan</span>
          </div>
        ) : (
          <NoPlan onBuild={() => {
            logGA4Event({ name: 'plan_setup_opened', params: { from: 'page' } });
            setConfiguring(true);
          }} />
        )}
      </main>
    </div>
  );
}

/**
 * No plan yet.
 *
 * A page rather than a card, so it says what a plan IS before asking for three
 * answers — the card has one line for that and this has room for the argument.
 */
function NoPlan({ onBuild }: { onBuild: () => void }) {
  return (
    <div className="rounded-lg surface-card p-6 text-center">
      <CalendarDays className="mx-auto h-8 w-8 text-link" />
      <p className="mt-3 text-base font-medium text-foreground">
        You do not have a training plan yet.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Tell us how often you can train and for how long. We work out what to
        train and when, weighted towards what your own results say you need —
        and you can change or stop it whenever you like.
      </p>
      <button
        type="button"
        onClick={onBuild}
        className="mt-5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        Build a training plan
      </button>
    </div>
  );
}
