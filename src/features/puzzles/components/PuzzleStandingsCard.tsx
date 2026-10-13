import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Compass, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchPuzzleStanding, type PuzzleStanding } from '../services/StandingService';
import { StandingOffer, StandingRow } from './StandingOffer';

/**
 * GO TO — every way off this page, in one card.
 *
 * Production's own three rows, marks and order: the training record on a target,
 * the rankings on a trophy, and the guest's standing last. Each row is a mark, a
 * label and a chevron — the row grammar `StandingLink`, `Toggle` and `StatGrid`
 * all share, which is what stops a card becoming a fourth presentation register.
 *
 * THE STANDING ROW IS FOR GUESTS ONLY, and the guard is `user`, never
 * `standing.identified`. The server sets `identified: true` whenever it resolved
 * an identity AT ALL, and a guest carrying an anonymous id is identified — so
 * keying on it hid the offer from exactly the audience it was built for, which
 * the owner found on dev in about a minute (2026-08-13). Two questions that read
 * alike at the call site: *do we know who is asking* and *are they signed in*.
 *
 * The links are ROUTER LINKS, not buttons with handlers: they are navigation, so
 * they should middle-click, open in a new tab, and be readable as links by
 * anything that reads links.
 */
export function PuzzleStandingsCard() {
  const { user } = useAuth();
  const location = useLocation();
  const [standing, setStanding] = useState<PuzzleStanding | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPuzzleStanding(controller.signal)
      .then(setStanding)
      .catch(() => setStanding(null));
    return () => controller.abort();
  }, []);

  const row = 'w-full flex items-center gap-[calc(var(--card-w,208px)*0.04)] py-[0.16em] text-[length:var(--card-type,14px)] text-muted-foreground hover:text-foreground transition-colors';

  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]">
        <Compass className="w-[1em] h-[1em]" />
        Go to
      </span>
      {/*
        NO GAP BETWEEN THESE ROWS (owner, 2026-08-15: *"distance between lines is
        not that big on production"*, *"distance to the bottom of the card is
        bigger for the last line"*).

        `.card-body` puts 0.35em between its children, which is the rhythm for
        rows that are separate statements - a label and its value. These are a
        LIST, and production sets their rhythm with the rows' own padding alone:
        measured, its gap is 0 and ours was 5, which also pushed the last line
        flush onto the card's bottom edge (0px against production's 16).
      */}
      <div className="card-body" style={{ gap: 0 }}>
        <Link to="/puzzles/progress" className={row} data-testid="go-to-record">
          <Target className="w-[1em] h-[1em] shrink-0" />
          Training record
          <ChevronRight className="ml-auto w-[1em] h-[1em] shrink-0" />
        </Link>
        {/*
          `?tc=puzzle` is what the leaderboard reads, and it is the parameter the
          trainer has always linked. The page defaults to the puzzles tab now
          (2026-08-13), so this is belt and braces rather than load-bearing.
        */}
        <Link to="/leaderboard?tc=puzzle" className={row} data-testid="go-to-rankings">
          <Trophy className="w-[1em] h-[1em] shrink-0" />
          Puzzle rankings
          <ChevronRight className="ml-auto w-[1em] h-[1em] shrink-0" />
        </Link>
        {!user && (
          <StandingRow
            standing={standing}
            onOpen={() => setOfferOpen(true)}
            returnTo={`${location.pathname}${location.search}`}
          />
        )}
      </div>

      {/*
        `returnTo` carries the query string as well as the path, so a guest who
        signs in from here lands back where they were rather than on the default
        page — the `?returnTo=` bug that went unread for months is the one to
        avoid reproducing.
      */}
      <StandingOffer
        standing={standing}
        open={offerOpen}
        onOpenChange={setOfferOpen}
        returnTo={`${location.pathname}${location.search}`}
        surface="trainer"
      />
    </>
  );
}

export default PuzzleStandingsCard;
