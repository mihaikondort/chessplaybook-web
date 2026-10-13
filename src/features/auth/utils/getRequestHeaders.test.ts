import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchAuthSession = vi.fn();
vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: (...a: unknown[]) => fetchAuthSession(...a) }));
vi.mock('@/hooks/useAnonymousId', () => ({ getAnonymousId: () => 'guest-uuid' }));
vi.mock('@/services/analytics', () => ({ logGA4Event: vi.fn() }));

const hasStoredSession = vi.fn();
vi.mock('./oauth', () => ({ hasStoredSession: () => hasStoredSession() }));

const { getRequestHeaders } = await import('./getAuthToken');

const withToken = (t: string) => ({ tokens: { idToken: { toString: () => t } } });

beforeEach(() => {
  fetchAuthSession.mockReset();
  hasStoredSession.mockReset();
});

describe('getRequestHeaders', () => {
  it('a real guest still gets their anonymous id', () => {
    hasStoredSession.mockReturnValue(false);
    fetchAuthSession.mockResolvedValue({ tokens: undefined });
    return getRequestHeaders().then((h) => {
      expect(h['X-Anonymous-Id']).toBe('guest-uuid');
      expect(h['Authorization']).toBeUndefined();
    });
  });

  it('a signed-in player sends the bearer token', async () => {
    hasStoredSession.mockReturnValue(true);
    fetchAuthSession.mockResolvedValue(withToken('id-token'));
    const h = await getRequestHeaders();
    expect(h['Authorization']).toBe('Bearer id-token');
  });

  /*
    THE REGRESSION THIS FILE EXISTS FOR.

    Believed signed in, no token obtainable. The old code sent
    `X-Anonymous-Id` anyway and the server filed the result under the guest —
    silently, and permanently, because `linkAnonymous` skips an id it has
    already claimed. Sending nothing produces a 401, which is visible.
  */
  it('sends NEITHER header when a session is believed present but no token can be produced', async () => {
    hasStoredSession.mockReturnValue(true);
    fetchAuthSession.mockRejectedValue(new TypeError('Failed to fetch'));
    const h = await getRequestHeaders();
    expect(h['X-Anonymous-Id']).toBeUndefined();
    expect(h['Authorization']).toBeUndefined();
    expect(Object.keys(h)).toHaveLength(0);
  });

  it('recovers via one forced refresh rather than giving up on a stale cache', async () => {
    hasStoredSession.mockReturnValue(true);
    fetchAuthSession
      .mockResolvedValueOnce({ tokens: undefined })      // cached read: nothing
      .mockResolvedValueOnce(withToken('fresh-token'));  // forceRefresh: good
    const h = await getRequestHeaders();
    expect(h['Authorization']).toBe('Bearer fresh-token');
    expect(fetchAuthSession).toHaveBeenNthCalledWith(2, { forceRefresh: true });
  });

  it('does not spend a forced refresh on a genuine guest', async () => {
    hasStoredSession.mockReturnValue(false);
    fetchAuthSession.mockResolvedValue({ tokens: undefined });
    await getRequestHeaders();
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
  });
});
