import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  nextSteps, orderAreasByFact, lastTrainedLabel, parseServerTime, ratedPuzzlesStillNeeded,
  ratingWindow, calendarWeeks, daysTrainedByWeek,
  MIN_RATED_FOR_PERFORMANCE,
} from './trainingRecord';
import type { AreaProgress, PuzzleArea } from './ProgressService';
import type { PlanItem, TrainingPlan } from './PlanApi';

const NOW = new Date(2026, 9, 14, 12, 0, 0); // 14 Oct 2026, local noon

function area(name: PuzzleArea, over: Partial<AreaProgress> = {}): AreaProgress {
  return {
    area: name, attempts: 20, solved: 12, rated: 20, ratedSolved: 12,
    averageRatingFaced: 1500, accuracy: 0.6, performance: 1550, confidence: 'established',
    lastAttemptAt: '2026-10-13 09:00:00', ...over,
  };
}

const noPlan = { plan: null, nextItem: null, nextDayTotal: 0 };

function planWith(item: Partial<PlanItem>, status: TrainingPlan['status'] = 'active') {
  const full: PlanItem = {
    id: 'i1', scheduledOn: '2026-10-14', ordinal: 0, area: 'endgame', total: 25,
    kind: 'training', sessionId: null, status: 'pending', ...item,
  };
  return { plan: { status, items: [full] } as TrainingPlan, nextItem: full, nextDayTotal: full.total };
}

describe('parseServerTime', () => {
  it('reads SQLite text as UTC, not local time', () => {
    expect(parseServerTime('2026-10-14 08:30:00')?.toISOString()).toBe('2026-10-14T08:30:00.000Z');
  });
  it('keeps an explicit zone', () => {
    expect(parseServerTime('2026-10-14T08:30:00.000Z')?.toISOString()).toBe('2026-10-14T08:30:00.000Z');
  });
  it('returns null for nothing or garbage', () => {
    expect(parseServerTime(null)).toBeNull();
    expect(parseServerTime('not a date')).toBeNull();
  });
});

describe('nextSteps', () => {
  it('says nothing is urgent when every area was trained recently and no plan is owed', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')], noPlan, NOW);
    expect(steps).toEqual([{ kind: 'none' }]);
  });

  it('puts an owed plan day first', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame', { attempts: 0 })],
      planWith({}), NOW);
    expect(steps.map(s => s.kind)).toEqual(['plan', 'untried']);
  });

  it('counts a missed earlier plan day as owed', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')],
      planWith({ scheduledOn: '2026-10-10', status: 'abandoned' }), NOW);
    expect(steps[0].kind).toBe('plan');
  });

  it('does not recommend a plan day scheduled for a later date', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')],
      planWith({ scheduledOn: '2026-10-16' }), NOW);
    expect(steps).toEqual([{ kind: 'none' }]);
  });

  it('recommends a run already under way even if scheduled later', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')],
      planWith({ scheduledOn: '2026-10-16', status: 'active' }), NOW);
    expect(steps[0].kind).toBe('plan');
  });

  it('ignores a plan that is not active', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')],
      planWith({}, 'completed'), NOW);
    expect(steps).toEqual([{ kind: 'none' }]);
  });

  it('flags an area at the stale line and not one day before it', () => {
    const atLine = nextSteps([area('tactics'), area('middlegame'),
      area('endgame', { lastAttemptAt: '2026-09-30 12:00:00' })], noPlan, NOW);
    expect(atLine.map(s => s.kind)).toEqual(['stale']);
    const before = nextSteps([area('tactics'), area('middlegame'),
      area('endgame', { lastAttemptAt: '2026-10-01 12:00:00' })], noPlan, NOW);
    expect(before).toEqual([{ kind: 'none' }]);
  });

  it('lists stale areas oldest first', () => {
    const steps = nextSteps([
      area('tactics', { lastAttemptAt: '2026-09-25 10:00:00' }),
      area('middlegame', { lastAttemptAt: '2026-09-01 10:00:00' }),
      area('endgame'),
    ], noPlan, NOW);
    expect(steps.map(s => (s.kind === 'stale' ? s.area : s.kind))).toEqual(['middlegame', 'tactics']);
  });

  it('never reads accuracy: a low-accuracy area recently trained is not a next step', () => {
    const steps = nextSteps([area('tactics', { accuracy: 0.1, performance: 900 }),
      area('middlegame'), area('endgame')], noPlan, NOW);
    expect(steps).toEqual([{ kind: 'none' }]);
  });
});

describe('orderAreasByFact', () => {
  it('orders untried, then unrated, then longest since trained', () => {
    const ordered = orderAreasByFact([
      area('tactics', { lastAttemptAt: '2026-10-13 09:00:00' }),
      area('middlegame', { lastAttemptAt: '2026-10-01 09:00:00' }),
      area('endgame', { attempts: 0, rated: 0, performance: null, lastAttemptAt: null }),
    ]);
    expect(ordered.map(a => a.area)).toEqual(['endgame', 'middlegame', 'tactics']);
    const withUnrated = orderAreasByFact([
      area('tactics'),
      area('middlegame', { rated: 2, performance: null }),
    ]);
    expect(withUnrated.map(a => a.area)).toEqual(['middlegame', 'tactics']);
  });

  it('ignores accuracy and performance when ordering rated areas', () => {
    const ordered = orderAreasByFact([
      area('tactics', { performance: 2000, lastAttemptAt: '2026-10-01 09:00:00' }),
      area('middlegame', { performance: 900, lastAttemptAt: '2026-10-13 09:00:00' }),
    ]);
    expect(ordered.map(a => a.area)).toEqual(['tactics', 'middlegame']);
  });
});

describe('lastTrainedLabel', () => {
  it('reads like a person would say it', () => {
    expect(lastTrainedLabel('2026-10-14 08:00:00', NOW)).toBe('today');
    expect(lastTrainedLabel('2026-10-13 08:00:00', NOW)).toBe('yesterday');
    expect(lastTrainedLabel('2026-10-10 08:00:00', NOW)).toBe('4 days ago');
    expect(lastTrainedLabel(null, NOW)).toBeNull();
  });
});

describe('ratedPuzzlesStillNeeded', () => {
  it('counts down to the minimum and never goes negative', () => {
    expect(ratedPuzzlesStillNeeded(area('tactics', { rated: 2 }))).toBe(3);
    expect(ratedPuzzlesStillNeeded(area('tactics', { rated: 9 }))).toBe(0);
  });
});

describe('replay step (#108)', () => {
  it('missed puzzles come before everything else, including an owed plan day', () => {
    const steps = nextSteps([area('tactics'), area('middlegame'), area('endgame')], planWith({}), NOW, 7);
    expect(steps.map(s => s.kind)).toEqual(['replay', 'plan']);
  });
  it('no missed puzzles, no replay step', () => {
    expect(nextSteps([area('tactics'), area('middlegame'), area('endgame')], noPlan, NOW, 0))
      .toEqual([{ kind: 'none' }]);
  });
});

describe('ratingWindow', () => {
  const pts = [
    { day: '2026-08-01', rating: 1400 },
    { day: '2026-09-10', rating: 1500 },
    { day: '2026-10-05', rating: 1560 },
    { day: '2026-10-13', rating: 1540 },
  ];
  it('measures from the rating held when the window opened', () => {
    const { shown, change } = ratingWindow(pts, 30, NOW);
    expect(shown.map(p => p.day)).toEqual(['2026-09-10', '2026-10-05', '2026-10-13']);
    expect(change).toBe(40);
  });
  it('gives no change when there was no rating before the window', () => {
    const { change } = ratingWindow(pts.slice(2), 30, NOW);
    expect(change).toBeNull();
  });
  it('"all" measures from the first point', () => {
    expect(ratingWindow(pts, 'all', NOW).change).toBe(140);
  });
});

describe('calendarWeeks and daysTrainedByWeek', () => {
  it('is whole weeks, Monday first, ending on the week holding today', () => {
    const weeks = calendarWeeks(NOW, 2); // NOW is Wednesday 14 Oct 2026
    expect(weeks[1][0]).toBe('2026-10-12');
    expect(weeks[1][2]).toBe('2026-10-14');
    expect(weeks[1][3]).toBeNull();
    expect(weeks[0][0]).toBe('2026-10-05');
  });
  it('counts days trained, not puzzles', () => {
    const days = [
      { day: '2026-10-12', attempts: 30, solved: 20 },
      { day: '2026-10-14', attempts: 1, solved: 1 },
      { day: '2026-10-06', attempts: 4, solved: 2 },
      { day: '2026-09-01', attempts: 9, solved: 9 },
    ];
    expect(daysTrainedByWeek(days, NOW)).toEqual({ thisWeek: 2, lastWeek: 1 });
  });
});

// The published frontend source has no backend/ (THIRD_PARTY_LICENSING.md §1).
describe.skipIf(!existsSync('backend'))('MIN_RATED_FOR_PERFORMANCE agrees with the server', () => {
  it('matches backend/src/db/puzzleProgress.ts', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('backend/src/db/puzzleProgress.ts', 'utf8');
    const m = src.match(/const MIN_RATED_FOR_PERFORMANCE\s*=\s*(\d+)/);
    expect(m, 'could not find MIN_RATED_FOR_PERFORMANCE in the backend').not.toBeNull();
    expect(Number(m![1])).toBe(MIN_RATED_FOR_PERFORMANCE);
  });
});
