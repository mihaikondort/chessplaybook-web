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

vi.mock('../services/ProgressService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/ProgressService')>();
  return { ...actual, fetchPuzzleProgress: vi.fn() };
});

const { fetchPuzzleProgress } = await import('../services/ProgressService');

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

beforeEach(() => { vi.mocked(fetchPuzzleProgress).mockReset(); });
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
    const overview = screen.getByRole('region', { name: /overview/i });
    expect(within(overview).getByText('Positions attempted').previousSibling).toHaveTextContent('20');
    expect(within(overview).getByText('Practice or helped').previousSibling).toHaveTextContent('20');
    // And the gap it does have is stated in the product's own terms.
    const gaps = screen.getByRole('region', { name: /gaps in your training/i });
    expect(within(gaps).getByText(/tactics or middlegame/i)).toBeInTheDocument();
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
        { area: 'endgame', attempts: 5, solved: 2, rated: 5, ratedSolved: 2, averageRatingFaced: 1500, accuracy: 0.4, performance: 1420, confidence: 'provisional', lastAttemptAt: '2026-08-02 10:00:00' },
        { area: 'middlegame', attempts: 10, solved: 7, rated: 9, ratedSolved: 6, averageRatingFaced: 1500, accuracy: 0.66, performance: 1580, confidence: 'provisional', lastAttemptAt: '2026-08-02 10:00:00' },
        { area: 'tactics', attempts: 15, solved: 12, rated: 13, ratedSolved: 11, averageRatingFaced: 1500, accuracy: 0.84, performance: 1690, confidence: 'established', lastAttemptAt: '2026-08-02 10:00:00' },
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/by area/i)).toBeInTheDocument());
    // No gaps section at all, and no area row claiming to be untrained. NOT a
    // page-wide text search: the page's own subtitle contains the same words,
    // so that assertion would pass for a reason unrelated to the data.
    expect(screen.queryByRole('region', { name: /gaps in your training/i })).not.toBeInTheDocument();
    const areasRegion = screen.getByRole('region', { name: /by area/i });
    expect(within(areasRegion).queryByText(/not trained yet/i)).not.toBeInTheDocument();
    // Areas keep the server's order — weakest first — so the page and the
    // weak-areas mode can never disagree about what is weakest.
    const areasSection = screen.getByRole('region', { name: /by area/i });
    const headings = within(areasSection)
      .getAllByText(/^(Tactics|Middlegame|Endgame)$/).map(n => n.textContent);
    expect(headings).toEqual(['Endgame', 'Middlegame', 'Tactics']);
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
    expect(within(areas).getByText(/not enough rated attempts/i)).toBeInTheDocument();
    expect(within(areas).queryByText(/performance$/i)).not.toBeInTheDocument();
    expect(within(areas).queryByText('0')).not.toBeInTheDocument();
  });

  it('shows an established figure plainly', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 20, solved: 14, rated: 20, performance: 1712, confidence: 'established' }),
      area({ area: 'middlegame' }),
      area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText('1712')).toBeInTheDocument());
    expect(screen.getByText(/from 20 rated attempts/i)).toBeInTheDocument();
  });

  it('marks a provisional figure as provisional', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(withAreas([
      area({ area: 'endgame', attempts: 6, solved: 4, rated: 6, performance: 1520, confidence: 'provisional' }),
      area({ area: 'middlegame' }),
      area({ area: 'tactics' }),
    ]));
    renderPage();
    await waitFor(() => expect(screen.getByText('1520')).toBeInTheDocument());
    expect(screen.getByText(/provisional, from 6 rated attempts/i)).toBeInTheDocument();
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
    const overview = screen.getByRole('region', { name: /overview/i });
    expect(within(overview).getByText('Puzzle rating').previousSibling).toHaveTextContent('1640');
  });
});

describe('PuzzleProgress — strengths, weak spots, history, one click to train (C9)', () => {
  const motif = (over: Partial<import('../services/ProgressService').MotifProgress>) => ({
    motif: 'fork', attempts: 20, solved: 18, accuracy: 0.9,
    confidence: 'established' as const, lastAttemptAt: '2026-08-04 10:00:00', ...over,
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

  it('ranks only motifs the server was willing to judge', async () => {
    // A motif below the minimum sample has no accuracy, and ranking on it would
    // produce a confident-looking list of noise — one lucky fork is not a
    // strength.
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      motifs: [
        motif({ motif: 'fork', accuracy: 0.9 }),
        motif({ motif: 'pin', accuracy: 0.3 }),
        motif({ motif: 'skewer', accuracy: null, attempts: 2, confidence: 'insufficient' }),
      ],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/strengths and weak spots/i)).toBeInTheDocument());
    expect(screen.getByText('Fork')).toBeInTheDocument();
    expect(screen.getByText('Pin')).toBeInTheDocument();
    expect(screen.queryByText('Skewer')).not.toBeInTheDocument();
  });

  it('says so plainly when nothing has enough evidence', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      motifs: [motif({ motif: 'fork', accuracy: null, attempts: 3, confidence: 'insufficient' })],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText(/not enough rated attempts on any single motif/i)).toBeInTheDocument());
  });

  it('every weak spot is one click from training it', async () => {
    vi.mocked(fetchPuzzleProgress).mockResolvedValue(populated({
      motifs: [motif({ motif: 'backRankMate', accuracy: 0.2 })],
    }));
    renderPage();
    await waitFor(() => expect(screen.getByText('Back rank mate')).toBeInTheDocument());
    const train = screen.getAllByRole('link', { name: /^Train →$/ });
    expect(train.length).toBeGreaterThan(0);
    expect(train[0]).toHaveAttribute('href', '/puzzles?theme=backRankMate');
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
});
