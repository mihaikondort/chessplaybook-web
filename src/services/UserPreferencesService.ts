/**
 * UserPreferencesService
 *
 * Syncs user preferences between localStorage (immediate) and the backend
 * (debounced, fire-and-forget). localStorage is always the source of truth
 * for reads — server sync enables cross-device consistency for both
 * authenticated AND anonymous users (the backend resolves identity from
 * either the Authorization header or the X-Anonymous-Id header).
 *
 * 2026-05-05: switched from `getAuthHeader` to `getRequestHeaders` so
 * anonymous users actually hit the server. Previously every anonymous
 * `loadFromServer` returned null and every `save` flushed to nothing,
 * leaving the server's `puzzle_rating` at the 1200 default while the
 * frontend accumulated real ratings in localStorage. The desync became
 * visible the moment `/api/puzzles/result` started succeeding (after
 * migration 011): the server's Glicko ran from its stale 1200 baseline
 * and the response's `newRating` overwrote the local accumulated value.
 *
 * Backend `/api/user/preferences` already handles both identities — see
 * `backend/src/routes/userPreferences.ts`. No backend change needed.
 */
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';
import env from '@/config/env';

const API_URL = env.apiBaseUrl;

export interface ServerPreferences {
  boardTheme?: string;
  pvCount?: number;
  analysisEnabled?: boolean;
  puzzleRating?: number;
  puzzleSolved?: number;
  puzzleFailed?: number;
  puzzleBestStreak?: number;
  puzzleSessions?: number;
  puzzleLastPlayed?: string | null;
}

class UserPreferencesService {
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingData: ServerPreferences = {};
  private inFlight: Promise<ServerPreferences | null> | null = null;

  /**
   * Load preferences from the server.
   * Returns null only if the request fails (network error, 5xx, etc.).
   * Authenticated users are identified by Authorization, anonymous users
   * by X-Anonymous-Id; both are sent on every call.
   */
  async loadFromServer(): Promise<ServerPreferences | null> {
    /*
      ONE REQUEST FOR CALLERS WHO ASK AT THE SAME TIME (B4). On `/puzzles` the
      board theme, the trainer and the puzzle record each ask as the page
      mounts; they now share one GET. Only an IN-FLIGHT request is shared, never
      a finished one, so a caller after a sign-in or a save gets a fresh read.
    */
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.fetchPreferences().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async fetchPreferences(): Promise<ServerPreferences | null> {
    try {
      const headers = await getRequestHeaders();
      const res = await fetch(`${API_URL}/api/user/preferences`, {
        headers: headers as HeadersInit,
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Queue a partial preference update to be sent to the server.
   * Calls are debounced — rapid changes are batched into a single request.
   */
  save(data: Partial<ServerPreferences>): void {
    this.pendingData = { ...this.pendingData, ...data };
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 1000);
  }

  private async flush(): Promise<void> {
    const data = { ...this.pendingData };
    this.pendingData = {};
    try {
      const headers = await getRequestHeaders();
      await fetch(`${API_URL}/api/user/preferences`, {
        method: 'PUT',
        headers: {
          ...(headers as Record<string, string>),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch {
      // Fire and forget — localStorage is the fallback
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
