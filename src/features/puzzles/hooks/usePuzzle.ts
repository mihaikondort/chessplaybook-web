import { useState, useCallback, useRef, useEffect } from 'react';
import {
  positionFromFen,
  applyMove,
  toUci,
} from '@/components/chess/chessLogic';
import type { ChessPosition } from '@/components/chess/chessLogic';
import type { Key, Color, Dests } from '@lichess-org/chessground/types';
import { logGA4Event } from '@/services/analytics';
import { recordPuzzleTry } from '@/features/puzzles/services/puzzleTry';

/**
 * Pause before the opponent's setup move is played, and before each opponent
 * reply (plan B3 / PZ-019).
 *
 * These were 800ms and 500ms, chosen for feel and never measured. The A3
 * baseline showed what the first one actually cost: on a throttled mobile the
 * board was PAINTED at 2.66s and only became legally touchable at 4.94s, and
 * roughly 972ms of that gap sat AFTER the puzzle data had already arrived. No
 * amount of bundle or network work could have moved it.
 *
 * They are not zero, and must not become zero. The setup move has to be *seen*
 * to be understood — the FEN is the position BEFORE it, so a board that jumps
 * straight to the post-move position silently tells the user the puzzle starts
 * somewhere it does not. What is needed is one painted frame of the starting
 * position plus the board's own 200ms move animation, not most of a second of
 * dead air.
 */
const SETUP_MOVE_DELAY_MS = 250;
const OPPONENT_REPLY_DELAY_MS = 300;

export interface Puzzle {
  id: string;
  /** Stable across refresh/resume; absent for an offline fallback puzzle. */
  tryId?: string;
  /** Came from the hardcoded offline list rather than the server. Nothing about
   *  it is reported or scored, and the page says so. See `PuzzleData.offline`. */
  offline?: true;
  fen: string;
  moves: string[];      // UCI moves: [setupMove, userMove1, opponentResponse1, userMove2, ...]
  rating: number;
  themes: string[];
  /** Lichess attempt count. Optional because the saved last-puzzle record and
   *  test fixtures do not carry it. Rendered after the answer (C2 / PZ-018). */
  nbPlays?: number;
  /** Pre-move line from the server's expression layer (C1 / PZ-017). Optional:
   *  the offline fallback puzzles and the saved last-puzzle record have none. */
  prompt?: string;
  /** When this player last missed it; only on a "Missed before" draw (#116). */
  missedAt?: string;
}

export type PuzzleStatus = 'loading' | 'ready' | 'playing' | 'correct' | 'failed' | 'solution';

export interface PuzzleState {
  puzzle: Puzzle | null;
  position: ChessPosition | null;
  fen: string;
  dests: Dests | undefined;
  turnColor: Color;
  movableColor: Color | undefined;
  lastMove: Key[] | undefined;
  isCheck: boolean;
  status: PuzzleStatus;
  playerColor: Color;
  moveIndex: number;          // Current index in the solution
  message: string;
  /** True iff this `failed` transition is the FIRST failure for the current
   *  puzzle. Subsequent wrong moves on the same puzzle (after auto-revert)
   *  still flash the overlay but `firstFailure` stays false. The rating-
   *  report effect uses this to keep retries free. Resets in `loadPuzzle`. */
  firstFailure: boolean;
  /** True iff this puzzle has had at least one failed move at any point.
   *  Stays true through retries and the eventual `correct` transition, so
   *  the trainer can treat a retry-solve as free (no rating, no stats,
   *  no streak). Resets in `loadPuzzle`. */
  hasFailed: boolean;
}

/**
 * What the caller knows about how this puzzle arrived, which the hook cannot
 * work out for itself (PUZZLES_PAGE_IMPLEMENTATION_PLAN A2).
 *
 * `responseAt` is only meaningful for `source: 'network'` — a puzzle taken from
 * a batch of ten was fetched long before it was shown, so timing it from the
 * response would report a delay that is not the user's experience of it.
 *
 * OMITTING the whole object means "this is not a new presentation" — the retry
 * path re-loads the same puzzle, and emitting a second `puzzle_board_ready`
 * for it would inflate the denominator of the first-move rate.
 */
export interface PuzzleLoadMeta {
  source: 'network' | 'queued' | 'daily' | 'restored';
  /** `performance.now()` at the moment the API response resolved. */
  responseAt?: number;
  /** Per-session sequence number: 1 for the first puzzle presented. */
  index: number;
  isDaily: boolean;
}

export interface PuzzleActions {
  loadPuzzle: (puzzle: Puzzle, meta?: PuzzleLoadMeta) => void;
  /**
   * Put a partly-solved puzzle back on the board after a refresh. Returns false if
   * the saved state cannot be replayed, in which case the caller must fetch as usual.
   */
  resumePuzzle: (puzzle: Puzzle, moveIndex: number, options?: { hasFailed?: boolean; expectedFen?: string; resolvedAs?: 'correct' | 'solution' }) => boolean;
  onMove: (orig: Key, dest: Key) => void;
  retry: () => void;
  showSolution: () => void;
}

/**
 * Hook that manages the puzzle solving flow.
 *
 * Puzzle move sequence:
 * - moves[0]: opponent's setup move (played automatically)
 * - moves[1]: user's first correct move
 * - moves[2]: opponent's response (played automatically)
 * - moves[3]: user's second correct move
 * - ...and so on
 */
export function usePuzzle(): [PuzzleState, PuzzleActions] {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [position, setPosition] = useState<ChessPosition | null>(null);
  const [status, setStatus] = useState<PuzzleStatus>('loading');
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);
  const [moveIndex, setMoveIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [playerColor, setPlayerColor] = useState<Color>('white');

  const positionRef = useRef<ChessPosition | null>(null);
  const puzzleRef = useRef<Puzzle | null>(null);
  const moveIndexRef = useRef(0);
  const playerColorRef = useRef<Color>('white');
  // Auto-revert + free-retries tracking. `hasFailedOnceRef` flips true on
  // the FIRST wrong move per puzzle and resets on `loadPuzzle`. The
  // PuzzleTrainer page uses `firstFailure` (mirrored to state for
  // re-renders) to gate the rating-report call: only the first failure
  // costs a Glicko-2 update; subsequent retries on the same puzzle are
  // free. The auto-revert timer is also tracked here so it can be
  // cancelled if the user navigates away or starts a new puzzle.
  const hasFailedOnceRef = useRef(false);
  const [firstFailure, setFirstFailure] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Funnel instrumentation (A2). `metaRef` is the presentation this puzzle
  // arrived with; `readyAtRef` is when the board actually became touchable;
  // `firstMoveSentRef` keeps `puzzle_first_move` to one per presentation.
  // All three are refs, not state — an analytics side-channel must never
  // cause a render of the board.
  const metaRef = useRef<PuzzleLoadMeta | null>(null);
  const readyAtRef = useRef<number>(0);
  const firstMoveSentRef = useRef(false);
  // One board_ready per PRESENTATION, not per load. `retry()` re-loads the
  // same puzzle and keeps its meta, so without this flag the retry emits a
  // second ready event and inflates the denominator of the first-move rate —
  // the exact double count the retry path was supposed to avoid.
  const readySentRef = useRef(false);

  // Every delayed callback here reads mutable refs, so it must be able to tell
  // whether the puzzle it was scheduled for is still the one on the board.
  // `loadGenRef` increments on every load; `pendingTimersRef` lets a new load
  // (or unmount) cancel the old ones outright rather than relying on the guard
  // alone.
  const loadGenRef = useRef(0);
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearPendingTimers = useCallback(() => {
    for (const t of pendingTimersRef.current) clearTimeout(t);
    pendingTimersRef.current = [];
  }, []);

  // Play a UCI move on the current position and update state
  const playMove = useCallback((uciMove: string): ChessPosition | null => {
    const pos = positionRef.current;
    if (!pos) return null;

    const newPos = applyMove(pos, uciMove);
    if (!newPos) return null;

    positionRef.current = newPos;
    setPosition(newPos);
    setLastMove([
      uciMove.substring(0, 2) as Key,
      uciMove.substring(2, 4) as Key,
    ]);

    return newPos;
  }, []);

  // Play the opponent's response move after a delay
  const playOpponentMove = useCallback((delay = OPPONENT_REPLY_DELAY_MS) => {
    // Capture the generation this reply belongs to. Every delayed callback in
    // this hook reads MUTABLE refs, so without the guard a reply scheduled for
    // puzzle A lands on puzzle B when the user presses New Puzzle inside the
    // delay window — "New Puzzle" is enabled during `playing`, so the window
    // is reachable, and the old timer would advance the new puzzle's move
    // index by one before the user had touched it.
    const gen = loadGenRef.current;
    const t = setTimeout(() => {
      if (gen !== loadGenRef.current) return;
      const puz = puzzleRef.current;
      const idx = moveIndexRef.current;
      if (!puz || idx >= puz.moves.length) return;

      const opponentMove = puz.moves[idx];
      playMove(opponentMove);

      const newIdx = idx + 1;
      moveIndexRef.current = newIdx;
      setMoveIndex(newIdx);

      // Check if puzzle is complete (no more user moves)
      if (newIdx >= puz.moves.length) {
        setStatus('correct');
        setMessage('Correct! Puzzle solved.');
        logGA4Event({
          name: 'puzzle_completed',
          params: { puzzle_id: puz.id, first_try: !hasFailedOnceRef.current },
        });
      } else {
        setMessage(`${playerColorRef.current === 'white' ? 'White' : 'Black'} to move`);
      }
    }, delay);
    pendingTimersRef.current.push(t);
  }, [playMove]);

  // Load a new puzzle
  const loadPuzzle = useCallback((p: Puzzle, meta?: PuzzleLoadMeta) => {
    setPuzzle(p);
    puzzleRef.current = p;

    // A retry re-loads the same puzzle and passes no meta: the presentation
    // was already counted, so it must not be counted twice. Keeping the
    // previous meta (rather than nulling it) is deliberate — the retry's
    // moves still belong to that puzzle_index if anything later needs them.
    if (meta) {
      metaRef.current = meta;
      firstMoveSentRef.current = false;
      readySentRef.current = false;
    }
    const loadCalledAt = performance.now();

    // New presentation: cancel anything still pending from the previous one
    // and invalidate any callback that survives the cancel.
    clearPendingTimers();
    const gen = ++loadGenRef.current;
    // Until this puzzle's setup move lands, there is no meaningful ready time.
    // Zeroing it stops a stale value from the previous puzzle being reported
    // as this one's ms_from_ready.
    readyAtRef.current = 0;

    // Set up the initial position
    const pos = positionFromFen(p.fen);
    if (!pos) {
      setMessage('Error loading puzzle position.');
      return;
    }

    positionRef.current = pos;
    setPosition(pos);
    setLastMove(undefined);
    setMoveIndex(0);
    moveIndexRef.current = 0;
    setStatus('ready');
    setMessage('');
    // Reset failure tracking + cancel any pending auto-revert timer from
    // the previous puzzle (e.g. user clicked New Puzzle while the
    // failed-flash was still on screen).
    hasFailedOnceRef.current = false;
    setFirstFailure(false);
    setHasFailed(false);
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    // Lichess puzzle format:
    // - FEN is the position BEFORE the opponent's last move
    // - moves[0] = opponent's setup move (played automatically)
    // - moves[1] = user's first correct move
    // - moves[2] = opponent's response (played automatically)
    // - moves[3] = user's second correct move
    // - ...etc
    //
    // The user plays the OPPOSITE color of whoever moves first in the FEN.
    const fenTurn = pos.turnColor;
    const userColor: Color = fenTurn === 'white' ? 'black' : 'white';
    setPlayerColor(userColor);
    playerColorRef.current = userColor;

    // Play the setup move (moves[0]) after a short, deliberate pause.
    const setupTimer = setTimeout(() => {
      if (gen !== loadGenRef.current) return;
      const setupMove = p.moves[0];
      const newPos = playMove(setupMove);
      if (!newPos) {
        setMessage('Error: invalid setup move.');
        return;
      }
      moveIndexRef.current = 1;
      setMoveIndex(1);
      setStatus('playing');
      setMessage(`${userColor === 'white' ? 'White' : 'Black'} to move`);

      // The board is legally touchable exactly here — `dests` is gated on
      // status === 'playing' — which is NOT when it was painted. That gap is
      // the 800ms constant above, and it is what B3 removes; measuring the
      // paint instead would credit the network for a product decision.
      readyAtRef.current = performance.now();
      const m = metaRef.current;
      if (m && !readySentRef.current) {
        readySentRef.current = true;
        const from = m.source === 'network' && m.responseAt !== undefined
          ? m.responseAt
          : loadCalledAt;
        logGA4Event({
          name: 'puzzle_board_ready',
          params: {
            puzzle_id: p.id,
            is_daily: m.isDaily,
            puzzle_index: m.index,
            ms_to_ready: Math.round(readyAtRef.current - from),
            ready_source: m.source,
          },
        });
      }
    }, SETUP_MOVE_DELAY_MS);
    pendingTimersRef.current.push(setupTimer);
  }, [playMove, clearPendingTimers]);

  /**
   * Restore a partly-solved puzzle (2026-08-08).
   *
   * Unlike `loadPuzzle` this starts at `targetIndex` rather than 0, and plays the
   * moves already made INSTANTLY and silently: the setup pause and the opponent-reply
   * delay exist to make a new puzzle readable, and replaying them would make a
   * refresh look like the puzzle restarting — which is the thing being fixed.
   *
   * The position is REPLAYED from `puzzle.fen`, never taken from the caller. A stored
   * FEN is only used to verify the result; if the two disagree the state is corrupt
   * and we refuse rather than putting an arbitrary position on the board.
   *
   * No `PuzzleLoadMeta` is accepted on purpose: a resume is not a new presentation,
   * so it must not emit `puzzle_board_ready` and inflate the first-move funnel.
   */
  const resumePuzzle = useCallback((
    p: Puzzle,
    targetIndex: number,
    options: { hasFailed?: boolean; expectedFen?: string; resolvedAs?: 'correct' | 'solution' } = {},
  ): boolean => {
    /*
      A RESOLVED ATTEMPT MAY SIT AT THE END OF THE LINE, and only it may
      (2026-08-09). Mid-solve, an index at `moves.length` is a puzzle with no
      move left to expect; resolved, it is the whole point.
    */
    if (targetIndex < 1 || targetIndex > p.moves.length - (options.resolvedAs ? 0 : 1)) return false;

    let pos = positionFromFen(p.fen);
    if (!pos) return false;
    for (let i = 0; i < targetIndex; i += 1) {
      const next = applyMove(pos, p.moves[i]);
      if (!next) return false;
      pos = next;
    }
    if (options.expectedFen && pos.fen !== options.expectedFen) return false;

    clearPendingTimers();
    ++loadGenRef.current;
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
    // A resume is not a presentation: leave metaRef null so nothing downstream
    // reports this as a newly shown puzzle.
    metaRef.current = null;
    readyAtRef.current = performance.now();

    setPuzzle(p);
    puzzleRef.current = p;
    positionRef.current = pos;
    setPosition(pos);

    const previousMove = p.moves[targetIndex - 1];
    setLastMove([
      previousMove.substring(0, 2) as Key,
      previousMove.substring(2, 4) as Key,
    ]);

    setMoveIndex(targetIndex);
    moveIndexRef.current = targetIndex;

    // The player is whoever is NOT to move in the puzzle's starting FEN — derived
    // the same way as loadPuzzle rather than from the resumed position, so an
    // odd/even mistake in the index cannot silently flip the board's colour.
    const startPos = positionFromFen(p.fen);
    const userColor: Color = startPos?.turnColor === 'white' ? 'black' : 'white';
    setPlayerColor(userColor);
    playerColorRef.current = userColor;

    // A wrong move already made stays made: `hasFailed` is what keeps a retry-solve
    // free, and clearing it would hand out a clean first try for reloading.
    hasFailedOnceRef.current = options.hasFailed === true;
    setHasFailed(options.hasFailed === true);
    setFirstFailure(false);

    /*
      The restored status is the one the attempt ENDED on, and the copy is the same
      copy those paths set — a resumed solve must not describe itself differently
      from the solve it is.

      `dests` and `movableColor` are already gated on `status === 'playing'`, so a
      resolved resume yields a board that can be reviewed and not played, with no
      extra guard here.
    */
    if (options.resolvedAs === 'correct') {
      setStatus('correct');
      setMessage('Correct! Puzzle solved.');
    } else if (options.resolvedAs === 'solution') {
      setStatus('solution');
      setMessage('Solution shown.');
    } else {
      setStatus('playing');
      setMessage(`${userColor === 'white' ? 'White' : 'Black'} to move`);
    }
    return true;
  }, [clearPendingTimers]);

  // Cancel every pending timer on unmount. Without this, navigating away
  // mid-puzzle leaves callbacks that call setState on an unmounted hook and,
  // worse, can emit funnel events for a page the user has already left.
  useEffect(() => () => {
    for (const t of pendingTimersRef.current) clearTimeout(t);
    pendingTimersRef.current = [];
    if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
  }, []);

  // Handle user move
  const onMove = useCallback((orig: Key, dest: Key) => {
    const puz = puzzleRef.current;
    const idx = moveIndexRef.current;
    if (!puz || status !== 'playing') return;

    const userMove = toUci(orig, dest);
    const expectedMove = puz.moves[idx];

    // Direct UCI match (handle promotion — accept any promotion for now).
    const isExpectedMove = userMove === expectedMove ||
      userMove === expectedMove.substring(0, 4); // ignore promotion suffix mismatch

    // Alternative-mate acceptance (Lichess convention): when the user plays
    // a different move that ALSO delivers checkmate, accept it. The puzzle's
    // chess goal is "find a mate", not "find this exact mate". Common case:
    // two queens both giving mate, or two pieces in two different mating
    // patterns. Tentatively apply the user's move on the current position
    // and inspect `isCheckmate`. The position is only mutated for real if
    // the move is correct (the existing `playMove(expectedMove)` path
    // applies the SOLUTION move, not the user's move — so even when we
    // accept an alternative mate, we replay it as the user's actual move
    // below, since both lead to the same end-state when the alt move is
    // mate (game over, no further plies).
    let isAltMate = false;
    if (!isExpectedMove && positionRef.current) {
      const tentative = applyMove(positionRef.current, userMove);
      if (tentative?.isCheckmate) isAltMate = true;
    }

    const isCorrect = isExpectedMove || isAltMate;

    // First move of this presentation, right or wrong. Emitted before the
    // branch so a wrong first move counts as engagement — the whole point of
    // the event is to separate "did not understand" from "found it hard",
    // and B1 (removing the revealed answer) is expected to produce MORE
    // wrong first moves, not fewer attempts.
    if (!firstMoveSentRef.current) {
      firstMoveSentRef.current = true;
      /* An offline puzzle was never served, so there is no presentation to
         count. Reporting one would file a real row against a puzzle the server
         did not choose - and it can SUCCEED, because the fallback also engages
         when a single slow `stats` probe latched `apiAvailable` false while the
         API was healthy the whole time. */
      if (!puz.offline) void recordPuzzleTry(puz.id, puz.tryId);
      const m = metaRef.current;
      // readyAtRef === 0 means this puzzle's setup callback never ran, so
      // there is no honest interval to report. Dropping the event is better
      // than reporting a duration measured from the wrong puzzle.
      if (m && readyAtRef.current > 0) {
        logGA4Event({
          name: 'puzzle_first_move',
          params: {
            puzzle_id: puz.id,
            puzzle_index: m.index,
            ms_from_ready: Math.round(performance.now() - readyAtRef.current),
            correct: isCorrect,
          },
        });
      }
    }

    if (isCorrect) {
      // For alt-mate, replay the user's exact UCI (the solution move would
      // be wrong here — they didn't play it). For the standard case, play
      // the expected UCI (which carries the promotion suffix the user may
      // have omitted). When alt-mate fires, the puzzle is by definition
      // over (mate ends the game), so we also force-end below regardless
      // of the puzzle's stored move count.
      playMove(isAltMate ? userMove : expectedMove);
      const newIdx = idx + 1;
      moveIndexRef.current = newIdx;
      setMoveIndex(newIdx);

      // Check if puzzle is complete. Alt-mate ends the puzzle immediately
      // even if the stored solution had more plies — those plies were
      // continuations that no longer apply once the king is mated.
      if (isAltMate || newIdx >= puz.moves.length) {
        setStatus('correct');
        setMessage('Correct! Puzzle solved.');
        logGA4Event({
          name: 'puzzle_completed',
          params: { puzzle_id: puz.id, first_try: !hasFailedOnceRef.current },
        });
      } else {
        // Play opponent's response. Suppress the "Correct! Keep going..."
        // banner when the next-and-last ply is the opponent's puzzle-
        // ending reply — otherwise it flashes for ~500ms (the
        // playOpponentMove delay) right before the "Puzzle Solved"
        // overlay, reading as a separate popup "before" the solve
        // celebration. Especially visible on mobile where the banner
        // sits directly above the board. Leaving the previous "to move"
        // prompt in place for 500ms is harmless — the user has already
        // moved and is just waiting for the opponent reply to land.
        const isPenultimateUserMove = newIdx + 1 >= puz.moves.length;
        if (!isPenultimateUserMove) {
          setMessage('Correct! Keep going...');
        }
        playOpponentMove();
      }
    } else {
      // Wrong move. Show the "Incorrect" overlay briefly, then auto-revert
      // to the position before the user's move and let them try again.
      // chessground updates its internal state when the user moves the
      // piece, but our React `position`/`positionRef` was never updated
      // (we only call `playMove` on the correct branch above), so when
      // the next render fires with status='failed' the ChessBoard's
      // useEffect calls `apiRef.current.set({ fen })` with the
      // pre-wrong-move FEN — chessground snaps the wrong piece back.
      // The auto-revert timer below then flips status back to 'playing'
      // so the user can try a different move from the same position.
      //
      // First-failure-only rating: hasFailedOnceRef tracks whether THIS
      // puzzle has already produced a 'failed' transition. Subsequent
      // wrong moves still flash the overlay and revert, but the
      // `firstFailure` flag stays false so PuzzleTrainer's rating-report
      // useEffect skips the Glicko call. Retries are free — the user
      // gets the visual feedback without further rating penalty.
      const isFirstFailure = !hasFailedOnceRef.current;
      hasFailedOnceRef.current = true;
      setFirstFailure(isFirstFailure);
      setHasFailed(true);
      setStatus('failed');
      // B2 / PZ-016 — say what has actually happened. The rating outcome is
      // fixed on this first failure and a later retry-solve is explicitly not
      // counted, so "Try again..." on its own invited the user to keep playing
      // for a result that had already been decided. Only the FIRST failure
      // decides anything; later ones really are free practice, and the copy
      // now distinguishes the two.
      /*
        "Incorrect. Keep trying." (owner, 2026-08-16: *"this needs to be
        modified, remove 'that one is scored' maybe some Keep trying or
        something?"*).

        It was "Incorrect — that one is scored.", which broke the standing
        no-em-dash rule and spent the largest type on the card telling someone
        what they had just LOST at the moment they lost it. What they need in
        that second is whether the position is still theirs to work out, and it
        is: the board reverts and they can keep going.

        THE SCORING IS NOT HIDDEN, it moved to where it is useful. The line that
        replaces this one 700ms later still says the attempt is already scored,
        which is the moment a player is deciding whether to keep calculating
        rather than reacting to a red flash.

        It also fits ONE line in the narrow card, where the old sentence needed
        two - and the slot reserves for the longest state it can hold.
      */
      setMessage(isFirstFailure ? 'Incorrect. Keep trying.' : 'Incorrect. Try again...');

      // The correct move is NOT revealed here (PZ-015 / plan B1).
      //
      // Until 2026-08-03 this branch lit the from/to squares of the correct
      // move 300ms after any wrong move and held them until the revert. That
      // made the "free retry" a lie in both directions: the retry was not a
      // second attempt at the problem, it was copying a highlight the page had
      // displayed 400ms earlier — so whatever calculation the puzzle existed
      // to train had already been short-circuited — and the rating outcome was
      // ALREADY settled on this first failure (see `isFirstFailure` above),
      // while the UI invited the user to carry on as though it were not.
      //
      // Revealing the answer is still available, deliberately, through
      // `showSolution()` — an explicit choice the user makes, rather than a
      // consolation the page hands out for being wrong.

      // Auto-revert after 700ms total — return to 'playing' state at the
      // pre-wrong-move position. Clear any prior timer first (defensive).
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
      revertTimerRef.current = setTimeout(() => {
        revertTimerRef.current = null;
        // Clear the last-move highlight so the user faces a fresh board. Since
        // B1 this is the setup move's highlight, not a revealed answer.
        setLastMove(undefined);
        setStatus('playing');
        /*
          The flash lasts 700ms and this line outlives it, so the page does not
          spend the rest of the puzzle looking like the result is still open.

          "already scored" was dropped from it (owner, 2026-08-06). The flash
          itself already says "Incorrect — that one is scored", so repeating the
          scoring for the rest of the attempt only kept telling someone they had
          lost something while they were still working. What has to survive is
          that the branch is DIFFERENT after a failure — that is what stops
          "Correct so far" coming back — not the words that were in it.
        */
        const side = playerColorRef.current === 'white' ? 'White' : 'Black';
        setMessage(hasFailedOnceRef.current
          ? `${side} to move. Keep going.`
          : `${side} to move`);
      }, 700);
    }
  }, [status, playMove, playOpponentMove]);

  // Retry the current puzzle
  const retry = useCallback(() => {
    if (puzzleRef.current) {
      loadPuzzle(puzzleRef.current);
    }
  }, [loadPuzzle]);

  // Show the full solution
  const showSolution = useCallback(() => {
    const puz = puzzleRef.current;
    if (!puz) return;

    // Reset to start and play all moves
    const pos = positionFromFen(puz.fen);
    if (!pos) return;

    /*
      KILL THE AUTO-REVERT BEFORE CLAIMING THE STATE (2026-08-13, found by an
      independent review).

      A wrong move sets `failed` and schedules a 700ms timer that puts the
      status back to `playing`. `Show solution` is deliberately clickable during
      that flash — it is the moment a beaten solver is most likely to give up —
      and this function set `solution` without cancelling the timer. The timer
      then fired into a revealed puzzle and set it back to `playing`, so the
      board showed the answer while the state said the attempt was live.
    */
    if (revertTimerRef.current) {
      clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }

    /*
      And cancel anything still animating from a previous reveal or setup move,
      for the same reason `loadPuzzle` does: a stale timer writes a position
      into whatever puzzle happens to be on the board when it fires.
    */
    pendingTimersRef.current.forEach(clearTimeout);
    pendingTimersRef.current = [];

    positionRef.current = pos;
    setPosition(pos);
    setStatus('solution');

    let current = pos;
    let i = 0;
    const playNext = () => {
      if (i >= puz.moves.length) {
        setMessage('Solution shown.');
        return;
      }
      const move = puz.moves[i];
      const next = applyMove(current, move);
      if (!next) return;

      current = next;
      positionRef.current = next;
      setPosition(next);
      setLastMove([
        move.substring(0, 2) as Key,
        move.substring(2, 4) as Key,
      ]);
      i++;
      /*
        TRACKED, so `loadPuzzle` can cancel it. Untracked, these kept firing
        after the player pressed New Puzzle mid-reveal and wrote the OLD
        puzzle's moves and highlights onto the NEW board — a position nobody
        played appearing under a puzzle nobody had started.
      */
      pendingTimersRef.current.push(setTimeout(playNext, 600));
    };

    pendingTimersRef.current.push(setTimeout(playNext, 300));
  }, []);

  const state: PuzzleState = {
    puzzle,
    position,
    fen: position?.fen || 'start',
    dests: status === 'playing' ? position?.dests : undefined,
    turnColor: position?.turnColor || 'white',
    movableColor: status === 'playing' ? playerColor : undefined,
    lastMove,
    isCheck: position?.isCheck || false,
    status,
    playerColor,
    moveIndex,
    message,
    firstFailure,
    hasFailed,
  };

  return [state, { loadPuzzle, resumePuzzle, onMove, retry, showSolution }];
}
