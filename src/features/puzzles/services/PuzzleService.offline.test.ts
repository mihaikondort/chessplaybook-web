/**
 * THE OFFLINE FALLBACK MUST BE DISTINGUISHABLE FROM THE PRODUCT WORKING
 * (2026-08-22).
 *
 * When the API cannot be reached the trainer serves five hardcoded puzzles,
 * shuffled. Nothing said so and nothing was scored, so a dev backend that was
 * running but had never bound its port produced a whole session of the same
 * puzzles repeating, reported as production being broken. The absence of
 * `tryId` already meant "not scored"; nobody could see that either.
 *
 * What is under test is the discriminator: a puzzle the SERVER chose must never
 * carry the flag, and a fallback puzzle must always carry it. A flag that is set
 * on everything, or on nothing, would pass a weaker test than this and fix
 * neither half.
 *
 * MODULE STATE IS RESET PER TEST, DELIBERATELY. `apiAvailable` is a
 * module-level latch that never returns to `null` once it has been set, so a
 * test importing the module after an earlier test had reached the API would
 * skip the gate entirely and measure the wrong path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const okStats = { ok: true, json: async () => ({ success: true, data: {} }) } as Response;

function stubFetch(handler: (url: string) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => handler(String(url))));
}

/** A fresh copy of the module, so the `apiAvailable` latch starts untested. */
async function freshService() {
  vi.resetModules();
  return import('./PuzzleService');
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('the offline fallback says it is the offline fallback', () => {
  it('marks every fallback puzzle when the gate itself cannot be reached', async () => {
    stubFetch(async () => { throw new Error('ECONNREFUSED'); });
    const svc = await freshService();

    const puzzles = await svc.fetchPuzzles({ count: 3 });

    expect(puzzles.length).toBeGreaterThan(0);
    // EVERY one, not "at least one" — a partially flagged list is what would
    // let an unmarked puzzle be reported as a real attempt.
    expect(puzzles.every(p => p.offline === true)).toBe(true);
    // The flag has to survive next to the absence of a tryId, which is the
    // property the report gates used to have to infer it from.
    expect(puzzles.every(p => p.tryId === undefined)).toBe(true);
  });

  it('reports the API as unreachable, which is what the card renders', async () => {
    stubFetch(async () => { throw new Error('ECONNREFUSED'); });
    const svc = await freshService();

    // Untested until something asks, so `null` and `false` are different
    // answers: one has not looked, the other has looked and failed.
    expect(svc.isApiReachable()).toBeNull();
    await svc.fetchPuzzles({ count: 1 });
    expect(svc.isApiReachable()).toBe(false);
  });

  it('never marks a puzzle the server chose', async () => {
    const real = [{
      id: 'x', tryId: 't-1', fen: 'f', moves: ['e2e4'], rating: 1500,
      themes: ['fork'], openingTags: [], nbPlays: 1, popularity: 1,
    }];
    stubFetch(async url => (url.includes('/stats')
      ? okStats
      : ({ ok: true, json: async () => ({ success: true, data: real }) } as Response)));
    const svc = await freshService();

    const puzzles = await svc.fetchPuzzles({ count: 1 });

    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].offline).toBeUndefined();
    expect(svc.isApiReachable()).toBe(true);
  });

  it('marks the daily puzzle when it falls back too', async () => {
    stubFetch(async () => { throw new Error('ECONNREFUSED'); });
    const svc = await freshService();

    const daily = await svc.fetchDailyPuzzle();

    expect(daily).not.toBeNull();
    expect(daily?.offline).toBe(true);
  });

  it('hands out a COPY, so a consumer cannot poison the shared list', async () => {
    stubFetch(async () => { throw new Error('ECONNREFUSED'); });
    const svc = await freshService();

    // The list is module-level and every fallback draw reads it again. A
    // consumer writing to a puzzle it was handed would otherwise corrupt every
    // later draw in the same session.
    const first = await svc.fetchPuzzles({ count: 5 });
    first[0].rating = -1;
    first[0].moves.length = 0;

    const second = await svc.fetchPuzzles({ count: 5 });
    expect(second.every(p => p.rating > 0)).toBe(true);
    expect(second.every(p => p.moves.length > 0)).toBe(true);
  });
});
