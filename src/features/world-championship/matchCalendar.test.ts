import { describe, expect, it } from 'vitest';
import { SCHEDULED_GAMES } from './match';
import { googleCalendarUrl, matchCalendarEvents, serializeMatchCalendar } from './matchCalendar';

const startOf = (g: number) => SCHEDULED_GAMES[g - 1].startsAt;
const onlyGame1 = (g: number) => g === 1;

describe('match calendar', () => {
  it('gives a time only to games whose start is confirmed', () => {
    const events = matchCalendarEvents(startOf, onlyGame1);
    expect(events).toHaveLength(14);
    expect(events[0].start?.toISOString()).toBe('2026-11-24T14:00:00.000Z');
    expect(events.slice(1).every((e) => e.start === null)).toBe(true);
    expect(events[1].description).toContain('has not been announced');
  });

  it('leaves out the games a decided match does not need', () => {
    expect(matchCalendarEvents(startOf, onlyGame1, 9).map((e) => e.game)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('writes timed games in UTC with an alarm, the others as all-day entries', () => {
    const text = serializeMatchCalendar(matchCalendarEvents(startOf, onlyGame1), new Date('2026-11-11T12:00:00Z'));
    expect(text).toContain('DTSTART:20261124T140000Z');
    expect(text).toContain('DTEND:20261124T190000Z');
    expect(text).toContain('TRIGGER:-PT30M');
    expect(text).toContain('DTSTART;VALUE=DATE:20261125');
    expect(text).toContain('DTEND;VALUE=DATE:20261126');
    expect(text.match(/BEGIN:VALARM/g)).toHaveLength(1);
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(14);
    expect(text.endsWith('END:VCALENDAR\r\n')).toBe(true);
    for (const line of text.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('builds a Google link with UTC times for a confirmed game and dates for the others', () => {
    const [first, second] = matchCalendarEvents(startOf, onlyGame1);
    const g1 = new URL(googleCalendarUrl(first));
    expect(g1.searchParams.get('dates')).toBe('20261124T140000Z/20261124T190000Z');
    expect(g1.searchParams.get('text')).toBe('World Championship game 1: Gukesh vs Sindarov');
    expect(new URL(googleCalendarUrl(second)).searchParams.get('dates')).toBe('20261125/20261126');
  });
});
