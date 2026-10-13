/**
 * Surviving a refresh.
 *
 * An accidental reload used to throw the puzzle away and fetch a new one, losing
 * whatever the player had worked out. This keeps it.
 *
 * IT LIVES IN sessionStorage ON PURPOSE, and that single choice implements the whole
 * rule (owner, 2026-08-08): *"the puzzle just survives the refresh; if they close the
 * browser we just forget about it."* sessionStorage survives a reload and is cleared
 * when the tab or browser closes — so there is no close-versus-refresh detection to
 * get wrong, and no expiry clock to tune. localStorage would have needed both.
 *
 * WHY `attemptRecorded` IS THE MOST IMPORTANT FIELD HERE.
 *
 * B1 records the attempt server-side on the FIRST WRONG MOVE, and the guard that
 * stops a second report for the same puzzle (`resultReportedRef`) is in memory, so a
 * refresh clears it. `puzzle_attempts` has NO unique constraint on
 * (identity_id, puzzle_id) — checked, not assumed — so re-reporting inserts a second
 * row and moves the rating a second time. Restoring the puzzle without restoring this
 * flag would turn an accidental refresh into a double penalty.
 *
 * The owner's rating rule: a player who continues after a refresh IS rated, because
 * the refresh may have been accidental. Closing the browser forgets the puzzle, and
 * anyone using that as an escape hatch is welcome to it.
 */
/*
  `../types` DOES NOT EXIST AND NEVER DID — there is no `types` module anywhere
  in this feature. `Puzzle` is declared in `hooks/usePuzzle.ts`, which is where
  it has always been.

  It went unnoticed because nothing enforces it: Vite strips type-only imports
  without resolving them, so the app builds and runs perfectly, the tests pass,
  and only `tsc --noEmit` objects. And `tsc` has been failing on exactly this
  one line for long enough that a clean type-check had no baseline — so any NEW
  type error was indistinguishable from the old one, which is the real cost.
  Fixed 2026-08-10 at the owner's request; `tsc` is clean for the first time
  since.

  A type-only import, so there is no runtime cycle to worry about even though
  `usePuzzle` and this module are neighbours in the same feature. (It happens
  not to be a cycle either way: `usePuzzle` does not import this file.)
*/
import type { Puzzle } from '../hooks/usePuzzle';

export const RESUME_STORAGE_KEY = 'chessplaybook.puzzle.resume.v1';

export interface ResumeState {
  /** Bumped when the shape changes, so an old tab's payload is discarded not misread. */
  version: 1;
  puzzle: Puzzle;
  /** Index into `puzzle.moves`; the next move expected from the player. */
  moveIndex: number;
  /**
   * `null` while the puzzle is still being solved; otherwise how the attempt ENDED
   * (owner, 2026-08-09: a solved puzzle must survive leaving the page too).
   *
   * A resolved puzzle used to be cleared here, and the consequence was never decided
   * — it fell out of the state being absent. `PuzzleTrainer`'s run-start effect asks
   * whether the puzzle on screen belongs to the run, so with nothing restored it drew
   * a fresh one over a position the player was reviewing. That review is a real
   * surface now (PZ-043 Phase A gave the solved line first/previous/next/final), and
   * Phase B is about to make the resolved position worth leaving the page for.
   *
   * It is a separate field rather than a widened `moveIndex` bound, because the bound
   * is what rejects a corrupt payload and must keep doing exactly that.
   */
  resolvedAs: 'correct' | 'solution' | null;
  /**
   * Position after replaying `moveIndex` moves. Stored for VERIFICATION only — the
   * restore replays from `puzzle.fen`, so a stored FEN that disagrees means the
   * payload is corrupt and the whole thing is dropped. Trusting it instead would let
   * a tampered or half-written entry put an arbitrary position on the board.
   */
  fen: string;
  /** The attempt is already scored server-side. Never report it twice. */
  attemptRecorded: boolean;
  /** A wrong move has already been made: no longer a first-try solve. */
  hasFailed: boolean;
  /** Rungs of the hint ladder shown; any at all makes the puzzle unrated. */
  rungsShown: number;
  /** Run this puzzle was served inside, so a resumed puzzle stays attached to it. */
  sessionId: string | null;
  /** The daily puzzle keeps its badge and its exemption from runs across a reload. */
  isDaily: boolean;
}

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    // Private modes and embedded webviews can throw on access alone.
    return null;
  }
}

function isPuzzle(value: unknown): value is Puzzle {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Puzzle>;
  return typeof candidate.id === 'string'
    && typeof candidate.fen === 'string'
    && Array.isArray(candidate.moves)
    && candidate.moves.length > 0
    && candidate.moves.every(move => typeof move === 'string');
}

/**
 * Validate hard. This is attacker-controllable text in the player's own browser, and
 * it is fed straight to the board and to the rating report.
 */
export function parseResumeState(raw: string | null): ResumeState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const candidate = parsed as Partial<ResumeState>;
  if (candidate.version !== 1) return null;
  if (!isPuzzle(candidate.puzzle)) return null;
  if (typeof candidate.fen !== 'string' || candidate.fen.length === 0) return null;
  /*
    Read BEFORE the index is bounded, because it is what decides the bound.

    An older payload has no `resolvedAs` and reads as `null` — which is exactly what
    it was, a mid-solve snapshot — so the shape stays at version 1 and no tab's
    stored puzzle is discarded by this change.
  */
  const resolvedAs = candidate.resolvedAs === 'correct' || candidate.resolvedAs === 'solution'
    ? candidate.resolvedAs
    : null;

  if (typeof candidate.moveIndex !== 'number'
    || !Number.isInteger(candidate.moveIndex)
    // A resume is only meaningful once the setup move has been played (index >= 1).
    || candidate.moveIndex < 1
    /*
      Mid-solve the index must stop SHORT of the end — an index at the end is a
      finished puzzle, and accepting one would restore a solved board into a state
      that expects the next move. A resolved payload is the one case where the end
      is the right answer, so it is the only one allowed to reach it.
    */
    || candidate.moveIndex > candidate.puzzle.moves.length - (resolvedAs ? 0 : 1)) return null;
  if (typeof candidate.rungsShown !== 'number'
    || !Number.isInteger(candidate.rungsShown)
    || candidate.rungsShown < 0) return null;

  return {
    version: 1,
    puzzle: candidate.puzzle,
    moveIndex: candidate.moveIndex,
    resolvedAs,
    fen: candidate.fen,
    attemptRecorded: candidate.attemptRecorded === true,
    hasFailed: candidate.hasFailed === true,
    rungsShown: candidate.rungsShown,
    sessionId: typeof candidate.sessionId === 'string' ? candidate.sessionId : null,
    isDaily: candidate.isDaily === true,
  };
}

export function loadResumeState(store: Storage | null = storage()): ResumeState | null {
  if (!store) return null;
  try {
    return parseResumeState(store.getItem(RESUME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveResumeState(state: ResumeState, store: Storage | null = storage()): void {
  if (!store) return;
  try {
    store.setItem(RESUME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A full or unavailable quota must never break solving. Losing the resume is
    // the pre-2026-08-08 behaviour, which is survivable; throwing here is not.
  }
}

export function clearResumeState(store: Storage | null = storage()): void {
  if (!store) return;
  try {
    store.removeItem(RESUME_STORAGE_KEY);
  } catch {
    // As above.
  }
}
