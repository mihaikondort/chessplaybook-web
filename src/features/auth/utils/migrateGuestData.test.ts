/**
 * The client must never state a rating or a solve count (2026-08-09).
 *
 * WHAT HAPPENED. This migration PUT `puzzleRating`, `puzzleSolved` and
 * `puzzleFailed` from localStorage, keeping the server's values only when they
 * were HIGHER. On a device with empty local storage — a first sign-in on a new
 * phone, or a sign-up moments after solving as a guest — local zeros never lose
 * that comparison. It raced the server-side anonymous link, which was writing
 * the guest's real record onto the account at the same moment, and won because
 * the save is debounced by a second.
 *
 * A real player finished with `puzzle_solved: 0` at 1200 next to a deviation of
 * 76.9 — the deviation surviving only because the client does not know that
 * field. These assert the shape of the request, not the merge arithmetic,
 * because the fix is that the fields are ABSENT rather than better-compared.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const save = vi.fn();
const loadFromServer = vi.fn();

vi.mock('@/services/UserPreferencesService', () => ({
  userPreferencesService: {
    save: (...args: unknown[]) => save(...args),
    loadFromServer: () => loadFromServer(),
  },
}));

import { migrateGuestData } from './migrateGuestData';

const LOCAL_PROGRESS = {
  estimatedRating: 1200, totalSolved: 0, totalFailed: 0, bestStreak: 0,
  sessions: 0, lastPlayed: '2026-08-09',
};

/* What the server holds after the anonymous link has merged the guest record. */
const SERVER_AFTER_LINK = {
  puzzleRating: 1648, puzzleSolved: 52, puzzleFailed: 22,
  puzzleBestStreak: 7, puzzleSessions: 1,
};

beforeEach(() => {
  localStorage.clear();
  save.mockClear();
  loadFromServer.mockReset().mockResolvedValue(SERVER_AFTER_LINK);
});

afterEach(() => { localStorage.clear(); });

describe('migrateGuestData', () => {
  it('never sends a rating, a solve count or a failure count', async () => {
    localStorage.setItem('chessplaybook_puzzle_progress', JSON.stringify(LOCAL_PROGRESS));
    await migrateGuestData('user-1');

    expect(save).toHaveBeenCalledTimes(1);
    const sent = save.mock.calls[0][0];
    expect(sent).not.toHaveProperty('puzzleRating');
    expect(sent).not.toHaveProperty('puzzleSolved');
    expect(sent).not.toHaveProperty('puzzleFailed');
    expect(sent).not.toHaveProperty('puzzleLastPlayed');
  });

  /*
    THE EXACT CASE THAT BROKE, AND THE FIXTURE THAT MATTERS.

    The first version of this test mocked the server as ALREADY LINKED, and the
    old code passed it — correctly, because once the guest record is merged the
    server's values are higher and the comparison keeps them. The defect needs
    the read to land BEFORE the link writes, so the server answers with a fresh,
    empty account row. Then local zeros win every comparison and get written
    over the record the link is about to create.

    A fixture that cannot reproduce the bug is a test that describes nothing.
  */
  it('cannot zero a record when the read beats the link', async () => {
    loadFromServer.mockResolvedValue({});
    localStorage.setItem('chessplaybook_puzzle_progress', JSON.stringify(LOCAL_PROGRESS));
    await migrateGuestData('user-2');

    const sent = save.mock.calls[0][0];
    expect(sent).not.toHaveProperty('puzzleSolved');
    expect(sent).not.toHaveProperty('puzzleFailed');
    expect(sent).not.toHaveProperty('puzzleRating');
  });

  it('still carries the settings this device legitimately owns', async () => {
    localStorage.setItem('chessplaybook_board_theme', 'brown');
    localStorage.setItem('chessPvCount', '3');
    await migrateGuestData('user-3');

    const sent = save.mock.calls[0][0];
    expect(sent.boardTheme).toBe('brown');
    expect(sent.pvCount).toBe(3);
  });

  it('runs once per user per device', async () => {
    localStorage.setItem('chessplaybook_board_theme', 'brown');
    await migrateGuestData('user-4');
    await migrateGuestData('user-4');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
