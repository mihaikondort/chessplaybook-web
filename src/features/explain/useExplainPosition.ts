/**
 * useExplainPosition — runs the existing /api/explain-position/v4 flow
 * for a single FEN. Lifted from GameAnalysisWrapper.handleExplainPosition
 * with the game-report-classification branch removed (the /explain page
 * doesn't have last-move context).
 *
 * Flow per `explain` call:
 *   1. Client-side ref cache hit → return immediately.
 *   2. Server cache-check (GET) → render cached structured response.
 *   3. Cache miss → ensure browser SF is enabled, run getCommentarySearchData,
 *      POST to v4 with the search payload, render structured response.
 *
 * The hook deliberately does NOT manage analysis-panel preference revert
 * (the wrapper does, because the panel exists there). On /explain, the
 * panel doesn't exist; we just leave SF enabled after the first uncached
 * request — the engine sits idle without harm.
 */

import { useCallback, useRef, useState } from 'react';
import { backendAPIClient } from '@/services/BackendAPIClient';
import { analysisService } from '@/services/AnalysisService';
import type { StructuredExplanation } from '@/types/positionExplanation';

export interface PositionExplanation {
  action?: string;
  structured?: StructuredExplanation;
}

/**
 * What an `explain` call actually did. Returned rather than inferred from the
 * hook's `explanation`/`error` state, because a caller cannot tell from state
 * alone whether *its own* call succeeded — a rapid second call replaces the
 * state, and a cache hit sets it without any observable transition.
 *
 * `cached` is true for both the in-memory/preseed hit and the server cache hit:
 * from the visitor's point of view both are instant and neither ran an engine.
 */
export type ExplainOutcome =
  | { ok: true; cached: boolean }
  | { ok: false; reason: 'no_fen' | 'analysis_not_ready' | 'empty_response' | 'request_failed' };

export interface UseExplainPositionResult {
  explanation: PositionExplanation | null;
  loading: boolean;
  error: string | null;
  /**
   * Live search depth reached by the browser engine on an uncached
   * (cache-miss) request. 0 while the cache-check is in flight or the
   * search hasn't reported a depth yet; drives the loading-state UX.
   * Stays 0 for cache hits (no local search runs).
   */
  depth: number;
  /**
   * Trigger an explain for `fen`. Idempotent within the session. Resolves with
   * the outcome so callers can instrument delivery rather than intent.
   */
  explain: (fen: string) => Promise<ExplainOutcome>;
  /** Reset the displayed result without clearing the cache. */
  reset: () => void;
}

export function useExplainPosition(
  /**
   * Optional FEN → explanation map to seed the in-memory cache. Used by
   * /explain to inject the statically-baked demo explanations so selecting
   * a curated position renders instantly (<100ms) — the seeded entry is
   * returned by step 1 of `explain`, skipping both the server cache-check
   * and any browser search.
   */
  preseed?: Record<string, PositionExplanation>,
): UseExplainPositionResult {
  const [explanation, setExplanation] = useState<PositionExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  // Seed once from `preseed`; the ref initializer runs only on first render.
  const cache = useRef<Map<string, PositionExplanation>>(
    new Map(preseed ? Object.entries(preseed) : []),
  );

  const explain = useCallback(async (fen: string): Promise<ExplainOutcome> => {
    if (!fen) return { ok: false, reason: 'no_fen' };

    // 1. In-memory cache (per page session).
    const cached = cache.current.get(fen);
    if (cached) {
      setExplanation(cached);
      setError(null);
      return { ok: true, cached: true };
    }

    setLoading(true);
    setError(null);
    setDepth(0);

    try {
      let response: Record<string, unknown>;

      // 2. Server cache-check first — sub-100ms when warm.
      let cachedFromServer: Record<string, unknown> | null = null;
      try {
        const cacheCheckUrl =
          `/api/explain-position/v4/cache-check` +
          `?fen=${encodeURIComponent(fen)}` +
          `&lastMoveClassification=`;
        const r = await backendAPIClient.get<{
          cached: boolean;
          result?: Record<string, unknown>;
        }>(cacheCheckUrl);
        if (r.cached && r.result) cachedFromServer = r.result;
      } catch (cacheErr) {
        console.warn('[useExplainPosition] cache-check failed, falling back:', cacheErr);
      }

      if (cachedFromServer) {
        response = cachedFromServer;
      } else {
        // 3. Cache miss — run the browser SF + POST path.
        if (!analysisService.isAnalysisEnabled()) {
          analysisService.setEnabled(true);
        }
        const searchData = await analysisService.getCommentarySearchData(fen, setDepth);
        if (!searchData) {
          throw new Error('ANALYSIS_NOT_READY');
        }
        const body: Record<string, unknown> = {
          fen,
          searchOutput: searchData.searchOutput,
          pvScores: searchData.pvScores,
          searchedEval: searchData.searchedEval,
          isMate: searchData.isMate,
          mateIn: searchData.mateIn,
          nullMoveSearchOutput: searchData.nullMoveSearchOutput,
        };
        response = await backendAPIClient.post(
          '/api/explain-position/v4',
          body,
        ) as unknown as Record<string, unknown>;
      }

      if (response.success && response.structured) {
        const exp: PositionExplanation = {
          action: response.action as string | undefined,
          structured: response.structured as StructuredExplanation | undefined,
        };
        cache.current.set(fen, exp);
        setExplanation(exp);
        return { ok: true, cached: !!cachedFromServer };
      } else {
        const shape = `success=${response.success} action=${!!response.action} structured=${!!response.structured}`;
        console.error('[useExplainPosition] v4 returned 2xx with empty content:', shape, response);
        setError('The engine returned an incomplete response. Please try again.');
        return { ok: false, reason: 'empty_response' };
      }
    } catch (err) {
      const e = err as Error;
      if (e.message === 'ANALYSIS_NOT_READY') {
        setError('The chess engine isn\'t ready yet. Please try again in a moment.');
        return { ok: false, reason: 'analysis_not_ready' };
      }
      console.error('[useExplainPosition] failed:', e);
      setError(e.message || 'Failed to explain position. Please try again.');
      return { ok: false, reason: 'request_failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setExplanation(null);
    setError(null);
    setDepth(0);
  }, []);

  return { explanation, loading, error, depth, explain, reset };
}
