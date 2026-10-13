/**
 * D3 — the client half of a bounded run.
 *
 * The load-bearing assertions are about what this hook REFUSES to do:
 *
 *  - it never increments progress locally (the attempt log owns the count, and
 *    a second place that adds one is a second place it can be wrong);
 *  - it asks the server what is active on mount rather than reading local
 *    state, which is the entire reason sessions are server-side;
 *  - a failed lookup is silent, because almost nobody has a run and an error
 *    about a feature they never used is worse than no answer;
 *  - a 409 is adopted, not surfaced — the server hands back the run that is in
 *    the way, and showing an error about a session the player cannot see is the
 *    dead end C9 spent a day removing from the filter drawer.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePuzzleSession } from './usePuzzleSession';
import * as api from '../services/PuzzleSessionApi';
import * as analytics from '@/services/analytics';
import { SessionApiError, type PuzzleSession } from '../services/PuzzleSessionApi';

function makeSession(over: Partial<PuzzleSession> = {}): PuzzleSession {
  return {
    id: 'sess-1',
    identityId: 'anon-1',
    total: 10,
    selection: 'adaptive',
    area: null,
    rated: true,
    status: 'active',
    createdAt: '2026-08-05 10:00:00',
    endedAt: null,
    progress: {
      completed: 0, solved: 0, failed: 0, ratedAttempts: 0,
      averageSolveMs: null, expectedScore: null, realizedScore: null, scoredAttempts: 0, performanceRating: null, finished: false,
    },
    ...over,
  };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('usePuzzleSession', () => {
  test('asks the server what is active on mount — the reload path', async () => {
    const active = makeSession({ progress: { ...makeSession().progress, completed: 3 } });
    const spy = vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(active);

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.current.session?.id).toBe('sess-1');
    expect(result.current.session?.progress.completed).toBe(3);
  });

  test('a failed lookup is silent, and leaves no run', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();
    // Almost everyone has no run. An error here would be an error about a
    // feature they never asked for.
    expect(result.current.error).toBeNull();
  });

  test('a 409 adopts the run that is in the way instead of erroring', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    const inTheWay = makeSession({ id: 'already-running', total: 20 });
    vi.spyOn(api, 'startSession').mockRejectedValue(
      new SessionApiError('A session is already active', 409, inTheWay),
    );

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start({ total: 10 }); });

    expect(result.current.session?.id).toBe('already-running');
    expect(result.current.error).toBeNull();
  });

  test('a real start failure surfaces, because the player asked for it', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    vi.spyOn(api, 'startSession').mockRejectedValue(new SessionApiError('nope', 500));

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start({ total: 10 }); });

    expect(result.current.session).toBeNull();
    expect(result.current.error).toBe('nope');
  });

  test('progress is re-read from the server, never incremented locally', async () => {
    const zero = makeSession();
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(zero);
    const fetchOne = vi.spyOn(api, 'fetchSession').mockResolvedValue(
      makeSession({ progress: { ...zero.progress, completed: 1, solved: 1 } }),
    );

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });

    expect(fetchOne).toHaveBeenCalledWith('sess-1');
    expect(result.current.session?.progress.completed).toBe(1);
  });

  test('a refresh that fails leaves the run alone rather than interrupting solving', async () => {
    const three = makeSession({ progress: { ...makeSession().progress, completed: 3 } });
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(three);
    vi.spyOn(api, 'fetchSession').mockRejectedValue(new Error('flaky'));

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });

    expect(result.current.session?.progress.completed).toBe(3);
    expect(result.current.error).toBeNull();
  });

  test('a refresh that lands after the run was dismissed does not resurrect it', async () => {
    const active = makeSession();
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(active);
    vi.spyOn(api, 'fetchSession').mockResolvedValue(
      makeSession({ progress: { ...active.progress, completed: 4 } }),
    );

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const pending = result.current.refresh();
      result.current.dismiss();
      await pending;
    });

    expect(result.current.session).toBeNull();
  });

  test('ending a run abandons it — never marks it completed', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(makeSession());
    const spy = vi.spyOn(api, 'endSession').mockResolvedValue(
      makeSession({ status: 'abandoned', endedAt: '2026-08-05 10:05:00' }),
    );

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.end(); });

    // 'completed' is the server's word, set when the last attempt lands. A
    // client claiming it would let a player finish a run by pressing stop.
    expect(spy).toHaveBeenCalledWith('sess-1', 'abandoned');
    expect(result.current.session?.status).toBe('abandoned');
  });

  /*
    E8a — the three session events. Phase D built the run and measured none of
    it, so "do runs get finished" (§9's headline count) had nothing behind it.

    What these actually defend is the DENOMINATOR. Every mistake available here
    inflates one side of that ratio: counting an adopted run as a start,
    counting a reload as a start, or emitting `completed` twice for the run it
    happened to.
  */
  test('starting a run reports it once, with the axes it was started with', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    vi.spyOn(api, 'startSession').mockResolvedValue(
      makeSession({ selection: 'weak_areas', area: 'endgame', total: 8, rated: false }),
    );
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start({ total: 8 }); });

    expect(ga).toHaveBeenCalledTimes(1);
    expect(ga).toHaveBeenCalledWith({
      name: 'puzzle_session_started',
      params: { selection: 'weak_areas', area: 'endgame', total: 8, rated: false },
    });
  });

  test('a run with no scope reports area "all", not an absent parameter', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    vi.spyOn(api, 'startSession').mockResolvedValue(makeSession({ area: null }));
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start({ total: 10 }); });

    // An unset GA4 parameter and a whole-corpus run read identically in a
    // report, and only one of them is a fact about the player.
    expect(ga.mock.calls[0][0].params).toMatchObject({ area: 'all' });
  });

  test('ADOPTING a run after a 409 is not a start, and is not reported', async () => {
    const existing = makeSession({ id: 'sess-existing' });
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    vi.spyOn(api, 'startSession').mockRejectedValue(
      new SessionApiError('A session is already active', 409, existing),
    );
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.start({ total: 10 }); });

    // The run existed already. Counting it would put every double-press and
    // every reload into the denominator of "how many runs get finished".
    expect(result.current.session?.id).toBe('sess-existing');
    expect(ga).not.toHaveBeenCalled();
  });

  test('finding a run on mount is not a start either', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(makeSession());
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(ga).not.toHaveBeenCalled();
  });

  test('completion is reported when the SERVER says so, once, with a duration', async () => {
    const active = makeSession({ total: 2 });
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(active);
    vi.spyOn(api, 'fetchSession').mockResolvedValue(makeSession({
      total: 2,
      status: 'completed',
      endedAt: '2026-08-05 10:02:30',
      progress: { ...active.progress, completed: 2, solved: 1, finished: true },
    }));
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Two refreshes: the run only completes once, however often it is re-read.
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.refresh(); });

    const completions = ga.mock.calls.filter(c => c[0].name === 'puzzle_session_completed');
    expect(completions).toHaveLength(1);
    expect(completions[0][0].params).toMatchObject({
      total: 2, solved: 1, rated: true, area: 'all',
      // 10:00:00 → 10:02:30, from the server's OWN timestamps. A clock started
      // when this hook mounted would measure the tab, not the run — which is
      // the whole reason sessions are server-side.
      ms_duration: 150_000,
    });
  });

  test('an active run reports nothing on refresh', async () => {
    const active = makeSession({ total: 5 });
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(active);
    vi.spyOn(api, 'fetchSession').mockResolvedValue(
      makeSession({ total: 5, progress: { ...active.progress, completed: 3 } }),
    );
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });

    expect(ga).not.toHaveBeenCalled();
  });

  test('abandoning reports HOW FAR they got, which is the whole value of it', async () => {
    const active = makeSession({ total: 20 });
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(active);
    vi.spyOn(api, 'endSession').mockResolvedValue(makeSession({
      total: 20,
      status: 'abandoned',
      endedAt: '2026-08-05 10:01:00',
      progress: { ...active.progress, completed: 2, solved: 2 },
    }));
    const ga = vi.spyOn(analytics, 'logGA4Event').mockImplementation(() => {});

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.end(); });
    // Pressed twice on a slow connection.
    await act(async () => { await result.current.end(); });

    const abandons = ga.mock.calls.filter(c => c[0].name === 'puzzle_session_abandoned');
    expect(abandons).toHaveLength(1);
    // "Runs get abandoned" is not actionable. "Abandoned at 2 of 20" says the
    // length is wrong.
    expect(abandons[0][0].params).toMatchObject({ total: 20, completed: 2, solved: 2 });
  });

  test('refresh is a no-op when there is no run', async () => {
    vi.spyOn(api, 'fetchActiveSession').mockResolvedValue(null);
    const spy = vi.spyOn(api, 'fetchSession');

    const { result } = renderHook(() => usePuzzleSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });

    // Free solving calls this after every attempt via the same binding.
    expect(spy).not.toHaveBeenCalled();
  });
});
