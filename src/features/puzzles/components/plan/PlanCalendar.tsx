import { ArrowRight, CalendarDays, Check, RotateCcw } from 'lucide-react';

import { Section } from '@/features/puzzles/components/TrainerUI';

import type { PlanCalendarBlock, PlanCalendarWeek } from '../../lib/planCalendar';
import type { PlanItem } from '../../services/PlanApi';
import { AREA_LABEL, dayLabel } from './planFormat';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const AREA_CLASS: Record<PlanCalendarBlock['area'], string> = {
  tactics: 'training-area-tactics',
  middlegame: 'training-area-middlegame',
  endgame: 'training-area-endgame',
  mixed: 'training-area-mixed',
};

interface PlanCalendarProps {
  weeks: PlanCalendarWeek[];
  activeItem: PlanItem | null;
  nextItem: PlanItem | null;
  busy: boolean;
  onStart: (itemId: string, area: string, total: number, kind: string) => void;
  readOnly?: boolean;
}

export function PlanCalendar({
  weeks, activeItem, nextItem, busy, onStart, readOnly = false,
}: PlanCalendarProps) {
  return (
    <Section
      title="Training schedule"
      icon={<CalendarDays className="h-4 w-4" />}
      aside={<span className="text-xs font-medium normal-case tracking-normal text-foreground">{monthRange(weeks)}</span>}
      testId="plan-schedule"
      className="h-full p-2.5"
    >
      <CalendarLegend />

      <div className="mt-2 hidden sm:block" data-testid="plan-calendar-grid">
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] text-center text-xs text-muted-foreground">
          <span aria-hidden="true" />
          {WEEKDAYS.map(day => <span key={day} className="pb-2">{day}</span>)}
        </div>

        <div className="overflow-hidden rounded-md border border-border/60">
          {weeks.map(week => (
            <div
              key={week.startsOn}
              className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-border/60 last:border-b-0"
              data-plan-week={week.index}
            >
              <div className="flex items-center justify-center bg-muted/20 px-1 text-[11px] text-muted-foreground">
                W{week.index}
              </div>
              {week.days.map(day => (
                <div
                  key={day.iso}
                  className={`min-h-14 min-w-0 border-l border-border/60 p-1 ${
                    day.inPlan ? 'bg-background/15' : 'bg-background/5 opacity-35'
                  } ${day.isToday ? 'outline outline-1 -outline-offset-2 outline-primary' : ''}`}
                  data-date={day.iso}
                  data-rest={day.isRest || undefined}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                    <span>{day.dayOfMonth === 1 ? shortMonthDay(day.iso) : day.dayOfMonth}</span>
                    {day.isToday && <span className="text-link">Today</span>}
                  </div>
                  {day.isRest ? (
                    <div className="mt-1 flex min-h-7 items-center justify-center rounded border border-dashed border-border/60 text-xs text-muted-foreground" title="Rest day">
                      R
                    </div>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {day.blocks.map(block => <CalendarBlock
                        key={block.key}
                        block={block}
                        activeItem={activeItem}
                        nextItem={nextItem}
                        busy={busy}
                        onStart={onStart}
                        readOnly={readOnly}
                      />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3 sm:hidden" data-testid="plan-calendar-agenda">
        {weeks.map(week => {
          const blocks = week.days.flatMap(day => day.blocks);
          const completed = blocks.filter(block => block.status === 'completed').length;
          return (
            <section key={week.startsOn} data-plan-week={week.index}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <h3 className="font-semibold text-foreground">Week {week.index}</h3>
                <span className="text-muted-foreground">{completed} of {blocks.length} complete</span>
              </div>
              <div className="divide-y divide-border/60 rounded-md border border-border/60">
                {week.days.filter(day => day.inPlan).map(day => (
                  <div key={day.iso} className="min-w-0 p-2" data-date={day.iso} data-rest={day.isRest || undefined}>
                    {day.isRest ? (
                      <div className="flex min-h-11 items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span>{dayLabel(day.iso)}</span>
                        <span><strong className="text-foreground">R</strong> · Rest</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {day.blocks.map(block => (
                          <AgendaBlock key={block.key} block={block} activeItem={activeItem}
                            nextItem={nextItem} busy={busy} onStart={onStart} readOnly={readOnly} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Section>
  );
}

function AgendaBlock({ block, activeItem, nextItem, busy, onStart, readOnly }: {
  block: PlanCalendarBlock;
  activeItem: PlanItem | null;
  nextItem: PlanItem | null;
  busy: boolean;
  onStart: PlanCalendarProps['onStart'];
  readOnly: boolean;
}) {
  const target = block.items.find(item => item.status === 'active')
    ?? block.items.find(item => item.status === 'abandoned')
    ?? block.items.find(item => item.status === 'pending')
    ?? block.items[0];
  const area = block.kind === 'review' ? 'Final review' : AREA_LABEL[block.area];
  const isNext = nextItem != null && block.items.some(item => item.id === nextItem.id);
  const canStart = block.status !== 'completed' && block.status !== 'active';
  const disabled = busy || activeItem != null;
  const status = block.status === 'completed' ? 'Done'
    : block.status === 'active' ? 'In progress'
      : block.status === 'abandoned' ? 'Catch up'
        : isNext ? 'Next' : 'Upcoming';

  return (
    <div className="flex min-h-11 items-center gap-2">
      <span className={`h-4 w-4 shrink-0 rounded-sm border ${AREA_CLASS[block.area]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{area} · {block.total} positions</p>
        <p className="text-xs text-muted-foreground">{dayLabel(block.scheduledOn)}</p>
      </div>
      {canStart && !readOnly ? (
        <button type="button"
          className="min-h-11 shrink-0 px-2 text-xs font-medium text-link enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          aria-label={`${block.status === 'abandoned' ? 'Continue' : 'Start'} ${area} session scheduled for ${dayLabel(block.scheduledOn)}`}
          onClick={() => onStart(target.id, target.area, target.total, target.kind)}>
          {block.status === 'abandoned' ? 'Catch up' : isNext ? 'Start' : 'Start early'}
        </button>
      ) : <span className="shrink-0 text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}

function CalendarBlock({ block, activeItem, nextItem, busy, onStart, readOnly }: {
  block: PlanCalendarBlock;
  activeItem: PlanItem | null;
  nextItem: PlanItem | null;
  busy: boolean;
  onStart: PlanCalendarProps['onStart'];
  readOnly: boolean;
}) {
  const target = block.items.find(item => item.status === 'active')
    ?? block.items.find(item => item.status === 'abandoned')
    ?? block.items.find(item => item.status === 'pending')
    ?? block.items[0];
  const area = block.kind === 'review' ? 'Final review' : AREA_LABEL[block.area];
  const status = block.status === 'completed'
    ? 'completed'
    : block.status === 'active'
      ? 'in progress'
      : block.status === 'abandoned'
        ? 'unfinished'
        : nextItem && block.items.some(item => item.id === nextItem.id)
          ? 'next'
          : 'upcoming';
  const label = `${area}, ${block.total} positions, ${dayLabel(block.scheduledOn)}, ${status}`;
  const isNext = nextItem != null && block.items.some(item => item.id === nextItem.id);
  const isDisabled = busy || (activeItem != null && block.status !== 'active');
  const className = `flex min-h-7 w-full items-center justify-center gap-1 rounded border px-1 text-xs font-semibold transition ${AREA_CLASS[block.area]} ${
    block.status === 'completed' ? 'opacity-55' : ''
  } ${block.status === 'active' ? 'outline outline-2 outline-primary' : ''} ${
    isNext && block.status !== 'active' ? 'ring-1 ring-inset ring-foreground/50' : ''
  }`;
  const content = (
    <>
      {block.status === 'completed' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {block.status === 'active' && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
      {block.status === 'abandoned' && <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-hidden="true">T</span>
    </>
  );

  if (readOnly || block.status === 'completed' || block.status === 'active') {
    return <div className={className} title={label} aria-label={label}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={`${className} enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40`}
      title={label}
      aria-label={`${block.status === 'abandoned' ? 'Continue' : 'Start'} ${label}`}
      disabled={isDisabled}
      onClick={() => onStart(target.id, target.area, target.total, target.kind)}
    >
      {content}
    </button>
  );
}

function CalendarLegend() {
  const areas: Array<{ label: string; className: string }> = [
    { label: 'Tactics', className: AREA_CLASS.tactics },
    { label: 'Middlegame', className: AREA_CLASS.middlegame },
    { label: 'Endgame', className: AREA_CLASS.endgame },
    { label: 'Final review', className: AREA_CLASS.mixed },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground" aria-label="Training calendar legend">
      <span><strong className="text-foreground">T</strong> training</span>
      <span><strong className="text-foreground">R</strong> rest</span>
      {areas.map(area => (
        <span key={area.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-sm border ${area.className}`} aria-hidden="true" />
          {area.label}
        </span>
      ))}
    </div>
  );
}

export default PlanCalendar;

function monthRange(weeks: PlanCalendarWeek[]): string {
  const planDays = weeks.flatMap(week => week.days).filter(day => day.inPlan);
  if (planDays.length === 0) return '';
  const first = utcFromIso(planDays[0].iso);
  const last = utcFromIso(planDays.at(-1)!.iso);
  const formatter = new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' });
  const firstMonth = formatter.format(first);
  const lastMonth = formatter.format(last);
  const firstYear = first.getUTCFullYear();
  const lastYear = last.getUTCFullYear();
  if (firstMonth === lastMonth && firstYear === lastYear) return `${firstMonth} ${firstYear}`;
  if (firstYear === lastYear) return `${firstMonth} – ${lastMonth} ${lastYear}`;
  return `${firstMonth} ${firstYear} – ${lastMonth} ${lastYear}`;
}

function shortMonthDay(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(utcFromIso(iso));
}

function utcFromIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
