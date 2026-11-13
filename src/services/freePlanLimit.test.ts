import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/analytics', () => ({ logGA4Event: vi.fn() }));
import { dailyLimitMessage, readDailyLimit, whenBack } from './freePlanLimit';

const body = { success: false, error: 'daily_limit', feature: 'game_report', limit: 1, resetsAt: '2026-11-20T22:00:00Z' };

describe('readDailyLimit', () => {
  it('reads the 402 the server sends, and nothing else', () => {
    expect(readDailyLimit(402, body)).toEqual({ feature: 'game_report', limit: 1, resetsAt: '2026-11-20T22:00:00Z' });
    expect(readDailyLimit(429, body)).toBeNull();
    expect(readDailyLimit(402, { ...body, error: 'other' })).toBeNull();
    expect(readDailyLimit(402, { ...body, feature: 'puzzles' })).toBeNull();
    expect(readDailyLimit(402, null)).toBeNull();
  });
});

describe('the message', () => {
  it('says when the allowance is back, today or tomorrow, in the visitor\'s own time', () => {
    const reset = new Date('2026-11-20T22:00:00Z');
    const sameDay = new Date(reset.getTime() - 60 * 60 * 1000);
    const time = reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const midnight = reset.getHours() === 0 && reset.getMinutes() === 0;
    const expected = midnight ? 'tomorrow'
      : reset.toDateString() === sameDay.toDateString() ? `at ${time}` : `tomorrow at ${time}`;
    expect(whenBack(reset.toISOString(), sameDay)).toBe(expected);
    expect(whenBack('not a date')).toBe('tomorrow');
    const localMidnight = new Date(2026, 10, 21, 0, 0, 0);
    expect(whenBack(localMidnight.toISOString(), new Date(2026, 10, 20, 15, 0, 0))).toBe('tomorrow');
  });

  it('has one plain sentence per feature, with no em dash', () => {
    for (const feature of ['game_report', 'explain_position', 'challenge_session', 'opening_session'] as const) {
      const text = dailyLimitMessage({ feature, limit: 3, resetsAt: '2026-11-20T22:00:00Z' });
      expect(text).toMatch(/^You've (used|played) today's /);
      expect(text).not.toContain('—');
    }
  });
});
