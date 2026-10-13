import type {
  PlanItem,
  PlanItemArea,
  TrainingPlan,
} from '../services/PlanApi';

export type CalendarBlockStatus = PlanItem['status'];

export interface PlanCalendarBlock {
  key: string;
  scheduledOn: string;
  area: PlanItemArea;
  total: number;
  kind: PlanItem['kind'];
  status: CalendarBlockStatus;
  items: PlanItem[];
}

export interface PlanCalendarDay {
  iso: string;
  dayOfMonth: number;
  inPlan: boolean;
  isRest: boolean;
  isToday: boolean;
  blocks: PlanCalendarBlock[];
}

export interface PlanCalendarWeek {
  index: number;
  startsOn: string;
  completedItems: number;
  totalItems: number;
  days: PlanCalendarDay[];
}

const DAY_MS = 86_400_000;

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, amount: number): string {
  return isoDate(new Date(utcDate(iso).getTime() + amount * DAY_MS));
}

function mondayOnOrBefore(iso: string): string {
  const day = utcDate(iso).getUTCDay();
  return addDays(iso, -(day === 0 ? 6 : day - 1));
}

function sundayOnOrAfter(iso: string): string {
  const day = utcDate(iso).getUTCDay();
  return addDays(iso, day === 0 ? 0 : 7 - day);
}

function blockStatus(items: PlanItem[]): CalendarBlockStatus {
  if (items.some(item => item.status === 'active')) return 'active';
  if (items.every(item => item.status === 'completed')) return 'completed';
  if (items.some(item => item.status === 'abandoned')) return 'abandoned';
  return 'pending';
}

export function groupPlanItemsByDay(items: PlanItem[]): Map<string, PlanItem[]> {
  const days = new Map<string, PlanItem[]>();
  for (const item of items) {
    const group = days.get(item.scheduledOn) ?? [];
    group.push(item);
    days.set(item.scheduledOn, group);
  }
  for (const group of days.values()) group.sort((a, b) => a.ordinal - b.ordinal);
  return days;
}

export function calendarBlocksForDay(items: PlanItem[]): PlanCalendarBlock[] {
  if (items.length === 0) return [];
  const ordered = [...items].sort((a, b) => a.ordinal - b.ordinal);
  if (ordered.some(item => item.kind === 'review')) {
    return [{
      key: `review-${ordered[0].scheduledOn}`,
      scheduledOn: ordered[0].scheduledOn,
      area: 'mixed',
      total: ordered.reduce((sum, item) => sum + item.total, 0),
      kind: 'review',
      status: blockStatus(ordered),
      items: ordered,
    }];
  }
  return ordered.map(item => ({
    key: item.id,
    scheduledOn: item.scheduledOn,
    area: item.area,
    total: item.total,
    kind: item.kind,
    status: item.status,
    items: [item],
  }));
}

export function buildPlanCalendar(
  plan: TrainingPlan,
  today = new Date().toLocaleDateString('en-CA'),
): PlanCalendarWeek[] {
  return buildPlanCalendarFromItems(plan.items, plan.startsOn, plan.endsOn, today);
}

export function buildPlanCalendarFromItems(
  items: PlanItem[],
  startsOn: string,
  endsOn: string,
  today = new Date().toLocaleDateString('en-CA'),
): PlanCalendarWeek[] {
  const byDay = groupPlanItemsByDay(items);
  const itemDates = items.map(item => item.scheduledOn);
  const firstDate = [startsOn, ...itemDates].sort()[0];
  const lastDate = [endsOn, ...itemDates].sort().at(-1) ?? endsOn;
  const firstMonday = mondayOnOrBefore(firstDate);
  const lastSunday = sundayOnOrAfter(lastDate);
  const weeks: PlanCalendarWeek[] = [];

  for (let weekStart = firstMonday, index = 1; weekStart <= lastSunday; weekStart = addDays(weekStart, 7), index++) {
    const days = Array.from({ length: 7 }, (_, offset): PlanCalendarDay => {
      const iso = addDays(weekStart, offset);
      const items = byDay.get(iso) ?? [];
      const inPlan = iso >= startsOn && iso <= endsOn;
      return {
        iso,
        dayOfMonth: Number(iso.slice(8, 10)),
        inPlan,
        isRest: inPlan && items.length === 0,
        isToday: iso === today,
        blocks: calendarBlocksForDay(items),
      };
    });
    const weekItems = days.flatMap(day => byDay.get(day.iso) ?? []);
    weeks.push({
      index,
      startsOn: weekStart,
      completedItems: weekItems.filter(item => item.status === 'completed').length,
      totalItems: weekItems.length,
      days,
    });
  }

  return weeks;
}
