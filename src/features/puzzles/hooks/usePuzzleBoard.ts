import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { positionFromFen, applyMove, toUci, isPromotion, type ChessPosition } from '@/components/chess/chessLogic';
import type { Key } from '@lichess-org/chessground/types';
import { useBoardStepInput } from '@/components/chess/useBoardStepInput';
import { usePuzzle, type Puzzle } from './usePuzzle';
import { fetchPuzzles, fetchDailyPuzzle, isApiReachable } from '../services/PuzzleService';
import { loadResumeState, saveResumeState, clearResumeState } from '../services/puzzleResume';

/**
 * EVERYTHING THE BOARD NEEDS, and nothing else.
 *
 * Built from the rules `PuzzleTrainer` already established, one at a time,
 * rather than lifted out of it wholesale. Each of these is a defect that shipped
 * once, so the reasoning travels with the code:
 *
 *   - `linePly` REPLAYS the solution from the puzzle's own FEN and BREAKS rather
 *     than throwing on a malformed corpus row, so one bad row cannot take the
 *     page down.
 *   - `boardDests` is `undefined` while the attempt is live except for the side
 *     to move, and becomes the legal moves of the DISPLAYED position once
 *     resolved. That is what makes "what if" possible without undoing B1: the
 *     gate is `isResolved`, which is `correct || solution` and never reverts.
 *     `failed` is TRANSIENT — auto-revert returns to `playing` in 700ms — so
 *     nothing may key on it.
 *   - Back UNDOES a "what if" before it walks the line, because while a branch
 *     exists that is what the solver just did.
 *   - Reset abandons the branch AND the review, returning to where the puzzle
 *     left off.
 *   - the branch is never recorded: the attempt was scored long before.
 */
/**
 * What the next draw asks the server for.
 *
 * A RUN'S AXES ARE NOT DECORATION (D4b). A session records what it is training;
 * if the fetch ignored them the card would say "endgames" while the sampler drew
 * whatever the drawer held. `sessionId` travels with the same object because it
 * is the same fact one layer on: the attempt is attached to the run this PUZZLE
 * was drawn under, never to whatever run is active when it resolves — which is
 * how a daily puzzle came to be counted into an endgame run on the old page.
 */
/** Which day's daily puzzle this browser has already been shown. */
const DAILY_SEEN_KEY = 'cp_daily_puzzle_seen';

export interface PuzzleDraw {
  selection?: string;
  area?: string;
  theme?: string;
  minRating?: number;
  maxRating?: number;
  count?: number;
  sessionId?: string | null;
}

export function usePuzzleBoard(
  options: {
    attemptRecordedFor?: string | null;
    draw?: PuzzleDraw;
    /*
      WHETHER A FILTER ARRIVED IN THE URL, which is the only thing the daily
      puzzle skips on. Reading `draw.theme` instead made a SAVED theme suppress
      the daily puzzle permanently - see the note at the skip itself.
    */
    arrivedWithFilter?: boolean;
  } = {},
) {
  const [puzzleState, puzzleActions] = usePuzzle();
  const [flipped, setFlipped] = useState(false);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [explore, setExplore] = useState<{ position: ChessPosition; lastMove: Key[] }[] | null>(null);
  const [loading, setLoading] = useState(false);
  /* Monotonic draw counter, so a late response cannot paint over a newer one. */
  const seqRef = useRef(0);
  /* Taken BEFORE each fetch. The newest draw wins whatever order the network
     answers in - see `nextPuzzle`. */
  const drawTokenRef = useRef(0);

  const isResolved = puzzleState.status === 'correct' || puzzleState.status === 'solution';

  /* The solved line, replayed once per puzzle. */
  const linePly = useMemo(() => {
    const puzzle = puzzleState.puzzle;
    if (!puzzle) return null;
    const start = positionFromFen(puzzle.fen);
    if (!start) return null;
    const plies = [{
      fen: start.fen,
      lastMove: undefined as Key[] | undefined,
      turnColor: start.turnColor,
      isCheck: start.isCheck,
    }];
    let position = start;
    for (const uci of puzzle.moves) {
      const next = applyMove(position, uci);
      if (!next) break;
      position = next;
      plies.push({
        fen: next.fen,
        lastMove: [uci.slice(0, 2), uci.slice(2, 4)] as Key[],
        turnColor: next.turnColor,
        isCheck: next.isCheck,
      });
    }
    return plies;
  }, [puzzleState.puzzle]);

  const lastPly = linePly ? linePly.length - 1 : 0;
  /*
    NAVIGATION IS ALWAYS AVAILABLE WHEN THERE IS SOMETHING TO NAVIGATE (owner,
    2026-08-15: *"the move navigation buttons should be enabled always if there
    is a position on the board and there is moves to navigate through"*).

    That reverses the old rule, which disabled the strip for the whole attempt so
    that stepping back could not be used as an undo (B1). The owner has asked for
    it and the request is right - a control that is dead for most of the time a
    player spends on the page reads as broken.

    BUT THE CEILING IS NOT THE SAME IN BOTH STATES, and this is the part the
    request cannot mean literally. `linePly` holds the WHOLE solution, so a
    forward button that walked it mid-attempt would hand the answer to anyone who
    pressed it twice - a free reveal, wearing the costume of a navigation
    control, and one that does not even cost the rating the way `Show solution`
    does.

    So the range is the moves that have actually been PLAYED. `moveIndex` is how
    far into the solution the attempt has got, and it advances only on a correct
    move. Mid-attempt you can walk back over your own moves and forward again to
    where you are; once resolved the ceiling opens to the full line. Nothing is
    disclosed that the solver has not already earned, and the buttons are live
    from the first move.

    Stepping back is still not an undo: the board's `dests` come from
    `puzzleState` while the attempt is live, so a position walked back to is
    LOOKED at, not played from.
  */
  const navCeiling = isResolved ? lastPly : Math.max(0, Math.min(puzzleState.moveIndex, lastPly));
  /*
    AND NOTHING TO NAVIGATE BEFORE THE FIRST MOVE (owner, 2026-08-15: *"if the
    solution was not revealed yet, or the user has not introduced any move then
    obviously there is no navigation to be done, but if the user has entered, for
    example, two moves, then the backward moves navigation should work"*).

    `START_PLY` is 1, not 0. `linePly[0]` is the position BEFORE the setup move -
    a position the solver never saw, where it is the opponent to play - and
    `linePly[1]` is the puzzle as posed. So `moveIndex` is already 1 on a fresh
    puzzle, and reading that as "one move of history" lit the whole strip before
    anybody had done anything. Caught by driving the board rather than by reading
    the code: the probe printed `on,on,on,on,on` at start.

    Mid-attempt the strip therefore wakes on the solver's FIRST move and its
    range is what they have played. Resolved, it opens to the whole line
    including ply 0, which is the one case where seeing the position before the
    setup move is legitimate - the attempt is over and the line is the thing
    being studied.
  */
  const START_PLY = 1;
  const canReview = !!linePly && (isResolved ? lastPly > 0 : navCeiling > START_PLY);
  const reviewAt = reviewIndex !== null && linePly ? linePly[reviewIndex] : null;

  /*
    A new puzzle abandons any branch on the old one, AND ANY FLIP.

    Orientation follows the side to move, and a flip chosen for one position
    must not silently invert the next one: the player would start a puzzle
    looking at it from the wrong side. v1 reset it here (PuzzleTrainer.tsx:504);
    the rebuilt page kept the flip and lost the reset (C6, D27).
  */
  useEffect(() => {
    setExplore(null);
    setReviewIndex(null);
    setFlipped(false);
  }, [puzzleState.puzzle?.id]);

  const exploreAt = explore && explore.length > 0 ? explore[explore.length - 1] : null;
  /*
    WHAT THE BOARD SHOWS, IN ONE PLACE: a "what if" branch, else the reviewed
    ply, else the live position. The position and its marks travel together.
    Only the FEN used to follow the review, so stepping back drew an earlier
    position with the FINAL move highlighted and the final check marked on it
    (C6, D27).
  */
  const displayedFen = exploreAt?.position.fen ?? reviewAt?.fen ?? puzzleState.fen;
  const displayedTurnColor = exploreAt ? exploreAt.position.turnColor
    : reviewAt ? reviewAt.turnColor
      : puzzleState.turnColor;
  const displayedLastMove = exploreAt ? exploreAt.lastMove
    : reviewAt ? reviewAt.lastMove
      : puzzleState.lastMove;
  const displayedIsCheck = exploreAt ? exploreAt.position.isCheck
    : reviewAt ? reviewAt.isCheck
      : puzzleState.isCheck;
  const displayedCheck = displayedIsCheck ? displayedTurnColor : undefined;

  const boardDests = useMemo(
    () => (isResolved ? positionFromFen(displayedFen)?.dests : puzzleState.dests),
    [isResolved, displayedFen, puzzleState.dests],
  );

  const displayedOrientation: 'white' | 'black' = flipped
    ? (puzzleState.playerColor === 'white' ? 'black' : 'white')
    : puzzleState.playerColor;

  const onBoardMove = useCallback((orig: Key, dest: Key) => {
    if (!isResolved) {
      puzzleActions.onMove(orig, dest);
      return;
    }
    const from = positionFromFen(displayedFen);
    if (!from) return;
    const next = applyMove(from, toUci(orig, dest, isPromotion(from, orig, dest) ? 'q' : undefined));
    if (!next) return;
    setExplore(prev => [...(prev ?? []), { position: next, lastMove: [orig, dest] }]);
  }, [isResolved, displayedFen, puzzleActions]);

  const stepTo = useCallback((index: number) => {
    setExplore(null);
    setReviewIndex(() => {
      const next = Math.max(0, Math.min(index, navCeiling));
      /* Landing on the final ply LEAVES review rather than sitting in it: the
         end of the line is the live board. */
      return next >= navCeiling ? null : next;
    });
  }, [navCeiling]);

  /* Back undoes a branch first, then walks the line. */
  const onBack = useCallback(() => {
    if (exploreAt) {
      setExplore(prev => (prev && prev.length > 1 ? prev.slice(0, -1) : null));
      return;
    }
    stepTo((reviewIndex ?? navCeiling) - 1);
  }, [exploreAt, reviewIndex, navCeiling, stepTo]);

  /*
    WHEEL-TO-STEP OVER THE BOARD (owner, 2026-08-15: *"the mouse scrolling while
    the pointer over the board acts like move navigation"*).

    `stepwiseScroll` is the pgn-viewer's OWN accumulator, not a reimplementation:
    it sums `deltaY` and steps only once the total passes 4, so one notch of a
    mouse wheel is one move and a trackpad flick does not fly through the line.
    The champion game pages get this from the library itself; the owner's
    instruction on 08-08 was to take the behaviour from there rather than write
    a second one.

    IT OBEYS THE SAME CEILING AS THE BUTTONS, which is the only rule it needs.
    `canReview` now means "there is something to navigate" rather than "the
    attempt is over", so the wheel works mid-attempt over the moves already
    played and opens to the full line on resolution. A wheel that stepped further
    than the buttons would be the disclosure rule broken by a different input.

    The wheel only, no arrow keys: this page has never had them, and adding them is
    a feature, not part of moving the wheel into the shared hook (Eg, 2026-10-10).
  */
  const attachWheel = useBoardStepInput({
    enabled: canReview,
    keys: false,
    onBack: () => stepTo((reviewIndex ?? navCeiling) - 1),
    onForward: () => stepTo((reviewIndex ?? navCeiling) + 1),
  });

  /*
    "CORRECT SO FAR" MUST NOT COME BACK AFTER A WRONG MOVE (owner, 2026-08-06:
    *"the red text appears for a fraction of a second then disappears and the
    green text Correct so far is shown again"*).

    A wrong move sets `failed` for 700ms and auto-revert then returns the status
    to `playing` with the move count untouched — so a naive `status === 'playing'
    && movesMade > 0` goes true again and the card congratulates someone whose
    attempt is already scored. Remembering WHICH puzzle failed is what survives
    the revert, because the status does not.

    `solverMovesMade` halves `moveIndex` because the line alternates: each solver
    move is answered by the opponent's reply.
  */
  const [failedPuzzleId, setFailedPuzzleId] = useState<string | null>(null);
  useEffect(() => {
    if (puzzleState.status === 'failed' && puzzleState.puzzle) {
      setFailedPuzzleId(puzzleState.puzzle.id);
    }
  }, [puzzleState.status, puzzleState.puzzle]);
  const solverMovesMade = Math.floor(puzzleState.moveIndex / 2);
  const hasFailedThisPuzzle = puzzleState.puzzle != null && failedPuzzleId === puzzleState.puzzle.id;
  const isMidSolve = puzzleState.status === 'playing' && solverMovesMade > 0 && !hasFailedThisPuzzle;

  /*
    ONE LIVE REGION, built from the same state the visuals use so the two cannot
    disagree (B4). This is the OUTCOME only. The rating change is appended by the
    page, which holds the record, together with the offline and empty-filter
    notices (TrainerLayoutSkeleton, `announcement`).
  */
  const announcement =
    isMidSolve ? 'Correct so far. Keep going.'
      : puzzleState.status === 'correct' ? 'Correct. Puzzle solved.'
        : puzzleState.status === 'failed'
          ? `Incorrect.${puzzleState.firstFailure ? ' This attempt is scored.' : ''}`
          : puzzleState.status === 'solution' ? 'Showing the solution.'
            : '';

  /*
    THE DRAW IS READ AT THE MOMENT OF THE FETCH, from a ref.

    `nextPuzzle` is passed to a button and to the resume effect, and rebuilding
    it whenever a filter changes would either re-run that mount effect or leave
    the button holding a stale closure — the exact defect the old page's
    `overrides` parameter exists to work around. A ref updated during render has
    neither problem: there is one function, and it always reads the current
    axes.
  */
  const drawRef = useRef<PuzzleDraw>(options.draw ?? {});
  drawRef.current = options.draw ?? {};
  /* Read by the mount-only daily effect, which cannot see a prop directly. */
  const arrivedWithFilterRef = useRef(false);
  arrivedWithFilterRef.current = options.arrivedWithFilter === true;
  /*
    Which run the puzzle ON SCREEN was served under. Captured at the draw, not
    read when the attempt lands: a run started while a puzzle is already up does
    not claim that puzzle, and a run ended mid-puzzle still owns the attempt it
    served.
  */
  const [servedRunId, setServedRunId] = useState<string | null>(null);
  /*
    A FILTER THAT MATCHES NOTHING IS A DEAD END UNLESS THE PAGE SAYS SO.

    The server used to answer an impossible filter with an unrelated puzzle,
    which was worse; it now correctly serves nothing, and a page that ignores
    that leaves the board where it was and the button doing nothing at all
    (2026-08-05). The player cannot see the cause either - the filter is in a
    card they may never have opened.

    Only true when a filter was actually sent. An empty response with no filter
    is a server problem, not a player one, and saying "nothing matched that
    filter" would be false.
  */
  const [filterFoundNothing, setFilterFoundNothing] = useState(false);
  /* Whether the last draw could reach the API at all. Kept apart from the
     per-puzzle `offline` flag on purpose: this one is about the SERVER, and it
     is what the card reports. */
  const [serverUnreachable, setServerUnreachable] = useState(false);
  /* The position on the board is today's daily puzzle, which the live card
     marks and which no run may claim. */
  const [isDaily, setIsDaily] = useState(false);
  /* A restored puzzle whose attempt the server already has. Read once, at the
     restore, and cleared by the next draw - the next puzzle has no history. */
  const [restoredReportedFor, setRestoredReportedFor] = useState<string | null>(null);
  /*
    A restored puzzle, scored or not. It is a SEPARATE fact from the one above:
    a mid-solve puzzle picked up after a reload has no report yet and still has
    no honest duration, because the clock starts when the tab reopens.
  */
  const [restoredPuzzleId, setRestoredPuzzleId] = useState<string | null>(null);
  /*
    A restored puzzle that came back ALREADY OVER. Distinct from both of the
    above: it is what the sitting's counters and the reveal event must ignore,
    because that outcome was counted in the sitting it happened in.
  */
  const [restoredResolvedFor, setRestoredResolvedFor] = useState<string | null>(null);

  /*
    `overrides` exists for exactly one caller: the "clear the filter" recovery.
    Clearing sets React state, and the fetch that must follow would otherwise run
    with the OLD filter - asking the server the same impossible question again
    and leaving the player exactly where they were.
  */
  const nextPuzzle = useCallback(async (overrides?: Partial<PuzzleDraw>) => {
    /* Drawing a new puzzle abandons the saved one. Clearing FIRST means an
       interrupted fetch leaves no stale entry to restore the old puzzle from. */
    clearResumeState();
    setLoading(true);
    const draw = { ...drawRef.current, ...overrides };
    /*
      THE TOKEN IS TAKEN AT THE REQUEST, NOT AT THE RESPONSE (Codex, 2026-08-16).

      `loadPuzzle`'s `index` is assigned when the response LANDS, so two
      overlapping draws both increment it and whichever finishes LAST wins - even
      when that is the older request. Starting a run and pressing New Puzzle in
      quick succession is enough: the free-solving draw can land second and take
      the board, and `servedRunId` goes with it, so the next attempt is filed
      under a run that never served the position.

      A token taken before the fetch and compared after it makes the NEWEST draw
      the winner regardless of the order the network answers in.
    */
    const token = ++drawTokenRef.current;
    const stale = () => token !== drawTokenRef.current;
    try {
      const puzzles = await fetchPuzzles({
        count: draw.count ?? 1,
        selection: draw.selection,
        area: draw.area,
        theme: draw.theme,
        /* `adaptive` derives the window server-side, and a pinned window beats a
           derived one — so sending ours would leave the mode doing nothing. */
        minRating: draw.selection === 'adaptive' ? undefined : draw.minRating,
        maxRating: draw.selection === 'adaptive' ? undefined : draw.maxRating,
        // The baked pool is a rounding error against 5.8M puzzles, so without
        // this an explanation would almost never appear. It only REORDERS what
        // the server already chose.
        preferExplained: true,
      });
      const first = puzzles?.[0];
      /*
        `index` is what lets `usePuzzle` tell one draw from another - it is how a
        late response for a puzzle nobody is looking at any more is discarded
        rather than written onto the board. `isDaily` is stated explicitly
        because the daily puzzle is a different draw with different rules.
      */
      /* A superseded draw says nothing about the board and reports nothing. */
      if (stale()) return;
      /*
        THE SERVER OUTRANKS THE FILTER, because only one of the two statements
        can be true and the filter one is the misleading half. A filtered draw
        against an unreachable API returns an empty list WITHOUT a fallback
        puzzle, which used to render as "nothing matched that filter" when the
        request was never made.
      */
      const unreachable = isApiReachable() === false;
      setServerUnreachable(unreachable);
      setFilterFoundNothing(!unreachable && !first && Boolean(draw.theme || draw.area));
      if (first) {
        setServedRunId(draw.sessionId ?? null);
        setIsDaily(false);
        setRestoredReportedFor(null);
        setRestoredPuzzleId(null);
        puzzleActions.loadPuzzle(first as Puzzle, {
          source: 'network',
          index: ++seqRef.current,
          isDaily: false,
        });
      }
    } finally {
      /* Only the draw still in flight owns the spinner: an older one finishing
         late must not report the newer one as done. */
      if (!stale()) setLoading(false);
    }
  }, [puzzleActions]);

  /*
    THE PUZZLE SURVIVES A REFRESH AND A TRIP TO ANOTHER PAGE (owner, 2026-08-15:
    *"make sure we have the cache mechanism in place when refreshing or
    navigating to another page then come back to the puzzles page"*, and *"this
    was present in the old page so needs to be present in the new one as well"*).

    RESTORE IS A REPLAY, NOT A RESTORE OF THE POSITION. `resumePuzzle` replays
    `moveIndex` moves from the puzzle's OWN fen and compares the result against
    the stored one; a payload whose fen disagrees is dropped whole. Trusting the
    stored fen instead would let a tampered or half-written entry put an
    arbitrary position on the board, and `resumePuzzle` returning false is what
    makes the fallback a fresh draw rather than a broken page.

    A RESOLVED PUZZLE IS SAVED TOO, which is not obvious and was decided on
    2026-08-09: the solved line is a surface you can walk with the strip and the
    wheel, so leaving the page and coming back to a fresh puzzle would throw away
    the thing the player was reading. `resolvedAs` carries how it ended.

    `attemptRecorded` is FALSE here because this page reports nothing yet. It
    exists so that a resumed attempt is never scored twice, and it must become
    real in the same commit that adds reporting - a resume that forgets an
    attempt was recorded moves the rating twice for one puzzle.
  */
  useEffect(() => {
    const resumed = loadResumeState();
    if (resumed && puzzleActions.resumePuzzle(resumed.puzzle, resumed.moveIndex, {
      hasFailed: resumed.hasFailed,
      expectedFen: resumed.fen,
      resolvedAs: resumed.resolvedAs ?? undefined,
    })) {
      /* The run the RESTORED puzzle was served under, so an attempt finished
         after a reload still lands in the run that served it. */
      setServedRunId(resumed.sessionId ?? null);
      setIsDaily(resumed.isDaily);
      /*
        AND WHETHER IT WAS ALREADY SCORED, which is what stops the rating moving
        twice for one solve. The payload has carried this since resume was built
        and nothing read it back: a restored puzzle arrives at `correct` or
        `solution`, the record hook's status effect fires on a fresh mount, and
        the attempt is written a second time. Measured, not reasoned about - two
        POSTs for one puzzle id after a reveal and a reload.
      */
      if (resumed.attemptRecorded) setRestoredReportedFor(resumed.puzzle.id);
      /*
        AND WHETHER IT CAME BACK ALREADY OVER. A puzzle restored at `correct` or
        `solution` makes the record hook's status effect fire on a fresh mount,
        which is right for the POST - that is guarded - and wrong for everything
        else in the same branch: the sitting's solved/failed counters moved, the
        streak moved, and a restored REVEAL re-emitted
        `puzzle_solution_revealed`. Three reloads of one solve added three
        solves to the card and three reveals to GA4.
      */
      if (resumed.resolvedAs) setRestoredResolvedFor(resumed.puzzle.id);
      setRestoredPuzzleId(resumed.puzzle.id);
      return;
    }

    /*
      THE FIRST VISIT OF THE DAY OPENS ON THE DAILY PUZZLE, which is what
      `/puzzles` has always done and what the chip in the live card is for.

      ONE FIXED POSITION FOR EVERYONE, so it ignores every filter - and that is
      why a draw carrying one SKIPS it. A player who clicked "train endgame" on
      their record would otherwise land on an unrelated tactic and see the filter
      take effect only on the next puzzle, which makes the link true of the
      second click. Skipped, never suppressed: the flag is left untouched, so the
      daily puzzle is still waiting on the next ordinary visit.

      IT IS NOBODY'S RUN either, for the same reason: a position that ignores the
      run's axes must not be counted into it.

      `source: 'daily'` and not `'network'` - a different endpoint on a different
      selection path, and lumping the two together would blur the comparison the
      measurement exists for.
    */
    const today = new Date().toISOString().split('T')[0];
    const seen = (() => {
      try { return localStorage.getItem(DAILY_SEEN_KEY); } catch { return null; }
    })();
    /*
      A FILTER THAT ARRIVED IN THE URL, not any filter at all. This read
      `draw.theme || draw.area`, and `draw.theme` also carries the player's SAVED
      theme - so saving one in Strength & themes silently ended the daily puzzle
      for that browser, for ever. The old page asks the narrower question
      (PuzzleTrainer.tsx:1147) and so does this one now. Counterfactual: with the
      old condition a saved theme draws `next?theme=fork` where the daily belongs.
    */
    if (seen === today || arrivedWithFilterRef.current) { void nextPuzzle(); return; }

    try { localStorage.setItem(DAILY_SEEN_KEY, today); } catch { /* quota */ }
    const dailyToken = ++drawTokenRef.current;
    fetchDailyPuzzle()
      .then(daily => {
        /* A draw started while the daily was in flight wins: the player has
           asked for something newer than the page's opening move. */
        if (dailyToken !== drawTokenRef.current) return;
        if (!daily) { void nextPuzzle(); return; }
        /*
          THE DAILY IS THE FIRST THING A VISITOR SEES, so it is the first place
          the fallback can appear - and setting this only in `nextPuzzle` left
          the opening puzzle of an offline session with no notice at all. Found
          by driving the page against a dead backend, not by reading it: the
          board showed hardcoded 3H6vB and the card said nothing.
        */
        setServerUnreachable(isApiReachable() === false);
        setServedRunId(null);
        setIsDaily(true);
        puzzleActions.loadPuzzle(daily as Puzzle, {
          source: 'daily', index: ++seqRef.current, isDaily: true,
        });
      })
      /* A failed daily is not a failed page: fall back to an ordinary draw -
         unless something newer has already been asked for. The success path has
         checked this token since it was written; the failure path did not, so a
         slow daily that eventually failed could issue a draw on top of the first
         puzzle of a run the player had already started. */
      .catch(() => { if (dailyToken === drawTokenRef.current) void nextPuzzle(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /*
    SAVED ON EVERY MEANINGFUL CHANGE, in the two shapes the state can take.

    Mid-solve is only worth saving between the first and last move: below 1 there
    is nothing to restore that a fresh draw would not give, and at or past the
    end the puzzle is over and the resolved branch owns it.
  */
  useEffect(() => {
    const puzzle = puzzleState.puzzle;
    if (!puzzle) return;
    const resolvedAs = puzzleState.status === 'correct' ? 'correct'
      : puzzleState.status === 'solution' ? 'solution'
        : null;
    if (resolvedAs) {
      const end = linePly?.[linePly.length - 1];
      /* A correct attempt that does not end on the line's last position is not
         a state we can reproduce, so it is dropped rather than half-restored. */
      if (!end || (resolvedAs === 'correct' && puzzleState.fen !== end.fen)) {
        clearResumeState();
        return;
      }
      saveResumeState({
        version: 1,
        puzzle,
        moveIndex: linePly.length - 1,
        resolvedAs,
        fen: end.fen,
        attemptRecorded: options.attemptRecordedFor === puzzle.id,
        hasFailed: puzzleState.hasFailed,
        rungsShown: 0,
        sessionId: servedRunId,
        isDaily,
      });
      return;
    }
    if (puzzleState.status !== 'playing') return;
    if (puzzleState.moveIndex < 1 || puzzleState.moveIndex >= puzzle.moves.length) return;
    saveResumeState({
      version: 1,
      puzzle,
      moveIndex: puzzleState.moveIndex,
      resolvedAs: null,
      fen: puzzleState.fen,
      attemptRecorded: options.attemptRecordedFor === puzzle.id,
      hasFailed: puzzleState.hasFailed,
      rungsShown: 0,
      sessionId: servedRunId,
      isDaily,
    });
  }, [
    puzzleState.puzzle, puzzleState.status, puzzleState.moveIndex,
    puzzleState.fen, puzzleState.hasFailed, linePly,
    /*
      THE THREE VALUES THIS EFFECT READS AND DID NOT WATCH. `attemptRecordedFor`
      is set by the parent AFTER the result is posted, and the status is already
      `correct` by then - so nothing re-ran, the saved payload kept
      `attemptRecorded: false`, and a reload restored a scored puzzle as unscored
      and posted it again. `servedRunId` and `isDaily` are the same omission: a
      resumed puzzle could come back attached to the wrong run, or lose the fact
      that it was the daily one.
    */
    options.attemptRecordedFor, servedRunId, isDaily,
  ]);

  return {
    puzzleState,
    puzzleActions,
    loading,
    isResolved,
    linePly,
    lastPly,
    navCeiling,
    isMidSolve,
    announcement,
    canReview,
    exploreAt,
    reviewIndex,
    displayedFen,
    displayedTurnColor,
    displayedLastMove,
    displayedCheck,
    displayedOrientation,
    boardDests,
    onBoardMove,
    stepTo,
    onBack,
    attachWheel,
    onFlip: () => setFlipped(f => !f),
    onReset: () => { setExplore(null); setReviewIndex(null); },
    nextPuzzle,
    /** The run the puzzle on the board was served under, or null. */
    servedRunId,
    /** The last draw asked for a filter and the corpus had nothing. */
    filterFoundNothing,
    /** The last draw could not reach the API, so anything on the board came
     *  from the offline list and nothing is being scored. */
    serverUnreachable,
    /** The board is showing today's daily puzzle. */
    isDaily,
    /** A restored puzzle whose attempt was already scored, so nothing reports it
     *  a second time. */
    restoredReportedFor,
    /** A restored puzzle, whose elapsed time this tab cannot know. */
    restoredPuzzleId,
    /** A restored puzzle that arrived resolved, so its outcome is not counted
     *  again into this sitting's record or re-announced to GA4. */
    restoredResolvedFor,
  };
}
