/**
 * Partial credit — the rule the plan's closing review measures with.
 *
 * OWNER, 2026-08-05: "solved correctly means 1, incorrectly at all means 0,
 * 3/5 or 1/4 etc will be scored accordingly", and "let's score also second
 * moves and third and so on if they got it right".
 *
 * And the constraint that goes with it: **only for assessments**. The rating
 * takes a binary solved/not, because partial credit there makes a failure a
 * draw rather than a loss and inflates every rating on the site. That half is
 * asserted server-side in `verify-plan-review.ts`; this file covers the
 * counting, which is the half that used to live untested inside a 1,700-line
 * component.
 */
import { describe, test, expect } from 'vitest';
import { partialCredit, scoreFor } from './partialCredit';

describe('partial credit', () => {
  test('a solved puzzle is every move, whatever the index says', () => {
    // The last move can resolve the puzzle without advancing the counter past
    // it, so `solved` has to win over the arithmetic.
    const credit = partialCredit(4, 2, true);
    expect(credit).toEqual({ totalMoves: 2, correctMoves: 2 });
    expect(scoreFor(credit, true)).toBe(1);
  });

  test('wrong on the first move is zero — they found nothing', () => {
    const credit = partialCredit(4, 1, false);
    expect(credit.correctMoves).toBe(0);
    expect(scoreFor(credit, false)).toBe(0);
  });

  test('wrong on the second of two scores a half — they found one', () => {
    const credit = partialCredit(4, 2, false);
    expect(credit).toEqual({ totalMoves: 2, correctMoves: 1 });
    expect(scoreFor(credit, false)).toBe(0.5);
  });

  test('a four-move puzzle failed at the last scores three quarters', () => {
    // 8 plies = 4 of the solver's moves; 6 plies played = 3 of them found.
    const credit = partialCredit(8, 6, false);
    expect(credit).toEqual({ totalMoves: 4, correctMoves: 3 });
    expect(scoreFor(credit, false)).toBe(0.75);
  });

  test('a one-move puzzle is all or nothing', () => {
    expect(scoreFor(partialCredit(2, 1, false), false)).toBe(0);
    expect(scoreFor(partialCredit(2, 2, true), true)).toBe(1);
  });

  test('credit can never exceed the puzzle', () => {
    // A move index past the end would otherwise report more correct moves than
    // the puzzle contains, and the server would clamp a number it should never
    // have been sent.
    expect(partialCredit(4, 99, false).correctMoves).toBe(2);
    expect(scoreFor(partialCredit(4, 99, false), false)).toBe(1);
  });

  test('a malformed puzzle scores zero rather than dividing by nothing', () => {
    expect(scoreFor(partialCredit(0, 0, false), false)).toBe(0);
  });
});
