/**
 * A filtered request never gets generic puzzles (2026-08-05).
 *
 * Found by Codex review: an empty filtered result fell through to a hardcoded
 * sample list that ignores theme and area, so "Train back-rank mates" could
 * hand the player an unrelated puzzle and say nothing — the same untrue link
 * C9 spent a day removing, arriving through the back door.
 *
 * The distinction under test is between three different answers that used to
 * look identical: the server found nothing, the server is unreachable, and
 * nobody asked for anything in particular.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPuzzles } from './PuzzleService';

const okEmpty = { ok: true, json: async () => ({ success: true, data: [] }) } as Response;
const okStats = { ok: true, json: async () => ({ success: true, data: {} }) } as Response;

function stubFetch(handler: (url: string) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => handler(String(url))));
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('fetchPuzzles with a filter', () => {
  it('returns nothing rather than an unrelated puzzle when the filter matches nothing', async () => {
    stubFetch(async url => (url.includes('/stats') ? okStats : okEmpty));
    const byTheme = await fetchPuzzles({ theme: 'backRankMate', count: 1 });
    expect(byTheme).toEqual([]);
    const byArea = await fetchPuzzles({ area: 'endgame', count: 1 });
    expect(byArea).toEqual([]);
  });

  it('returns nothing rather than a sample when the API is unreachable', async () => {
    // A network failure with a filter in hand is still no reason to serve a
    // puzzle the player did not ask for.
    stubFetch(async url => {
      if (url.includes('/stats')) return okStats;
      throw new Error('offline');
    });
    expect(await fetchPuzzles({ theme: 'fork', count: 1 })).toEqual([]);
  });

  it('an UNFILTERED request still falls back to samples, which is the point of them', async () => {
    stubFetch(async url => {
      if (url.includes('/stats')) return okStats;
      throw new Error('offline');
    });
    const puzzles = await fetchPuzzles({ count: 3 });
    expect(puzzles.length).toBeGreaterThan(0);
  });

  it('a filtered request that DOES match is returned untouched', async () => {
    const real = [{ id: 'x', fen: 'f', moves: ['e2e4'], rating: 1500, themes: ['fork'], openingTags: [], nbPlays: 1, popularity: 1 }];
    stubFetch(async url => (url.includes('/stats')
      ? okStats
      : ({ ok: true, json: async () => ({ success: true, data: real }) } as Response)));
    expect(await fetchPuzzles({ theme: 'fork', count: 1 })).toEqual(real);
  });
});
