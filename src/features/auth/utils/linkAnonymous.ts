/**
 * Link anonymous user data to the authenticated account.
 *
 * Called once after sign-in when cp_anonymous_id exists in localStorage.
 * Sends the anonymous UUID to the backend, which merges puzzle stats,
 * game history, and preferences into the authenticated account.
 */
import { getAuthToken } from './getAuthToken';
import env from '@/config/env';

const ANON_KEY = 'cp_anonymous_id';
const LINKED_KEY = 'cp_account_linked';

export async function linkAnonymousData(): Promise<void> {
  const anonymousId = localStorage.getItem(ANON_KEY);
  if (!anonymousId) return;

  /*
    Already linked THIS anonymous id — not "already linked once, ever".

    The flag used to be the string `true`, set on the first successful link and
    never cleared, so a browser that had ever linked an account skipped the call
    for good. A player who then solved as a guest — a second account, a sign-out,
    or simply testing — kept everything under the new anonymous id and found none
    of it after signing in. That is the exact failure the owner hit on
    2026-08-05: a plan built as a guest, invisible the moment they signed in,
    under a panel promising it would follow them.

    Storing the id makes the question answerable: has *this* guest identity been
    claimed?

    THE LEGACY `true` IS NOT HONOURED, and the first version of this fix got
    that wrong (Codex, 2026-08-05). Every browser that has ever linked holds
    `true` — including the one the bug was reported from — so skipping on it
    preserved the exact failure this exists to remove. An id that really was
    claimed already is answered 409 by the server and recorded then, which
    costs one request and is the only way to tell the two cases apart.
  */
  if (localStorage.getItem(LINKED_KEY) === anonymousId) return;

  const token = await getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${env.apiBaseUrl}/api/user/link-anonymous`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ anonymousId }),
    });

    // The ID, not a boolean — see above. A later guest identity is a different
    // question and has to be asked again.
    if (res.ok) {
      localStorage.setItem(LINKED_KEY, anonymousId);
    }
    // 409 = already claimed, also record it to prevent retries
    if (res.status === 409) {
      localStorage.setItem(LINKED_KEY, anonymousId);
    }
  } catch {
    // Silent failure — will retry on next sign-in
  }
}
