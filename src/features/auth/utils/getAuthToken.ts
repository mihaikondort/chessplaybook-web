import { fetchAuthSession } from 'aws-amplify/auth';
import { getAnonymousId } from '@/hooks/useAnonymousId';
import { hasStoredSession } from './oauth';
import { logGA4Event } from '@/services/analytics';

/**
 * Returns the Cognito ID token string for use in Authorization headers,
 * or null if the user is not authenticated.
 *
 * Always use the ID token (not access token) so the backend gets
 * email + preferred_username claims for auto-provisioning.
 *
 * ONE FORCED RETRY WHEN A SESSION IS BELIEVED PRESENT (2026-08-12). A bare
 * `fetchAuthSession()` returns whatever is cached; if that read fails while
 * `LastAuthUser` is still in localStorage, the tokens may simply be stale
 * rather than gone. Asking once with `forceRefresh` is the difference between
 * recovering the session and filing the player's work under a guest.
 *
 * The retry is deliberately NOT attempted when no session is believed present:
 * a genuine guest would pay a pointless network round trip on every request.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString() ?? null;
    if (token) return token;
    if (!hasStoredSession()) return null;
  } catch {
    if (!hasStoredSession()) return null;
  }

  // We believe there is a session and could not produce a token from cache.
  try {
    const refreshed = await fetchAuthSession({ forceRefresh: true });
    const token = refreshed.tokens?.idToken?.toString() ?? null;
    logGA4Event({ name: 'auth_token_unavailable', params: { recovered: !!token } });
    return token;
  } catch {
    logGA4Event({ name: 'auth_token_unavailable', params: { recovered: false } });
    return null;
  }
}

/** Convenience wrapper that builds the Authorization header value. */
export async function getAuthHeader(): Promise<{ Authorization: string } | Record<string, never>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Build request headers for API calls.
 * Authenticated users get Authorization header.
 * Anonymous users get X-Anonymous-Id header.
 *
 * A SIGNED-IN PLAYER'S WORK IS NEVER FILED UNDER A GUEST (2026-08-12).
 *
 * Both headers used to be sent unconditionally, and the server resolves the
 * bearer token when it is there and the anonymous id when it is not — which is
 * correct server-side and catastrophic here. The moment a token could not be
 * produced, the request still carried a guest identity and the backend
 * dutifully filed the result under it. Measured on production: an account
 * authenticated at 21:08 on 2026-08-04, then solved 22 puzzles between 21:10
 * and 21:40 that all landed on its guest id, leaving it off the leaderboard
 * with `games_played` 0 and an established rating it could not corroborate.
 *
 * So when this browser believes it holds a session and cannot produce a token,
 * NEITHER header is sent. The request then fails `requireIdentity` with a 401,
 * which is visible and recoverable, instead of succeeding against the wrong
 * identity, which is silent and permanent.
 *
 * A real guest is unaffected: `hasStoredSession()` is false, so they get their
 * anonymous id exactly as before.
 */
export async function getRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // The anonymous id still rides along so the server can claim a guest
    // record at sign-in. The bearer token wins on the server, so this cannot
    // misattribute anything while the token is present.
    headers['X-Anonymous-Id'] = getAnonymousId();
    return headers;
  }

  if (hasStoredSession()) {
    // Believed signed in, no token. Send nothing rather than a guest identity.
    return headers;
  }

  headers['X-Anonymous-Id'] = getAnonymousId();
  return headers;
}
