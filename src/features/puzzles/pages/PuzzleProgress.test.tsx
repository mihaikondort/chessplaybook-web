/**
 * The training-record page's states (C7).
 *
 * Four states, and three of them are the ones a page like this normally gets
 * wrong: the first visit with no data, the reachable-but-failed load, and the
 * player whose whole record is unrated. The fourth — a normal record — is the
 * easy one and is here to keep the others honest.
 *
 * The rule under test that matters most: **a player who has only ever revealed
 * solutions still has a record**. Deciding "has this person trained anything"
 * from a rating rather than from attempts would contradict the coverage rule
 * the entire substrate is built on (C5), and it is a one-character mistake.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PuzzleProgress from './PuzzleProgress';
import type { PuzzleProgressData } from '../services/ProgressService';
import { expectationLabel, strongestWeakness } from '../services/trainingRecord';

vi.mock('../services/ProgressService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ProgressService')>();
  return { ...actual, fetchPuzzleProgress: vi.fn() };
});

vi.mock('../services/PlanApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/PlanApi')>();
  return { ...actual, fetchActivePlan: vi.fn() };
});

vi.mock('@/services/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/analytics')>();
  return { ...actual, logGA4Event: vi.fn() };
});

const { fetchPuzzleProgress } = await import('../services/ProgressService');
const { fetchActivePlan } = await import('../services/PlanApi');
const { logGA4Event } = await import('@/services/analytics');

function makeData(over: Partial<PuzzleProgressData> = {}): PuzzleProgressData {
  return {
    identified: true,
    overall: { rating: null, rd: null, ratedAttempts: null, lifetimeSolved: null, lifetimeFailed: null },
    summary: {
      totalAttempts: 0, totalSolved: 0, unrated: 0, unratedReasons: {},
      firstAttemptAt: null, lastAttemptAt: null,
      untouchedAreas: ['tactics', 'middlegame', 'endgame'],
    },
    areas: (['tactics', 'middlegame', 'endgame'] as const).map(area => ({
      area, attempts: 0, solved: 0, rated: 0, ratedSolved: 0,
      averageRatingFaced: null, accuracy: null, performance: null,
      confidence: 'none' as const, lastAttemptAt: null,
    })),
    motifs: [],
    history: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PuzzleProgress />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  vi.mocked(fetchPuzzleProgress).mockReset();
  vi.mocked(fetchActivePlan).mockReset().mockResolvedValue(null);
  vi.mocked(logGA4Event).mockReset();
});
afterEach(() => { vi.restoreAllMocks(); });

describe('PuzzleProgress', () => {
  it('announces the loading state to assistive tech rather than showing nothing', async () => {
    vi.mocked(fetchPuzzleProgress).mockReturnValue(new Promise(() => { /* never resolves */ }));
    renderPage();
    expect(screen.getByText(/loading your training record/i)).toBeInTheDocument();
  });

  it('tells a first-time visitor what to do, not what is missing', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(makeData({ identified: false }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/nothing to show yet/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /start training/i })).toBeInTheDocument();
    // No zeroes and no empty charts: a record page that opens with three blank
    // areas teaches a new visitor only that they are behind.
    expect(screen.queryByText(/by area/i)).not.toBeInTheDocument();
  });

  it('a record built entirely of revealed solutions is still a record', async () => {
    // The C5 rule at the UI boundary. Twenty reveals, no rated attempt, no
    // rating anywhere — and this player HAS trained endgames.
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(makeData({
      summary: {
        totalAttempts: 20, totalSolved: 0, unrated: 20, unratedReasons: { solution: 20 },
        firstAttemptAt: '2026-08-01 10:00:00', lastAttemptAt: '2026-08-02 10:00:00',
        untouchedAreas: ['tactics', 'middlegame'],
      },
      areas: [
        { area: 'tactics', attempts: 0, solved: 0, rated: 0, ratedSolved: 0, averageRatingFaced: null, accuracy: null, performance: null, confidence: 'none', lastAttemptAt: null },
        { area: 'middlegame', attempts: 0, solved: 0, rated: 0, ratedSolved: 0, averageRatingFaced: null, accuracy: null, performance: null, confidence: 'none', lastAttemptAt: null },
        { area: 'endgame', attempts: 20, solved: 0, rated: 0, ratedSolved: 0, averageRatingFaced: null, accuracy: null, performance: null, confidence: 'none', lastAttemptAt: '2026-08-02 10:00:00' },
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    expect(screen.queryByText(/nothing to show yet/i)).not.toBeInTheDocument();
    // Scoped: "20" is both the attempt total and the unrated count, and an
    // ambiguous query here would pass for the wrong reason.
    const totals = screen.getByRole('region', { name: /totals/i });
    expect(within(totals).getByText('Puzzles attempted').nextSibling).toHaveTextContent('20');
    expect(within(totals).getByText('Did not count toward your rating').nextSibling).toHaveTextContent('20');
    expect(within(totals).getByText('Solution shown').nextSibling).toHaveTextContent('20');
    // And the gap it does have is the next step, in the product's own terms.
    const next = screen.getByRole('region', { name: /next step/i });
    expect(within(next).getByText(/you have not tried a tactics puzzle yet/i)).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: /solve middlegame puzzles/i }))
      .toHaveAttribute('href', '/puzzles?area=middlegame');
    // The untouched areas say so on their own rows as well.
    const areasSection = screen.getByRole('region', { name: /by area/i });
    expect(within(areasSection).getAllByText(/not trained yet/i)).toHaveLength(2);
  });

  it('names no gap when every area has been trained', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(makeData({
      summary: {
        totalAttempts: 30, totalSolved: 21, unrated: 3, unratedReasons: { hint: 3 },
        firstAttemptAt: '2026-07-01 10:00:00', lastAttemptAt: '2026-08-02 10:00:00',
        untouchedAreas: [],
      },
      areas: [
        // Accuracy deliberately runs OPPOSITE to recency, so ordering by either
        // one gives a different answer from ordering by the other.
        { area: 'tactics', attempts: 15, solved: 12, rated: 13, ratedSolved: 11, averageRatingFaced: 1500, accuracy: 0.84, performance: 1690, confidence: 'established', lastAttemptAt: '2026-08-01 10:00:00' },
        { area: 'endgame', attempts: 5, solved: 2, rated: 5, ratedSolved: 2, averageRatingFaced: 1500, accuracy: 0.4, performance: 1420, confidence: 'provisional', lastAttemptAt: '2026-08-03 10:00:00' },
        { area: 'middlegame', attempts: 10, solved: 7, rated: 9, ratedSolved: 6, averageRatingFaced: 1500, accuracy: 0.66, performance: 1580, confidence: 'provisional', lastAttemptAt: '2026-08-02 10:00:00' },
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    // No area called untried, in the next step or on a row.
    expect(screen.queryByText(/have not tried/i)).not.toBeInTheDocument();
    const areasRegion = screen.getByRole('region', { name: /by area/i });
    expect(within(areasRegion).queryByText(/not trained yet/i)).not.toBeInTheDocument();
    // Areas are ordered by fact, the one trained longest ago first. Never by
    // accuracy: at these sample sizes the lowest accuracy is mostly noise.
    const headings = within(areasRegion)
      .getAllByText(/^(Tactics|Middlegame|Endgame)$/).map(n => n.textContent);
    expect(headings).toEqual(['Tactics', 'Middlegame', 'Endgame']);
  });

  it('a failed load says nothing was lost, and offers a way back', async () => {
    vi.mocked(fetchPuzzleProgress).mockRejectedValue(new Error('progress request failed: 503'));
    renderPage();
    await waitFor(() => expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument());
    expect(screen.getByText(/nothing has been lost/i)).toBeInTheDocument();
    // Two such links exist — the page header's and the error panel's. The one
    // that matters is inside the panel, beside the failure it recovers from.
    const panel = screen.getByText(/could not be loaded/i).closest('div')!.parentElement!;
    expect(within(panel).getByRole('link', { name: /back to training/i })).toBeInTheDocument();
  });

  it('an abort is never reported as a failed record', async () => {
    /*
      Asserted while the page is still MOUNTED, deliberately. The first version
      of this test unmounted first and passed even with the guard deleted —
      after unmount nothing renders either way, so it could not fail and was
      therefore testing nothing. A browser can abort an in-flight request on
      its own, and telling that player their record could not be loaded is a
      lie about data that is fine.
    */
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.mocked(fetchPuzzleProgress).mockRejectedValue(abort);
    renderPage();
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument();
    // Still showing the loading state is the honest thing: the request simply
    // never completed.
    expect(screen.getByText(/loading your training record/i)).toBeInTheDocument();
  });
});

describe('PuzzleProgress — the confidence gate (C8)', () => {
  const area = (over: Partial<import('../services/ProgressService').AreaProgress> = {}) => ({
    area: 'endgame' as const, attempts: 0, solved: 0, rated: 0, ratedSolved: 0,
    averageRatingFaced: null, accuracy: null, performance: null,
    confidence: 'none' as const, lastAttemptAt: null, ...over,
  });

  const withAreas = (areas: import('../services/ProgressService').AreaProgress[]) => makeData({
    summary: {
      totalAttempts: areas.reduce((n, a) => n + a.attempts, 0),
      totalSolved: areas.reduce((n, a) => n + a.solved, 0),
      unrated: 0, unratedReasons: {},
      firstAttemptAt: '2026-08-01 10:00:00', lastAttemptAt: '2026-08-04 10:00:00',
      untouchedAreas: [],
    },
    areas,
    overall: { rating: 1640, rd: 72, ratedAttempts: 400, lifetimeSolved: 338, lifetimeFailed: 89 },
  });

  it('never renders an unearned figure as a number', async () => {
    // Four rated attempts is below the minimum sample. The failure this guards
    // is rendering null as 0 or as a dash that reads like a rating — the
    // difference between "we do not know yet" and "you scored nothing" is the
    // entire point of the gate.
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 4, solved: 2, rated: 4, confidence: 'insufficient' }),
      area({ area: 'middlegame' }),
      area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    const areas = screen.getByRole('region', { name: /by area/i });
    expect(within(areas).getByText(/^1 more rated puzzle to rate$/i)).toBeInTheDocument();
    // The endgame row's only numbers are its puzzle count. No rating-sized
    // figure, and no 0 standing in for one. (Untried areas do show a puzzle
    // count of 0, which is true, so the check is scoped to this row.)
    const row = within(areas).getByText('Endgame').parentElement!;
    expect(row.textContent).not.toMatch(/\d{3,}/);
    expect(row.textContent).not.toMatch(/(^|\D)0(\D|$)/);
  });

  it('shows an established figure plainly', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 20, solved: 14, rated: 20, performance: 1712, confidence: 'established' }),
      area({ area: 'middlegame' }),
      area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText('1712')).toBeInTheDocument());
    // Established: the number alone, with no qualifier beside it.
    const areas = screen.getByRole('region', { name: /by area/i });
    expect(within(areas).queryByText('provisional')).not.toBeInTheDocument();
  });

  it('marks a provisional figure as provisional', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 6, solved: 4, rated: 6, performance: 1520, confidence: 'provisional' }),
      area({ area: 'middlegame' }),
      area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText('1520')).toBeInTheDocument());
    // The word, beside the number, in the same cell.
    expect(screen.getByText('1520').parentElement).toHaveTextContent(/^1520provisional$/);
  });

  it('keeps the claim narrow — puzzles, not skill', async () => {
    // PRD 9: a figure from endgame-tagged PUZZLES is endgame-puzzle
    // performance. The judgment trainers do not exist yet, and a label that
    // outruns its evidence is how an unearned number steers a training plan.
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 20, solved: 14, rated: 20, performance: 1712, confidence: 'established' }),
      area({ area: 'middlegame' }), area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText('1712')).toBeInTheDocument());
    expect(screen.getByText(/describes your puzzle solving in each area, not your play as a whole/i))
      .toBeInTheDocument();
  });

  it('shows the overall rating from the rating system, not from this window', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 3, solved: 1, rated: 3, confidence: 'insufficient' }),
      area({ area: 'middlegame' }), area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText(/puzzle rating/i)).toBeInTheDocument());
    const rating = screen.getByRole('region', { name: /puzzle rating/i });
    expect(rating).toHaveTextContent('1640');
    // A deviation of 72 is settled: no provisional mark.
    expect(within(rating).queryByText(/provisional/i)).not.toBeInTheDocument();
  });

  it('marks the rating provisional while its deviation is 110 or more', async () => {
    const data = withAreas([area({ area: 'endgame', attempts: 3, rated: 3 }), area({ area: 'middlegame' }), area({ area: 'tactics' })]);
    data.overall = { ...data.overall, rating: 1388, rd: 140 };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(data);
    renderPage();
    await waitFor(() => expect(screen.getByText(/puzzle rating/i)).toBeInTheDocument());
    const rating = screen.getByRole('region', { name: /puzzle rating/i });
    expect(within(rating).getByText(/provisional/i)).toBeInTheDocument();
  });
});

describe('PuzzleProgress — strengths, weak spots, history, one click to train (C9)', () => {
  const motif = (over: Partial<import('../services/ProgressService').MotifProgress>) => ({
    motif: 'fork', attempts: 40, missed: 0, rated: 40, solvedRate: 0.9, usualRate: 0.6, z: 1.2,
    verdict: 'no_clear_difference' as const, lastAttemptAt: '2026-08-04 10:00:00', ...over,
  });

  const populated = (over: Partial<PuzzleProgressData> = {}) => makeData({
    summary: {
      totalAttempts: 60, totalSolved: 40, unrated: 0, unratedReasons: {},
      firstAttemptAt: '2026-07-01 10:00:00', lastAttemptAt: '2026-08-04 10:00:00',
      untouchedAreas: [],
    },
    overall: { rating: 1500, rd: 70, ratedAttempts: 60, lifetimeSolved: 40, lifetimeFailed: 20 },
    ...over,
  });

  it('a large raw gap with no verdict names no weakness (#109)', async () => {
    /*
      At puzzle sample sizes the lowest raw accuracy is mostly noise and the
      difficulty of what was served. Only the server's evidence verdict may
      call a pattern weak; a row without one reads "Not clear yet".
    */
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      motifs: [
        motif({ motif: 'fork', solvedRate: 0.9 }),
        motif({ motif: 'pin', rated: 20, solvedRate: 0.2, usualRate: 0.6, z: -3.6, verdict: 'too_few_to_judge' }),
      ],
    }));
    renderPage();
    const patterns = await screen.findByRole('region', { name: /patterns/i });
    expect(within(patterns).getByText('Pin')).toBeInTheDocument();
    expect(within(patterns).getByText('No clear weak area yet.')).toBeInTheDocument();
    // Below is said only past the bar: 20% against 60% on 20 puzzles is "Not clear yet".
    expect(within(patterns).getByText('Not clear yet')).toBeInTheDocument();
    expect(screen.queryByText(/below expectation/i)).not.toBeInTheDocument();
    // Option A (owner, 2026-10-15): ahead by any margin over a point is said.
    expect(within(patterns).getByText('Above expectation')).toBeInTheDocument();
    // z of -3.6 on 20 puzzles is under the 30-puzzle bar: the page must not decide otherwise.
    expect(screen.queryByRole('link', { name: 'Solve pin puzzles' })).not.toBeInTheDocument();
  });

  it('an area trains by AREA, never by the middlegame theme', async () => {
    /*
      The distinction that makes the link honest: `middlegame` as a THEME
      includes every middlegame puzzle carrying a tactical pattern, and the C1
      rule files those under Tactics. A link promising middlegame training via
      the theme would serve puzzles the player's own record counts as something
      else.
    */
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      areas: [
        { area: 'middlegame', attempts: 10, solved: 4, rated: 10, ratedSolved: 4, averageRatingFaced: 1500, accuracy: 0.4, performance: 1420, confidence: 'established', lastAttemptAt: null },
        { area: 'endgame', attempts: 10, solved: 6, rated: 10, ratedSolved: 6, averageRatingFaced: 1500, accuracy: 0.6, performance: 1580, confidence: 'established', lastAttemptAt: null },
        { area: 'tactics', attempts: 40, solved: 30, rated: 40, ratedSolved: 30, averageRatingFaced: 1500, accuracy: 0.75, performance: 1700, confidence: 'established', lastAttemptAt: null },
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    const areas = screen.getByRole('region', { name: /by area/i });
    expect(within(areas).getByRole('link', { name: /train middlegame/i }))
      .toHaveAttribute('href', '/puzzles?area=middlegame');
    expect(within(areas).getByRole('link', { name: /train tactics/i }))
      .toHaveAttribute('href', '/puzzles?area=tactics');
    // Every area is trainable, including the one with no phase tag of its own.
    expect(within(areas).getAllByRole('link', { name: /^Train .+ →$/ })).toHaveLength(3);
  });

  it('history groups weeks and states the counts in text, not only in a bar', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      history: [
        { week: '2026-08-03', area: 'tactics', attempts: 12, solved: 9 },
        { week: '2026-08-03', area: 'endgame', attempts: 4, solved: 2 },
        { week: '2026-07-27', area: 'tactics', attempts: 5, solved: 3 },
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/recent weeks/i)).toBeInTheDocument());
    // 12 + 4 in the first week: the number a screen reader gets, since the bar
    // is aria-hidden.
    expect(screen.getByText('16 positions')).toBeInTheDocument();
    expect(screen.getByText('5 positions')).toBeInTheDocument();
  });

  it('renders no history section when there is nothing to show', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({ history: [] }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    expect(screen.queryByText(/recent weeks/i)).not.toBeInTheDocument();
  });

  it('the calendar says how many days were trained this week and last', async () => {
    const day = (n: number) => {
      const d = new Date(); d.setDate(d.getDate() - n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      // Today only, so the count does not depend on what weekday the test runs.
      trainingDays: [{ day: day(0), attempts: 12, solved: 8 }, { day: day(30), attempts: 3, solved: 1 }],
    }));
    renderPage();
    const habit = await screen.findByRole('region', { name: /training days/i });
    expect(within(habit).getByText(/^Trained 1 day this week, \d+ last week\.$/)).toBeInTheDocument();
    expect(within(habit).getByTitle(/: 12 puzzles$/)).toBeInTheDocument();
  });

  it('an older server without the new fields still renders the record', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated());
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    expect(screen.queryByRole('region', { name: /training days/i })).not.toBeInTheDocument();
  });
});

describe('PuzzleProgress — rating graph and replay (#108)', () => {
  const base = (over: Partial<PuzzleProgressData> = {}) => makeData({
    summary: {
      totalAttempts: 40, totalSolved: 25, unrated: 5, unratedReasons: { hint: 5 },
      firstAttemptAt: '2026-09-01 10:00:00', lastAttemptAt: new Date().toISOString(), untouchedAreas: [],
    },
    areas: (['tactics', 'middlegame', 'endgame'] as const).map(area => ({
      area, attempts: 10, solved: 6, rated: 10, ratedSolved: 6, averageRatingFaced: 1500, accuracy: 0.6,
      performance: 1550, confidence: 'established' as const, lastAttemptAt: new Date().toISOString(),
    })),
    overall: { rating: 1620, rd: 60, ratedAttempts: 35, lifetimeSolved: 25, lifetimeFailed: 15 },
    ...over,
  });

  it('puts missed puzzles first and links into a Missed before run', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(base({ missedToReplay: 12 }));
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('12 puzzles you missed are waiting.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Replay them' })).toHaveAttribute('href', '/puzzles?run=missed');
  });

  it('draws the graph, the peak and the change, with no verdict word', async () => {
    const d = (n: number) => {
      const x = new Date(); x.setDate(x.getDate() - n);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(base({
      ratingSeries: {
        points: [{ day: d(40), rating: 1580 }, { day: d(10), rating: 1700 }, { day: d(1), rating: 1620 }],
        peak: { day: d(10), rating: 1700 },
      },
    }));
    renderPage();
    const rating = await screen.findByRole('region', { name: /puzzle rating/i });
    expect(within(rating).getByRole('img', { name: /puzzle rating from/i })).toBeInTheDocument();
    // Measured from the rating held when the 30-day window opened (1580).
    expect(within(rating).getByText('+40 in 30 days')).toBeInTheDocument();
    expect(within(rating).getByText(/^Peak/)).toHaveTextContent('Peak 1700');
    expect(rating.textContent).not.toMatch(/improv|progress|better|worse/i);
  });

  it('never tells a player with plenty of rated puzzles to solve 10 more', async () => {
    // Owner's screenshot on dev, 2026-10-14: 67 puzzles, an API without the
    // series, and the page said the graph "appears after 10 rated puzzles".
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(base());
    renderPage();
    const rating = await screen.findByRole('region', { name: /puzzle rating/i });
    expect(within(rating).getByText('1620')).toBeInTheDocument();
    expect(within(rating).queryByText(/appears after/i)).not.toBeInTheDocument();
  });

  it('holds the graph back until 10 rated puzzles', async () => {
    const data = base({
      ratingSeries: { points: [{ day: '2026-10-01', rating: 1500 }], peak: { day: '2026-10-01', rating: 1500 } },
    });
    data.summary = { ...data.summary, totalAttempts: 9, unrated: 0 };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(data);
    renderPage();
    const rating = await screen.findByRole('region', { name: /puzzle rating/i });
    expect(within(rating).getByText(/appears after 10 rated puzzles/i)).toBeInTheDocument();
    expect(within(rating).queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('PuzzleProgress — the next step (#107)', () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const trained = (name: 'tactics' | 'middlegame' | 'endgame', lastAttemptAt = recent) => ({
    area: name, attempts: 10, solved: 6, rated: 10, ratedSolved: 6, averageRatingFaced: 1500,
    accuracy: 0.6, performance: 1550, confidence: 'established' as const, lastAttemptAt,
  });
  const record = (areas = [trained('tactics'), trained('middlegame'), trained('endgame')]) => makeData({
    summary: {
      totalAttempts: 30, totalSolved: 18, unrated: 0, unratedReasons: {},
      firstAttemptAt: recent, lastAttemptAt: recent, untouchedAreas: [],
    },
    areas,
  });

  it('says nothing is urgent when every area is fresh and no plan is owed', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record());
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('Nothing urgent.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Solve puzzles' })).toHaveAttribute('href', '/puzzles');
  });

  it('names an area left for a month, with its date', async () => {
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record([trained('tactics'), trained('middlegame'), trained('endgame', old)]));
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText(/you have not solved an endgame puzzle since/i)).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: /solve endgame puzzles/i }))
      .toHaveAttribute('href', '/puzzles?area=endgame');
  });

  it('puts an owed plan day first and links to the plan', async () => {
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    vi.mocked(fetchActivePlan).mockResolvedValue({
      id: 'p1', status: 'active', sessionsPerWeek: 3, positionsPerSession: 25,
      startsOn: day, endsOn: day, targetEvent: null, createdAt: day, endedAt: null,
      items: [{ id: 'i1', scheduledOn: day, ordinal: 0, area: 'endgame', total: 25, kind: 'training', sessionId: null, status: 'pending' }],
      progress: { items: 1, completed: 0, positions: 25, positionsDone: 0, finished: false },
    });
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record());
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('Your training plan has 25 endgame puzzles waiting.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Go to your plan' })).toHaveAttribute('href', '/puzzles/plan');
  });

  it('still renders the record when the plan cannot be read', async () => {
    vi.mocked(fetchActivePlan).mockRejectedValue(new Error('plan request failed: 503'));
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record());
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('Nothing urgent.')).toBeInTheDocument();
  });

  it('reports the view once, with the step it showed', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record());
    renderPage();
    await screen.findByRole('region', { name: /next step/i });
    const views = vi.mocked(logGA4Event).mock.calls.filter(([e]) => e.name === 'training_record_viewed');
    expect(views).toHaveLength(1);
    expect(views[0][0].params).toMatchObject({ next_step: 'none', other_steps: 0, signed_in: false });
  });
});

describe('PuzzleProgress - patterns and the evidence rule (#109)', () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const trained = (name: 'tactics' | 'middlegame' | 'endgame') => ({
    area: name, attempts: 40, solved: 24, rated: 40, ratedSolved: 24, averageRatingFaced: 1500,
    accuracy: 0.6, performance: 1550, confidence: 'established' as const, lastAttemptAt: recent,
  });
  const pattern = (over: Partial<import('../services/ProgressService').MotifProgress>) => ({
    motif: 'fork', attempts: 40, missed: 0, rated: 34, solvedRate: 0.41, usualRate: 0.58, z: -2.3,
    verdict: 'below' as const, lastAttemptAt: recent, ...over,
  });
  const record = (over: Partial<PuzzleProgressData> = {}) => makeData({
    summary: {
      totalAttempts: 120, totalSolved: 70, unrated: 0, unratedReasons: {},
      firstAttemptAt: recent, lastAttemptAt: recent, untouchedAreas: [],
    },
    areas: [trained('tactics'), trained('middlegame'), trained('endgame')],
    ...over,
  });
  const noVerdict = { rated: 0, solvedRate: null, usualRate: null, z: null, verdict: 'not_enough' as const };

  it('a weakness the server found is the next step, with its numbers, when nothing else applies', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({ motifs: [pattern({})] }));
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('You solve fork puzzles below expectation.')).toBeInTheDocument();
    expect(within(next).getByText('You solved 41% of 34. 58% was expected for puzzles this hard.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Solve fork puzzles' })).toHaveAttribute('href', '/puzzles?theme=fork');
    const patterns = screen.getByRole('region', { name: /patterns/i });
    expect(within(patterns).getByText('Below expectation')).toBeInTheDocument();
    expect(within(patterns).getByText('· expected 58%')).toBeInTheDocument();
    expect(within(patterns).queryByText('No clear weak area yet.')).not.toBeInTheDocument();
  });

  it('missed puzzles still come before a weakness', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({ motifs: [pattern({})], missedToReplay: 3 }));
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('3 puzzles you missed are waiting.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Solve fork puzzles' })).toBeInTheDocument();
  });

  it('the clearest weakness wins when an area and a motif are both below', async () => {
    const evidence = {
      areas: {
        tactics: { rated: 40, solvedRate: 0.5, usualRate: 0.6, z: -1.0, verdict: 'no_clear_difference' as const },
        middlegame: { rated: 40, solvedRate: 0.5, usualRate: 0.6, z: -1.0, verdict: 'no_clear_difference' as const },
        endgame: { rated: 60, solvedRate: 0.3, usualRate: 0.6, z: -3.1, verdict: 'below' as const },
      },
      pool: 140, unrecorded: 140, themeFiltered: 0,
    };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({ motifs: [pattern({})], evidence }));
    renderPage();
    const next = await screen.findByRole('region', { name: /next step/i });
    expect(within(next).getByText('You solve endgame puzzles below expectation.')).toBeInTheDocument();
    expect(within(next).getByRole('link', { name: 'Solve endgame puzzles' })).toHaveAttribute('href', '/puzzles?area=endgame');
  });

  it('a pattern with misses links to a replay run of that pattern only', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({
      motifs: [pattern({ verdict: 'no_clear_difference', missed: 3, motif: 'discoveredAttack' })],
    }));
    renderPage();
    const link = await screen.findByRole('link', { name: 'Replay 3 missed discovered attack puzzles' });
    expect(link).toHaveAttribute('href', '/puzzles?run=missed&theme=discoveredAttack');
  });

  it('below ten rated puzzles a pattern shows no figures and no verdict', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({
      motifs: [pattern({ rated: 6, solvedRate: null, usualRate: null, z: null, verdict: 'not_enough' })],
    }));
    renderPage();
    const patterns = await screen.findByRole('region', { name: /patterns/i });
    expect(within(patterns).getByText('Not enough yet')).toBeInTheDocument();
    expect(within(patterns).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('says older puzzles all count when the record predates theme recording', async () => {
    const evidence = {
      areas: { tactics: noVerdict, middlegame: noVerdict, endgame: noVerdict },
      pool: 34, unrecorded: 20, themeFiltered: 0,
    };
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({ motifs: [pattern({})], evidence }));
    renderPage();
    const patterns = await screen.findByRole('region', { name: /patterns/i });
    expect(within(patterns).getByText(/before 15 October all count/)).toBeInTheDocument();
  });

  it('a long list shows eight patterns until asked for all', async () => {
    const motifs = Array.from({ length: 11 }, (_, i) => pattern({ motif: 'motif' + i, verdict: 'no_clear_difference' }));
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(record({ motifs }));
    renderPage();
    const patterns = await screen.findByRole('region', { name: /patterns/i });
    expect(within(patterns).getAllByText('Not clear yet')).toHaveLength(8);
    within(patterns).getByRole('button', { name: 'Show all 11 patterns' }).click();
    await waitFor(() => expect(within(patterns).getAllByText('Not clear yet')).toHaveLength(11));
  });
});

describe('PuzzleProgress - the expectation label is one-sided (#109, option A)', () => {
  const row = (solvedRate: number | null, usualRate: number | null, verdict: import('../services/ProgressService').Verdict = 'too_few_to_judge') =>
    ({ solvedRate, usualRate, verdict });

  it('ahead by more than a point says Above expectation, even unproven', () => {
    expect(expectationLabel(row(0.58, 0.54))).toBe('Above expectation');
    expect(expectationLabel(row(0.58, 0.46, 'no_clear_difference'))).toBe('Above expectation');
  });

  it('within a point either way says Within expectation, judged on the figures shown', () => {
    expect(expectationLabel(row(0.52, 0.518))).toBe('Within expectation');
    expect(expectationLabel(row(0.51, 0.52))).toBe('Within expectation');
    expect(expectationLabel(row(0.53, 0.52))).toBe('Within expectation');
  });

  it('behind without clearing the bar is never called Below', () => {
    expect(expectationLabel(row(0.18, 0.53))).toBe('Not clear yet');
    expect(expectationLabel(row(0.40, 0.49, 'no_clear_difference'))).toBe('Not clear yet');
  });

  it('the cleared verdicts from the server win', () => {
    expect(expectationLabel(row(0.24, 0.51, 'below'))).toBe('Below expectation');
    expect(expectationLabel(row(0.70, 0.50, 'above'))).toBe('Above expectation');
  });

  it('no figures, no label', () => {
    expect(expectationLabel(row(null, null, 'not_enough'))).toBeNull();
  });

  it('a small-margin Above never becomes a next step: rule 4 reads the server verdict only', () => {
    expect(strongestWeakness([{ motif: 'fork', evidence: { rated: 20, solvedRate: 0.7, usualRate: 0.5, z: 1.5, verdict: 'too_few_to_judge' } }])).toBeNull();
  });
});
