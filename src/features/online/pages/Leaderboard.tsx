import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { StandingOffer, hasStanding } from '@/features/puzzles/components/StandingOffer';
import { fetchRunLeaderboard, type RunEntry } from '@/features/puzzles/services/RunLeaderboardService';
import { fetchPuzzleStanding, ordinal, type PuzzleStanding } from '@/features/puzzles/services/StandingService';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Trophy, Search } from 'lucide-react';
import env from '@/config/env';
import SeoHead from '@/components/SeoHead';
import { logGA4Event } from '@/services/analytics';
import { useAuth } from '@/features/auth/AuthContext';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  rank: number;
  username: string;
  rating: number;
  gamesPlayed: number;
  /** Puzzle boards only: REAL lifetime solves. `gamesPlayed` is rated attempts. */
  puzzlesSolved?: number | null;
  /** True for a signed-out player, who wears an allocated two-word handle. */
  isGuest?: boolean;
  /** True on the caller's own row. Marked server-side: only it knows which subject is theirs. */
  you?: boolean;
}

interface LeaderboardResponse {
  timeControl: string;
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  /** Where the caller stands on this board, or null when they are not on it. */
  yourRank?: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/*
  PUZZLES FIRST, AND IT IS THE DEFAULT (2026-08-13, owner).

  The default was `blitz`, which meant a visitor arriving at /leaderboard landed
  on an EMPTY board and read "No rated players yet for blitz." Measured on
  production the same day, the time-control boards were empty or nearly so,
  while puzzles had by far the most players.

  So the page opened on the one thing almost nobody does, and the thing most
  people do was the fifth tab. Puzzles now leads the strip as well as being
  the default, because a lit tab in last position reads as a mistake.

  This is a default, not a restriction: every other board is one click away and
  `?tc=` still selects any of them, which is what the trainer's own
  /leaderboard?tc=puzzle link relies on.
*/
const DEFAULT_TIME_CONTROL = 'puzzle';

const TIME_CONTROLS = [
  { value: 'puzzle', label: 'Puzzles' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapid', label: 'Rapid' },
  { value: 'classical', label: 'Classical' },
];

/**
 * THE RUN BOARDS, on a second row (owner, 2026-08-16).
 *
 * ONE SELECTION ACROSS BOTH ROWS, never a matrix. Two independently selectable
 * rows would imply "Blitz and runs of 5", which is not a thing: a run
 * performance is a puzzle quantity and the top row is time controls. So these
 * are the same tab set laid out on two lines, and choosing one here deselects
 * whatever was chosen above.
 *
 * FIVE, TEN AND TWENTY because those are what the chooser offers. The API
 * accepts any length from 5 to 60 and a few others exist on production - a 12,
 * some 25s - but a board is a comparison, and a run of 12 has nobody to be
 * compared with.
 */
const RUN_TABS = [
  { value: 'run5', label: 'Runs of 5', length: 5 },
  { value: 'run10', label: 'Runs of 10', length: 10 },
  { value: 'run20', label: 'Runs of 20', length: 20 },
];

export const runLengthFor = (tab: string): number | null =>
  RUN_TABS.find(t => t.value === tab)?.length ?? null;

/**
 * The number under the "Solved" / "Games" column.
 *
 * On the puzzle board these are NOT the same quantity, and conflating them is
 * the bug this helper exists to stop coming back (2026-08-04): the column said
 * "Solved" while rendering `gamesPlayed`, which counts rated ATTEMPTS —
 * failures included — so it read 346 for a player who had solved 338, and the
 * gap widens the more someone struggles.
 *
 * A missing count renders as a dash rather than falling back to the attempt
 * count. Substituting a plausible wrong number is exactly how this looked
 * correct for months.
 */
export function countFor(
  timeControl: string,
  entry: { gamesPlayed: number; puzzlesSolved?: number | null },
): string {
  if (timeControl !== 'puzzle') return String(entry.gamesPlayed);
  return entry.puzzlesSolved == null ? '—' : String(entry.puzzlesSolved);
}

/**
 * May this visitor be offered a place on the board?
 *
 * DO NOT USE `standing.identified` FOR THIS. It was the first version and it
 * suppressed the offer for every single person it was written for (found by the
 * owner on the dev server, 2026-08-13): the server sets `identified: true`
 * whenever it resolved an identity AT ALL, and a guest carrying an anonymous id
 * is identified. It answers "do we know who is asking", not "are they signed
 * in" — two questions that read identically at the call site and differ for the
 * entire audience of this feature.
 *
 * Signed-in state is the client's own fact, so it is passed in. A player who is
 * already on the board must not be offered a place on it — `eligible` is true
 * for them too, so without this the page would render "You'd be 8th" to the
 * person it is displaying at 8th.
 *
 * Exported for its test: the rule is four lines, and two of them have now been
 * wrong in a way that looked entirely reasonable in review.
 */
export function shouldOfferStanding(
  timeControl: string,
  standing: PuzzleStanding | null,
  isSignedIn: boolean,
): boolean {
  if (timeControl !== 'puzzle') return false;
  if (isSignedIn) return false;
  return hasStanding(standing);
}

/**
 * The board's own minimum, duplicated from `LEADERBOARD_GATES.puzzle.minGames`
 * in `backend/src/db/ratings.ts`. A test reads that file and asserts the two
 * agree, because a duplicated constant is a constant that drifts, and this one
 * drifting means telling people to solve a number of puzzles that does not
 * actually get them onto the board.
 */
export const MIN_RATED_ATTEMPTS = 5;

/**
 * What to say to a guest who is NOT yet on the board.
 *
 * WHO THIS IS FOR. Some guests clear the gate and get a rank. Many more hold a
 * rating row with zero rated attempts and, until now, were told nothing at all
 * on this page. This speaks to them without naming a number we cannot
 * back, which is the rule `eligible` exists to enforce.
 *
 * Returns null when there is nothing honest to say, including for a guest who
 * already qualifies (they get the rank instead).
 */
export function standingPromptText(standing: PuzzleStanding | null): string | null {
  if (!standing) return null;
  if (standing.eligible) return null;

  const done = typeof standing.ratedAttempts === 'number' ? standing.ratedAttempts : 0;
  const remaining = MIN_RATED_ATTEMPTS - done;

  /*
    Below the count, say the count. At or above it, the block is the deviation
    rather than the number of attempts, and "solve 0 more puzzles" is nonsense,
    so the line stops counting and just encourages. Both are true statements;
    neither promises a place.
  */
  if (remaining > 0) {
    return `Solve ${remaining} ${remaining === 1 ? 'puzzle' : 'puzzles'} to see how you rank.`;
  }
  return 'Keep solving to see how you rank.';
}

function rankBadge(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-medal-gold" />;
  if (rank === 2) return <Trophy className="h-4 w-4 text-medal-silver" />;
  if (rank === 3) return <Trophy className="h-4 w-4 text-medal-bronze" />;
  return <span className="text-sm text-muted-foreground w-4 text-center">{rank}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SearchResult {
  username: string;
  rating: number;
  gamesPlayed: number;
  /** Puzzle boards only: REAL lifetime solves. `gamesPlayed` is rated attempts. */
  puzzlesSolved?: number | null;
  rank: number;
}

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const initialTc = searchParams.get('tc') || DEFAULT_TIME_CONTROL;
  const [timeControl, setTimeControl] = useState(
    TIME_CONTROLS.some(tc => tc.value === initialTc) || runLengthFor(initialTc)
      ? initialTc
      : DEFAULT_TIME_CONTROL
  );
  /* Non-null exactly when a RUN board is selected, which every branch below
     keys on rather than testing the tab's string in five places. */
  const runLength = runLengthFor(timeControl);
  const [runBoard, setRunBoard] = useState<RunEntry[] | null>(null);
  const [runFailed, setRunFailed] = useState(false);

  /*
    The run board is its own fetch, because it is its own quantity: the existing
    one ranks a PLAYER's rating and this ranks a single run's performance. They
    share a page and nothing else.
  */
  useEffect(() => {
    if (!runLength) { setRunBoard(null); setRunFailed(false); return; }
    const ac = new AbortController();
    setRunBoard(null);
    setRunFailed(false);
    fetchRunLeaderboard(runLength, ac.signal)
      .then(setRunBoard)
      .catch(err => { if (err?.name !== 'AbortError') setRunFailed(true); });
    return () => ac.abort();
  }, [runLength]);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  /*
    WHERE THE GUEST IS TOLD (2026-08-13).

    Many guests clear this board's own thresholds -- `games_played >= 5` and
    `rd < 250` -- far more than the accounts actually on it. They are not filtered
    off the board; their rating lives in `user_preferences` and the board is
    built from `ratings`, a table it never reads.

    Until now the only place that fact was ever mentioned was inside the puzzle
    trainer. This page -- someone reading the ranking they are absent from --
    said nothing at all, which is the highest-intent moment in the whole funnel
    going unused.

    `/api/leaderboard/standing` is deliberately ungated and answers for a guest
    identity, so this needs no new backend. It is fetched only for the puzzle
    board, because it is the only board it describes.
  */
  const location = useLocation();
  const [standing, setStanding] = useState<PuzzleStanding | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    if (timeControl !== 'puzzle') { setStanding(null); return; }
    const ac = new AbortController();
    fetchPuzzleStanding(ac.signal)
      .then(setStanding)
      // Silent: the board is the page, and a missing offer must never be able
      // to break or delay it.
      .catch(() => setStanding(null));
    return () => ac.abort();
  }, [timeControl]);

  const { user } = useAuth();
  const showStanding = shouldOfferStanding(timeControl, standing, !!user);

  /*
    The softer line, for the far larger group who do not qualify yet. Same three
    conditions as the offer minus eligibility: puzzle board, signed out, and
    something honest to say.
  */
  const promptText = timeControl === 'puzzle' && !user ? standingPromptText(standing) : null;

  // Once per rank, not once per render — see `puzzle_standing_shown`.
  const reportedRank = useRef<number | null>(null);
  useEffect(() => {
    if (!showStanding || !hasStanding(standing)) return;
    if (reportedRank.current === standing.rank) return;
    reportedRank.current = standing.rank;
    logGA4Event({
      name: 'puzzle_standing_shown',
      params: { rank: standing.rank, total: standing.total, surface: 'leaderboard' },
    });
  }, [showStanding, standing]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  /*
    A FAILED REQUEST IS A STATE, NOT A NULL (owner, 2026-08-15, on a blank
    board: *"why is the puzzles ranking broken?"*).

    This set `data` to `null` on any failure and the render had three branches —
    loading, rows, no rows — and none for null. So one failed request produced a
    page with a heading, five tabs, a search box and nothing else: no message, no
    reason, no way to try again. Indistinguishable from an empty board except
    that the empty board at least says it is empty.

    The parameter was never the problem. `?tc=puzzle` is what the trainer links
    and what the API accepts; `puzzle` answers 200 and `puzzles` 400s.
  */
  const [failed, setFailed] = useState(false);
  /*
    AND THE LAST REQUEST STARTED IS THE ONE THAT MAY WRITE.

    There was no abort and no ordering guard, so switching tabs quickly let an
    older response land after a newer one and paint the wrong board — and an
    aborted fetch landed in the same `catch` as a real failure, which is how a
    perfectly healthy page could blank itself. An abort is not an error: it is
    this component saying it no longer wants that answer, so it returns without
    touching state at all.
  */
  const requestSeq = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const fetchLeaderboard = useCallback(async (tc: string, page: number) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const seq = ++requestSeq.current;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({
        timeControl: tc,
        page: String(page),
        limit: '50',
      });
      /*
        The identity headers are sent so the server can mark the caller's own row and say where
        they stand. Nothing about the board is private; a guest gets the same board.
      */
      const res = await fetch(`${env.apiBaseUrl}/api/leaderboard?${params}`, {
        headers: await getRequestHeaders(),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const body = await res.json();
      if (seq !== requestSeq.current) return;
      setData(body);
    } catch (err) {
      if (controller.signal.aborted || seq !== requestSeq.current) return;
      setData(null);
      setFailed(true);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Debounced player search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ timeControl, q: searchQuery.trim() });
        const res = await fetch(`${env.apiBaseUrl}/api/leaderboard/search?${params}`);
        if (res.ok) {
          const { results } = await res.json();
          setSearchResults(results);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, timeControl]);

  /*
    ── OPEN THE BOARD WHERE THE READER IS, ONCE ──

    Owner, 2026-08-20: scroll to the reader's own row, "only when first arriving on the page".

    IT IS A JUMP BEFORE IT IS A SCROLL. The board pages at 50, so a player ranked 200th is not
    among the rows the page holds and there is nothing on screen to scroll to. The server
    returns `yourRank`, which is what makes the right page knowable at all.

    ONCE PER BOARD, tracked by time control. Without that it fights the reader the moment they
    press Next: every page they turned would be yanked back to their own row. Switching tabs is
    a new arrival and gets one jump; paging inside a tab never does.
  */
  const jumpedFor = useRef<string | null>(null);
  const youRow = useRef<HTMLDivElement | null>(null);

  useEffect(() => { jumpedFor.current = null; }, [timeControl]);

  useEffect(() => {
    if (runLength != null || !data) return;
    if (jumpedFor.current === timeControl) return;

    const rank = data.yourRank;
    if (!rank) { jumpedFor.current = timeControl; return; }

    const theirPage = Math.floor((rank - 1) / 50) + 1;
    if (theirPage !== data.page) {
      jumpedFor.current = timeControl;
      fetchLeaderboard(timeControl, theirPage);
      return;
    }

    jumpedFor.current = timeControl;
    /*
      After paint, and CENTRED rather than at the top: a row scrolled to the very top of the
      viewport loses the rows above it, which are the ones a reader most wants to see.
    */
    requestAnimationFrame(() => {
      youRow.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, [data, timeControl, runLength, fetchLeaderboard]);

  useEffect(() => {
    setSearchQuery('');
    setSearchResults(null);
    /* A run board is not a time control, and asking the ratings endpoint for
       `timeControl=run5` would be asking a question it cannot answer. */
    if (runLength != null) return;
    fetchLeaderboard(timeControl, 1);
  }, [timeControl, fetchLeaderboard, runLength]);

  return (
    <>
      <SeoHead routeKey="leaderboard" />


      <div className="min-h-screen bg-background pt-6 pb-12">
        <div className="max-w-2xl mx-auto px-4">

          <h1 className="font-playfair text-2xl font-bold mb-6">Leaderboard</h1>

          {/* Time control tabs */}
          <div className="flex rounded-lg border border-border p-1 gap-1 mb-6">
            {TIME_CONTROLS.map(tc => (
              <button
                key={tc.value}
                onClick={() => setTimeControl(tc.value)}
                className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                  timeControl === tc.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {tc.label}
              </button>
            ))}
          </div>

          {/*
            THE RUN BOARDS, on their own row (owner, 2026-08-16: *"maybe a new
            row of tabs for runs performance ratings?"*).

            A second ROW, one SELECTION. Choosing a run board clears the time
            control above it, because "Blitz and runs of 5" is not a state that
            exists - a run performance is a puzzle quantity. Rendering them as
            two independent strips would draw a matrix whose cells are mostly
            nothing.

            It sits below rather than inside the first strip because these rank a
            different thing: the row above ranks a PLAYER's rating, this ranks
            one run. Eight tabs in one line would mix the two and read as one
            list of eight equivalent boards.
          */}
          <div className="flex rounded-lg border border-border p-1 gap-1 mb-6">
            {RUN_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setTimeControl(tab.value)}
                className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                  timeControl === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/*
            Player search belongs to the ratings board. A run board ranks runs,
            and searching it by player would answer a question it does not hold:
            one row per player already, and their best run only.
          */}
          {runLength == null && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search player..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          )}

          {/* Search results overlay */}
          {searchResults && searchResults.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                    Search Results
                  </div>
                  {searchResults.map(r => (
                    <div key={r.username} className="flex items-center px-4 py-3 hover:bg-accent/30 transition-colors">
                      <span className="w-12 flex justify-center">
                        {rankBadge(r.rank)}
                      </span>
                      <Link
                        to={`/player/${r.username}`}
                        className="flex-1 font-medium text-sm hover:text-link transition-colors truncate"
                      >
                        {r.username}
                      </Link>
                      <span className="w-20 text-right font-bold text-sm">{r.rating}</span>
                      <span className="w-20 text-right text-sm text-muted-foreground hidden sm:block">
                        {countFor(timeControl, r)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/*
            THE INVITATION SITS ON THE ONE MOMENT IT IS TRUE FOR THEM: they are on a public
            board, under a name they did not choose. That is the soft-account rule this product
            runs on - prompt where the data is worth keeping, never as a gate.

            It names their handle rather than describing the scheme, because the concrete
            version is the argument. And it is honest: `transferAnonymousData` re-keys completed
            runs onto the account, so the row keeps its place and gains their name.
          */}
          {runLength != null && runBoard?.some(r => r.you && r.isGuest) && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              You are on this board as {runBoard.find(r => r.you)!.username}.{' '}
              {/*
                `returnTo` so they land back on the board they were reading rather than the
                homepage. It is read by `LoginPage` and stashed across the OAuth round trip,
                which was NOT true until 2026-08-05 - four places built the parameter and
                nothing consumed it.
              */}
              <Link
                to={`/login?returnTo=${encodeURIComponent(`${location.pathname}?tc=${timeControl}`)}`}
                className="text-link hover:underline"
              >
                Sign in
              </Link>{' '}
              to use your own name.
            </p>
          )}
          {searchResults && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <p className="text-sm text-muted-foreground text-center mb-4">No players found matching "{searchQuery}"</p>
          )}

          {/* Loading */}
          {runLength == null && loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/*
            The guest's own place, above the board rather than buried in it.
            Deliberately NOT rendered as a fake row inside the table: a person
            who is not on the leaderboard must not appear to be on it, and a
            highlighted row among real ones reads exactly like a listing.
          */}
          {/*
            Not yet on the board. No rank is named, because none is owed.
          */}
          {promptText && (
            <Link
              to="/puzzles"
              onClick={() => logGA4Event({ name: 'puzzle_standing_prompt', params: { surface: 'leaderboard' } })}
              className="w-full mb-4 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/30"
            >
              <Trophy className="w-5 h-5 shrink-0 text-muted-foreground" />
              {/*
                ONE SENTENCE (owner, 2026-08-13). The second line used to read
                "Only players with an account appear here. You keep your rating
                when you join." It answered a question this visitor has not
                reached yet: they have not solved a puzzle, so the account
                argument is not true for them and reads as boilerplate. See
                .claude/skills/ui-copy.
              */}
              <span className="flex-1 text-sm font-medium text-foreground">{promptText}</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </Link>
          )}

          {showStanding && (
            <button
              type="button"
              onClick={() => {
                logGA4Event({
                  name: 'puzzle_standing_opened',
                  params: { rank: standing.rank, surface: 'leaderboard' },
                });
                setOfferOpen(true);
              }}
              className="w-full mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
            >
              <Trophy className="w-5 h-5 shrink-0 text-link" />
              {/*
                Two short sentences, no dashes (owner, 2026-08-13). The first
                version packed the offer and the reassurance into one clause
                joined by an em dash, which reads as one long thought and is not
                how anyone writes. Say the action, then say what it costs them,
                and let the full stop do the work.
              */}
              {/*
                "YOU ARE", NOT "YOU'D BE", SINCE 2026-08-20, and the old line became false the
                day guests joined the board rather than being merely clumsy. It said "Create a
                free account to join the board" to a player who was already on it, four rows
                further down the same screen. The owner read the two together and caught it.

                The offer still holds and its reason changed: they are ranked under a name they
                did not choose, and signing in puts their own name on it. That is also true,
                and checked - `transferAnonymousData` re-keys the rows, so the place is kept.
              */}
              <span className="flex-1 text-sm">
                <span className="font-semibold text-foreground">
                  You are {ordinal(standing.rank)} of {standing.total}
                </span>
                <span className="block text-muted-foreground">
                  {typeof standing.rating === 'number'
                    ? `Sign in to keep your ${standing.rating} rating under your own name.`
                    : 'Sign in to use your own name on the board.'}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </button>
          )}

          {/*
            THE RUN BOARD, which is a different table because it ranks a
            different thing. `Performance` is the run's, not the player's, and
            `Score` carries partial solving - so a row can read 4.5 of 5.

            A GUEST IS LISTED WITHOUT A NAME. Measured on production
            2026-08-16: only 5 of 126 completed runs at length 5 belong to an
            account, 7 of 34 at length 10 and 1 of 6 at length 20. An
            account-only board would hold five rows, seven and one - which is
            the empty-board failure this page shipped once already, when it
            opened on blitz with nothing in it. A guest row is also the sign-in
            argument at its most concrete: your run is up there without your
            name on it.
          */}
          {/*
            WHY A GUEST IS NOT ON THIS BOARD, AND WHAT TO DO ABOUT IT (owner,
            2026-08-16: *"lets not put guests on the leaderboard, we should have
            the message saying they need to sign in"*).

            It is shown BEFORE the board rather than after it, because the
            question it answers - "where am I?" - is asked while reading the
            rows, not once they have finished.

            "COUNT HERE", not "appear here". A run only appears if it is good
            enough for the top twenty, and promising a place to anyone who signs
            in is the offer breaking on the day it is accepted. What an account
            actually buys is eligibility, so that is what the sentence says.

            `returnTo` carries the path AND the query, so a visitor who signs in
            from the board of 20 comes back to the board of 20. Four places on
            this site built that parameter and nothing read it for months.
          */}
          {runLength != null && !user && (
            <Link
              to={`/login?returnTo=${encodeURIComponent(`${location.pathname}?tc=${timeControl}`)}`}
              onClick={() => logGA4Event({
                name: 'run_board_signin_prompt',
                params: { length: runLength },
              })}
              className="w-full mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
            >
              <Trophy className="w-5 h-5 shrink-0 text-link" />
              <span className="flex-1 text-sm font-medium text-foreground">
                Sign in so your runs count here.
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </Link>
          )}

          {runLength != null && runBoard != null && runBoard.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                    <span className="w-12 text-center">#</span>
                    <span className="flex-1">Player</span>
                    <span className="w-24 text-right">Performance</span>
                    <span className="w-20 text-right hidden sm:block">Score</span>
                  </div>
                  {runBoard.map(entry => (
                    <div
                      key={`${entry.rank}-${entry.playedOn}`}
                      className={`flex items-center px-4 py-3 transition-colors ${
                        entry.you ? 'bg-primary/5' : 'hover:bg-accent/30'
                      }`}
                    >
                      <span className="w-12 flex justify-center">{rankBadge(entry.rank)}</span>
                      <span className="flex-1 font-medium text-sm truncate">
                        {entry.username}
                        {/*
                          THE MARK IS NOT DECORATION. A guest handle and an account username are
                          the same kind of string in the same column, and nothing stops someone
                          signing up as `Silent Solver` - `users.username` has no unique
                          constraint. Without this the two are indistinguishable and it reads as
                          impersonation.
                        */}
                        {entry.isGuest && (
                          <span className="ml-2 text-xs text-muted-foreground">guest</span>
                        )}
                        {entry.you && <span className="ml-2 text-xs text-link">you</span>}
                      </span>
                      <span className="w-24 text-right font-bold text-sm">{entry.performanceRating}</span>
                      <span className="w-20 text-right text-sm text-muted-foreground hidden sm:block">
                        {entry.score} of {entry.total}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/*
            THE EMPTY BOARD SAYS WHY IT IS EMPTY, and "no runs of 20 have been
            completed yet" would be false: runs of 20 exist, and none of them
            belongs to an account. Measured on production 2026-08-16 - 6
            completed runs of 20, 1 from an account - so this is the state that
            board actually opens in, not a corner case.
          */}
          {runLength != null && runBoard != null && runBoard.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">
                No run of {runLength} has been posted yet.
              </p>
              <Link
                to="/puzzles"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Be the first
              </Link>
            </div>
          )}

          {runLength != null && runFailed && (
            <p className="text-center py-16 text-muted-foreground">The board did not load.</p>
          )}

          {/* Leaderboard table */}
          {runLength == null && !loading && data && data.entries.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {/* Header */}
                  <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                    <span className="w-12 text-center">#</span>
                    <span className="flex-1">Player</span>
                    <span className="w-20 text-right">Rating</span>
                    <span className="w-20 text-right hidden sm:block">{timeControl === 'puzzle' ? 'Solved' : 'Games'}</span>
                  </div>

                  {/* Entries */}
                  {data.entries.map(entry => (
                    <div
                      key={entry.username}
                      ref={entry.you ? youRow : undefined}
                      /* Your row keeps its highlight AND reacts to the pointer:
                         without a hover of its own it read as the one dead row on
                         the board (owner, 2026-10-02). */
                      className={`flex items-center px-4 py-3 transition-colors ${
                        entry.you ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/30'
                      }`}
                    >
                      <span className="w-12 flex justify-center">
                        {rankBadge(entry.rank)}
                      </span>
                      {/*
                        A GUEST'S NAME IS NOT A LINK. `/player/:username` is an account's page,
                        and a guest has no account behind theirs - the row exists because
                        `getOrCreateRating` needs a `users` row for its foreign key. Linking it
                        would also put a space in the URL, since handles are two words.
                      */}
                      {/*
                        YOUR OWN GUEST ROW IS THE WAY TO CLAIM IT (owner, 2026-10-02). There is
                        no profile to open, so on the puzzle board it opens the same "You are
                        4th" offer as the card above, and on any other board it goes to sign-in,
                        returning here. Other guests' rows stay plain text.
                      */}
                      {entry.isGuest && entry.you ? (
                        showStanding ? (
                          <button
                            type="button"
                            onClick={() => {
                              logGA4Event({
                                name: 'puzzle_standing_opened',
                                params: { rank: entry.rank, surface: 'leaderboard' },
                              });
                              setOfferOpen(true);
                            }}
                            className="flex-1 text-left font-medium text-sm hover:text-link transition-colors truncate"
                          >
                            {entry.username}
                            <span className="ml-2 text-xs text-muted-foreground">guest</span>
                          </button>
                        ) : (
                          <Link
                            to={`/login?returnTo=${encodeURIComponent(`${location.pathname}?tc=${timeControl}`)}`}
                            className="flex-1 font-medium text-sm hover:text-link transition-colors truncate"
                          >
                            {entry.username}
                            <span className="ml-2 text-xs text-muted-foreground">guest</span>
                          </Link>
                        )
                      ) : entry.isGuest ? (
                        <span className="flex-1 font-medium text-sm truncate">
                          {entry.username}
                          <span className="ml-2 text-xs text-muted-foreground">guest</span>
                        </span>
                      ) : (
                        <Link
                          to={`/player/${entry.username}`}
                          className="flex-1 font-medium text-sm hover:text-link transition-colors truncate"
                        >
                          {entry.username}
                        </Link>
                      )}
                      <span className="w-20 text-right font-bold text-sm">
                        {entry.rating}
                      </span>
                      <span className="w-20 text-right text-sm text-muted-foreground hidden sm:block">
                        {countFor(timeControl, entry)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/*
            THE FAILED STATE, which is the one that was missing.

            It says what happened and gives the one control that can fix it. It
            does NOT say "no rated players yet" — that is the empty state below,
            it is a different fact, and telling someone the board is empty when
            we simply could not read it is the kind of wrong answer that gets
            believed.
          */}
          {runLength == null && !loading && failed && (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">The board did not load.</p>
              <button
                type="button"
                onClick={() => fetchLeaderboard(timeControl, 1)}
                className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {runLength == null && !loading && data && data.entries.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">No rated players yet for {timeControl}.</p>
              <Link
                to={timeControl === 'puzzle' ? '/puzzles' : '/play-online'}
                className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                {timeControl === 'puzzle' ? 'Start solving puzzles' : 'Play a rated game'}
              </Link>
            </div>
          )}

          {/*
            The same dialog the trainer uses, told which surface it is on so the
            two can be compared. `returnTo` is this page WITH its query string,
            so a guest who signs in from the puzzle board lands back on the
            puzzle board rather than the default tab — the `?returnTo=` bug that
            went unread for months is exactly the failure to avoid reproducing.
          */}
          <StandingOffer
            standing={standing}
            open={offerOpen}
            onOpenChange={setOfferOpen}
            returnTo={`${location.pathname}${location.search}`}
            surface="leaderboard"
          />

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchLeaderboard(timeControl, data.page - 1)}
                disabled={data.page <= 1}
                className="p-2 rounded-lg border border-border hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground px-3">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => fetchLeaderboard(timeControl, data.page + 1)}
                disabled={data.page >= data.pages}
                className="p-2 rounded-lg border border-border hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </div>

    </>
  );
}
