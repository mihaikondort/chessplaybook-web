import { useCallback, useEffect, useRef, useState } from 'react';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';
import { logGA4Event } from '@/services/analytics';
import { partialCredit } from '../lib/partialCredit';
import { postPuzzleResult } from '../services/postPuzzleResult';

export interface PuzzleProgress {
  totalSolved: number;
  totalFailed: number;
  bestStreak: number;
  sessions: number;
  estimatedRating: number;
  lastPlayed: string;
}

const STORAGE_KEY = 'chessplaybook_puzzle_progress';

/**
 * How far outside a pinned band the player's rating may be before an attempt
 * stops counting. 200, the same number the old page uses - stated once here so
 * the two pages cannot drift into freezing different attempts.
 */
const FREEZE_MARGIN = 200;

/**
 * THE ANTI-GRIND RULE, ONCE. Scoring freezes on it and the settings card says
 * so with it: the same verdict, so the sentence can never disagree with what
 * the server is told. The card was built to show it and the rebuilt page never
 * passed it, so a band far from the rating froze attempts in silence (C6, D27).
 */
export function isBandFarFromRating(
  band: { min: number; max: number } | null | undefined,
  rating: number,
): boolean {
  return band != null
    && (rating < band.min - FREEZE_MARGIN || rating > band.max + FREEZE_MARGIN);
}

export function loadProgress(): PuzzleProgress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* a corrupt entry is not worth breaking the page for */ }
  return { totalSolved: 0, totalFailed: 0, bestStreak: 0, sessions: 0, estimatedRating: 1200, lastPlayed: '' };
}

/**
 * The two record cards' numbers: this sitting, and the lifetime record.
 *
 * IT WRITES NOW, AND THE COMMENT THAT SAID OTHERWISE WAS STALE (2026-08-16).
 *
 * This block used to read "the server is READ on mount and never written", which
 * was true while the page could not report a result and is exactly the kind of
 * comment that outlives its subject. Two things reach the server from here: the
 * attempt itself (`POST /api/puzzles/result`, one per puzzle) and the best
 * streak, which is written only when it RISES because it is the one number with
 * no server-side writer of its own.
 *
 * WHAT IS STILL DELIBERATELY NOT WRITTEN: the puzzle counters and the rating.
 * The server owns those - it returns `newRating` on every attempt and the page
 * adopts it verbatim. A second writer for one number is what made the displayed
 * rating read 2712 and then 2229 on 2026-08-05.
 *
 * SOLVING ON A DEV SERVER WRITES REAL ROWS unless `DEV_API_TARGET` points at a
 * local backend: `npm run dev` proxies `/api` to the LIVE API (see vite.config.ts).
 *
 * THE SCORING RULES ARE THE TRAINER'S, not new ones:
 *
 *   - a retry-solve is FREE: a puzzle failed earlier and then completed does not
 *     count as solved and does not restore the streak. Retries exist for
 *     learning, not for points.
 *   - only the FIRST failure counts. Auto-revert flashes `failed` for 700ms and
 *     a solver can miss repeatedly on one puzzle; `firstFailure` is true exactly
 *     once, which is what stops one bad move being counted four times.
 *   - REVEALING COUNTS AS ATTEMPTED AND NOT SOLVED. Giving up and looking is a
 *     real training event and used to be recorded nowhere, so a player who
 *     revealed twenty endgames looked identical to one who had never opened an
 *     endgame.
 */
export function usePuzzleRecord(
  puzzleState: {
    status: string;
    hasFailed: boolean;
    firstFailure: boolean;
    moveIndex: number;
    /* `tryId` is the server-issued presentation id (plan B1). It is optional
       because a legacy client or a resumed pre-B1 position has none, and the
       result endpoint must still accept those - see `puzzle_attempts.try_id`,
       which is NULL for exactly that reason. */
    /* `offline` is read rather than inferred from a missing `tryId`: a resumed
       pre-B1 position lacks one too and IS a real attempt. */
    puzzle: {
      id: string; rating?: number | null; moves: string[];
      tryId?: string; offline?: true;
    } | null;
  },
  options: {
    rated: boolean;
    /**
     * The PINNED rating band, or null in auto mode.
     *
     * An attempt more than `FREEZE_MARGIN` outside the player's own rating is
     * frozen: solving 800s at 1600 must not move a rating, in either direction.
     * The band is passed rather than the verdict because the rating it is
     * compared against lives HERE - two owners of one number is how the
     * displayed rating came to disagree with the server's (2026-08-05).
     */
    ratingBand?: { min: number; max: number } | null;
    /**
     * The run the puzzle on the board was SERVED under, which is what the server
     * advances. Never "the run that is active now": a run started while a puzzle
     * is already up does not claim it.
     */
    sessionId?: string | null;
    /** Called once the server has written the attempt, so a run can re-read its
     *  own progress. The count lives in the attempt log, never on the client. */
    onResultRecorded?: () => void;
    /**
     * A puzzle RESTORED from a previous visit whose attempt was already scored.
     *
     * WITHOUT THIS THE RATING MOVES TWICE FOR ONE SOLVE. The report is driven by
     * an effect on `puzzleState.status`, and a restored puzzle arrives at
     * `correct` or `solution` on mount - so the effect fires, `reportedRef` is
     * empty in a fresh mount, and the same attempt is written a second time.
     * Measured on 2026-08-16 by revealing a puzzle and reloading: two POSTs for
     * one puzzle id.
     *
     * The resume payload has carried `attemptRecorded` since resume was built,
     * and its own comment says a resume that forgets it "moves the rating twice
     * for one puzzle". Nothing was reading it back.
     */
    alreadyReportedFor?: string | null;
    /**
     * The attempt was restored ALREADY OVER, so its outcome belongs to the
     * sitting it happened in and must not be counted into this one.
     *
     * `alreadyReportedFor` guards the POST and nothing else, so a reload of a
     * solved puzzle still added a solve to this sitting's card, still moved the
     * streak, and a restored REVEAL re-emitted `puzzle_solution_revealed` - three
     * reloads, three reveals in GA4, for one reveal.
     */
    restoredResolvedFor?: string | null;
    /**
     * The attempt was RESTORED, so the clock cannot know how long it took.
     *
     * The timer starts when the status becomes `playing`, which on a resumed
     * puzzle is the moment the tab reopened - so without this the server is told
     * a puzzle picked up a day later was solved in four seconds. That number is
     * not cosmetic: D7's pacing budgets are the MEDIAN of these durations per
     * area, so a stream of fake-fast attempts drags the budget down for everyone.
     * The old page reports `null` here and so does this one.
     */
    durationUnreliable?: boolean;
  } = { rated: true },
) {
  const [stats, setStats] = useState({ solved: 0, failed: 0, streak: 0 });
  const [progress, setProgress] = useState<PuzzleProgress>(loadProgress);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [lastSolveFrozen, setLastSolveFrozen] = useState(false);
  /** The puzzle whose result has already been sent. One report per puzzle. */
  const reportedRef = useRef<string | null>(null);
  const [attemptRecordedFor, setAttemptRecordedFor] = useState<string | null>(null);

  /*
    A RESTORED, ALREADY-SCORED ATTEMPT IS ADOPTED BEFORE ANY EFFECT CAN REPORT IT.

    Written during RENDER, not in an effect: the reporting effect runs on the same
    commit that puts the restored puzzle on the board, and an effect writing this
    ref would be ordered after it in the same pass on some renders. Render is the
    only place guaranteed to be earlier.
  */
  const restored = options.alreadyReportedFor ?? null;
  if (restored && reportedRef.current !== restored) {
    reportedRef.current = restored;
  }

  /* The rating the freeze rule is measured against, readable from `report`
     without making the callback depend on every progress change. */
  const progressRef = useRef(progress);
  progressRef.current = progress;

  /* How long the attempt took, for the server's own timing figures. Reset when a
     new puzzle is put on the board; a resumed puzzle reports null, because the
     clock cannot know how long the tab was closed. */
  /* Which puzzle of this sitting, so an event can be placed in the session. */
  const seqRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const durationUnreliableRef = useRef(false);
  useEffect(() => {
    if (puzzleState.status === 'playing' && startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }
  }, [puzzleState.status]);
  useEffect(() => {
    startedAtRef.current = null;
    durationUnreliableRef.current = false;
    if (puzzleState.puzzle) seqRef.current += 1;
    /* Both halves of the last result belong to the last puzzle. Resetting only
       the delta left Overall reading "practice" on the next one until its own
       result arrived (C6, D27; v1 reset both, PuzzleTrainer.tsx:1244). */
    setRatingDelta(null);
    setLastSolveFrozen(false);
  }, [puzzleState.puzzle?.id]);

  /*
    ONE REPORT PER PUZZLE, AND THE FIRST WRONG MOVE IS THE REPORT (B1).

    `reportedRef` is what makes that true: a wrong move settles the attempt, and
    everything after it — a retry that succeeds, a reveal — must not send a
    second row. It is also why the reveal metric is a FLOOR rather than a count,
    which is recorded on the current page and stays true here.

    FROZEN IS COMPUTED THE SAME WAY, by the same precedence: a reveal outranks a
    hint, which outranks practice mode, which outranks a band far from the
    player's rating. One value, because a delimited set would reintroduce the
    substring matching C2 removed.
  */
  /*
    THE RUN AND THE CALLBACK ARE READ AT THE MOMENT OF THE REPORT.

    `report` is invoked from an effect keyed on the puzzle's STATUS, so a value
    captured when the callback was built can be one render out of date — which is
    exactly the 08-05 defect where a memoised reporter kept the `rated` flag from
    the render that created it and a hint never made a puzzle unrated. A ref
    written during render cannot be stale.
  */
  const liveRef = useRef(options);
  liveRef.current = options;

  const report = useCallback(async (solved: boolean, revealed = false) => {
    const puzzle = puzzleState.puzzle;
    if (!puzzle) return;
    /*
      AN OFFLINE PUZZLE IS NOT AN ATTEMPT (2026-08-22).

      It never came from the server, so there is nothing to score it against and
      no `tryId` to key it on. Returning BEFORE `setAttemptRecordedFor` is
      deliberate: that flag is what makes the page say "already scored", and
      saying it here would be the same untrue claim the fallback already makes
      by staying silent.

      The GA4 event is dropped with it. `puzzle_result_recorded` exists to
      separate honest failures from abandonment, and rows for five hardcoded
      puzzles nobody was served would corrupt exactly that reading.
    */
    if (puzzle.offline) return;
    if (reportedRef.current === puzzle.id) return;
    reportedRef.current = puzzle.id;
    setAttemptRecordedFor(puzzle.id);

    const { totalMoves, correctMoves } = partialCredit(
      puzzle.moves.length, puzzleState.moveIndex, solved,
    );
    const bandIsFarFromRating = isBandFarFromRating(
      liveRef.current.ratingBand, progressRef.current.estimatedRating,
    );
    const frozen = !options.rated || bandIsFarFromRating || revealed;
    const frozenReason = revealed ? 'solution'
      : !options.rated ? 'practice'
        : bandIsFarFromRating ? 'band'
          : null;

    logGA4Event({
      name: 'puzzle_result_recorded',
      params: {
        puzzle_id: puzzle.id,
        puzzle_index: seqRef.current,
        solved,
        frozen,
        frozen_reason: frozenReason ?? 'none',
      },
    });

    const elapsed = startedAtRef.current != null ? Date.now() - startedAtRef.current : null;
    try {
      const headers = await getRequestHeaders();
      /* Retries a 503 with the SAME tryId — see postPuzzleResult for why that
         is safe and why nothing else is retried. */
      const res = await postPuzzleResult(headers, {
          puzzleId: puzzle.id,
          tryId: puzzle.tryId,
          solved,
          correctMoves,
          totalMoves,
          frozen,
          /* A resumed attempt has no honest duration - see `durationUnreliable`. */
          solveDurationMs: durationUnreliableRef.current || liveRef.current.durationUnreliable
            ? null
            : elapsed,
          frozenReason,
          /* The server verifies this against the caller's own identity and
             ignores a run that is not theirs or no longer active. */
          sessionId: liveRef.current.sessionId ?? null,
      });
      if (res.ok && res.data) {
        const { data } = res;
        /* The SERVER's rating, not a local guess. The current page displayed a
           number the server had never stored until this was fixed on 08-05. */
        setProgress(p => ({
          ...p,
          estimatedRating: data.newRating,
          lastPlayed: new Date().toISOString().split('T')[0],
          ...(solved ? { totalSolved: p.totalSolved + 1 } : { totalFailed: p.totalFailed + 1 }),
        }));
        setRatingDelta(data.ratingChange);
        setLastSolveFrozen(data.frozen === true);
      }
      /* Re-read the run AFTER the write, whether or not the response parsed:
         the attempt row is what advances it, and progress is a count over that
         log rather than anything this page increments. */
      liveRef.current.onResultRecorded?.();
    } catch {
      /* Offline keeps the local record; the attempt is lost rather than the
         page. Deliberately NO local rating estimate here: two writers for one
         number is what made the displayed rating disagree with the server's. */
    }
  }, [puzzleState.puzzle, puzzleState.moveIndex, options.rated]);

  /* The server is the cross-device source of truth. Read once, written never. */
  useEffect(() => {
    userPreferencesService.loadFromServer().then(prefs => {
      if (!prefs) return;
      const serverProgress: PuzzleProgress = {
        totalSolved: prefs.puzzleSolved ?? 0,
        totalFailed: prefs.puzzleFailed ?? 0,
        bestStreak: prefs.puzzleBestStreak ?? 0,
        sessions: prefs.puzzleSessions ?? 0,
        estimatedRating: prefs.puzzleRating ?? 1200,
        lastPlayed: prefs.puzzleLastPlayed ?? '',
      };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serverProgress)); } catch { /* quota */ }
      setProgress(serverProgress);
    }).catch(() => { /* offline keeps the local record */ });
  }, []);

  useEffect(() => {
    /* A puzzle that came back from a reload already over: scored, counted
       and announced in the sitting it happened in. Nothing here fires for it
       again. */
    if (puzzleState.puzzle?.id
      && puzzleState.puzzle.id === options.restoredResolvedFor) return;
    if (puzzleState.status === 'correct' && !puzzleState.hasFailed) {
      setStats(prev => {
        const streak = prev.streak + 1;
        setProgress(p => ({ ...p, bestStreak: Math.max(p.bestStreak, streak) }));
        return { solved: prev.solved + 1, failed: prev.failed, streak };
      });
      /* OUTSIDE the updater: a state updater may run more than once for a single
         update, and this posts to the server and emits an analytics event. */
      void report(true);
    } else if (puzzleState.status === 'failed' && puzzleState.firstFailure) {
      setStats(prev => ({ solved: prev.solved, failed: prev.failed + 1, streak: 0 }));
      void report(false);
    } else if (puzzleState.status === 'solution') {
      setStats(prev => ({ solved: prev.solved, failed: prev.failed + 1, streak: 0 }));
      /*
        FIRED EVEN WHEN THE ATTEMPT WAS ALREADY REPORTED, which is the whole
        point of having it (Codex, 2026-08-16 - the new page had stopped emitting
        it). `reportPuzzleResult` returns early once a puzzle is reported and the
        FIRST WRONG MOVE reports it, so *try, fail, give up, look* reaches the
        server as a plain failure. Every reveal rate read from `puzzle_attempts`
        is therefore a FLOOR rather than a count, and this event is the only
        thing that can see the commonest reveal of all.

        Not a second attempt row, deliberately: the attempt is already logged and
        scored, and another row would double-count the position in coverage and
        in weak-area ranking.
      */
      logGA4Event({
        name: 'puzzle_solution_revealed',
        params: {
          after_failure: puzzleState.hasFailed,
          puzzle_rating: puzzleState.puzzle?.rating ?? 0,
        },
      });
      /* Revealed: attempted and not solved, and unrated. No rating is lost for
         asking to be shown, and none is gained. */
      void report(false, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleState.status, puzzleState.hasFailed, puzzleState.firstFailure]);

  /*
    THE BEST STREAK IS PERSISTED WHEN IT RISES — the same repair as the current
    page, for the same reason: it is the one number with no server-side writer,
    and the owner's own record read `Solved 16 / Streak 0`.
  */
  const persistedStreakRef = useRef(-1);
  useEffect(() => {
    if (progress.bestStreak <= persistedStreakRef.current) return;
    persistedStreakRef.current = progress.bestStreak;
    userPreferencesService.save({ puzzleBestStreak: progress.bestStreak });
  }, [progress.bestStreak]);

  return {
    stats,
    progress,
    ratingDelta,
    lastSolveFrozen,
    /** The pinned band is far enough from the rating that attempts are frozen. */
    bandIsFarFromRating: isBandFarFromRating(options.ratingBand, progress.estimatedRating),
    /** The puzzle whose attempt is already scored — what `resume` must carry. */
    /*
      A RESTORED SCORED ATTEMPT COUNTS AS RECORDED, or the next save writes
      `attemptRecorded: false` and the reload after THIS one reports it again -
      the same defect one visit later. Derived rather than stored, so there is
      one answer to "has this puzzle been scored" whichever way it got that way.
    */
    attemptRecordedFor: attemptRecordedFor ?? restored,
  };
}
