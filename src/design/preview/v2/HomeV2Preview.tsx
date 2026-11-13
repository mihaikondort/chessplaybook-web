/**
 * /dev/home-v2: the homepage in design v2 (visual redesign experiment).
 *
 * DEV ONLY, never shipped. An ADAPTATION of the co-founder's mock, not a copy
 * (docs/Features Development/VISUAL_REDESIGN_ANALYSIS.md, option H2): the six
 * chooser cards stay the page's job and stay inside the first phone screen; the
 * atmosphere comes from a photograph above them, and the "alive" sections
 * (training record, champions, news) sit BELOW the chooser, outside what
 * `home_choice_click` measures.
 *
 * The control panel (bottom right) switches hero image, card style, icon colour
 * and the record's state, and can keep v2 on for every page (dev only), so the
 * Workspace pages can be looked at in the same tokens.
 *
 * Everything shown is real except the record panel's "sample" state, which is
 * labelled as sample on screen.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUp, Crown } from 'lucide-react';
import { FaFire, FaTrophy } from 'react-icons/fa';
import { featureCards } from '@/config/featureCards';
import { newsArticles } from '@/config/newsArticles';
import routeMeta from '@/config/route-meta.json';
import { logGA4Event } from '@/services/analytics';

const IMG = '/assets/images/home-preview';

/*
  Each photo: where its focal piece sits in the image (fx, fy, fractions), and how far
  right the image layer starts on desktop so that piece lands in the right half, as the
  mock's golden king does. The light and the colour grade are aimed at that point.
*/
const HEROES = [
  // The owner's first pick, 2026-11-13: carved figures read as people.
  { id: 'ivory-black', label: 'Ivory on black', fx: 0.5, fy: 0.5, left: 0.16, ratio: 1.5, fit: 'fill' },
  { id: 'golden-king', label: 'Golden king', fx: 0.49, fy: 0.52, left: 0.24, ratio: 1.5, fit: 'fill' },
  // The co-founder's AI images (2026-11-13), preview only: AI art is reference only until the owner rules on heroes (Q6).
  // Shown WHOLE by default (owner: "don't cut them but zoom them out").
  { id: 'cofounder-blue-castle', label: 'Co-founder: blue castle', fx: 0.47, fy: 0.55, left: 0.2, ratio: 1577 / 672, fit: 'whole' },
  { id: 'cofounder-sunset', label: 'Co-founder: sunset castle', fx: 0.51, fy: 0.5, left: 0.3, ratio: 1264 / 842, fit: 'whole' },
  // The owner's pick, 2026-11-13 (later): this one, filled.
  { id: 'cofounder-sunset-glass', label: 'Co-founder: sunset, glass knight', fx: 0.51, fy: 0.5, left: 0.3, ratio: 1264 / 842, fit: 'fill' },
  { id: 'wood-navy', label: 'Wood, navy backdrop', fx: 0.64, fy: 0.42, left: 0.12, ratio: 1.5, fit: 'fill' },
  { id: 'wood-close', label: 'Wood, toppled king', fx: 0.6, fy: 0.62, left: 0.16, ratio: 1.5, fit: 'fill' },
] as const;
type HeroFit = 'fill' | 'whole';
type HeroId = (typeof HEROES)[number]['id'];

const MASTERS = ['Capablanca', 'Alekhine', 'Botvinnik', 'Fischer', 'Kasparov', 'Carlsen', 'Gukesh'];


interface PlayerInfo { fullName: string; championshipYears: string }

export default function HomeV2Preview() {
  const [hero, setHeroId] = useState<HeroId>('cofounder-sunset-glass');
  const [fit, setFit] = useState<HeroFit>('fill');
  // Each photo opens in its own default fit; the Fit switch overrides it.
  const setHero = (id: HeroId) => { setHeroId(id); setFit(HEROES.find((h) => h.id === id)!.fit); };
  const [cardStyle, setCardStyle] = useState<'flat' | 'lift'>('flat');
  const [hues, setHues] = useState(false);
  const [designOn, setDesignOn] = useState(true);
  const [everyPage, setEveryPage] = useState(() => {
    try { return localStorage.getItem('cpb.designPreview') === 'v2'; } catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (designOn) root.setAttribute('data-design', 'v2'); else root.removeAttribute('data-design');
    return () => { if (!everyPage) root.removeAttribute('data-design'); };
  }, [designOn, everyPage]);

  useEffect(() => {
    try {
      if (everyPage) localStorage.setItem('cpb.designPreview', 'v2');
      else localStorage.removeItem('cpb.designPreview');
    } catch { /* ignore */ }
  }, [everyPage]);

  const heroCfg = HEROES.find((h) => h.id === hero)!;

  return (
    <div data-card-style={cardStyle} className="bg-background text-foreground">
      <GoldGradientDefs />
      <Stage hero={heroCfg} fit={fit} hues={hues} cardStyle={cardStyle} />
      <AliveSections />
      <Controls
        hero={hero} setHero={setHero}
        fit={fit} setFit={setFit}
        cardStyle={cardStyle} setCardStyle={setCardStyle}
        hues={hues} setHues={setHues}
        designOn={designOn} setDesignOn={setDesignOn}
        everyPage={everyPage} setEveryPage={setEveryPage}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- stage */

const WRAP = 'mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-[3.5vw]';

/* The gradient every gold icon strokes or fills with (`.v2-gold-icon` in index.css). */
function GoldGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="v2-gold-grad" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--gold-top))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--gold-bottom))' }} />
        </linearGradient>
        {/* For filled icons of any viewBox (the trophy is 576x512): the gradient follows each shape. */}
        <linearGradient id="v2-gold-grad-bb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--gold-top))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--gold-bottom))' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/*
  ONE STAGE FOR THE HEADLINE AND THE CARDS. Round 1 faded the photo out before the
  cards and kept it off the left; measured on the owner's screen that left 37% of the
  hero near-black against the mock's 24%, and the cards sat on flat darkness. Here the
  photo runs behind both, darkened toward the text, with a warm key light on the focal
  piece, a vignette and fine grain; the cards are glass over it.
*/
function Stage({ hero, fit, hues, cardStyle }: { hero: (typeof HEROES)[number]; fit: HeroFit; hues: boolean; cardStyle: 'flat' | 'lift' }) {
  const meta = routeMeta[''] as { heading: string; body: string };
  const words = meta.heading.split(' ');
  const plain = words.slice(0, -2).join(' ');
  const gold = words.slice(-2).join(' ');
  const fxDesktop = fit === 'whole' ? '68%' : `${Math.round((hero.left + hero.fx * (1 - hero.left)) * 100)}%`;

  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ ['--fx' as string]: fxDesktop, ['--fy' as string]: '36%' }}
    >
      {fit === 'fill' ? (
        <div
          className="absolute inset-x-0 top-0 h-[300px] md:h-full md:left-[var(--img-left)] -z-10 overflow-hidden v2-stage-imgwrap"
          style={{ ['--img-left' as string]: `${hero.left * 100}%` }}
          aria-hidden
        >
          <picture>
            <source media="(max-width: 767px)" srcSet={`${IMG}/hero-${hero.id}-1200.webp`} />
            <source srcSet={`${IMG}/hero-${hero.id}-2400.webp`} />
            <img
              src={`${IMG}/hero-${hero.id}-1200.webp`}
              alt=""
              className="v2-stage-img v2-kenburns w-full h-full object-cover"
              style={{ objectPosition: `${hero.fx * 100}% ${hero.fy * 100}%` }}
              fetchPriority="high"
            />
          </picture>
        </div>
      ) : (
        /* WHOLE: the box takes the image's own proportions (full stage height on desktop, full width on a phone),
           so nothing is cropped; its edges are feathered into the page instead of ending in a hard frame. */
        <div
          className="v2-stage-whole absolute top-0 inset-x-0 w-full md:left-auto md:right-0 md:w-auto md:h-full -z-10"
          style={{ aspectRatio: `${hero.ratio}` }}
          aria-hidden
        >
          <picture>
            <source media="(max-width: 767px)" srcSet={`${IMG}/hero-${hero.id}-1200.webp`} />
            <source srcSet={`${IMG}/hero-${hero.id}-2400.webp`} />
            <img src={`${IMG}/hero-${hero.id}-1200.webp`} alt="" className="v2-stage-img w-full h-full object-cover" fetchPriority="high" />
          </picture>
        </div>
      )}
      <div className="v2-stage-shade absolute inset-0 -z-10" aria-hidden />
      <div className="v2-stage-light absolute inset-0 -z-10" aria-hidden />
      <div className="v2-stage-vignette absolute inset-0 -z-10" aria-hidden />
      <div className="v2-grain absolute inset-0 -z-10" aria-hidden />

      <div className={`${WRAP} h-[250px] md:h-auto md:pt-[clamp(32px,5.5svh,64px)] flex flex-col justify-end pb-6 md:pb-10`}>
        <h1 className="[text-shadow:0_2px_24px_hsl(var(--background))] font-playfair font-semibold leading-[1.02] tracking-[-0.015em] text-[34px] md:text-[clamp(48px,5.4vw,104px)] max-w-[16ch]">
          {plain}{' '}<span className="v2-gold-text [text-shadow:none]">{gold}</span>
        </h1>
        <p className="[text-shadow:0_1px_12px_hsl(var(--background))] mt-2 md:mt-5 max-w-[36rem] text-sm md:text-[19px] text-foreground/90 leading-snug">
          {meta.body}
        </p>
      </div>

      <div className={`${WRAP} grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-10 md:pb-14`}>
        {featureCards.map((f, index) => (
          <Link
            key={f.href}
            to={f.href}
            onClick={() => logGA4Event({ name: 'home_choice_click', params: { to: f.href, position: index } })}
            className={`group ${cardStyle === 'lift' ? 'v2-card' : 'v2-card-glass'} relative flex flex-col md:flex-row md:items-center gap-2 md:gap-5 p-3 md:px-6 h-[96px] md:h-[100px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5 active:translate-y-px`}
          >
            <f.icon
              className={`w-7 h-7 md:w-10 md:h-10 shrink-0 ${hues ? (f.tier === 'secondary' ? 'text-muted-foreground' : f.iconColor) : 'v2-gold-icon text-link'}`}
              {...({ strokeWidth: 1.5 } as object)}
            />
            <div className="min-w-0 flex-1 mt-auto md:mt-0">
              <h2 className="font-playfair font-semibold text-[18px] md:text-[23px] leading-tight">
                <span className="md:hidden">{f.shortTitle ?? f.title}</span>
                <span className="hidden md:inline">{f.title}</span>
              </h2>
              <p className="hidden md:line-clamp-2 text-[13px] text-muted-foreground leading-snug mt-1">
                {f.description}
              </p>
            </div>
            <span className="v2-arrow v2-arrow-lg absolute top-3 right-3 md:static" aria-hidden>
              <ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" strokeWidth={2.5} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- alive parts */

function AliveSections() {
  const [players, setPlayers] = useState<Record<string, PlayerInfo> | null>(null);
  useEffect(() => {
    fetch('/assets/players/players_list.json').then((r) => r.json()).then(setPlayers).catch(() => setPlayers(null));
  }, []);

  return (
    <div className={`${WRAP} pt-4 md:pt-6 pb-16 space-y-10 md:space-y-14`}>
      {/* The chooser's own grid (3 columns, 16px gaps), so these edges fall on the cards above:
          the record and the champions strip span two columns, Fischer and the news one. */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0 flex [&>*]:flex-1"><Journey /></div>
        <FeaturedChampion players={players} />
      </div>
      <div className="grid gap-8 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0"><Masters /></div>
        <LatestNews />
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, link, linkLabel }: { title: string; sub?: string; link?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="font-playfair font-semibold text-[26px] md:text-[32px] leading-tight">{title}</h2>
        {sub && <p className="text-sm md:text-[15px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {link && (
        <Link to={link} className="shrink-0 text-[13px] text-link hover:underline inline-flex items-center gap-1 pb-1">
          {linkLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/*
  "Your Chess Journey", the mock's card (owner, 2026-11-13), with the mock's player block replaced by the call to
  action. A display-only illustration (see Journey below): the slots read "Days, last 7" and "Puzzle rating" where
  the mock has a streak and a "puzzle score", and the chart is a rolling seven days ending today, drawn in a loop.
*/
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/*
  THE LAST SEVEN DAYS, TODAY ON THE RIGHT (owner, 2026-11-13: the line should run to the end
  like the mock's). A Monday-to-Sunday week cannot: on a Friday, Saturday and Sunday have not
  happened. A rolling week always ends today, so the line always reaches the right edge.
*/
function thisWeek(): { days: string[]; labels: string[]; today: number } {
  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + i));
  return { days: dates.map(isoDay), labels: dates.map((d) => WEEKDAY[d.getDay()]), today: 6 };
}

interface JourneyFigures {
  rating: number | null;
  change: number | null;
  daysThisWeek: number;
  week: (number | null)[];
  hasRecord: boolean;
}

/*
  DISPLAY ONLY (owner, 2026-11-13): "the progress card is just for display, we should not calculate any progress
  of any player". The same illustrative week for every visitor: no request, no record read, nothing computed.
*/
const DISPLAY_FIGURES = { rating: 1520, change: 24, daysThisWeek: 5, steps: [0, 6, 4, 12, 17, 20, 26] };

function Journey() {
  const { labels, today } = useMemo(thisWeek, []);
  const base = DISPLAY_FIGURES.rating - DISPLAY_FIGURES.steps[DISPLAY_FIGURES.steps.length - 1];
  const figures: JourneyFigures = {
    rating: DISPLAY_FIGURES.rating,
    change: DISPLAY_FIGURES.change,
    daysThisWeek: DISPLAY_FIGURES.daysThisWeek,
    week: DISPLAY_FIGURES.steps.map((d) => base + d),
    hasRecord: true,
  };

  return (
    <section className="v2-card-editorial v2-glow-panel relative overflow-hidden p-5 md:p-6 grid gap-5 md:gap-0 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="md:pr-6 min-w-0">
        <h2 className="font-playfair font-semibold text-[26px] md:text-[30px] leading-tight">Your Chess Journey</h2>
        <p className="text-sm md:text-[15px] text-foreground/85 mt-1.5">Track your progress and reach new milestones.</p>

        <div className="mt-5 grid grid-cols-[1fr_1px_1fr] md:grid-cols-[auto_1px_1fr_1px_1fr] items-center gap-x-4 gap-y-5 md:gap-x-5">
          <Link to="/puzzles" className="v2-btn-gold col-span-3 md:col-span-1 inline-flex items-center justify-center gap-2 px-4 md:px-5 h-11 text-sm font-semibold whitespace-nowrap">
            {figures.hasRecord ? 'Solve a puzzle' : 'Solve your first puzzle'} <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <span className="hidden md:block h-12 bg-border" aria-hidden />
          <JourneyStat
            icon={<FaFire className="shrink-0 w-[22px] h-[22px] md:w-6 md:h-6 v2-gold-icon text-link" aria-hidden />}
            value={`${figures.daysThisWeek}`}
            label="Days, last 7"
          />
          <span className="h-12 bg-border" aria-hidden />
          <JourneyStat
            icon={<FaTrophy className="shrink-0 w-6 h-6 md:w-7 md:h-7 v2-gold-icon text-link" aria-hidden />}
            value={figures.rating != null ? figures.rating.toLocaleString() : '—'}
            label="Puzzle rating"
            extra={figures.change != null && figures.change !== 0 ? (
              <span className={`inline-flex items-center text-xs font-medium ${figures.change > 0 ? 'text-win' : 'text-loss'}`}>
                <ArrowUp className={`w-3 h-3 ${figures.change < 0 ? 'rotate-180' : ''}`} aria-hidden />{Math.abs(figures.change)}
              </span>
            ) : null}
          />
        </div>
      </div>

      <div className="md:pl-6 md:border-l md:border-border min-w-0">
        <WeekChart week={figures.week} today={today} labels={labels} />
      </div>
    </section>
  );
}

function JourneyStat({ icon, value, label, extra }: { icon: React.ReactNode; value: string; label: string; extra?: React.ReactNode }) {
  return (
    <div className="min-w-0 text-center">
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
  if (pts.length < 2) return '';
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
  One loop of the chart: the line draws over DRAW% of the cycle, holds until HOLD%, fades out by FADE%, and stays
  empty to 100% before starting again. A point appears when the line reaches its x (the path runs left to right,
  so its length grows almost in step with x). Off entirely under reduced motion (index.css).
*/
const LOOP = { DRAW: 50, HOLD: 82, FADE: 92 };

function loopKeyframes(pts: (readonly [number, number])[]): string {
  const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
  return pts.map(([x], i) => {
    // Fully in as the line arrives: start 3% earlier, never at or past DRAW (a shared percentage would merge frames).
    const on = Math.round((LOOP.DRAW * (x - x0)) / (x1 - x0));
    const at = Math.max(0, Math.min(on, LOOP.DRAW) - 3);
    return `@keyframes v2-loop-dot-${i} { ${at === 0 ? '0%' : `0%, ${at}%`} { opacity: ${at === 0 ? 1 : 0}; } ${Math.max(on, at + 1)}%, ${LOOP.HOLD}% { opacity: 1; } ${LOOP.FADE}%, 100% { opacity: 0; } }`;
  }).join('\n');
}

function WeekChart({ week, today, labels }: { week: (number | null)[]; today: number; labels: string[] }) {
  const W = 560, H = 150, PX = 22, TOP = 16, BOTTOM = 26;
  const xs = week.map((_, i) => PX + (i * (W - 2 * PX)) / 6);
  const known = week.map((r, i) => (r != null ? [i, r] as const : null)).filter(Boolean) as (readonly [number, number])[];
  const values = known.map(([, r]) => r);
  const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1;
  const span = Math.max(16, max - min);
  const y = (r: number) => TOP + (1 - (r - min) / span) * (H - TOP - BOTTOM - 8);
  const pts = known.map(([i, r]) => [xs[i], y(r)] as const);
  const line = smoothPath(pts);
  const baseY = H - BOTTOM;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-full h-[150px] md:h-[164px]" role="img"
      aria-label={known.length ? 'Your puzzle rating at the end of each of the last seven days' : 'The last seven days, waiting for your first puzzle'}>
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

      {pts.length >= 2 && (
        <>
          {/* THE LOOP (owner, 2026-11-13): the line draws in slowly, holds, fades, and starts again; each point
              appears as the line reaches it. One cycle is LOOP_MS; the keyframes below share its percentages. */}
          <style>{loopKeyframes(pts)}</style>
          <path d={`${line} L${last[0]},${baseY} L${pts[0][0]},${baseY} Z`} fill="url(#v2-week-area)" className="v2-loop-area" />
          <path d={line} pathLength={1} className="v2-loop-line v2-line-glow" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.25" strokeLinecap="round" />
        </>
      )}
      {pts.map(([px, py], i) => (
        <g key={i} className="v2-loop-dot" style={{ animationName: `v2-loop-dot-${i}` }}>
          {i === pts.length - 1 && <circle cx={px} cy={py} r="13" fill="hsl(var(--primary))" className="v2-pulse" opacity="0.3" />}
          <circle cx={px} cy={py} r={i === pts.length - 1 ? 6.5 : 5} fill="hsl(var(--gold-top))" className="v2-dot-glow" />
        </g>
      ))}

      {/* No record yet: the empty week, with today waiting for the first point. */}
      {!pts.length && (
        <>
          {xs.map((x, i) => i !== today && (
            <circle key={i} cx={x} cy={baseY - 40} r="3.5" fill="none" stroke="hsl(var(--border-strong))" strokeWidth="1.25" opacity={i < today ? 0.9 : 0.45} />
          ))}
          <circle cx={xs[today]} cy={baseY - 40} r="13" fill="hsl(var(--primary))" className="v2-pulse" opacity="0.3" />
          <circle cx={xs[today]} cy={baseY - 40} r="6" fill="hsl(var(--gold-top))" className="v2-dot-glow" />
        </>
      )}
    </svg>
  );
}

/*
  ROTATION, owner 2026-11-13: three featured champions (Fischer, Kasparov, Carlsen) taking
  turns, and the strip showing all 18 over time. Two rules hold both:
  - it stops while a reader is on it (hover or keyboard focus), in a background tab, and
    entirely for visitors who ask for reduced motion (WCAG 2.2.2: anything that moves on its
    own for more than 5 seconds needs a way to stop it);
  - it never touches the chooser above, whose clicks are measured by position.
*/
/*
  Reduced motion is CSS's answer, not a JS media query (the reentry guard keeps layout and
  media decisions in CSS): `--v2-motion` is 0 under `prefers-reduced-motion: reduce`.
  Read on every tick, so a change in the OS setting applies without a reload.
*/
function motionAllowed(): boolean {
  return getComputedStyle(document.documentElement).getPropertyValue('--v2-motion').trim() !== '0';
}

/* Calls `tick` every `ms` unless paused, the tab is hidden, or motion is reduced. */
function useTicker(tick: () => void, ms: number, paused: boolean) {
  const ref = useRef(tick);
  ref.current = tick;
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && motionAllowed()) ref.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused]);
}

/* Pause while the pointer is over the element or focus is inside it. */
function usePauseHandlers() {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  return {
    paused: hover || focus,
    handlers: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onFocus: () => setFocus(true),
      onBlur: (e: React.FocusEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(false); },
    },
  };
}

const FEATURED = ['Fischer', 'Kasparov', 'Carlsen'];

function FeaturedChampion({ players }: { players: Record<string, PlayerInfo> | null }) {
  const [index, setIndex] = useState(0);
  const { paused, handlers } = usePauseHandlers();
  useTicker(() => setIndex((i) => (i + 1) % FEATURED.length), 7000, paused);
  const key = FEATURED[index];
  const info = players?.[key];

  return (
    <div className="relative h-full min-h-[200px]" {...handlers}>
      <Link to={`/champions/${key.toLowerCase()}/games`} className="group v2-card-editorial relative overflow-hidden h-full min-h-[200px] flex">
        {/* All three portraits stay mounted and cross-fade, so a change never flashes the card empty. */}
        {FEATURED.map((k, i) => (
          <img
            key={k}
            src={`${IMG}/portraits/${k}.webp`}
            alt=""
            className={`v2-photo-fade-right absolute inset-y-0 left-0 h-full w-[50%] object-cover object-[50%_20%] transition-[opacity,transform] duration-700 group-hover:scale-[1.03] ${i === index ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <img
          key={`c-${key}`}
          src={`${IMG}/portraits-color/${key}.webp`}
          alt=""
          className="v2-color-reveal v2-photo-fade-right absolute inset-y-0 left-0 h-full w-[50%] object-cover object-[50%_20%] group-hover:scale-[1.03]"
        />
        {/* No overlay: the photo fades itself out (v2-photo-fade-right), so it dissolves into the card in any
            theme. The overlay it replaced reached the card colour only at 60%, past the photo's edge at 50%,
            which left a hard grey-to-white edge in light (owner, 2026-11-13). */}
        <div key={key} className="v2-fade-in-late relative ml-auto w-[55%] p-5 flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-link"><Crown className="w-3.5 h-3.5" aria-hidden />Featured champion</span>
          <h3 className="font-playfair font-semibold text-[26px] leading-tight mt-2">{info?.fullName ?? key}</h3>
          <p className="text-sm text-muted-foreground mt-1">{info?.championshipYears ?? ''}</p>
          <span className="mt-4 text-[13px] text-link inline-flex items-center gap-1 group-hover:underline">Explore his games <ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
        </div>
        <div className="v2-ring-warm absolute inset-0 pointer-events-none" aria-hidden />
      </Link>
      {/* Pick one directly; also the visible sign that the card changes. */}
      <div className="absolute bottom-3 right-4 flex gap-1.5" role="group" aria-label="Featured champion">
        {FEATURED.map((k, i) => (
          <button
            key={k}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={k}
            aria-pressed={i === index}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong hover:bg-muted-foreground'}`}
          />
        ))}
      </div>
    </div>
  );
}

const ALL_CHAMPIONS = ['Steinitz', 'Lasker', 'Capablanca', 'Alekhine', 'Euwe', 'Botvinnik', 'Smyslov', 'Tal', 'Petrosian', 'Spassky', 'Fischer', 'Karpov', 'Kasparov', 'Kramnik', 'Anand', 'Carlsen', 'Ding', 'Gukesh'];

function Masters() {
  const [slots, setSlots] = useState<string[]>(MASTERS);
  const [previous, setPrevious] = useState<(string | null)[]>(() => MASTERS.map(() => null));
  // Which cards are on screen is CSS's answer (3, 4 or 7 by breakpoint); read it from the cards, never from the window.
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { paused, handlers } = usePauseHandlers();

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  // One card at a time: a random visible slot takes a random champion not already showing.
  useTicker(() => {
    const cur = slotsRef.current;
    const visible = cardRefs.current.filter((el) => el && el.offsetParent !== null).length || 3;
    const shown = new Set(cur.slice(0, visible));
    const pool = ALL_CHAMPIONS.filter((c) => !shown.has(c));
    if (!pool.length) return;
    const slot = Math.floor(Math.random() * visible);
    const incoming = pool[Math.floor(Math.random() * pool.length)];
    setPrevious((p) => p.map((v, i) => (i === slot ? cur[slot] : v)));
    setSlots(cur.map((v, i) => (i === slot ? incoming : v)));
  }, 3200, paused);

  return (
    <section {...handlers}>
      <SectionHeader title="Learn from the champions" sub="Replay the games of all 18 World Champions." link="/champions" linkLabel="All champions" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5 md:gap-3">
        {slots.map((k, i) => (
          <Link
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            to={`/champions/${k.toLowerCase()}/games`}
            className={`v2-portrait group relative block overflow-hidden rounded-[10px] aspect-[4/5] ring-1 ring-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i >= 4 ? 'hidden md:block' : i >= 3 ? 'hidden sm:block' : ''}`}
          >
            {/* The outgoing portrait stays underneath while the new one fades in over it. */}
            {previous[i] && previous[i] !== k && (
              <img src={`${IMG}/portraits/${previous[i]}.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <img key={k} src={`${IMG}/portraits/${k}.webp`} alt="" loading="lazy" className="v2-fade-in relative w-full h-full object-cover" />
            {/* The co-founder's idea: toned at rest, the photo as taken on hover (colour for the modern champions,
                the original print for the rest). Same crop and light, so the colour seeps in, nothing jumps. */}
            <img key={`c-${k}`} src={`${IMG}/portraits-color/${k}.webp`} alt="" loading="lazy" className="v2-color-reveal absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent" aria-hidden />
            <span key={`n-${k}`} className="v2-fade-in absolute bottom-2 left-2.5 right-2 font-playfair font-semibold text-[15px] md:text-[16px] leading-tight">
              {k}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LatestNews() {
  return (
    <section className="v2-card-editorial h-full px-5 pt-4 pb-2 flex flex-col">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-playfair font-semibold text-[22px]">Latest news</h2>
        <Link to="/news" className="text-[13px] text-link hover:underline inline-flex items-center gap-1">All news <ArrowRight className="w-3.5 h-3.5" aria-hidden /></Link>
      </div>
      <ul className="divide-y divide-border flex-1 flex flex-col justify-around">
        {newsArticles.slice(0, 3).map((a) => (
          <li key={a.href}>
            <Link to={a.href} className="group flex items-center gap-3 py-2.5">
              <img src={a.image} alt="" loading="lazy" className="v2-warm-thumb w-[64px] h-[42px] rounded-md object-cover shrink-0 ring-1 ring-border" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-link">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.date}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- controls */

interface ControlsProps {
  hero: HeroId; setHero: (h: HeroId) => void;
  fit: HeroFit; setFit: (f: HeroFit) => void;
  cardStyle: 'flat' | 'lift'; setCardStyle: (s: 'flat' | 'lift') => void;
  hues: boolean; setHues: (b: boolean) => void;
  designOn: boolean; setDesignOn: (b: boolean) => void;
  everyPage: boolean; setEveryPage: (b: boolean) => void;
}

function Controls(p: ControlsProps) {
  const [open, setOpen] = useState(true);
  return (
    <aside className="fixed bottom-3 right-3 z-50 w-[250px] rounded-lg bg-popover text-popover-foreground ring-1 ring-border shadow-2xl text-xs">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3 py-2 font-semibold flex justify-between">
        Preview controls (dev) <span aria-hidden>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5">
          <Row label="Hero">
            <select value={p.hero} onChange={(e) => p.setHero(e.target.value as HeroId)} className="w-full bg-input/40 rounded px-1.5 py-1">
              {HEROES.map((h) => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
          </Row>
          <Row label="Photo"><Seg value={p.fit} options={['fill', 'whole']} onChange={(v) => p.setFit(v as HeroFit)} /></Row>
          <Row label="Cards"><Seg value={p.cardStyle} options={['flat', 'lift']} onChange={(v) => p.setCardStyle(v as 'flat' | 'lift')} /></Row>
          <Row label="Icons"><Seg value={p.hues ? 'hues' : 'gold'} options={['gold', 'hues']} onChange={(v) => p.setHues(v === 'hues')} /></Row>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.designOn} onChange={(e) => p.setDesignOn(e.target.checked)} />Design v2 tokens (off = today's colours)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.everyPage} onChange={(e) => p.setEveryPage(e.target.checked)} />Keep v2 on every page</label>
        </div>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid grid-cols-[52px_1fr] items-center gap-2"><span className="text-muted-foreground">{label}</span>{children}</div>;
}

function Seg({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded overflow-hidden ring-1 ring-border">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={`flex-1 py-1 capitalize ${value === o ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{o}</button>
      ))}
    </div>
  );
}
