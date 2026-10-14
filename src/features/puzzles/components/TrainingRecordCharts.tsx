/**
 * The training record's rating graph and training calendar (#108,
 * TRAINING_RECORD_ANALYSIS §7 B and C).
 *
 * The graph shows what the rating system believes and makes no claim about it:
 * no "improved", no trend line. The rating moves a few points on every puzzle,
 * so over a few hundred puzzles its ordinary wander is as large as most real
 * changes, and a sentence calling one of them progress would usually be wrong.
 * The change across the window is printed as a plain number, nothing more.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RatingPoint, TrainingDay } from '../services/ProgressService';
import {
  ratingWindow,
  calendarWeeks,
  daysTrainedByWeek,
  dayKey,
  MIN_RATED_FOR_GRAPH,
  PROVISIONAL_RD,
  type RatingWindow,
} from '../services/trainingRecord';

function formatDay(day: string, withYear = false): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
  });
}

const WINDOWS: Array<{ value: RatingWindow; label: string }> = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 'all', label: 'All' },
];

/* Drawn at the container's real pixel width, so text is real pixels at every size. */
const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

function RatingGraph({ points }: { points: RatingPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ratings = points.map(p => p.rating);
  const lo = Math.min(...ratings);
  const hi = Math.max(...ratings);
  // At least 100 points of height, so a flat stretch does not fill the box with noise.
  const span = Math.max(hi - lo, 100);
  const mid = (hi + lo) / 2;
  const yMin = Math.floor((mid - span / 2 - 10) / 50) * 50;
  const yMax = Math.ceil((mid + span / 2 + 10) / 50) * 50;
  const x = (i: number) => PAD.left + (points.length === 1 ? (W - PAD.left - PAD.right) / 2
    : (i / (points.length - 1)) * (W - PAD.left - PAD.right));
  const y = (r: number) => PAD.top + (1 - (r - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
  const ticks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.rating).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <div ref={box} className="w-full">
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img"
      aria-label={`Puzzle rating from ${formatDay(points[0].day)} (${points[0].rating}) to ${formatDay(last.day)} (${last.rating})`}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">{t}</text>
        </g>
      ))}
      <path d={path} fill="none" className="stroke-link" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.rating)} r={3.5} className="fill-link" />
      <text x={PAD.left} y={H - 6} className="fill-muted-foreground text-[11px]">{formatDay(points[0].day)}</text>
      {points.length > 1 && (
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">{formatDay(last.day)}</text>
      )}
    </svg>
    </div>
  );
}

export function RatingCard({ rating, rd, ratedAttempts, series }: {
  rating: number | null;
  rd: number | null;
  /** Rated attempts in the log: the graph's minimum is counted in puzzles, not days. */
  ratedAttempts: number;
  series: { points: RatingPoint[]; peak: RatingPoint | null } | undefined;
}) {
  const [range, setRange] = useState<RatingWindow>(30);
  const points = series?.points ?? [];
  const { shown, change } = useMemo(() => ratingWindow(points, range), [points, range]);
  /*
    Two different reasons for no graph, and only one of them is the player's.
    Too few rated puzzles: say so. No series from the server (an older API
    during a deploy, or no rated point recorded): show nothing extra, because
    "appears after 10 rated puzzles" would be false for someone with hundreds.
  */
  const tooFew = ratedAttempts < MIN_RATED_FOR_GRAPH;
  const enough = !tooFew && points.length > 0;

  return (
    <section aria-labelledby="rating-heading" role="region" className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="rating-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Puzzle rating
        </h2>
        {rating == null ? (
          <span className="text-sm text-muted-foreground">No rating yet.</span>
        ) : (
          <span className="text-2xl font-bold tabular-nums">
            {rating}
            {rd != null && rd >= PROVISIONAL_RD && (
              <span className="ml-2 text-xs font-medium text-muted-foreground">provisional</span>
            )}
          </span>
        )}
        {enough && change != null && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {change > 0 ? `+${change}` : change < 0 ? `−${Math.abs(change)}` : '0'}
            {' '}in {range === 'all' ? 'all' : `${range} days`}
          </span>
        )}
        {enough && series?.peak && (
          <span className="text-sm text-muted-foreground">
            Peak <span className="tabular-nums">{series.peak.rating}</span> on {formatDay(series.peak.day, true)}
          </span>
        )}
      </div>

      {!enough ? (
        rating != null && tooFew && (
          <p className="text-sm text-muted-foreground">
            Your rating graph appears after {MIN_RATED_FOR_GRAPH} rated puzzles.
          </p>
        )
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex gap-1 mb-2" role="group" aria-label="Time range">
            {WINDOWS.map(w => (
              <button
                key={String(w.value)}
                type="button"
                aria-pressed={range === w.value}
                onClick={() => setRange(w.value)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
                  range === w.value
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
          {shown.length > 0 ? (
            <RatingGraph points={shown} />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No rated puzzles in this range.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Shade by puzzles that day. Fixed steps, so a day means the same thing every week. */
function shade(attempts: number): string {
  if (attempts === 0) return 'bg-muted/40';
  if (attempts < 5) return 'bg-primary/25';
  if (attempts < 15) return 'bg-primary/50';
  if (attempts < 30) return 'bg-primary/75';
  return 'bg-primary';
}

export function TrainingCalendar({ days }: { days: TrainingDay[] }) {
  const now = new Date();
  const weeks = useMemo(() => calendarWeeks(now, 12), [now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDay = useMemo(() => new Map(days.map(d => [d.day, d])), [days]);
  const { thisWeek, lastWeek } = daysTrainedByWeek(days, now);
  const trainedDays = weeks.flat().filter(k => k != null && (byDay.get(k)?.attempts ?? 0) > 0).length;
  const today = dayKey(now);

  return (
    <section aria-labelledby="habit-heading" role="region" className="space-y-3">
      <h2 id="habit-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Training days
      </h2>
      <p className="text-sm">
        Trained {thisWeek} {thisWeek === 1 ? 'day' : 'days'} this week, {lastWeek} last week.
      </p>
      <div className="rounded-lg border border-border bg-card p-4 w-fit max-w-full">
        <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 text-[10px] leading-none text-muted-foreground" aria-hidden="true">
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => (
            <span key={i} className="h-3.5 sm:h-5 flex items-center">{d}</span>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label={`Trained on ${trainedDays} days in the last 12 weeks`}
        >
          {weeks.flat().map((key, i) => {
            if (key == null) return <span key={`f${i}`} className="h-3.5 w-3.5 sm:h-5 sm:w-5" />;
            const d = byDay.get(key);
            const n = d?.attempts ?? 0;
            return (
              <span
                key={key}
                title={`${formatDay(key)}: ${n} ${n === 1 ? 'puzzle' : 'puzzles'}`}
                className={`h-3.5 w-3.5 sm:h-5 sm:w-5 rounded-sm ${shade(n)} ${key === today ? 'ring-1 ring-foreground/60' : ''}`}
              />
            );
          })}
        </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
          <span>Fewer</span>
          {[0, 1, 5, 15, 30].map(n => <span key={n} className={`h-3 w-3 rounded-sm ${shade(n)}`} />)}
          <span>More puzzles</span>
        </div>
      </div>
    </section>
  );
}
