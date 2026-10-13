import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PRESENCE_STORAGE_KEY,
  VISITOR_STORAGE_KEY,
  getPresenceId,
  getVisitorId,
  normalizeRouteGroup,
  sendPresenceHeartbeat,
} from './presence';

describe('presence transport', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

  it('creates and reuses one ephemeral ID per storage context', () => {
    const first = getPresenceId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getPresenceId()).toBe(first);
    expect(sessionStorage.getItem(PRESENCE_STORAGE_KEY)).toBe(first);

    const secondStorage = new Map<string, string>();
    const storage = {
      getItem: (key: string) => secondStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { secondStorage.set(key, value); },
    } as Storage;
    expect(getPresenceId(storage)).not.toBe(first);
  });

  it('reuses a persistent visitor ID across separate tab sessions', () => {
    const visitorId = getVisitorId();
    sessionStorage.clear();
    expect(getPresenceId()).not.toBe(visitorId);
    expect(getVisitorId()).toBe(visitorId);
    expect(localStorage.getItem(VISITOR_STORAGE_KEY)).toBe(visitorId);
  });

  it('normalizes dynamic paths without retaining identifiers or query strings', () => {
    expect(normalizeRouteGroup('/champions/carlsen/best-games')).toBe('champions');
    expect(normalizeRouteGroup('/puzzles/session/private-id')).toBe('puzzles');
    expect(normalizeRouteGroup('/unknown/private-id')).toBe('other');
  });

  it('sends only random session/visitor IDs and the route group and swallows network failure', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(sendPresenceHeartbeat('puzzles', { fetchImpl, timeoutMs: 50 })).resolves.toBeUndefined();

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ presenceId: expect.any(String), visitorId: expect.any(String), routeGroup: 'puzzles' });
    expect(JSON.stringify(body)).not.toMatch(/query|gclid|referrer|userAgent/);
  });
});
