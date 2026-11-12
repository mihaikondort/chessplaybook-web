/**
 * The funnel's first touch and daily visit (#46): only a path and a host leave the
 * browser, the first touch is sent once, the visit once a Bucharest day.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const headers = vi.hoisted(() => ({ value: { 'X-Anonymous-Id': 'anon-1' } as Record<string, string> }));
vi.mock('@/features/auth/utils/getAuthToken', () => ({ getRequestHeaders: async () => headers.value }));

import { readFirstTouch, bucharestDay, captureFirstTouch, recordVisit } from './funnel';

const at = new Date('2026-11-12T10:00:00Z');
const loc = (pathAndQuery: string) => {
  const url = new URL(pathAndQuery, 'https://www.chessplaybook.com');
  return { pathname: url.pathname, search: url.search, host: url.host };
};

describe('readFirstTouch', () => {
  it('keeps the path, the utm values and a paid click, never the click id', () => {
    const t = readFirstTouch(loc('/puzzles?utm_source=google&utm_medium=cpc&utm_campaign=in-puzzles&gclid=ABC123'), 'https://www.google.com/search?q=chess', at);
    expect(t).toEqual({
      touchedAt: '2026-11-12T10:00:00.000Z', landingPath: '/puzzles', utmSource: 'google', utmMedium: 'cpc',
      utmCampaign: 'in-puzzles', utmContent: undefined, paidClick: true, referrerHost: 'www.google.com',
    });
    expect(JSON.stringify(t)).not.toContain('ABC123');
    expect(JSON.stringify(t)).not.toContain('q=chess');
  });

  it('a click id alone marks a paid click', () => {
    expect(readFirstTouch(loc('/?gbraid=x'), '', at).paidClick).toBe(true);
    expect(readFirstTouch(loc('/?utm_medium=email'), '', at).paidClick).toBe(false);
  });

  it('our own pages are not a referrer', () => {
    expect(readFirstTouch(loc('/'), 'https://www.chessplaybook.com/news', at).referrerHost).toBeUndefined();
  });

  it('drops a utm value the server would refuse', () => {
    expect(readFirstTouch(loc('/?utm_campaign=%3Cscript%3E'), '', at).utmCampaign).toBeUndefined();
  });
});

describe('bucharestDay', () => {
  it('is the day in Bucharest, not UTC', () => {
    expect(bucharestDay(new Date('2026-11-12T22:30:00Z'))).toBe('2026-11-13');
  });
});

describe('recordVisit', () => {
  beforeEach(() => {
    localStorage.clear();
    headers.value = { 'X-Anonymous-Id': 'anon-1' };
  });
  const ok = () => vi.fn(async () => new Response(null, { status: 204 }));

  it('sends the first touch once and the visit once a day', async () => {
    window.history.replaceState(null, '', '/puzzles?utm_source=google&utm_medium=cpc');
    captureFirstTouch(at);
    const fetchImpl = ok();
    await recordVisit({ fetchImpl, now: at });
    await recordVisit({ fetchImpl, now: at });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.firstTouch.landingPath).toBe('/puzzles');

    await recordVisit({ fetchImpl, now: new Date('2026-11-13T10:00:00Z') });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const next = JSON.parse((fetchImpl.mock.calls[1] as unknown as [string, RequestInit])[1].body as string);
    expect(next).toEqual({});
  });

  it('a failed send is tried again on the next load', async () => {
    const fail = vi.fn(async () => new Response(null, { status: 503 }));
    await recordVisit({ fetchImpl: fail, now: at });
    const fetchImpl = ok();
    await recordVisit({ fetchImpl, now: at });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('signed in with no token right now: sends nothing', async () => {
    headers.value = {};
    const fetchImpl = ok();
    await recordVisit({ fetchImpl, now: at });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('the first touch is captured once; a later page does not replace it', () => {
    window.history.replaceState(null, '', '/explain');
    captureFirstTouch(at);
    window.history.replaceState(null, '', '/puzzles');
    captureFirstTouch(at);
    expect(JSON.parse(localStorage.getItem('cp_first_touch')!).landingPath).toBe('/explain');
  });
});
