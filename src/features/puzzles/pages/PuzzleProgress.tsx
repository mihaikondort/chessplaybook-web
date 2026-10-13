/**
 * The training record (TRAINING_SYSTEM C7 — route and shell).
 *
 * ONE route with views, not four pages (plan §5 C3–C5). This file owns the
 * route, the data states and the frame; the views that fill it are C8 (per-area
 * performance with confidence gating) and C9 (strengths, weak areas, coverage,
 * history, one click to train).
 *
 * NOT behind `ProtectedRoute`, unlike `/profile`. The attempt log is keyed on a
 * Cognito sub OR a raw anonymous UUID, and most traffic has no account — gating
 * this would show an empty page to the majority of the people who have a
 * record. Signing in is offered where the data would otherwise be lost, never
 * as a toll gate.
 *
 * Not in the sitemap either: it is one person's record, it renders empty to a
 * crawler, and there is nothing here for search. It still carries real meta
 * (via route-meta) so it never inherits the homepage's, which is the drift the
 * 2026-07-28 audit found on eight routes.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import SeoHead from '@/components/SeoHead';
import { Target, ArrowLeft, AlertCircle, CalendarDays, ChevronRight } from 'lucide-react';
import { setAreaPreference } from '../services/PlanApi';
import {
  fetchPuzzleProgress,
  confidenceNote,
  motifLabel,
  AREA_LABELS,
  type AreaProgress,
  type MotifProgress,
  type PuzzleProgressData,
  type PuzzleArea,
} from '../services/ProgressService';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: PuzzleProgressData };

/**
 * Has this player trained anything at all?
 *
 * Deliberately `totalAttempts`, not "is there a rating" — a player who has
 * revealed twenty endgames and rated nothing has trained, and telling them they
 * have no record would contradict the coverage rule the whole substrate is
 * built on (C5).
 */
function hasRecord(data: PuzzleProgressData): boolean {
  return data.summary.totalAttempts > 0;
}

export default function PuzzleProgress() {
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    fetchPuzzleProgress(controller.signal)
      .then(data => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(err => {
        if (cancelled || controller.signal.aborted) return;
        /*
          An abort is not a failure, whoever caused it. Navigating away is the
          usual one, and there the component is gone so nothing renders — but a
          browser can abort an in-flight request on its own, and "your record
          could not be loaded" is then a lie told to someone whose record is
          fine. Checked by NAME rather than by our own flag, because the flag
          only knows about the aborts we initiated.
        */
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  return (
    <div className="bg-background">
      <SeoHead routeKey="puzzles/progress" />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link
            to="/puzzles"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to training
          </Link>
        </div>

        {/*
          THE RECORD AND THE PLAN ARE TWO HALVES OF ONE QUESTION (owner,
          2026-08-06, on the plan page being reachable only from the trainer).

          This page says how you are doing; the plan says what to do about it.
          Someone reading their own weak areas is exactly the person for whom
          "and here is a schedule that trains them" is the next sentence — and
          this is the ungated place to say it, since plan routes take an
          anonymous UUID and most traffic has no account.

          A quiet link beside the heading, not a card and not a pitch: the page
          they asked for is the record, and an offer that outshouted it would be
          the upsell the PRD excludes on the pages where concentration is the
          product.
        */}
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Your training record</h1>
            <p className="text-sm text-muted-foreground">
              Where you stand, and what you have not trained yet.
            </p>
          </div>
          <Link
            to="/puzzles/plan"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Your training plan
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/*
          THE OTHER HALF OF THE SOFT-ACCOUNT RULE (rehomed 2026-08-06).

          "Prompt at the precise moment data needs to persist, never block the
          flow." The end-of-run prompt was the moment this system used, and it
          went with the run summary the panel rebuild deleted — leaving the
          trainer's standing "Sign in to save" link as the only ask, which is
          permanent and therefore easy to stop seeing.

          This page is the better moment anyway, and it had NO prompt at all: a
          signed-out player could read their entire record — every attempt, every
          area, months of history — with nothing saying it lives on this device
          and this browser. That is the one screen where what would be lost is
          itemised in front of them.

          Below the record, not above it. They came to read it, and an ask that
          arrives before the thing they asked for is a toll gate wearing an
          offer's clothes.
        */}
        {state.status === 'loading' && <LoadingShell />}
        {state.status === 'error' && <ErrorPanel message={state.message} />}
        {state.status === 'ready' && (
          hasRecord(state.data) ? <RecordShell data={state.data} /> : <EmptyRecord />
        )}
        {state.status === 'ready' && hasRecord(state.data) && !user && <SaveThisRecord />}
      </main>
    </div>
  );
}

/**
 * The loading state reserves the space the real content takes.
 *
 * B10's rule, applied to a second page: a block that appears where nothing was
 * moves everything below it, and this page's content arrives on a network
 * round trip, so the shift is guaranteed rather than occasional.
 */
/**
 * What a signed-out player would lose, said once, at the bottom.
 *
 * No number in it. The counts are directly above and repeating them here would
 * be the same fact twice, one of them louder — and a prompt that has to shout
 * its own evidence is admitting the evidence is not enough.
 */
function SaveThisRecord() {
  const location = useLocation();
  return (
    <div className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm text-foreground">This record lives on this device.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in and it follows you to any browser you use — along with your rating,
        your plan and everything you have solved.
      </p>
      <Link
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        className="mt-3 inline-flex px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
      >
        Sign in
      </Link>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your training record</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 h-[86px] animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 h-[104px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Your record could not be loaded.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nothing has been lost — this page could not reach the server. Try again in a moment.
          </p>
          <p className="text-xs text-muted-foreground mt-3 font-mono">{message}</p>
          <Link
            to="/puzzles"
            className="inline-block mt-4 text-sm font-medium text-link hover:underline"
          >
            Back to training
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * No attempts yet.
 *
 * Says what to do, not what is missing. A record page that opens with three
 * empty charts teaches a first-time visitor nothing except that they are behind.
 */
function EmptyRecord() {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">Nothing to show yet.</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Solve a few puzzles and this page will show where you stand in tactics, middlegames
        and endgames — including the areas you have not touched.
      </p>
      <Link
        to="/puzzles"
        className="inline-block mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Start training
      </Link>
    </div>
  );
}

/*
  THE COVERAGE-WINDOW LINE IS GONE (owner, 2026-08-07: "that mention is not
  useful at all, nobody cares if some early days puzzle solves are missing,
  from now on all is recorded anyway").

  It read "Counting positions since <date>. Your all-time solve count and rating
  are on the trainer." and it existed for a real reason: the attempt log began
  on 2026-08-03, nothing before it can be backfilled, and so this page's totals
  were legitimately smaller than the trainer's and the leaderboard's — which the
  owner first met as a three-way contradiction (338 solved in one place, 90
  attempted in another).

  What has changed is not the fact but its shelf life. The gap is fixed in size
  and every day of use makes it a smaller fraction of the record, so a permanent
  banner explaining a shrinking discrepancy costs more attention than it saves.
  `summary.firstAttemptAt` still comes down the wire and is untouched, so this is
  reversible by rendering it again — nothing was thrown away but the sentence.
*/
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/**
 * One area, and the decision of whether it may show a number (C8).
 *
 * `performance` is null below the minimum sample, and null MUST NOT render as
 * 0 or as a dash pretending to be a rating: the difference between "we do not
 * know yet" and "you scored nothing" is the whole point of the gate. So the
 * unrated states say what they are, in words, and only an earned figure appears
 * as a figure.
 */
/**
 * More or less of this area, in future plans (owner, 2026-08-05; rehomed here
 * 2026-08-06).
 *
 * WHY IT LIVES HERE NOW. It was built at the run summary, which the panel
 * rebuild deleted — so the control had no surface, while its table, its
 * endpoint and the plan generation that reads it all stayed live and working.
 * The record page is the better home anyway: it is the ONLY surface that
 * discusses areas one at a time, so the question is asked next to the evidence
 * that answers it.
 *
 * AND IT IS STILL NOT ASKED ON THE PACING NOTE. That was decided on 2026-08-05
 * and the reasoning is unchanged: the note fires precisely when someone is
 * stuck, so the answer would measure frustration. Here they are reading their
 * own record, calmly, having chosen to.
 *
 * `less` MOVES AN AREA BACK, IT NEVER DROPS IT. That is the generator's rule
 * (C5's ranking still applies), and it is why the control can be offered at all
 * — a player who avoids endgames must not be able to avoid them faster.
 *
 * Optimistic and unawaited: this is a preference, not a transaction, and making
 * someone wait on a round trip to say "more endgames" would be the slowest
 * possible way to answer a question nobody had to answer at all. A failed write
 * puts the control back, because a control showing a choice the server never
 * took is the defect this phase found twice in the ratings.
 */
function AreaPreferenceControl({ area, value, onChange }: {
  area: PuzzleArea;
  value: 'more' | 'less' | undefined;
  onChange: (next: 'more' | 'less' | null) => void;
}) {
  const label = AREA_LABELS[area].toLowerCase();
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">In my training plans:</span>
      {(['more', 'less'] as const).map(choice => {
        const on = value === choice;
        return (
          <button
            key={choice}
            type="button"
            // Pressing the lit one clears it: "I no longer have an opinion" is a
            // real answer, and the endpoint takes null for exactly that.
            onClick={() => onChange(on ? null : choice)}
            aria-pressed={on}
            aria-label={on
              ? `Stop asking for ${choice} ${label}`
              : `Ask for ${choice} ${label} in future plans`}
            className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
              on
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {choice === 'more' ? 'More' : 'Less'}
          </button>
        );
      })}
    </div>
  );
}

function AreaRow({ area, preference, onPreference }: {
  area: AreaProgress;
  preference: 'more' | 'less' | undefined;
  onPreference: (area: PuzzleArea, next: 'more' | 'less' | null) => void;
}) {
  const note = confidenceNote(area.confidence, area.rated);

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-baseline justify-between gap-4">
      <div>
        <div className="font-medium">{AREA_LABELS[area.area]}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {area.attempts === 0
            ? 'Not trained yet'
            : `${area.attempts} attempted · ${area.solved} solved`}
        </div>
        <AreaPreferenceControl
          area={area.area}
          value={preference}
          onChange={next => onPreference(area.area, next)}
        />
      </div>
      <div className="flex items-baseline gap-4">
        <TrainLink to={`/puzzles?area=${area.area}`} label={`Train ${AREA_LABELS[area.area].toLowerCase()}`} />
      <div className="text-right">
        {area.performance == null ? (
          <div className="text-sm text-muted-foreground">
            {area.attempts === 0 ? 'No result yet' : 'Not enough rated attempts'}
          </div>
        ) : (
          <>
            <div className="text-lg font-bold leading-tight">
              {area.performance}
              {area.confidence === 'provisional' && (
                <span className="ml-1 align-top text-xs font-medium text-muted-foreground">?</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">performance</div>
          </>
        )}
        {note && area.performance != null && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{note}</div>
        )}
      </div>
      </div>
    </div>
  );
}

/**
 * "Train this", and it has to be true.
 *
 * The link carries `?area=` or `?theme=`, which the trainer reads on mount and
 * lets beat its remembered filter. Area is a real server-side filter (C9) and
 * NOT the `middlegame` theme: that theme includes every middlegame puzzle
 * carrying a tactical pattern, and the C1 rule files those under Tactics — so
 * a link promising middlegame training would have served puzzles the player's
 * own record counts as something else.
 */
function TrainLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-xs font-medium text-link hover:underline whitespace-nowrap"
    >
      {label} →
    </Link>
  );
}

/**
 * Motifs the player is measurably good or bad at.
 *
 * ONLY motifs whose accuracy the server was willing to compute appear here —
 * below the minimum sample there is no claim to rank on, and sorting
 * insufficient evidence produces a confident-looking list of noise. A player
 * with one lucky fork should not be told forks are a strength.
 */
const STRONG_AT = 0.7;

function rankedMotifs(motifs: MotifProgress[]): { strong: MotifProgress[]; weak: MotifProgress[] } {
  /*
    Judged motifs only, and asserted rather than defaulted. An earlier version
    wrote `m.accuracy ?? 0` / `?? 1`, which quietly invented a score for a motif
    the server refused to rate — it happened to exclude them, but by accident,
    and a counterfactual that removed the real filter still passed. A default
    that stands in for missing evidence is the same mistake as rendering a null
    performance as 0.
  */
  const judged = motifs.filter((m): m is MotifProgress & { accuracy: number } => m.accuracy != null);
  const byAccuracy = [...judged].sort((a, b) => b.accuracy - a.accuracy);
  return {
    strong: byAccuracy.filter(m => m.accuracy >= STRONG_AT).slice(0, 5),
    weak: [...byAccuracy].reverse().filter(m => m.accuracy < STRONG_AT).slice(0, 5),
  };
}

function MotifList({ motifs, tone }: { motifs: MotifProgress[]; tone: 'strong' | 'weak' }) {
  return (
    <ul className="space-y-2">
      {motifs.map(m => (
        <li key={m.motif} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">{motifLabel(m.motif)}</span>
          <span className="flex items-baseline gap-3">
            <span className={tone === 'strong' ? 'text-success' : 'text-muted-foreground'}>
              {Math.round((m.accuracy ?? 0) * 100)}%
            </span>
            <span className="text-xs text-muted-foreground">{m.attempts} seen</span>
            <TrainLink to={`/puzzles?theme=${encodeURIComponent(m.motif)}`} label="Train" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * What you are good and bad at, by motif (C9).
 *
 * Both halves are shown, and the strengths are not decoration: a page that only
 * lists failures is one a player stops opening. But nothing appears here
 * without enough rated attempts behind it — see `rankedMotifs`.
 */
function StrengthsAndWeaknesses({ motifs }: { motifs: MotifProgress[] }) {
  const { strong, weak } = rankedMotifs(motifs);
  const judged = motifs.filter(m => m.accuracy != null).length;

  if (judged === 0) {
    return (
      <section aria-labelledby="motifs-heading" role="region">
        <h2 id="motifs-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Strengths and weak spots
        </h2>
        <p className="text-sm text-muted-foreground">
          Not enough rated attempts on any single motif yet. Solve a few more and this will
          show which patterns you find easy and which cost you points.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="motifs-heading" role="region">
      <h2 id="motifs-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Strengths and weak spots
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Strongest</h3>
          {strong.length > 0
            ? <MotifList motifs={strong} tone="strong" />
            : <p className="text-sm text-muted-foreground">Nothing above 70% yet.</p>}
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Weakest</h3>
          {weak.length > 0
            ? <MotifList motifs={weak} tone="weak" />
            : <p className="text-sm text-muted-foreground">Nothing below 70% — well done.</p>}
        </div>
      </div>
    </section>
  );
}

/**
 * When you trained, by week and area (C9).
 *
 * Weeks, not days: someone training a few times a week produces a daily series
 * that is mostly zeroes, and "did you train this week, and on what" is the
 * question the plan's reflow will actually ask.
 *
 * A bar per week, sized against the busiest week rather than an absolute
 * scale — the shape of the habit is the readable thing, not the volume.
 */
function History({ history }: { history: PuzzleProgressData['history'] }) {
  if (history.length === 0) return null;

  const byWeek = new Map<string, { week: string; total: number; areas: Record<string, number> }>();
  for (const point of history) {
    const entry = byWeek.get(point.week) ?? { week: point.week, total: 0, areas: {} };
    entry.total += point.attempts;
    entry.areas[point.area] = (entry.areas[point.area] ?? 0) + point.attempts;
    byWeek.set(point.week, entry);
  }
  const weeks = [...byWeek.values()].sort((a, b) => b.week.localeCompare(a.week)).slice(0, 12);
  const busiest = Math.max(...weeks.map(w => w.total), 1);

  return (
    <section aria-labelledby="history-heading" role="region">
      <h2 id="history-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Recent weeks
      </h2>
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        {weeks.map(w => (
          <div key={w.week} className="flex items-center gap-3 text-xs">
            <span className="w-24 flex-shrink-0 text-muted-foreground tabular-nums">
              {new Date(w.week + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </span>
            <span className="flex-1 h-4 rounded bg-muted/40 overflow-hidden flex" aria-hidden="true">
              {(['tactics', 'middlegame', 'endgame'] as const).map(area => {
                const n = w.areas[area] ?? 0;
                if (n === 0) return null;
                return (
                  <span
                    key={area}
                    className={
                      area === 'tactics' ? 'bg-primary/70'
                      : area === 'endgame' ? 'bg-success/70'
                      : 'bg-muted-foreground/50'
                    }
                    style={{ width: `${(n / busiest) * 100}%` }}
                  />
                );
              })}
            </span>
            <span className="w-16 text-right text-muted-foreground tabular-nums">
              {w.total} {w.total === 1 ? 'position' : 'positions'}
            </span>
          </div>
        ))}
      </div>
      {/* The bar is decorative; the counts beside it are the accessible record. */}
      <p className="text-xs text-muted-foreground mt-2">
        Tactics, middlegame and endgame, stacked. The week of your busiest training fills the bar.
      </p>
    </section>
  );
}

/**
 * The frame the C8 and C9 views drop into.
 *
 * What it shows today is the summary and the coverage gap — the two things
 * that need no rating and no minimum sample, and the second of which is the
 * product's whole argument ("you have not tried a single endgame", PRD §6.3).
 */
function RecordShell({ data }: { data: PuzzleProgressData }) {
  const { summary } = data;

  /*
    Held locally so the control answers immediately, seeded from the payload so
    a reload shows what the player actually asked for rather than a blank slate.
    A failed write reverts to what the server last confirmed.
  */
  const [preferences, setPreferences] = useState<Record<string, 'more' | 'less'>>(
    data.areaPreferences ?? {},
  );
  const onPreference = useCallback((area: PuzzleArea, next: 'more' | 'less' | null) => {
    setPreferences(current => {
      const updated = { ...current };
      if (next) updated[area] = next; else delete updated[area];
      return updated;
    });
    void setAreaPreference(area, next).catch(() => {
      setPreferences(data.areaPreferences ?? {});
    });
  }, [data.areaPreferences]);

  const accuracy = summary.totalAttempts > 0
    ? Math.round((summary.totalSolved / summary.totalAttempts) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="overview-heading" role="region">
        <h2 id="overview-heading" className="sr-only">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/*
            The overall rating comes from the rating system, not from this
            page's window — it is the same number the trainer shows, so the two
            can never disagree the way the leaderboard did.
          */}
          <Stat label="Puzzle rating" value={data.overall.rating == null ? '—' : String(data.overall.rating)} />
          <Stat label="Positions attempted" value={String(summary.totalAttempts)} />
          <Stat label="Solved first try" value={`${accuracy}%`} />
          {/*
            Unrated is shown as a plain count, not as a share or a warning.
            These attempts trained something — they simply moved no rating —
            and presenting them as a deficit would punish exactly the players
            who used the hint ladder the way it was designed to be used.
          */}
          <Stat label="Practice or helped" value={String(summary.unrated)} />
        </div>
      </section>

      {summary.untouchedAreas.length > 0 && (
        <section aria-labelledby="gaps-heading" role="region" className="rounded-lg border-2 border-border bg-card p-5">
          <h2 id="gaps-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Gaps in your training
          </h2>
          <p className="text-sm">
            You have not tried{' '}
            <span className="font-medium">
              {summary.untouchedAreas.map(a => AREA_LABELS[a].toLowerCase()).join(' or ')}
            </span>{' '}
            here. That gap is worth closing before any number on this page means much.
          </p>
        </section>
      )}

      {/*
        C8 fills in per-area performance with its confidence gate; C9 adds
        strengths, weak areas, coverage and history, each one click from
        training it. The frame is here so those land as views rather than as
        four more pages.
      */}
      <section aria-labelledby="areas-heading" role="region">
        <h2 id="areas-heading" className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
          By area
        </h2>
        <div className="space-y-3">
          {data.areas.map(area => (
            <AreaRow
              key={area.area}
              area={area}
              preference={preferences[area.area]}
              onPreference={onPreference}
            />
          ))}
        </div>
        {/*
          The claim, stated once and narrowly (PRD §9). These positions are
          puzzles, so a figure drawn from endgame-tagged ones is endgame-PUZZLE
          performance — not endgame skill, which needs the judgment trainers
          that do not exist yet. Comparing it to a rating from another corpus
          without calibration is exactly the overclaim the plan forbids.
        */}
        <p className="text-xs text-muted-foreground mt-3">
          Performance is how you scored against the difficulty of the puzzles you faced,
          counting rated attempts only. It describes your puzzle solving in each area, not
          your play as a whole.
        </p>
      </section>

      <StrengthsAndWeaknesses motifs={data.motifs} />
      <History history={data.history} />
    </div>
  );
}
