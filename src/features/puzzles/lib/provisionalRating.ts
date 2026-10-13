/**
 * Who is told that their puzzle rating is a starting estimate.
 *
 * OWNER, 2026-08-04. The note ("1200 is a starting estimate. It settles as you
 * solve.") was gated on the SESSION counter, which starts at zero on every page
 * load. A player with 332 lifetime solves and a 2269 rating therefore read it on
 * every visit, printed beside a number that had not been 1200 in months — the
 * page telling an experienced solver that their record does not count yet.
 *
 * The note explains an unearned opening number. That stops being the player's
 * situation as soon as a few real results exist, so the gate is lifetime
 * history, not this session's.
 *
 * A handful rather than exactly zero: the rating genuinely is provisional over
 * the first few solves, and the ask was "the very first resolves, or the very
 * first few days". Failed attempts count — a rating moves on those too, and a
 * player who has missed four puzzles has not been given nothing to read.
 *
 * Extracted so the rule is testable. The condition it replaced was two terms
 * inline in a 1,700-line component, which is why the wrong one went unnoticed.
 */
export const PROVISIONAL_ATTEMPTS = 5;

export function isRatingProvisional(history: {
  totalSolved: number;
  totalFailed: number;
}): boolean {
  const attempts = (history.totalSolved || 0) + (history.totalFailed || 0);
  return attempts < PROVISIONAL_ATTEMPTS;
}
