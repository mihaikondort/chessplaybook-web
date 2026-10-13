/**
 * One-time migration of guest localStorage data to the server.
 *
 * Runs once per user per device (guarded by a localStorage flag).
 * Safe to call on every login — the flag prevents duplicate runs.
 *
 * Merge rules:
 *  - Preferences (boardTheme, pvCount, analysisEnabled): local wins
 *  - Best streak and sessions: the higher of local and server, because nothing
 *    server-side maintains them
 *  - Rating, solves and failures: NOT SENT AT ALL. See below.
 *
 * THE CLIENT DOES NOT OWN A RATING (2026-08-09).
 *
 * This used to push `puzzleRating`, `puzzleSolved`, `puzzleFailed` and
 * `puzzleLastPlayed`, keeping the server's value only when it was HIGHER. On a
 * device with empty local storage — a first sign-in on a new phone, or a
 * sign-up straight after solving as a guest — local zeros never lose that
 * comparison, so the PUT wiped the account's real counters.
 *
 * It happened. A player with dozens of guest solves and an established rating
 * ended up recorded as `puzzle_solved: 0` at 1200, beside a low deviation that
 * gave the whole thing away: the deviation survived because the client does not know
 * that field, so it was the one number the overwrite could not reach.
 *
 * `/api/puzzles/result` maintains these atomically, per attempt, on the server.
 * The trainer stopped sending them for exactly this reason ("counter rollbacks
 * from a stale cached value"); this was the same mistake in the one place that
 * was never cleaned up. A comparison cannot fix it — the client simply has no
 * business stating them.
 */
import { BOARD_THEME_STORAGE_KEY } from '@/config/boardThemes';
import { userPreferencesService, type ServerPreferences } from '@/services/UserPreferencesService';

function migrationKey(userId: string) {
  return `cp_migrated_${userId}`;
}

export async function migrateGuestData(userId: string): Promise<void> {
  // Already migrated on this device for this user
  if (localStorage.getItem(migrationKey(userId))) return;

  // Gather all local data
  const local: ServerPreferences = {};

  const boardTheme = localStorage.getItem(BOARD_THEME_STORAGE_KEY);
  if (boardTheme) local.boardTheme = boardTheme;

  const pvCountRaw = localStorage.getItem('chessPvCount');
  if (pvCountRaw) {
    const n = parseInt(pvCountRaw, 10);
    if (n >= 1 && n <= 3) local.pvCount = n;
  }

  const analysisRaw = localStorage.getItem('analysis_config');
  if (analysisRaw) {
    try {
      const cfg = JSON.parse(analysisRaw);
      if (typeof cfg.enabled === 'boolean') local.analysisEnabled = cfg.enabled;
    } catch { /* ignore */ }
  }

  const puzzleRaw = localStorage.getItem('chessplaybook_puzzle_progress');
  if (puzzleRaw) {
    try {
      const p = JSON.parse(puzzleRaw);
      // Only the two the server has no authoritative updater for. Rating,
      // solves, failures and last-played are the server's — see the header.
      local.puzzleBestStreak = p.bestStreak;
      local.puzzleSessions   = p.sessions;
    } catch { /* ignore */ }
  }

  // Nothing to migrate
  const hasLocal = Object.keys(local).length > 0;
  if (!hasLocal) {
    localStorage.setItem(migrationKey(userId), '1');
    return;
  }

  // Fetch current server state to avoid overwriting higher values
  const server = await userPreferencesService.loadFromServer();

  const merged: ServerPreferences = { ...local };

  if (server) {
    // Only the two fields this device is allowed to state, and the server still
    // wins when it knows more. Read AFTER the anonymous link has merged the
    // guest record, which is why AuthContext awaits it first.
    if ((server.puzzleBestStreak ?? 0) > (local.puzzleBestStreak ?? 0)) {
      merged.puzzleBestStreak = server.puzzleBestStreak;
    }
    if ((server.puzzleSessions ?? 0) > (local.puzzleSessions ?? 0)) {
      merged.puzzleSessions = server.puzzleSessions;
    }
  }

  // Upload merged data (debounced fire-and-forget)
  userPreferencesService.save(merged);

  // Mark as migrated so this never runs again on this device for this user
  localStorage.setItem(migrationKey(userId), '1');
}
