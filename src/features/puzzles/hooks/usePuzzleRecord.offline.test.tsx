/**
 * AN OFFLINE FALLBACK PUZZLE IS NOT AN ATTEMPT (2026-08-22).
 *
 * When the API cannot be reached the trainer serves five hardcoded puzzles. Up
 * to this fix, solving or missing one of them still ran the whole reporting
 * sequence: a `puzzle_result_recorded` GA4 event, a POST to
 * `/api/puzzles/result`, and the page claiming the attempt was scored.
 *
 * MEASURED ON A REAL PAGE BEFORE IT WAS FIXED: with the API dead, one wrong
 * move on the hardcoded daily posted BOTH `/api/puzzles/try` and
 * `/api/puzzles/result`.
 *
 * That is worse than untidy. The fallback also engages when a single slow
 * `stats` probe latched `apiAvailable` false while the API was healthy the
 * whole time - and then those POSTs SUCCEED, writing a real attempt row and
 * moving a real rating for a puzzle the server never chose.
 *
 * The discriminator is the point of these tests: an ordinary puzzle must still
 * report exactly as before. A gate that silenced everything would pass half of
 * this file and break the product.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const postPuzzleResult = vi.fn(
  async (_headers: unknown, _body: unknown) => ({ ok: true as const, data: null }),
);
const logGA4Event = vi.fn((_event: { name?: string }) => {});

vi.mock('../services/postPuzzleResult', () => ({
  postPuzzleResult: (headers: unknown, body: unknown) => postPuzzleResult(headers, body),
}));
vi.mock('@/services/analytics', () => ({
  logGA4Event: (event: { name?: string }) => logGA4Event(event),
}));
vi.mock('@/features/auth/utils/getAuthToken', () => ({ getRequestHeaders: async () => ({}) }));
vi.mock('@/services/UserPreferencesService', () => ({
  userPreferencesService: {
    loadFromServer: async () => null,
    save: async () => {},
    saveProgress: async () => {},
  },
}));

const { usePuzzleRecord } = await import('./usePuzzleRecord');

const SERVER_PUZZLE = {
  id: 'server-1', rating: 1500, moves: ['e2e4', 'e7e5'], tryId: 'try-1',
};
/* The rating and move count are identical on purpose: `offline` is the ONLY
   difference between the two cases, so nothing else can explain the result. */
const OFFLINE_PUZZLE = { ...SERVER_PUZZLE, id: '4Osgg', tryId: undefined, offline: true as const };

function renderFor(puzzle: Record<string, unknown>) {
  return renderHook(() => usePuzzleRecord(
    {
      /* `failed` + `firstFailure` is the branch a wrong move takes, and it is
         the one that reports - a miss settles the attempt (B1). */
      status: 'failed', hasFailed: true, firstFailure: true, moveIndex: 1,
      puzzle: puzzle as never,
    },
    { rated: true },
  ));
}

beforeEach(() => { postPuzzleResult.mockClear(); logGA4Event.mockClear(); localStorage.clear(); });
afterEach(() => vi.clearAllMocks());

describe('an offline puzzle is never reported', () => {
  it('posts no result for an offline puzzle', async () => {
    renderFor(OFFLINE_PUZZLE);
    // Give the effect and its async body every chance to run before concluding
    // that nothing happened; asserting an absence immediately would pass even
    // if the call were merely one microtask away.
    await new Promise(r => setTimeout(r, 50));
    expect(postPuzzleResult).not.toHaveBeenCalled();
  });

  it('emits no puzzle_result_recorded for an offline puzzle', async () => {
    renderFor(OFFLINE_PUZZLE);
    await new Promise(r => setTimeout(r, 50));
    const results = logGA4Event.mock.calls
      .filter(([e]) => e?.name === 'puzzle_result_recorded');
    // Five hardcoded puzzles nobody was served would corrupt exactly the reading
    // this event exists for: honest failures against abandonment.
    expect(results).toHaveLength(0);
  });

  it('never claims the attempt was scored', async () => {
    const { result } = renderFor(OFFLINE_PUZZLE);
    await new Promise(r => setTimeout(r, 50));
    // `attemptRecordedFor` is what makes the page say "already scored". Saying
    // it here is the same untrue claim the silent fallback already made.
    expect(result.current.attemptRecordedFor).toBeNull();
  });

  it('STILL reports an ordinary server puzzle, which is the discriminator', async () => {
    const { result } = renderFor(SERVER_PUZZLE);
    await waitFor(() => expect(postPuzzleResult).toHaveBeenCalledTimes(1));
    const body = postPuzzleResult.mock.calls[0][1] as { puzzleId: string; tryId?: string };
    expect(body.puzzleId).toBe('server-1');
    expect(body.tryId).toBe('try-1');
    expect(result.current.attemptRecordedFor).toBe('server-1');
  });
});
