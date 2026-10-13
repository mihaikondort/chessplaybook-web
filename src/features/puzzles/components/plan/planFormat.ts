/**
 * The words and numbers every plan surface shares (A2 of the plan-page work).
 *
 * One copy, because the card and the page are about to say the same things
 * about the same plan. Two copies of `AREA_LABEL` is how "Final review" becomes
 * "Mixed" on one screen and not the other — the class of drift this codebase
 * has now found in meta tags, in the sitemap, in `schema.sqlite.sql` and in the
 * leaderboard's Solved column.
 */

export const AREA_LABEL: Record<string, string> = {
  tactics: 'Tactics',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
  // The closing session covers all three, so it is named for what it is rather
  // than for an area it does not have (owner, 2026-08-05).
  mixed: 'Final review',
};

/**
 * The three questions, and they are about the player's life rather than their
 * chess (PRD §6.4.0).
 */
export const FREQUENCIES = [2, 3, 4, 5] as const;
/**
 * The three common answers, not the only ones.
 *
 * They are shortcuts on top of the stepper beside them, which reaches anything
 * the server will accept. Presented as chips because most people want one of
 * these and should not have to press a stepper eight times to get there.
 */
export const LENGTHS = [15, 25, 40] as const;
export const DURATIONS = [3, 4, 6, 8] as const;

/**
 * The bounds, and they MIRROR THE SERVER — `MIN_POSITIONS_PER_SESSION` and
 * `MAX_POSITIONS_PER_SESSION` in `backend/src/services/puzzles/planGeneration.ts`,
 * which rejects anything outside them with a 400.
 *
 * Duplicated rather than fetched because a form that cannot bound its own input
 * until a round trip completes is a form that offers values it will then refuse.
 * If the server's bounds move, these move: the failure is a player being told
 * "positionsPerSession must be between 5 and 60" by a control that let them
 * pick 70.
 */
export const MIN_POSITIONS = 5;
export const MAX_POSITIONS = 60;
/**
 * Fives, on the owner's suggestion ("maybe multiple of 5 or something similar").
 *
 * A step of one would make the distance from 15 to 40 twenty-five presses, and
 * the difference between 27 and 28 positions is not a difference anybody can
 * feel. Fives are the granularity the choice actually has.
 */
export const POSITIONS_STEP = 5;

/** `2026-08-06` → `Thu 6 Aug`. Formatted here; the server sends dates, not prose. */
export function dayLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}
