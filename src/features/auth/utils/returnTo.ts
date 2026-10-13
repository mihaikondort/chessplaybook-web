/**
 * Where sign-in sends the player back to.
 *
 * FOUND BY DRIVING IT (owner, 2026-08-05): signing in from `/puzzles` landed on
 * the homepage. Four places across the site build `/login?returnTo=…` —
 * `GuestBadge` on four pages, the demo modal, the Champion Challenge summary,
 * and now the plan panel — and **nothing ever read it**. `LoginPage` read
 * `location.state.from`, which those links do not set, so every "sign in to
 * save your progress" link on the site has been dumping people on the homepage
 * and losing whatever they were doing.
 *
 * SAME-ORIGIN PATHS ONLY. `returnTo` arrives in a URL anyone can write, and a
 * login that forwards to another origin after authenticating is an open
 * redirect with a fresh session attached. Anything that is not a plain absolute
 * path on this site falls back to the homepage.
 *
 * The QUERY STRING is preserved deliberately: `/puzzles?theme=fork` has to come
 * back as itself, or the player returns to a different page from the one they
 * left — which is exactly how the training system vanished after sign-in (when
 * it lived behind `?trainer=v2`, deleted in C6).
 */
const STASH_KEY = 'cp_return_to';

const PROTOCOL_RELATIVE = /^\/[/\\]/;

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // A malformed escape is not a destination.
    return null;
  }
  if (!value.startsWith('/')) return null;
  // `//evil.example` and `/\evil.example` are both protocol-relative once a
  // browser has normalised them — neither is a path on this site.
  if (PROTOCOL_RELATIVE.test(value)) return null;
  return value;
}

/** Read it from a location's query string. */
export function returnToFrom(search: string): string | null {
  try {
    return safeReturnTo(new URLSearchParams(search).get('returnTo'));
  } catch {
    return null;
  }
}

/**
 * Keep it across the OAuth round trip.
 *
 * Google sign-in leaves the site entirely and comes back to `/auth/callback`,
 * so a query parameter cannot survive on its own. `sessionStorage` is the right
 * lifetime: one tab, one attempt, gone when the tab closes.
 */
export function stashReturnTo(value: string | null): void {
  try {
    if (value) sessionStorage.setItem(STASH_KEY, value);
    else sessionStorage.removeItem(STASH_KEY);
  } catch {
    // Private mode. The fallback is the homepage, which is survivable.
  }
}

export function takeStashedReturnTo(): string | null {
  try {
    const value = sessionStorage.getItem(STASH_KEY);
    sessionStorage.removeItem(STASH_KEY);
    return safeReturnTo(value);
  } catch {
    return null;
  }
}
