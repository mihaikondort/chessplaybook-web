/**
 * What the training record recommends, and in what order it lists the areas.
 *
 * Every rule here works from FACTS: a plan day that is owed, an area never
 * tried, an area not trained for a while. None of them reads accuracy. At the
 * sample sizes a puzzle player reaches, a difference in accuracy between two
 * areas is mostly noise and the difficulty of what was served, so a page that
 * called the lower one a weakness would usually be wrong. Weakness claims come
 * later, behind an evidence rule (TRAINING_RECORD_ANALYSIS §6).
 */
import type { AreaProgress, PuzzleArea } from './ProgressService';
import type { PlanItem, TrainingPlan } from './PlanApi';

/**
 * Rated attempts an area needs before the server shows a performance figure.
 * Duplicated from `MIN_RATED_FOR_PERFORMANCE` in the backend; a test reads the
 * backend source and fails if the two drift.
 */
export const MIN_RATED_FOR_PERFORMANCE = 5;

/** An area untouched for this many days is worth a nudge. */
export const STALE_AFTER_DAYS = 14;

export type NextStep =
  | { kind: 'plan'; item: PlanItem; total: number }
  | { kind: 'untried'; area: PuzzleArea }
  | { kind: 'stale'; area: PuzzleArea; lastTrained: Date }
  | { kind: 'none' };

/**
 * The server writes timestamps as SQLite text in UTC ("2026-10-14 08:30:00"),
 * which `new Date` would read as LOCAL time. Treat a string with no zone as UTC.
 */
export function parseServerTime(value: string | null): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const zoned = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days between two instants, counted on the player's own calendar. */
export function daysBetween(earlier: Date, later: Date): number {
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** YYYY-MM-DD for the player's own today, the format plan items are scheduled in. */
function localDay(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Every next step that applies, most useful first. The page shows the first as
 * the recommendation and the rest as small links.
 *
 * Order: an owed plan day (the player chose it), then an area never tried, then
 * the area left longest past the stale line. `none` only when nothing applies.
 * Missed-puzzle replay and evidence-backed weaknesses join this list in later
 * issues (#108, #109).
 */
export function nextSteps(
  areas: AreaProgress[],
  plan: { plan: TrainingPlan | null; nextItem: PlanItem | null; nextDayTotal: number },
  now: Date = new Date(),
): NextStep[] {
  const steps: NextStep[] = [];

  const { nextItem } = plan;
  if (plan.plan?.status === 'active' && nextItem
      && (nextItem.status === 'active' || nextItem.scheduledOn <= localDay(now))) {
    steps.push({ kind: 'plan', item: nextItem, total: plan.nextDayTotal || nextItem.total });
  }

  for (const a of areas) {
    if (a.attempts === 0) steps.push({ kind: 'untried', area: a.area });
  }

  const stale = areas
    .filter(a => a.attempts > 0)
    .map(a => ({ area: a.area, last: parseServerTime(a.lastAttemptAt) }))
    .filter((a): a is { area: PuzzleArea; last: Date } =>
      a.last != null && daysBetween(a.last, now) >= STALE_AFTER_DAYS)
    .sort((x, y) => x.last.getTime() - y.last.getTime());
  for (const s of stale) steps.push({ kind: 'stale', area: s.area, lastTrained: s.last });

  return steps.length > 0 ? steps : [{ kind: 'none' }];
}

/**
 * Areas in the order a player should look at them: never tried, then not yet
 * rated, then the one trained longest ago. Never by accuracy (see the header).
 */
export function orderAreasByFact(areas: AreaProgress[]): AreaProgress[] {
  const rank = (a: AreaProgress) => (a.attempts === 0 ? 0 : a.performance == null ? 1 : 2);
  const last = (a: AreaProgress) => parseServerTime(a.lastAttemptAt)?.getTime() ?? 0;
  return [...areas].sort((a, b) => rank(a) - rank(b) || last(a) - last(b));
}

/** "today", "yesterday", "5 days ago", then a date once it is more than a week back. */
export function lastTrainedLabel(lastAttemptAt: string | null, now: Date = new Date()): string | null {
  const last = parseServerTime(lastAttemptAt);
  if (!last) return null;
  const days = daysBetween(last, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return last.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** How many more rated puzzles before this area gets a performance figure. */
export function ratedPuzzlesStillNeeded(area: AreaProgress): number {
  return Math.max(0, MIN_RATED_FOR_PERFORMANCE - area.rated);
}

/** Why an attempt did not move the rating, in the player's words. */
export const UNRATED_REASON_LABELS: Record<string, string> = {
  solution: 'Solution shown',
  hint: 'Hint used',
  practice: 'Practice mode',
  band: 'Outside your rating range',
  unrecorded: 'Reason not recorded',
};
