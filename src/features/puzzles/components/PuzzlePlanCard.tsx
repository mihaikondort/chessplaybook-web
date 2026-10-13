import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Play, X } from 'lucide-react';
import { logGA4Event } from '@/services/analytics';
import type { PlanItem, PlanOffer, TrainingPlan } from '../services/PlanApi';
import { AREA_LABEL } from './plan/planFormat';
import { offerSentence } from '../lib/planOfferSentence';

/**
 * THE PLAN, IN 101px.
 *
 * Written from `PlanSummaryCard` and `PlanEntry`, which are the two things this
 * slot has ever held, and it is the size that makes it one component rather than
 * two. `PlanSummaryCard` measured 129px and its slot on the old page gave it 113
 * at 1280x800, so `Start this session` was drawn 18px below the card's own
 * bottom edge and clipped (2026-08-14). The frozen layout gives this card 101px
 * at the owner's viewport and will not give it more, so what fits is decided
 * here rather than discovered later:
 *
 *     a title row, one line, one control
 *
 * and every state has to say what it has to say in those three. That is not a
 * reduction: it is the whole of what `PlanSummaryCard` renders, and everything
 * else about a plan - the schedule, the setup, the preview, changing it,
 * stopping it - has lived at `/puzzles/plan` since 2026-08-06 precisely because
 * a multi-week commitment does not fit in a box beside a chessboard.
 *
 * IT ANSWERS ONE QUESTION: what am I supposed to do now, and can I start it.
 *
 * THE RULES IT KEEPS:
 *
 *   - THE REFUSAL IS SAID IN A LINE THAT ALREADY EXISTS. A run in progress
 *     blocks a plan day, and the card says so before the click rather than
 *     letting the server's 409 arrive after it. It was once `sr-only` - because
 *     a card must never resize - so a sighted player saw a button that did
 *     nothing. The rule was right and the conclusion was not: while there is
 *     something to say it REPLACES the session description.
 *   - A BLOCKED ACTION IS NOT AN ERROR. A run in progress is a state, not a
 *     fault, so it is muted rather than destructive; a real refusal from the
 *     server is destructive and announced.
 *   - A DAY STOPPED PART-WAY SAYS "PICK IT UP AGAIN". The server RESUMES such a
 *     day - it reactivates the run the item already points at - so "Start"
 *     would name a different act from the one performed.
 *   - THE LOADING STATE IS A SHELL, NOT THE ENTRY. "Train with a plan" shown to
 *     someone who HAS one is a false sentence, so the card says nothing it does
 *     not yet know.
 */

export interface PuzzlePlanCardProps {
  plan: TrainingPlan | null;
  activeItem: PlanItem | null;
  nextItem: PlanItem | null;
  /** What is left of the DAY, not of the block: a review day is three blocks. */
  nextDayTotal: number;
  loading?: boolean;
  busy?: boolean;
  error?: string | null;
  /** Why today's session cannot start right now, or null when it can. */
  blockedReason?: string | null;
  onStart: (item: PlanItem) => void;
  /** The one plan offer, when the server says it has been earned (`usePlanOffer`). */
  offer?: PlanOffer | null;
  onOfferShown?: () => void;
  onOfferAccept?: () => void;
  onOfferDismiss?: () => void;
}

/*
  THE OFFER, IN THE ENTRY'S OWN THREE ROWS (owner, 2026-10-08).

  v2 gave it five - the sentence, an explanation, two buttons - in a taller slot.
  This card is declared at three (`cardTypes.ts`, `puzzlePlan`), and five would
  overflow at the small sizes D23 and D25 cleared. So the offer is the entry
  with the player's own numbers in place of the generic ask: the same title, the
  same link to setup, and an x that declines.

  The second sentence says what is always true. "Weighted toward this one" was
  not guaranteed: the offer picks its area from the per-area figures and the
  plan weights toward `getWeakestAreas`' first, and those can differ.

  THE WHOLE CARD IS THE LINK, and a button inside an `<a>` is invalid HTML, so
  the link stretches over the card through `::after` and the x sits above it.
*/
function OfferEntry({ sentence, onShown, onAccept, onDismiss }: {
  sentence: string;
  onShown?: () => void;
  onAccept?: () => void;
  onDismiss?: () => void;
}) {
  // Spent when it RENDERS, which only this component knows (`usePlanOffer`).
  useEffect(() => { onShown?.(); }, [onShown]);
  return (
    <div className="card-body group relative text-left" data-testid="plan-offer">
      <span className="card-row card-lead">
        <CalendarDays className="shrink-0 text-link" />
        <Link
          to="/puzzles/plan?mode=setup&from=offer"
          onClick={onAccept}
          data-testid="plan-link"
          className="font-medium text-foreground after:absolute after:inset-0 after:content-['']"
        >
          Train with a plan
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="No thanks"
          className="relative z-10 ml-auto shrink-0 hover:text-foreground"
        >
          <X />
        </button>
      </span>
      <span className="block text-muted-foreground" style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}>
        {sentence} A training plan covers all three areas.
      </span>
    </div>
  );
}

/** The way to everything this card deliberately does not hold. */
function DetailsLink({ label = 'Training plan details' }: { label?: string }) {
  return (
    <Link
      to="/puzzles/plan"
      // The denominator for "was a whole page the right call".
      onClick={() => logGA4Event({ name: 'plan_details_opened', params: { from: 'card' } })}
      className="card-row shrink-0 whitespace-nowrap hover:text-foreground"
      style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}
    >
      {label}
      <ChevronRight />
    </Link>
  );
}

export function PuzzlePlanCard({
  plan, activeItem, nextItem, nextDayTotal,
  loading = false, busy = false, error = null, blockedReason = null, onStart,
  offer = null, onOfferShown, onOfferAccept, onOfferDismiss,
}: PuzzlePlanCardProps) {
  if (loading) {
    /* THE SHAPE OF WHAT IT BECOMES, and no words. An empty card reads as a card
       that failed; a card that guessed would tell someone who has a plan to go
       and make one for as long as the round trip takes. */
    return (
      <div className="card-body" aria-busy="true">
        <span className="sr-only">Loading your training plan</span>
        {/* `card-lead` in every state, loading included: the boundary must not
            appear when the answer arrives. */}
        <div className="card-lead flex items-center" style={{ gap: 'calc(var(--card-air) * 2)' }}>
          <div className="animate-pulse rounded bg-muted" style={{ width: 'var(--card-type)', height: 'var(--card-type)' }} />
          <div className="animate-pulse rounded bg-muted" style={{ width: 'calc(var(--card-type) * 6)', height: 'calc(var(--card-type) * 0.6)' }} />
        </div>
        <div className="mt-auto animate-pulse rounded-lg bg-muted" style={{ height: 'calc(var(--card-type) * 2.2)' }} />
      </div>
    );
  }

  /*
    NO PLAN: the standing entry, and its weight is deliberate.

    It was a 12px muted link, last in the panel, and a player who never found it
    is one we failed quietly. What did NOT change is its behaviour: permanent,
    same place, same words whatever the board is doing, nothing to dismiss. It is
    furniture, not an event.
  */
  /* No sentence, no offer: there is deliberately no generic version of it. */
  const sentence = !plan && offer ? offerSentence(offer) : null;
  if (!plan && sentence) {
    return (
      <OfferEntry
        sentence={sentence}
        onShown={onOfferShown}
        onAccept={onOfferAccept}
        onDismiss={onOfferDismiss}
      />
    );
  }

  if (!plan) {
    return (
      <Link
        to="/puzzles/plan?mode=setup&from=card"
        data-testid="plan-link"
        className="card-body group text-left"
      >
        {/*
          THE COLOUR GOES ON THE INNER SPAN, never beside `card-row`. That class
          sets `color` itself and both live in Tailwind's utilities layer, so
          `card-row text-foreground` on one element is a coin toss the class
          wins - measured, the title rendered muted while production draws it as
          foreground.
        */}
        <span className="card-row card-lead">
          <CalendarDays className="shrink-0 text-link" />
          <span className="font-medium text-foreground">Train with a plan</span>
          <ChevronRight className="ml-auto shrink-0 group-hover:text-foreground" />
        </span>
        {/*
          The ask, small. Naming the feature says nothing about what it costs to
          try, which is the question a player actually has.

          NOT A `card-row`: that class is `white-space: nowrap`, which is right
          for a label and a value on one line and wrong for a sentence - it
          printed this one on a single line and clipped it mid-word at the card's
          edge. Production wraps it to two.
        */}
        {/*
          IT SAYS WHO DOES WHAT, and that was the miss (owner, 2026-08-15: *"what
          I don't like with the new text (and the old one) is that it doesn't say
          that we will create a plan for the user"*). Both earlier versions
          described training and never mentioned the offer, which is the one
          thing this card exists to make: you give us the time, WE build it.

          AND THE LINE HOLDS BOTH IDEAS, because there was room for both and I
          twice traded one away for space that was not scarce. Owner, with a
          screenshot of the card's empty lower half: *"there is plenty of space
          there... at least one and a half lines available"*. Measured: this
          sentence wraps to TWO lines at every viewport and leaves 25px at the
          owner's, 15 at 1280x800, 58 at FHD. Only a phone is tight, at 1px - and
          the line it replaces measured exactly the same, so the length costs
          nothing anywhere.

          CONSISTENCY IS WHAT THE PLAN IS FOR (owner, 2026-08-15: *"the most
          important part of the plan is consistency more than anything else"*,
          then *"training consistently, every few days, is one of the most
          important parts helping the progress"*).

          THE SITE'S OWN NUMBERS SAY THE SAME THING. Almost every plan measured
          on 08-13 had exactly ONE day started, and most of the players who
          dropped out never came back to the SITE at all. Adoption was never the
          problem; returning was. A card that sells
          coverage is answering a question nobody was losing.

          WHAT IS STILL NOT SAID, AND WHERE IT LIVES. "Balanced" and "weak spots"
          are both true - the generator's own rule is *"start balanced, shift
          toward measured weakness, never drop an area"* - and they are left to
          `/puzzles/plan`, where the preview shows
          them rather than claiming them.

          AND NOT "all phases of the game", which an earlier draft had: the three
          areas are tactics, middlegame and endgame, TACTICS IS NOT A PHASE, and
          v1's middlegame and endgame are tag-derived tactics rather than
          judgement training. That one would have broken on the day it was
          accepted.
        */}
        <span className="block text-muted-foreground" style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}>
          Tell us how much time you have and we build the plan. Training every few days is what makes you improve.
        </span>
      </Link>
    );
  }

  const underWay = activeItem != null;
  /* The server resumes a stopped day rather than restarting it. */
  const unfinished = !underWay && nextItem?.status === 'abandoned';

  return (
    <div className="card-body" data-testid="plan-summary">
      <span className="card-row card-lead">
        <CalendarDays className="shrink-0 text-link" />
        <span className="truncate uppercase tracking-wide" style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}>
          Your training plan
        </span>
        <span className="ml-auto shrink-0" style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}>
          {plan.progress.completed}/{plan.progress.items}
        </span>
      </span>

      {nextItem ? (
        <>
          <span className="card-row min-w-0" role={error ? 'alert' : undefined}>
            {/* Three things can occupy this line, in order of how much they need
                saying: a refusal that has happened, a reason the action is
                unavailable now, and otherwise what today asks for. */}
            <span className={`truncate font-semibold ${
              error ? 'text-destructive' : blockedReason ? 'text-muted-foreground' : 'text-foreground'
            }`}>
              {error ?? blockedReason ?? `${
                nextItem.kind === 'review' ? AREA_LABEL.mixed : AREA_LABEL[nextItem.area]
              } · ${nextDayTotal} positions`}
            </span>
            {!error && !blockedReason && <DetailsLink label="Details" />}
          </span>

          {underWay ? (
            <span className="card-btn mt-auto border border-border" style={{ background: 'transparent' }}>
              Current session, in progress
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onStart(nextItem)}
              disabled={busy || blockedReason != null}
              /* The reason rides on the control as well as in the line above: a
                 disabled button whose explanation lives elsewhere is the shape
                 that makes people click it repeatedly. */
              title={blockedReason ?? undefined}
              className="card-btn card-btn-primary mt-auto w-full hover:opacity-90 disabled:opacity-50"
            >
              <Play />
              <span className="truncate">{unfinished ? 'Pick it up again' : 'Start this session'}</span>
            </button>
          )}
        </>
      ) : (
        <>
          {/* The positions are the one number the plan produced that the title
              row does not already show (it shows the sessions). v2 printed it;
              the rebuilt card dropped it (C6, D27). */}
          <span className="card-row min-w-0">
            <span className="truncate text-foreground">Complete. {plan.progress.positionsDone} positions.</span>
          </span>
          <span className="card-btn mt-auto border border-border" style={{ background: 'transparent' }}>
            <DetailsLink label="Review the training plan" />
          </span>
        </>
      )}
    </div>
  );
}

export default PuzzlePlanCard;
