/**
 * The trainer renders. That is the whole test, and it is here because nothing
 * else in this suite mounts it.
 *
 * Ported from `PuzzleTrainer.smoke.test.tsx` when C6 deleted trainers v1 and v2
 * (2026-10-08). Its reason is unchanged: D7 once read a ref above its own
 * declaration, every unit test passed because none rendered the trainer, and
 * the page died on load. Found by opening the page, which is not a thing that
 * happens on every commit.
 *
 * WHAT IT CATCHES: a crash on mount, a bad hook order, a missing provider, and a
 * crash on the render where the position becomes the solver's (the old test's
 * lesson: a mount-only assertion passes straight through that one).
 *
 * WHAT IT DOES NOT: anything that needs a working board in a browser. Moves,
 * layout and focus mode are the browser guards' (`verify-trainer-c6a`, the
 * Workspace contract), and stay theirs.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { SiteShell } from '@/app/SiteShell';
import TrainerLayoutSkeleton from './TrainerLayoutSkeleton';

const PUZZLE = {
  id: 'smoke1',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  moves: ['e1g1', 'g8f6'],
  rating: 1400,
  themes: ['middlegame', 'fork', 'short'],
  area: 'tactics',
  prompt: 'Find the best move',
};

/** Every endpoint the trainer touches on mount, answered plausibly. */
function stubFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/api/puzzles/next') ? { success: true, data: [PUZZLE], count: 1 }
      : url.includes('/api/puzzles/daily') ? { success: false, error: 'No daily puzzle available' }
        : url.includes('/api/puzzles/sessions/active') ? { success: true, data: null }
          : url.includes('/api/puzzles/selections') ? {
            success: true,
            data: { selections: [{ id: 'adaptive', available: true }], areas: ['tactics'] },
          }
            : url.includes('/api/puzzles/plan-offer') ? { success: true, data: { eligible: false } }
              : { success: true, data: null };
    return new Response(JSON.stringify(body), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  });
}

beforeEach(() => {
  localStorage.setItem('cp_daily_puzzle_seen', new Date().toISOString().split('T')[0]);
  vi.stubGlobal('fetch', stubFetch());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('the trainer mounts', () => {
  test('/puzzles renders, and keeps rendering once the position is the solver\'s', async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(args); });

    render(<HelmetProvider><MemoryRouter><SiteShell><TrainerLayoutSkeleton /></SiteShell></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'New Puzzle' })).toBeInTheDocument());
    await waitFor(
      () => expect(screen.getByRole('button', { name: /Show solution/i })).toBeInTheDocument(),
      { timeout: 4000 },
    );

    // A render error surfaces through console.error before a boundary catches it.
    const fatal = errors.filter(e => /before initialization|is not a function|Cannot read/i.test(String(e)));
    expect(fatal).toEqual([]);
    spy.mockRestore();
  });
});
