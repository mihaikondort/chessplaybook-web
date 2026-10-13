/**
 * "You are 4th" — the sign-in offer, in the one place a guest can see it.
 *
 * IT SAID "YOU'D BE" UNTIL 2026-08-20, which was true while guests were absent from the
 * puzzle leaderboard and became false the day they joined it. The rank was never conditional
 * after that: the player IS ranked, under a generated name, and what signing in changes is
 * whose name is on the row rather than whether there is one.
 *
 * THE ROW REPLACES "Sign in to save" rather than joining it (owner,
 * 2026-08-09). The GO TO card's rows are one line at 192px, which is why the
 * longer "Sign in to save progress" was cut in the first place — a sentence
 * naming a rank has no chance there. A rank is two or three characters, so the
 * hook fits where the explanation never could, and the explanation moves behind
 * the click.
 *
 * IT ONLY APPEARS WHEN THE NUMBER IS TRUE. Below the board's own thresholds the
 * server returns `eligible: false` with no rank, and the row falls back to the
 * old copy. Naming a place for someone who would not be listed is worse than
 * saying nothing, because they find out by accepting.
 *
 * The copy went through four drafts. The owner's verdict on the third — "too
 * long, not human" — is the reason it is three short sentences with no warning
 * about losing data and no explaining of what a leaderboard is.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Cloud, Trophy } from 'lucide-react';
import { logGA4Event } from '@/services/analytics';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ordinal, type PuzzleStanding } from '../services/StandingService';

/**
 * Which page the offer is being made on. Carried through to every event so the
 * two surfaces can be compared — the trainer catches a guest mid-task, the
 * leaderboard catches one looking at the ranking they are absent from, and
 * which of those converts is the question this instrumentation exists to answer.
 */
export type StandingSurface = 'trainer' | 'leaderboard';

interface StandingOfferProps {
  standing: PuzzleStanding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where sign-in returns to — this page, with whatever it was showing. */
  returnTo: string;
  surface?: StandingSurface;
}

/** True only when there is a real place to name. */
export function hasStanding(standing: PuzzleStanding | null): standing is PuzzleStanding & { rank: number } {
  return standing?.eligible === true && typeof standing.rank === 'number';
}

/**
 * The row itself. Same geometry as its two neighbours in every state, because
 * this card must not change height when the fetch lands — a row that grows on
 * arrival is the defect the whole panel was rebuilt to remove.
 */
export function StandingRow({
  standing, onOpen, returnTo, surface = 'trainer',
}: {
  standing: PuzzleStanding | null;
  onOpen: () => void;
  returnTo: string;
  /** Which page this row is on. See `puzzle_standing_shown` in analytics.ts. */
  surface?: StandingSurface;
}) {
  /*
    THE ROW IS THE CARD'S SIZE, like the two rows above it (owner, 2026-08-16:
    *"the Sign in to save is way too big"*).

    `text-sm` and `py-1` are fixed - 14px in a card whose own type is 10 at
    788x467, so this row rendered 28px tall beside neighbours at 16.7 and read as
    a different kind of object. The card publishes `--card-type` and the other
    rows in this card already use it.
  */
  const rowClass = 'w-full flex items-center gap-2 py-[0.16em] text-[length:var(--card-type,14px)] text-muted-foreground hover:text-foreground transition-colors';

  /*
    Reported once per (surface, rank), not once per render. The standing arrives
    asynchronously and the row re-renders for reasons of its own, so an
    unguarded call would inflate the denominator of the only ratio this event
    exists to produce: offers shown vs offers taken.
  */
  const reported = useRef<string | null>(null);
  const rank = hasStanding(standing) ? standing.rank : null;
  const total = standing?.total ?? 0;
  useEffect(() => {
    if (rank === null) return;
    const key = `${surface}:${rank}`;
    if (reported.current === key) return;
    reported.current = key;
    logGA4Event({ name: 'puzzle_standing_shown', params: { rank, total, surface } });
  }, [rank, total, surface]);

  if (!hasStanding(standing)) {
    return (
      <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} className={rowClass}>
        <Cloud className="w-3.5 h-3.5 shrink-0" />
        {/* One line at 192px: the longer "Sign in to save progress" wrapped, and
            a 48px row against its 28px neighbours overflowed the card. */}
        <span className="truncate">Sign in to save</span>
        <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        logGA4Event({ name: 'puzzle_standing_opened', params: { rank: standing.rank, surface } });
        onOpen();
      }}
      className={rowClass}
    >
      <Trophy className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">You are {ordinal(standing.rank)}</span>
      <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
    </button>
  );
}

export function StandingOffer({ standing, open, onOpenChange, returnTo, surface = 'trainer' }: StandingOfferProps) {
  if (!hasStanding(standing)) return null;
  /*
    Two real routes, not one route with a mode. `/signup` exists, and both pages
    read `?returnTo=` — which is worth stating because for months four places
    built that parameter and nothing read it, so everyone who signed in landed
    on the homepage. An offer that sends someone away from the board they were
    just told about would reproduce that bug by hand.
  */
  const login = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  const signup = `/signup?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>You are {ordinal(standing.rank)}</DialogTitle>
          {/*
            NAME THE NUMBER, IN PLAIN SENTENCES (2026-08-13).

            "You keep your rating" is abstract; "You keep your 1452 rating" is
            the offer. `seedPuzzleRatingFromGuest` genuinely carries the guest's
            Glicko state onto the account, so this is a promise the server
            already keeps and we were simply not making it out loud.

            No dashes, and no clause stacking (owner). Three short sentences,
            each saying one thing.

            Guarded on the rating being present: the dialog only opens when
            `eligible` is true, but the field is typed nullable and inventing a
            number here would break the offer at the moment it is accepted,
            which is the exact failure `eligible` exists to prevent.
          */}
          <DialogDescription className="space-y-2 pt-1 text-sm text-foreground">
            {/* Not "only players with an account appear": false since 2026-08-20,
                when guests joined the board under generated names (D12). */}
            <span className="block">Sign in to put your own name on the board.</span>
            <span className="block">
              {typeof standing.rating === 'number'
                ? `You keep your ${standing.rating} rating, your puzzles and your training plan.`
                : 'You keep your rating, your puzzles and your training plan.'}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Link
            to={signup}
            onClick={() => logGA4Event({
              name: 'puzzle_standing_cta',
              params: { action: 'signup', rank: standing.rank, surface },
            })}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create account
          </Link>
          <Link
            to={login}
            onClick={() => logGA4Event({
              name: 'puzzle_standing_cta',
              params: { action: 'login', rank: standing.rank, surface },
            })}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-foreground hover:bg-muted"
          >
            I have one
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StandingOffer;
