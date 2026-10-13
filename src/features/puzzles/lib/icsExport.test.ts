import { describe, expect, it } from 'vitest';
import type { TrainingPlan } from '../services/PlanApi';
import { buildPlanCalendarEvents, serializePlanCalendar } from './icsExport';

function plan(): TrainingPlan {
  return {
    id: 'p1', status: 'active', sessionsPerWeek: 3, positionsPerSession: 25,
    startsOn: '2026-08-07', endsOn: '2026-08-14', targetEvent: null,
    createdAt: '2026-08-07T00:00:00Z', endedAt: null,
    progress: { items: 3, completed: 0, positions: 34, positionsDone: 0, finished: false },
    items: [
      { id: 'z', scheduledOn: '2026-08-07', ordinal: 2, area: 'endgame', total: 25, kind: 'training', sessionId: null, status: 'pending' },
      { id: 'a', scheduledOn: '2026-08-07', ordinal: 1, area: 'tactics', total: 9, kind: 'training', sessionId: null, status: 'pending' },
      { id: 'r', scheduledOn: '2026-08-14', ordinal: 3, area: 'mixed', total: 0, kind: 'review', sessionId: null, status: 'pending' },
    ],
  };
}

describe('training plan calendar export', () => {
  it('groups a multi-block day and anchors its UID to the lowest stable item id', () => {
    const [event] = buildPlanCalendarEvents(plan());
    expect(event.total).toBe(34);
    expect(event.items.map(item => item.id)).toEqual(['a', 'z']);
    expect(event.uid).toContain('-item-a@');
  });

  it('keeps the UID when a whole day is moved by reflow', () => {
    const before = plan();
    const after = plan();
    after.items[0].scheduledOn = '2026-08-10';
    after.items[1].scheduledOn = '2026-08-10';
    expect(buildPlanCalendarEvents(after)[0].uid).toBe(buildPlanCalendarEvents(before)[0].uid);
  });

  it('serializes floating time, CRLF, escaped text, alarm and sequence', () => {
    const text = serializePlanCalendar(buildPlanCalendarEvents(plan()), {
      time: '19:00', reminderMinutes: 30, now: new Date('2026-08-07T10:11:12Z'),
    });
    expect(text).toContain('DTSTART:20260807T190000\r\n');
    expect(text).toContain('SEQUENCE:0\r\n');
    expect(text).toContain('TRIGGER:-PT30M\r\n');
    expect(text).toContain('DTSTART;VALUE=DATE:20260807\r\n');
    expect(text).toContain('DTEND;VALUE=DATE:20260808\r\n');
    expect(text).toContain('SUMMARY:Training day · Tactics + Endgame\r\n');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(text).not.toMatch(/(?<!\r)\n/);
    for (const line of text.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('can omit all-day markers while retaining timed sessions', () => {
    const text = serializePlanCalendar(buildPlanCalendarEvents(plan()), {
      time: '19:00', reminderMinutes: null, visibleDayMarkers: false,
    });
    expect(text).not.toContain('VALUE=DATE');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});
