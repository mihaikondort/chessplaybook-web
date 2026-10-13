import { Download } from 'lucide-react';
import { useState } from 'react';

import { Section } from '@/features/puzzles/components/TrainerUI';
import { logGA4Event } from '@/services/analytics';

import { buildPlanCalendarEvents, planCalendarFilename, serializePlanCalendar } from '../../lib/icsExport';
import type { TrainingPlan } from '../../services/PlanApi';

export function PlanCalendarExport({ plan }: { plan: TrainingPlan }) {
  const [time, setTime] = useState('19:00');
  const [reminder, setReminder] = useState(30);
  const [visibleDayMarkers, setVisibleDayMarkers] = useState(true);

  function download() {
    const events = buildPlanCalendarEvents(plan);
    const contents = serializePlanCalendar(events, {
      time, reminderMinutes: reminder || null, visibleDayMarkers,
      productUrl: `${window.location.origin}/puzzles`,
    });
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = planCalendarFilename(plan);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    logGA4Event({
      name: 'plan_calendar_exported',
      params: { format: 'ics', plan_items: plan.items.length, has_times: true },
    });
  }

  return (
    <Section title="Add to your calendar" icon={<Download className="h-4 w-4" />} className="h-full p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Training time
          <input type="time" value={time} onChange={event => setTime(event.target.value)}
            className="mt-1 block min-h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground" />
        </label>
        <label className="text-xs text-muted-foreground">
          Reminder
          <select value={reminder} onChange={event => setReminder(Number(event.target.value))}
            className="mt-1 block min-h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground">
            <option value={0}>No reminder</option>
            <option value={10}>10 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
          </select>
        </label>
      </div>
      <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={visibleDayMarkers}
          onChange={event => setVisibleDayMarkers(event.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
        <span><strong className="font-medium text-foreground">Highlight training days</strong> with an all-day marker; the timed reminder stays.</span>
      </label>
      <button type="button" onClick={download} disabled={!time}
        className="mt-2 w-full rounded-lg bg-primary py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        Export calendar (.ics)
      </button>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Google uses the destination calendar's color. No automatic sync—re-export after changes.
        Stopping the plan does not remove imported events.
      </p>
    </Section>
  );
}

export default PlanCalendarExport;
