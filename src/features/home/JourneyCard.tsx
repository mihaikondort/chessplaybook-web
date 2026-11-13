import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { FaFire, FaTrophy } from 'react-icons/fa';
import { logHomeSection } from './homeEvents';

/*
  "Your Chess Journey": the mock's card, with its player block replaced by the call to action.
  DISPLAY ONLY (owner, 2026-11-13): "the progress card is just for display, we should not calculate any progress
  of any player". The same illustration of potential growth for every visitor: no request, no record read,
  nothing computed. Real progress lives only on the pages built for it (the training record).
*/
const DISPLAY_FIGURES = { rating: 1520, change: 24, daysThisWeek: 5, steps: [0, 6, 4, 12, 17, 20, 26] };
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* The last seven days, today on the right, so the line always reaches the right edge (owner). */
function lastSevenDays(): string[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => WEEKDAY[new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i).getDay()]);
}

export function JourneyCard() {
  const labels = useMemo(lastSevenDays, []);
  const base = DISPLAY_FIGURES.rating - DISPLAY_FIGURES.steps[DISPLAY_FIGURES.steps.length - 1];
  const week = DISPLAY_FIGURES.steps.map((d) => base + d);

  return (
    <section className="v2-card-editorial v2-glow-panel relative overflow-hidden p-5 md:p-6 grid gap-5 md:gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="v2-journey-left md:pr-6 min-w-0">
        <h2 className="font-playfair font-semibold text-[26px] md:text-[30px] leading-tight">Your Chess Journey</h2>
        <p className="text-sm md:text-[15px] text-foreground/85 mt-1.5">Track your progress and reach new milestones.</p>

        <div className="v2-journey-row mt-5 flex flex-col gap-5">
          <Link
            to="/puzzles"
            onClick={() => logHomeSection('journey', '/puzzles', 0)}
            className="v2-btn-gold inline-flex items-center justify-center gap-2 px-4 md:px-5 h-11 text-sm font-semibold whitespace-nowrap"
          >
            Solve a puzzle <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <span className="v2-journey-sep-wide w-px h-12 shrink-0 bg-border" aria-hidden />
          <div className="v2-journey-stats flex items-center justify-evenly">
            <JourneyStat
              icon={<FaFire className="shrink-0 w-[22px] h-[22px] md:w-6 md:h-6 v2-gold-icon text-link" aria-hidden />}
              value={`${DISPLAY_FIGURES.daysThisWeek}`}
              label="Days, last 7"
            />
            <span className="h-12 w-px shrink-0 bg-border" aria-hidden />
            <JourneyStat
              icon={<FaTrophy className="shrink-0 w-6 h-6 md:w-7 md:h-7 v2-gold-icon text-link" aria-hidden />}
              value={DISPLAY_FIGURES.rating.toLocaleString()}
              label="Puzzle rating"
              extra={(
                <span className="inline-flex items-center text-xs font-medium text-win">
                  <ArrowUp className="w-3 h-3" aria-hidden />{DISPLAY_FIGURES.change}
                </span>
              )}
            />
          </div>
        </div>
      </div>

      <div className="md:pl-6 md:border-l md:border-border min-w-0">
        <WeekChart week={week} labels={labels} />
      </div>
    </section>
  );
}

function JourneyStat({ icon, value, label, extra }: { icon: React.ReactNode; value: string; label: string; extra?: React.ReactNode }) {
  return (
    <div className="min-w-0 shrink-0 text-center">
      <div className="flex items-center justify-center gap-2">
        {icon}
        <span className="font-sans font-semibold text-[22px] md:text-[24px] leading-none tabular-nums">{value}</span>
        {extra}
      </div>
      <div className="text-[12px] md:text-[13px] text-foreground/85 mt-1.5 whitespace-nowrap">{label}</div>
    </div>
  );
}

/* A smooth line through the points (Catmull-Rom as cubic Beziers). */
function smoothPath(pts: (readonly [number, number])[]): string {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/*
  One loop: the line draws over DRAW% of the cycle, holds to HOLD%, fades by FADE%, stays empty to 100%, and
  starts again; a point appears as the line reaches it. Still under reduced motion (index.css).
*/
const LOOP = { DRAW: 50, HOLD: 82, FADE: 92 };

function loopKeyframes(pts: (readonly [number, number])[]): string {
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  return pts.map(([x], i) => {
    const on = Math.round((LOOP.DRAW * (x - x0)) / (x1 - x0));
    const at = Math.max(0, Math.min(on, LOOP.DRAW) - 3);
    return `@keyframes v2-loop-dot-${i} { ${at === 0 ? '0%' : `0%, ${at}%`} { opacity: ${at === 0 ? 1 : 0}; } ${Math.max(on, at + 1)}%, ${LOOP.HOLD}% { opacity: 1; } ${LOOP.FADE}%, 100% { opacity: 0; } }`;
  }).join('\n');
}

function WeekChart({ week, labels }: { week: number[]; labels: string[] }) {
  const W = 560, H = 150, PX = 22, TOP = 16, BOTTOM = 26, today = 6;
  const xs = week.map((_, i) => PX + (i * (W - 2 * PX)) / 6);
  const min = Math.min(...week), max = Math.max(...week);
  const span = Math.max(16, max - min);
  const y = (r: number) => TOP + (1 - (r - min) / span) * (H - TOP - BOTTOM - 8);
  const pts = week.map((r, i) => [xs[i], y(r)] as const);
  const line = smoothPath(pts);
  const baseY = H - BOTTOM;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full h-[150px] md:h-[164px]" role="img" aria-label="An example of a puzzle rating rising over a week">
      <defs>
        <linearGradient id="v2-week-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.30" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {xs.map((x, i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={TOP - 6} y2={baseY} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.6" />
          <text x={x} y={H} textAnchor="middle" fontSize="13" fill={i === today ? 'hsl(var(--link))' : 'hsl(var(--foreground) / 0.8)'}>{labels[i]}</text>
        </g>
      ))}
      <line x1={PX} x2={W - PX} y1={baseY} y2={baseY} stroke="hsl(var(--border))" strokeWidth="1" />
      <style>{loopKeyframes(pts)}</style>
      <path d={`${line} L${last[0]},${baseY} L${pts[0][0]},${baseY} Z`} fill="url(#v2-week-area)" className="v2-loop-area" />
      <path d={line} pathLength={1} className="v2-loop-line v2-line-glow" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.25" strokeLinecap="round" />
      {pts.map(([px, py], i) => (
        <g key={i} className="v2-loop-dot" style={{ animationName: `v2-loop-dot-${i}` }}>
          {i === pts.length - 1 && <circle cx={px} cy={py} r="13" fill="hsl(var(--primary))" className="v2-pulse" opacity="0.3" />}
          <circle cx={px} cy={py} r={i === pts.length - 1 ? 6.5 : 5} fill="hsl(var(--gold-top))" className="v2-dot-glow" />
        </g>
      ))}
    </svg>
  );
}
