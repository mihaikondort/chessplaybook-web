import { describe, expect, it } from 'vitest';

import type { PlanItem, TrainingPlan } from '../services/PlanApi';
import { buildPlanCalendar, calendarBlocksForDay, groupPlanItemsByDay } from './planCalendar';

function item(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'item-1',
    scheduledOn: '2026-08-07',
    ordinal: 0,
    area: 'tactics',
    total: 25,
    kind: 'training',
    sessionId: null,
    status: 'pending',
    ...overrides,
  };
}

function plan(items: PlanItem[], overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    id: 'plan-1',
    status: 'active',
    sessionsPerWeek: 3,
    positionsPerSession: 25,
    startsOn: '2026-08-07',
    endsOn: '2026-09-03',
    targetEvent: null,
    createdAt: '2026-08-07T08:00:00Z',
    endedAt: null,
    items,
    progress: {
      items: items.length,
      completed: items.filter(entry => entry.status === 'completed').length,
      positions: items.reduce((sum, entry) => sum + entry.total, 0),
      positionsDone: 0,
      finished: false,
    },
    ...overrides,
  };
}

describe('plan calendar grouping', () => {
  it('keeps calendar weeks Monday–Sunday with inert days before a mid-week start', () => {
    const weeks = buildPlanCalendar(plan([item()]), '2026-08-07');
    expect(weeks[0].startsOn).toBe('2026-08-03');
    expect(weeks[0].days.map(day => day.iso)).toEqual([
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06',
      '2026-08-07', '2026-08-08', '2026-08-09',
    ]);
    expect(weeks[0].days.slice(0, 4).every(day => !day.inPlan && !day.isRest)).toBe(true);
    expect(weeks[0].days[4].isToday).toBe(true);
  });

  it('crosses month boundaries without shifting calendar dates', () => {
    const weeks = buildPlanCalendar(plan([
      item({ scheduledOn: '2026-08-31' }),
      item({ id: 'item-2', scheduledOn: '2026-09-02' }),
    ], { startsOn: '2026-08-31', endsOn: '2026-09-06' }));
    expect(weeks).toHaveLength(1);
    expect(weeks[0].days[0].iso).toBe('2026-08-31');
    expect(weeks[0].days[6].iso).toBe('2026-09-06');
  });

  it('orders multiple blocks on a bunched day by ordinal', () => {
    const items = [
      item({ id: 'later', ordinal: 1, area: 'endgame' }),
      item({ id: 'first', ordinal: 0, area: 'tactics' }),
    ];
    expect(groupPlanItemsByDay(items).get('2026-08-07')?.map(entry => entry.id))
      .toEqual(['first', 'later']);
    expect(calendarBlocksForDay(items).map(block => block.key)).toEqual(['first', 'later']);
  });

  it('collapses the final review into one mixed block with the full day total', () => {
    const review = [
      item({ id: 'r1', kind: 'review', area: 'tactics', total: 8, status: 'completed' }),
      item({ id: 'r2', kind: 'review', area: 'middlegame', total: 8, ordinal: 1, status: 'completed' }),
      item({ id: 'r3', kind: 'review', area: 'endgame', total: 9, ordinal: 2, status: 'completed' }),
    ];
    expect(calendarBlocksForDay(review)).toMatchObject([{
      area: 'mixed', total: 25, kind: 'review', status: 'completed',
    }]);
  });

  it('marks empty in-plan dates as rest and reports zero progress for an untouched week', () => {
    const weeks = buildPlanCalendar(plan([item()]));
    expect(weeks[0].days.find(day => day.iso === '2026-08-08')?.isRest).toBe(true);
    expect(weeks[0].completedItems).toBe(0);
    expect(weeks[0].totalItems).toBe(1);
  });
});
