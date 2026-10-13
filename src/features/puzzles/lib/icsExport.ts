import type { PlanItem, TrainingPlan } from '../services/PlanApi';

export interface PlanCalendarEvent {
  uid: string;
  scheduledOn: string;
  title: string;
  description: string;
  total: number;
  items: PlanItem[];
}

export interface IcsOptions {
  time: string;
  reminderMinutes: number | null;
  visibleDayMarkers?: boolean;
  now?: Date;
  productUrl?: string;
}

const LABEL = { tactics: 'Tactics', middlegame: 'Middlegame', endgame: 'Endgame', mixed: 'Final review' } as const;

export function buildPlanCalendarEvents(plan: TrainingPlan): PlanCalendarEvent[] {
  const byDay = new Map<string, PlanItem[]>();
  for (const item of [...plan.items].sort((a, b) => a.ordinal - b.ordinal)) {
    const items = byDay.get(item.scheduledOn) ?? [];
    items.push(item);
    byDay.set(item.scheduledOn, items);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([scheduledOn, items]) => {
    const anchor = [...items].map(item => item.id).sort()[0];
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const names = [...new Set(items.map(item => item.kind === 'review' ? 'Final review' : LABEL[item.area]))];
    return {
      uid: `chessplaybook-plan-${plan.id}-item-${anchor}@chessplaybook.com`,
      scheduledOn,
      title: names.includes('Final review') ? 'Chess training · Final review' : `Chess training · ${names.join(' + ')}`,
      description: `${names.join(', ')} · ${total} positions in your Chess Playbook training plan.`,
      total,
      items,
    };
  });
}

export function serializePlanCalendar(events: PlanCalendarEvent[], options: IcsOptions): string {
  const now = formatUtc(options.now ?? new Date());
  const url = options.productUrl ?? 'https://www.chessplaybook.com/puzzles';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chess Playbook//Training Plan//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Chess Playbook Training Plan', 'COLOR:gold',
  ];
  for (const event of events) {
    if (options.visibleDayMarkers !== false) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${escapeText(markerUid(event.uid))}`,
        `DTSTAMP:${now}`,
        'SEQUENCE:0',
        `DTSTART;VALUE=DATE:${compactDate(event.scheduledOn)}`,
        `DTEND;VALUE=DATE:${compactDate(addDays(event.scheduledOn, 1))}`,
        `SUMMARY:${escapeText(event.title.replace('Chess training', 'Training day'))}`,
        `DESCRIPTION:${escapeText(`${event.description}\nYour timed session and reminder are listed separately.`)}`,
        'TRANSP:TRANSPARENT',
        'COLOR:gold',
        'CATEGORIES:CHESS PLAYBOOK TRAINING',
        `URL:${url}`,
        'END:VEVENT',
      );
    }
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${now}`,
      'SEQUENCE:0',
      `DTSTART:${compactDate(event.scheduledOn)}T${options.time.replace(':', '')}00`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(`${event.description}\nOpen trainer: ${url}`)}`,
      `URL:${url}`,
    );
    if (options.reminderMinutes != null && options.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${options.reminderMinutes}M`,
        'DESCRIPTION:Chess training session', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function planCalendarFilename(plan: TrainingPlan): string {
  return `chess-playbook-training-plan-${plan.startsOn}.ics`;
}

function escapeText(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n')
    .replaceAll(',', '\\,').replaceAll(';', '\\;');
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function markerUid(uid: string): string {
  return uid.replace('@', '-day@');
}

function compactDate(iso: string): string {
  return iso.replaceAll('-', '');
}

function addDays(iso: string, amount: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = '';
  let limit = 75;
  for (const char of line) {
    if (encoder.encode(chunk + char).length > limit) {
      chunks.push(chunk);
      chunk = char;
      limit = 74;
    } else chunk += char;
  }
  chunks.push(chunk);
  return chunks.join('\r\n ');
}
