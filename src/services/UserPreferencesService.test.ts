import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/utils/getAuthToken', () => ({
  getRequestHeaders: vi.fn(async () => ({ 'X-Anonymous-Id': 'test' })),
}));

import { userPreferencesService } from './UserPreferencesService';

afterEach(() => vi.unstubAllGlobals());

describe('UserPreferencesService.loadFromServer', () => {
  /* B4: the board theme, the trainer and the puzzle record ask at once on /puzzles. */
  it('shares one request among callers who ask at the same time', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ boardTheme: 'green' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const [a, b, c] = await Promise.all([
      userPreferencesService.loadFromServer(),
      userPreferencesService.loadFromServer(),
      userPreferencesService.loadFromServer(),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ boardTheme: 'green' });
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  /* Never a cached answer: after a sign-in or a save the next caller must read fresh. */
  it('asks again once the shared request has finished', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await userPreferencesService.loadFromServer();
    await userPreferencesService.loadFromServer();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('still answers null on a failure, and recovers on the next call', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await userPreferencesService.loadFromServer()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"pvCount":2}', { status: 200 })));
    expect(await userPreferencesService.loadFromServer()).toEqual({ pvCount: 2 });
  });
});
