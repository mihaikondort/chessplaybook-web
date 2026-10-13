/**
 * The Game report and Explain Position, as state and actions (layout redesign E4b-2,
 * 2026-10-10): taken out of `GameAnalysisWrapper` unchanged. Since E6 every caller is
 * `GameReviewActions` on `GameViewerWorkspace` (the champion viewers and `/analysis`
 * review mode), and it reads the ply from the game model.
 *
 * Report: a server cache check, else browser Stockfish over every position, then
 * `POST /api/game-summary` for the summary and LC0 policy. Explanation: a server cache
 * check, else a browser search and `POST /api/explain-position/v4`.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { backendAPIClient, APIHTTPError } from '@/services/BackendAPIClient';
import { logEvent } from '@/services/analytics';
import { analysisService } from '@/services/AnalysisService';
import { analyzeFullGame, type FullGameAnalysis } from '@/services/GameAnalysisService';
import type { ChessGame } from '@/types/chess';
import type { StructuredExplanation } from '@/types/positionExplanation';

/** Structured position explanation from V2/V3 CommentaryPipeline */
export interface PositionExplanation {
  /** Sectioned output consumed by PositionExplanationCard. Present on
   *  every /explain-position/v4 response from pipeline 2.7.0 onward
   *  (mandatory from 2.8.0 after the flat-prose fields were retired). */
  structured?: StructuredExplanation;
  /** Headline recommendation — kept as a top-level field for callers
   *  that want the ACTION prose without drilling into `structured`. */
  action?: string;
}

/** Game summary returned from POST /api/game-summary */
/** The report's progress: not asked for, running, done. */
export type GameReportButtonState = 'initial' | 'analyzing' | 'ready';

export interface GameSummaryResult {
  summary: string;
  cta: string;
  championLink: { championName: string; championKey: string; url: string } | null;
  criticalMoveIndex: number | null;
}

export interface UseGameReviewOptions {
  /** The position on the board. */
  currentFen: string;
  /** The game's moves, UCI. */
  moves: string[];
  gameResult: 'white' | 'black' | 'draw';
  /** Players, opening and result, for the summary. */
  metadata?: ChessGame;
  /** Plies played to reach the board (0 = the start), from the game model. */
  moveIndex: number;
}

export function useGameReview({
  currentFen, moves, gameResult, metadata, moveIndex,
}: UseGameReviewOptions) {
  // Game identity — used to invalidate cached analysis when game changes
  const gameKey = moves.length > 0 ? moves.slice(0, 5).join(',') + ':' + moves.length : '';

  // Game Analysis state — restore from sessionStorage only if same game
  const [gameAnalysis, setGameAnalysis] = useState<FullGameAnalysis | null>(() => {
    try {
      const storedKey = sessionStorage.getItem('analysis_gameKey');
      if (storedKey === gameKey && gameKey) {
        const stored = sessionStorage.getItem('analysis_gameReport');
        return stored ? JSON.parse(stored) : null;
      }
      return null;
    } catch { return null; }
  });
  const [reportButtonState, setReportButtonState] = useState<GameReportButtonState>(
    () => {
      try {
        const storedKey = sessionStorage.getItem('analysis_gameKey');
        if (storedKey === gameKey && gameKey) {
          return sessionStorage.getItem('analysis_gameReport') ? 'ready' : 'initial';
        }
        return 'initial';
      } catch { return 'initial'; }
    }
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [positionExplanation, setPositionExplanation] = useState<PositionExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  /** `?forceExplain=1` debug bypass. When set, Explain Position:
   *   - skips the useRef client cache,
   *   - skips the GET /v4/cache-check call,
   *   - always runs the 6s browser SF search,
   *   - console.logs the full raw `searchOutput` + `nullMoveSearchOutput`
   *     so the developer can copy them from DevTools,
   *   - sends `forceFresh: true` on the POST body so the backend
   *     bypasses its own cache on read (still writes through).
   *  Purpose: diagnose "what did the engine actually produce?" when a
   *  shared cache entry is in the way. */
  const useForceExplain = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('forceExplain') === '1';
    } catch { return false; }
  }, []);

  const [reportError, setReportError] = useState<string | null>(null);
  const explanationCache = useRef<Map<string, PositionExplanation>>(new Map());
  const policyDataRef = useRef<Array<{ topMoves: Array<{ move: string; policy: number }>; wdl: { win: number; draw: number; loss: number } }> | null>(null);
  const [gameSummary, setGameSummary] = useState<GameSummaryResult | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  // Progress shown inside the "Analyzing..." button during client-side
  // Stockfish batch analysis. `null` when not running.
  const [reportProgress, setReportProgress] = useState<{ current: number; total: number } | null>(null);

  // Persist game analysis to sessionStorage (with game key for invalidation)
  useEffect(() => {
    try {
      if (gameAnalysis) {
        sessionStorage.setItem('analysis_gameReport', JSON.stringify(gameAnalysis));
        sessionStorage.setItem('analysis_gameKey', gameKey);
      } else {
        sessionStorage.removeItem('analysis_gameReport');
        sessionStorage.removeItem('analysis_gameKey');
      }
    } catch { /* storage full — ignore */ }
  }, [gameAnalysis, gameKey]);

  // Clear stale analysis when game changes
  useEffect(() => {
    const storedKey = sessionStorage.getItem('analysis_gameKey');
    if (storedKey && storedKey !== gameKey) {
      setGameAnalysis(null);
      setGameSummary(null);
      setReportButtonState('initial');
      sessionStorage.removeItem('analysis_gameReport');
      sessionStorage.removeItem('analysis_gameKey');
    }
  }, [gameKey]);

  /*
    THE MOVE INDEX: the plies played to reach the board, so 0 is the starting position,
    from the game model (E4b-2). The FEN arithmetic it replaced (E6) read the move
    number off the FEN, which is wrong for a game imported from a `[FEN]` position.
  */
  useEffect(() => {
    if (!currentFen) return;
    const halfMove = moveIndex;
    setCurrentMoveIndex(halfMove);
    // Dismiss overlays when navigating
    setPositionExplanation(null);
    setExplanationError(null);
    if (halfMove !== 0) setShowSummary(false);
  }, [currentFen, moveIndex]);

  // Game Report handler — client-side Stockfish flow.
  //
  // Flow (cache miss):
  //   1. GET /api/game-summary/cache-check → empty
  //   2. analysisService.analyzeFullGameClientSide(moves, onProgress)
  //      runs `go depth 16` on every position in the browser
  //   3. analyzeFullGame(..., null) produces preliminary classification
  //   4. POST /api/game-summary with the whole preliminary payload; the
  //      server runs LC0 + generates the natural-language summary and
  //      caches the full bundle keyed by (moves, result)
  //   5. analyzeFullGame(..., policyData) reruns classification with
  //      brilliant-move detection once policy lands
  //
  // Flow (cache hit):
  //   1. GET /api/game-summary/cache-check → cached bundle
  //   2. analyzeFullGame on cached evals/bestMoves/mateIn + policyData
  //   3. Render summary from the cached bundle
  //   No Stockfish run, no LC0 run — all purely client-side reconstruction.
  const handleGameReport = useCallback(async () => {
    if (moves.length === 0) return;
    setReportButtonState('analyzing');
    setReportError(null);
    setReportProgress(null);

    const resultStr =
      gameResult === 'white' ? '1-0' : gameResult === 'black' ? '0-1' : '1/2-1/2';

    try {
      // ── Step 1: cache pre-flight ──────────────────────────────────────
      // A hit returns everything needed to render without running any
      // engine. Failures are non-fatal — we fall through to the client-
      // side Stockfish path.
      let cached: {
        summary: string;
        cta: string;
        championLink: GameSummaryResult['championLink'];
        criticalMoveIndex: number | null;
        policyData: Array<{
          topMoves: Array<{ move: string; policy: number }>;
          wdl: { win: number; draw: number; loss: number };
        }> | null;
        evals: number[];
        bestMoves: string[];
        mateIn: (number | null)[];
      } | null = null;
      try {
        const cacheCheckUrl =
          `/api/game-summary/cache-check` +
          `?moves=${moves.join(',')}` +
          `&result=${encodeURIComponent(resultStr)}`;
        const cacheResp = await backendAPIClient.get<{
          cached: boolean;
          result?: {
            summary: { text: string; cta: string; championLink: GameSummaryResult['championLink']; criticalMoveIndex: number | null };
            policyData: typeof cached extends null ? never : NonNullable<typeof cached>['policyData'];
            evals: number[];
            bestMoves: string[];
            mateIn: (number | null)[];
          };
        }>(cacheCheckUrl);
        if (cacheResp.cached && cacheResp.result) {
          const r = cacheResp.result;
          cached = {
            summary: r.summary.text,
            cta: r.summary.cta,
            championLink: r.summary.championLink,
            criticalMoveIndex: r.summary.criticalMoveIndex,
            policyData: r.policyData,
            evals: r.evals,
            bestMoves: r.bestMoves,
            mateIn: r.mateIn,
          };
        }
      } catch (cacheErr) {
        console.warn('[GameAnalysisWrapper] game-summary cache-check failed:', cacheErr);
      }

      if (cached) {
        // ── Cache hit: reconstruct the full report client-side ──────────
        policyDataRef.current = cached.policyData;
        const analysis = analyzeFullGame(
          cached.evals,
          cached.bestMoves,
          cached.mateIn,
          moves,
          gameResult,
          cached.policyData,
        );
        setGameAnalysis(analysis);
        setGameSummary({
          summary: cached.summary,
          cta: cached.cta,
          championLink: cached.championLink,
          criticalMoveIndex: cached.criticalMoveIndex,
        });
        setShowSummary(true);
        setReportButtonState('ready');
        return;
      }

      // ── Step 2: client-side Stockfish batch analysis ────────────────
      // Runs `go depth 16` on every position. Progress callback drives
      // the "Analyzing N/M" label on the report button (GameReviewActions).
      const totalPositions = moves.length + 1;
      setReportProgress({ current: 0, total: totalPositions });

      const batch = await analysisService.analyzeFullGameClientSide(
        moves,
        ({ current, total }) => setReportProgress({ current, total }),
      );

      // ── Step 3: preliminary analysis (no policy yet) ─────────────────
      // The server only needs classifiedMoves/accuracy/counts/phases/
      // gameRating for summary generation — brilliance can be layered
      // on top later when policyData arrives.
      const preliminary = analyzeFullGame(
        batch.evals,
        batch.bestMoves,
        batch.mateIn,
        moves,
        gameResult,
        null,
      );

      // ── Step 4: POST /api/game-summary ───────────────────────────────
      // Server runs LC0 + generates summary in parallel, stores the
      // full bundle in the game-report cache.
      const summaryBody: Record<string, unknown> = {
        evalGraph: preliminary.evalGraph,
        classifiedMoves: preliminary.classifiedMoves,
        whiteAccuracy: preliminary.whiteAccuracy,
        blackAccuracy: preliminary.blackAccuracy,
        whiteCounts: preliminary.whiteCounts,
        blackCounts: preliminary.blackCounts,
        phases: preliminary.phases,
        gameRating: preliminary.gameRating,
        white: metadata?.white || 'White',
        black: metadata?.black || 'Black',
        result: resultStr,
        moveCount: Math.floor(moves.length / 2),
        eco: metadata?.eco,
        opening: metadata?.opening,
        moveHistory: moves,
        bestMoves: batch.bestMoves,
        mateIn: batch.mateIn,
      };

      let policyData: Array<{
        topMoves: Array<{ move: string; policy: number }>;
        wdl: { win: number; draw: number; loss: number };
      }> | null = null;
      let summaryPayload: GameSummaryResult | null = null;

      try {
        const summaryResp = (await backendAPIClient.post(
          '/api/game-summary',
          summaryBody,
        )) as unknown as Record<string, unknown>;
        if (summaryResp.success && summaryResp.summary) {
          summaryPayload = {
            summary: summaryResp.summary as string,
            cta: (summaryResp.cta as string) || '',
            championLink: summaryResp.championLink as GameSummaryResult['championLink'],
            criticalMoveIndex: summaryResp.criticalMoveIndex as number | null,
          };
          policyData = (summaryResp.policyData as typeof policyData) ?? null;
        }
      } catch (summaryErr) {
        console.error('[GameAnalysisWrapper] Game summary failed:', summaryErr);
        // Non-fatal — fall through with policyData=null so the report
        // still renders with classifications (just no brilliant tagging).
      }

      // ── Step 5: final analysis with policyData ──────────────────────
      policyDataRef.current = policyData;
      const analysis = analyzeFullGame(
        batch.evals,
        batch.bestMoves,
        batch.mateIn,
        moves,
        gameResult,
        policyData,
      );
      setGameAnalysis(analysis);
      if (summaryPayload) {
        setGameSummary(summaryPayload);
        setShowSummary(true);
      }
      setReportButtonState('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[GameAnalysisWrapper] Game Report failed:', err);
      setReportError(`Error: ${message}`);
      setReportButtonState('initial');
    } finally {
      setReportProgress(null);
    }
  }, [moves, gameResult, metadata]);

  // Explain Position handler
  const handleExplainPosition = useCallback(async () => {
    if (!currentFen) return;
    // `?forceExplain=1` — skip the client-side useRef cache so a fresh
    // analysis always runs (debug tool for diagnosing "what did the
    // engine actually produce?"). The server-side cache-check is also
    // skipped further down.
    if (useForceExplain) {
      explanationCache.current.delete(currentFen);
      console.info('[forceExplain] skipping client cache for', currentFen);
    }
    const cached = explanationCache.current.get(currentFen);
    // If the sectioned UI flag is ON but the cached entry predates the
    // 2.7.0-route-fix roll-out (commit 8ef0528) and therefore lacks
    // `structured`, evict it so the next call hits the network and
    // gets a fresh response that includes the structured field.
    if (cached && !cached.structured) {
      // Legacy cached entry from before the sectioned-UI rollout; evict
      // so the next call hits the network and gets a structured response.
      explanationCache.current.delete(currentFen);
    } else if (cached) {
      setPositionExplanation(cached);
      setExplanationError(null);
      return;
    }
    setExplanationLoading(true);
    setExplanationError(null);

    // Track whether we auto-enabled analysis in this call so we can revert
    // it in the finally block. If the user had analysis enabled already,
    // didAutoEnable stays false and we leave it alone.
    const analysisWasEnabled = analysisService.isAnalysisEnabled();
    let didAutoEnable = false;

    try {
      // v4-only flow (as of 2026-04-11): the old v1 fallback is gone.
      // Commentary always comes from either the server-side cache or
      // a fresh v4 run (browser Stockfish → POST /explain-position/v4).
      let response: Record<string, unknown>;

      // R4: Look up last-move classification from game report (if available).
      // Needs to happen BEFORE the cache-check because classification is
      // part of the cache key — see POSITION_EXPLAINER_CACHE_VERSIONING.md
      // Q5 ("re-compute if classification different").
      const lastMoveClass = currentMoveIndex > 0 && gameAnalysis
        ? gameAnalysis.classifiedMoves.find(m => m.moveIndex === currentMoveIndex - 1)
        : null;
      const classificationParam = lastMoveClass?.classification ?? '';

      // Pre-flight: check the server-side cache BEFORE running Stockfish.
      // If a current-version cached explanation exists for
      // (fen, classification), skip Stockfish entirely and render instantly.
      // Cache-check round-trips in <100ms.
      //
      // Failure is non-fatal: a cache-check error logs a warning and falls
      // through to the fresh-analysis path. The user never sees an error
      // from a broken cache-check.
      let cachedResult: Record<string, unknown> | null = null;
      if (useForceExplain) {
        console.info('[forceExplain] skipping server cache-check; will run fresh SF + POST with forceFresh=true');
      } else {
        try {
          const cacheCheckUrl =
            `/api/explain-position/v4/cache-check` +
            `?fen=${encodeURIComponent(currentFen)}` +
            `&lastMoveClassification=${encodeURIComponent(classificationParam)}`;
          const cacheCheckResponse = await backendAPIClient.get<{
            cached: boolean;
            result?: Record<string, unknown>;
          }>(cacheCheckUrl);
          if (cacheCheckResponse.cached && cacheCheckResponse.result) {
            cachedResult = cacheCheckResponse.result;
          }
        } catch (cacheCheckErr) {
          console.warn(
            '[GameAnalysisWrapper] cache-check failed, falling back to fresh analysis:',
            cacheCheckErr,
          );
        }
      }

      if (cachedResult) {
        // Cache hit — skip Stockfish + POST entirely, render instantly.
        response = cachedResult;
      } else {
        // Cache miss — run fresh analysis through v4.
        //
        // Auto-enable: if the user has the analysis panel disabled, turn
        // it on so the browser Stockfish starts producing data for the
        // current position. The finally block reverts this to preserve
        // the user's panel preference.
        if (!analysisWasEnabled) {
          analysisService.setEnabled(true);
          didAutoEnable = true;
        }

        // getCommentarySearchData delegates to CommentarySearchProtocol
        // (MultiPV=1, Hash=32 MB, movetime=6s main + MultiPV=3 depth=8
        // null-move) via a WorkerTransport over the service's shared
        // Worker. Drains any panel search in flight first. See
        // SEARCH_QUALITY_PLAN.md §3 and
        // src/services/commentarySearch/CommentarySearchProtocol.ts.
        const searchData = await analysisService.getCommentarySearchData(currentFen);

        if (!searchData) {
          // Engine never returned bestmove within movetime + safety
          // slack. Extremely unlikely unless the worker died.
          throw new Error('ANALYSIS_NOT_READY');
        }

        if (useForceExplain) {
          // Dump the raw engine output so the developer can inspect
          // what the parser will see. Keys match the POST body shape.
          // Copy from DevTools console as plain text.
          console.groupCollapsed(
            `[forceExplain] raw searchOutput for ${currentFen.substring(0, 30)}… (${searchData.searchOutput.length} chars, depth=${searchData.meta.finalDepth}, wall=${searchData.meta.wallMs}ms)`,
          );
          console.log('── main search (pv1, MultiPV=1, movetime=6000) ──');
          console.log(searchData.searchOutput);
          console.log('── null-move search (MultiPV=3, depth=8) ──');
          console.log(searchData.nullMoveSearchOutput);
          console.log('── parsed summary ──');
          console.log({
            searchedEval: searchData.searchedEval,
            isMate: searchData.isMate,
            mateIn: searchData.mateIn,
            pvScores: searchData.pvScores,
            meta: searchData.meta,
          });
          console.groupEnd();
        }

        // V4 POST: send browser search data, server only runs eval + pipeline.
        const body: Record<string, unknown> = {
          fen: currentFen,
          searchOutput: searchData.searchOutput,
          pvScores: searchData.pvScores,
          searchedEval: searchData.searchedEval,
          isMate: searchData.isMate,
          mateIn: searchData.mateIn,
          nullMoveSearchOutput: searchData.nullMoveSearchOutput,
        };
        if (useForceExplain) {
          // Bypass the backend cache-read so the pipeline actually re-runs
          // with this fresh searchOutput. The backend still writes through.
          body.forceFresh = true;
        }
        if (moves.length > 0 && currentMoveIndex > 0) {
          body.moveHistory = moves.slice(0, currentMoveIndex);
          body.moveNumber = Math.floor((currentMoveIndex - 1) / 2) + 1;
        }
        if (lastMoveClass) {
          body.lastMoveClassification = lastMoveClass.classification;
          body.lastMoveEvalBefore = lastMoveClass.evalBefore / 100; // cp -> pawn units
          body.lastMoveEvalAfter = lastMoveClass.evalAfter / 100;
          // R14: Send LC0 policy for the last move if available
          const posPolicy = policyDataRef.current?.[currentMoveIndex - 1];
          if (posPolicy) {
            const playedMove = moves[currentMoveIndex - 1];
            const policyEntry = posPolicy.topMoves.find((m: { move: string }) => m.move === playedMove);
            if (policyEntry) body.lastMovePolicy = policyEntry.policy;
          }
        }
        response = await backendAPIClient.post('/api/explain-position/v4', body) as unknown as Record<string, unknown>;
      }

      if (response.success && response.structured) {
        const explanation: PositionExplanation = {
          action: response.action as string | undefined,
          structured: response.structured as StructuredExplanation | undefined,
        };
        explanationCache.current.set(currentFen, explanation);
        setPositionExplanation(explanation);
      } else {
        // Issue #10 (2026-04-19): the backend returned 2xx but the body
        // is missing both prose fields AND the structured section. This
        // shouldn't happen — the pipeline always produces at least an
        // action or assessment — but if it does we surface a specific
        // message instead of the old "Failed to explain position" and
        // log the response shape so we can diagnose in prod via GA4.
        const shape = `success=${response.success} action=${!!response.action} structured=${!!response.structured}`;
        console.error('[GameAnalysisWrapper] v4 returned 2xx with empty content:', shape, response);
        logEvent('explain_position', 'failed', `empty_response:${shape}`);
        setExplanationError('The engine returned an incomplete response. Please try again.');
      }
    } catch (err) {
      // Issue #10 (2026-04-19): error mapping rewritten to use
      // APIHTTPError's status code rather than substring-matching on
      // the message. The old code silently mishandled the 429 case
      // (backend message is "Too many requests. Please try again in N
      // seconds." — contains none of "429" / "rate" / "limit") and
      // every 400 / 500 fell through to the generic "Failed to explain
      // position" toast. Each branch now fires a GA4 event so we can
      // count occurrences in prod without user reports.
      console.error('[GameAnalysisWrapper] Position explanation failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (err instanceof APIHTTPError) {
        logEvent('explain_position', 'failed', `http_${err.status}`);
        if (err.status === 429) {
          setExplanationError('Too many requests — please wait a moment and try again.');
        } else if (err.status === 503) {
          setExplanationError('The chess engine is temporarily unavailable. Please try again.');
        } else if (err.status === 400) {
          // Most common cause: browser Stockfish hadn't produced a
          // `bestmove` line yet when we POSTed the search output.
          // Retrying after the panel warms up almost always works.
          setExplanationError('Analysis data was not ready. Please wait a moment and try again.');
        } else if (err.status >= 500) {
          setExplanationError('Server error while explaining the position. Please try again.');
        } else {
          setExplanationError(err.message || 'Failed to explain position. Please try again.');
        }
      } else if (message === 'ANALYSIS_NOT_READY') {
        logEvent('explain_position', 'failed', 'analysis_not_ready');
        setExplanationError('Analysis engine is still warming up. Please wait a moment and try again.');
      } else {
        // Unknown / network error.
        logEvent('explain_position', 'failed', 'unknown');
        setExplanationError('Failed to explain position. Please try again.');
      }
    } finally {
      // Revert auto-enable to preserve the user's analysis-panel preference.
      // This only fires if we turned the panel on ourselves inside this call.
      if (didAutoEnable) {
        analysisService.setEnabled(false);
      }
      setExplanationLoading(false);
    }
  }, [currentFen, moves, currentMoveIndex, gameAnalysis]);

  return {
    gameAnalysis, reportButtonState, reportProgress, reportError, gameSummary,
    showSummary, setShowSummary, currentMoveIndex, setCurrentMoveIndex,
    positionExplanation, setPositionExplanation, explanationLoading, explanationError,
    setExplanationError, handleGameReport, handleExplainPosition,
  };
}
