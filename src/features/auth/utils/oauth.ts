/**
 * Manual OAuth 2.0 PKCE flow for Cognito Hosted UI (Managed Login).
 * Amplify's signInWithRedirect is incompatible with Cognito Managed Login
 * and causes 400 errors when it tries to revoke stale tokens internally.
 * We implement the full PKCE flow ourselves instead.
 *
 * Based on: https://advancedweb.hu/how-to-secure-the-cognito-login-flow-with-a-state-nonce-and-pkce/
 */

import { BOARD_THEME_STORAGE_KEY, LEGACY_BOARD_THEME_STORAGE_KEY } from '@/config/boardThemes';
import env from '@/config/env';

/* Read from `config/env.ts` since #34. These were duplicated here and in
   `config/amplify.ts`, each with its own fallback - two files that had to be
   edited together to change one value. The localStorage keys below are built
   from the client id, so a drift between the two would have looked like a
   sign-in that succeeded and then could not find its own tokens. */
const COGNITO_DOMAIN = env.cognitoDomain;
const CLIENT_ID = env.cognitoClientId;

async function sha256(str: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
}

async function generateNonce(): Promise<string> {
  const hash = await sha256(crypto.getRandomValues(new Uint32Array(4)).toString());
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Redirect to Cognito's authorize endpoint with Google as identity provider.
 * Generates PKCE code verifier/challenge and state nonce.
 */
export async function redirectToGoogle(): Promise<void> {
  const state = await generateNonce();
  const codeVerifier = await generateNonce();
  sessionStorage.setItem(`cp_pkce_${state}`, codeVerifier);

  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));
  const redirectUri = window.location.origin + '/auth/callback';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    identity_provider: 'Google',
    prompt: 'select_account',
  });

  window.location.href = `https://${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
}

/**
 * Exchange the authorization code for tokens.
 * Called on the callback page after Cognito redirects back.
 */
export async function exchangeCodeForTokens(): Promise<{
  id_token: string;
  access_token: string;
  refresh_token: string;
}> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDesc = params.get('error_description');

  if (error) throw new Error(errorDesc || error);
  if (!code || !state) throw new Error('Missing authorization code or state');

  const codeVerifier = sessionStorage.getItem(`cp_pkce_${state}`);
  if (!codeVerifier) throw new Error('Session expired. Please try signing in again.');

  const redirectUri = window.location.origin + '/auth/callback';

  const res = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  sessionStorage.removeItem(`cp_pkce_${state}`);
  return res.json();
}

/**
 * Does this browser BELIEVE it holds a session?
 *
 * Synchronous and independent of React, because the request layer needs the
 * answer and is not a hook. `LastAuthUser` is what Amplify's token store reads
 * first, so its presence is the same question Amplify itself asks.
 *
 * This is deliberately a belief, not a guarantee: the tokens behind it may be
 * expired or unusable. That is precisely the state that matters — a browser
 * that thinks it is signed in must never have its work filed under a guest.
 */
export function hasStoredSession(): boolean {
  return !!localStorage.getItem(`CognitoIdentityServiceProvider.${CLIENT_ID}.LastAuthUser`);
}

/**
 * Remove all Cognito tokens from localStorage for this app's client.
 *
 * THIS DESTROYS THE REFRESH TOKEN, which is the only thing that can restore a
 * session without the player signing in again. It used to be called from two
 * error paths unconditionally, so a dropped connection or a Cognito throttle
 * signed someone out for good — see `authErrors.ts` for the production case.
 * Callers must now decide with `classifyAuthError` and pass what they decided.
 *
 * It does NOT clear `cp_anonymous_id`. That is intentional and is what
 * distinguishes this from a real sign-out, but it is also why the caller must
 * be sure: the guest id survives, so anything solved afterwards accumulates
 * under an identity the account has already claimed.
 */
export function clearAmplifyTokens(): void {
  const prefix = `CognitoIdentityServiceProvider.${CLIENT_ID}`;
  Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear all user-specific app data from localStorage on sign-out.
 * Ensures the next user who signs in starts with their own server data
 * rather than seeing the previous user's cached preferences and stats.
 */
export function clearUserLocalStorage(): void {
  const userKeys = [
    BOARD_THEME_STORAGE_KEY,
    LEGACY_BOARD_THEME_STORAGE_KEY,
    'chessPvCount',
    'analysis_config',
    'chessplaybook_puzzle_progress',
  ];
  userKeys.forEach((key) => localStorage.removeItem(key));

  /*
    RETIRE THE GUEST IDENTITY TOO (Codex, 2026-08-05).

    `cp_anonymous_id` used to survive sign-out, and once it had been claimed by
    an account it stayed claimed. So a guest solving after signing out wrote
    everything under an id the server had already given away: the link is
    skipped because that id is recorded as linked, and the backend refuses it
    anyway as "already claimed". Their solving was stranded where nothing would
    ever collect it.

    Clearing it means the next guest session mints a fresh id — which is what a
    new anonymous player IS. Nothing is lost: whatever the old id held was
    transferred to the account when it was claimed, which is why it is claimed.
  */
  localStorage.removeItem('cp_anonymous_id');
  localStorage.removeItem('cp_account_linked');
  // Clear per-user migration flags (cp_migrated_<userId>)
  Object.keys(localStorage)
    .filter((key) => key.startsWith('cp_migrated_'))
    .forEach((key) => localStorage.removeItem(key));
}

/**
 * Store tokens in localStorage in the format Amplify expects,
 * so getCurrentUser() and fetchAuthSession() work after the redirect.
 */
export function storeTokensForAmplify(tokens: {
  id_token: string;
  access_token: string;
  refresh_token: string;
}): void {
  const payload = JSON.parse(atob(tokens.id_token.split('.')[1]));
  const userId = payload.sub as string;
  const prefix = `CognitoIdentityServiceProvider.${CLIENT_ID}`;

  localStorage.setItem(`${prefix}.LastAuthUser`, userId);
  localStorage.setItem(`${prefix}.${userId}.idToken`, tokens.id_token);
  localStorage.setItem(`${prefix}.${userId}.accessToken`, tokens.access_token);
  localStorage.setItem(`${prefix}.${userId}.refreshToken`, tokens.refresh_token);
  localStorage.setItem(`${prefix}.${userId}.clockDrift`, '0');
}
