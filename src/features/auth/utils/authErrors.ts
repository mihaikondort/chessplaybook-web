/**
 * Is this auth failure a verdict about the SESSION, or about the network?
 *
 * THE DISTINCTION IS THE WHOLE BUG (2026-08-12). `clearAmplifyTokens()` deletes
 * the refresh token, which is the only thing that can restore a session without
 * the user signing in again. Calling it on any thrown error means a dropped
 * connection, a Cognito 5xx or a throttle signs the player out permanently.
 *
 * That is not theoretical. On 2026-08-04 an account authenticated at 21:08 and
 * then solved 22 puzzles between 21:10 and 21:40 that were all filed under its
 * GUEST identity, because no token was available to send. The guest id survived,
 * which is how we know it was not a deliberate sign-out — a real sign-out clears
 * `cp_anonymous_id` and the next solve would have minted a fresh one.
 *
 * So: only Cognito telling us the grant is dead may destroy the grant. Anything
 * else leaves the tokens alone and is retried on the next call. The original
 * reason the clear existed — not hammering Cognito with a refresh that will
 * never succeed — is preserved exactly, because that case IS a definitive error.
 *
 * DEFAULT IS "TRANSIENT", and that direction is deliberate. Keeping a genuinely
 * dead token costs one failed refresh per page load, which is noise. Deleting a
 * live one costs the player their account and, until `linkAnonymous` learns to
 * re-claim, everything they solve afterwards.
 */

/**
 * Cognito's names for "this grant is no longer valid". A user pool answers a
 * spent, revoked or expired refresh token with `NotAuthorizedException`; the
 * hosted-UI token endpoint answers the OAuth-standard `invalid_grant`.
 */
const DEFINITIVE_AUTH_ERRORS = [
  'NotAuthorizedException',
  'InvalidGrantException',
  'invalid_grant',
  'UserNotFoundException',
  'TokenRevokedException',
] as const;

/**
 * Only the two outcomes this function can actually produce. A deliberate
 * sign-out is not represented here on purpose: it never reaches this code, and
 * a third member that nothing returns would widen every caller's type for a
 * case that cannot occur.
 */
export type SessionLossReason =
  | 'definitive'  // Cognito rejected the grant — the session is genuinely over.
  | 'transient';  // Network, throttle, 5xx. The session may well still be good.

/**
 * Classify a thrown auth error.
 *
 * Matches on `name` first because that is what the AWS SDK sets and it is exact;
 * falls back to a substring of the message, since Amplify wraps some failures in
 * a plain `Error` whose name is just `Error`. The fallback is the reason the
 * list holds the lowercase `invalid_grant` as well as the exception name.
 */
export function classifyAuthError(err: unknown): SessionLossReason {
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = (err as { message?: string } | null)?.message ?? '';

  for (const definitive of DEFINITIVE_AUTH_ERRORS) {
    if (name === definitive) return 'definitive';
    if (message.includes(definitive)) return 'definitive';
  }
  return 'transient';
}

/** Convenience: may this error destroy the refresh token? */
export function isDefinitiveAuthError(err: unknown): boolean {
  return classifyAuthError(err) === 'definitive';
}
