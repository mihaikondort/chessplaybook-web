/**
 * How much of a multi-move puzzle the solver actually got right.
 *
 * OWNER, 2026-08-05: *"solved correctly means 1, incorrectly at all means 0,
 * 3/5 or 1/4 etc will be scored accordingly"* — and *"let's score also second
 * moves and third and so on if they got it right"*.
 *
 * That is what the trainer has always sent and what the server has always
 * scored (`score = solved ? 1 : correctMoves / totalMoves`). This module exists
 * because the computation lived as two lines inside a 1,700-line component with
 * no test on it, and it is now load-bearing for something new: the plan's
 * closing review measures performance from these scores, so a solver who found
 * three moves of four and missed the last reads as 0.75 rather than as a
 * failure. Extracted so the rule is testable — the same reason
 * `provisionalRating` was extracted after the wrong one of two inline terms
 * went unnoticed for months.
 *
 * THE PLY LAYOUT. A puzzle's `moves` alternate: the opponent plays the setup
 * move, then the solver, then the opponent, and so on. So the solver's moves
 * sit at the odd indices and there are `floor(moves.length / 2)` of them.
 * `moveIndex` is how many plies have been played, which makes the solver's
 * completed moves `floor(moveIndex / 2)`.
 *
 * Wrong on the FIRST move is zero, and that is not a rounding artifact: they
 * found nothing. Wrong on the third of four is 0.5, because they found two.
 */
export interface PartialCredit {
  /** The solver's own moves in this puzzle. */
  totalMoves: number;
  /** How many of them they played correctly before it ended. */
  correctMoves: number;
}

export function partialCredit(
  plyCount: number,
  moveIndex: number,
  solved: boolean,
): PartialCredit {
  const totalMoves = Math.floor(plyCount / 2);
  return {
    totalMoves,
    // A solved puzzle is every move, whatever the index says — the last move
    // can resolve the puzzle without advancing the counter past it.
    correctMoves: solved ? totalMoves : Math.max(0, Math.min(totalMoves, Math.floor(moveIndex / 2))),
  };
}

/**
 * The score the server will compute from those numbers.
 *
 * Duplicated here ONLY for tests and for anything that wants to show the
 * player what an attempt was worth. The server computes its own from the
 * counts it receives — this must never become the source of the stored value,
 * or the two will drift and the rating will follow the client's opinion.
 */
export function scoreFor({ totalMoves, correctMoves }: PartialCredit, solved: boolean): number {
  if (solved) return 1;
  if (totalMoves <= 0) return 0;
  return Math.max(0, Math.min(1, correctMoves / totalMoves));
}
