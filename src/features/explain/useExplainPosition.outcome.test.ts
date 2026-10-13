/**
 * The `ExplainOutcome` contract (D3).
 *
 * Why this is tested at all: the /explain conversion events used to fire on
 * click, so a visitor whose engine never became ready counted as a conversion.
 * The replacement events fire on this outcome instead, which makes the outcome
 * the thing every downstream measurement now rests on — including whether a
 * failure is recorded as a failure rather than silently as a success.
 *
 * Cache-hit shape matters as much as ok/not-ok: `cached: true` and
 * `cached: false` are different visitor experiences (instant vs a real engine
 * round trip) and averaging them hides which one converts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExplainPosition } from './useExplainPosition';

const STRUCTURED = { verdict: 'ok' } as never;
const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OTHER_FEN = '8/8/8/4k3/4K3/8/8/8 w - - 0 1';

vi.mock('@/services/BackendAPIClient', () => ({
  backendAPIClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('@/services/AnalysisService', () => ({
  analysisService: {
    isAnalysisEnabled: vi.fn(() => true),
    setEnabled: vi.fn(),
    getCommentarySearchData: vi.fn(),
  },
}));

import { backendAPIClient } from '@/services/BackendAPIClient';
import { analysisService } from '@/services/AnalysisService';

const get = backendAPIClient.get as unknown as ReturnType<typeof vi.fn>;
const post = backendAPIClient.post as unknown as ReturnType<typeof vi.fn>;
const searchData = analysisService.getCommentarySearchData as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('useExplainPosition outcome', () => {
  it('reports a preseeded (baked demo) hit as cached, with no network call', async () => {
    const { result } = renderHook(() =>
      useExplainPosition({ [FEN]: { structured: STRUCTURED } }),
    );

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: true, cached: true });
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('reports a server cache hit as cached and never starts the engine', async () => {
    get.mockResolvedValue({ cached: true, result: { success: true, structured: STRUCTURED } });
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: true, cached: true });
    expect(searchData).not.toHaveBeenCalled();
  });

  it('reports a cache miss that reaches the engine as NOT cached', async () => {
    get.mockResolvedValue({ cached: false });
    searchData.mockResolvedValue({ searchOutput: 'x', pvScores: [], searchedEval: 0 });
    post.mockResolvedValue({ success: true, structured: STRUCTURED });
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: true, cached: false });
  });

  // The failure this whole change exists to make visible: previously this
  // visitor fired a conversion event on click and we never learned they got
  // nothing.
  it('reports an engine that never became ready as a failure, not a success', async () => {
    get.mockResolvedValue({ cached: false });
    searchData.mockResolvedValue(null);
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: false, reason: 'analysis_not_ready' });
  });

  it('reports a 2xx with empty content as a failure', async () => {
    get.mockResolvedValue({ cached: false });
    searchData.mockResolvedValue({ searchOutput: 'x', pvScores: [], searchedEval: 0 });
    post.mockResolvedValue({ success: true, structured: undefined });
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: false, reason: 'empty_response' });
  });

  it('reports a thrown request as a failure', async () => {
    get.mockResolvedValue({ cached: false });
    searchData.mockResolvedValue({ searchOutput: 'x', pvScores: [], searchedEval: 0 });
    post.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain(FEN);
    });

    expect(outcome).toEqual({ ok: false, reason: 'request_failed' });
  });

  it('reports an empty FEN without touching the network', async () => {
    const { result } = renderHook(() => useExplainPosition());

    let outcome;
    await act(async () => {
      outcome = await result.current.explain('');
    });

    expect(outcome).toEqual({ ok: false, reason: 'no_fen' });
    expect(get).not.toHaveBeenCalled();
  });

  // Underpins `position_index`: the second explain of the SAME position must be
  // distinguishable from exploring a new one, which the caller does by counting
  // distinct FENs. Here we only assert the hook keeps serving both correctly.
  it('serves a repeat of the same position from cache and a new one freshly', async () => {
    get.mockResolvedValue({ cached: true, result: { success: true, structured: STRUCTURED } });
    const { result } = renderHook(() => useExplainPosition());

    await act(async () => {
      await result.current.explain(FEN);
    });
    expect(get).toHaveBeenCalledTimes(1);

    // Repeat — served by the in-memory cache, no second cache-check.
    await act(async () => {
      await result.current.explain(FEN);
    });
    expect(get).toHaveBeenCalledTimes(1);

    // A different position does go out again.
    await act(async () => {
      await result.current.explain(OTHER_FEN);
    });
    expect(get).toHaveBeenCalledTimes(2);
  });
});
