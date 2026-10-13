import { CheckCircle2, ChevronRight, Compass, Eye, Signal, Target, WifiOff, XCircle } from 'lucide-react';
import { Action, LiveStatus } from './TrainerUI';

/**
 * CARD 1 — what is happening on this position, and what to do about it.
 *
 * Written from the trainer's own card rather than lifted out of it, one rule at
 * a time. Every gate below is a defect that shipped once:
 *
 *   - the reveal row is keyed on `playing || failed`, and `failed` is TRANSIENT:
 *     auto-revert returns a solver to `playing` within 700ms, so a row that
 *     unmounted would flicker out and back at the exact moment a frustrated
 *     player is reaching for it. It is rendered and made `inert` instead.
 *   - `inert` ALONE, never with `aria-hidden`. Both were set together and Chrome
 *     refuses the second while the clicked button still holds focus ("Blocked
 *     aria-hidden on an element because its descendant retained focus"), which
 *     leaves the row exposed to assistive technology — the opposite of the
 *     intent. Found in the browser console, 2026-08-13.
 *   - the headline is REPLACED while exploring rather than joined by a second
 *     line: the slot reserves two lines, so writing into it costs nothing, and
 *     anything appended would grow the card.
 *   - difficulty is shown from the start (owner, 2026-08-06), reversing an
 *     earlier rule that withheld it. Recorded as a decision, not a slip.
 *   - signal bars, not a gauge: a gauge is an open arc and reads as a broken
 *     circle at this size.
 *
 * COLOUR LIVES ON THE MARK, NEVER ON THE SENTENCE. The status line used to render
 * in three different hues, one of them a raw Tailwind literal belonging to no
 * palette. The words are `text-foreground` and the icon carries good/bad, which
 * is also more accessible than a coloured sentence.
 */
export interface PuzzleLiveCardProps {
  status: string;
  message: string;
  rating?: number | null;
  prompt?: string | null;
  isDailyPuzzle?: boolean;
  exploring: boolean;
  isMidSolve: boolean;
  announcement?: string;
  loading: boolean;
  /** Inside a run this reads `Next Puzzle`; outside one, `New Puzzle`. */
  sessionId?: string | null;
  /**
   * The last draw asked for a filter and the corpus had nothing.
   *
   * SAID IN THE LINES THIS CARD ALREADY HAS, and the way out is the button that
   * is already there. A filtered request used to be answered with an unrelated
   * puzzle; the server now correctly serves nothing, and the page became a dead
   * end instead - no new position, a primary that appeared to do nothing, and a
   * cause the player cannot see because the filter is in a card they may never
   * have opened (2026-08-05). A card must not resize, so the message takes the
   * headline and the recovery takes the label.
   */
  filterFoundNothing?: boolean;
  onClearFilter?: () => void;
  /**
   * The last draw could not reach the API.
   *
   * THE FALLBACK USED TO SAY NOTHING AT ALL (2026-08-22). When the API is
   * unreachable the trainer serves five hardcoded puzzles, shuffled, and every
   * one of them looked exactly like the product working - so a dev backend that
   * had never bound its port produced a whole session of the same puzzles
   * repeating, reported as production being broken. Nothing was scored either,
   * and nothing said that.
   *
   * IT OUTRANKS `filterFoundNothing` because both cannot be true and the filter
   * line is the one that misleads: no request was made, so nothing "matched".
   * Same slots, same geometry, no block that comes and goes.
   */
  serverUnreachable?: boolean;
  /**
   * HOW THE RUN THAT JUST ENDED WENT (owner, 2026-08-16: *"the performance
   * should be on the live card"*).
   *
   * IT COSTS NO HEIGHT, which is why it can be here at all. The detail slot
   * under the headline holds the puzzle's prompt WHILE PLAYING and nothing
   * otherwise - and a run ends on a resolved puzzle, so the slot is empty at
   * exactly the moment this has something to say. Same line, same reserved
   * space, no block that comes and goes.
   *
   * REALIZED AGAINST EXPECTED, both derived by the server from the attempt log:
   * `realized` counts PARTIAL solving (3 correct moves of 5 is 0.6) and
   * `expected` is the Elo expectation of each puzzle against the rating the
   * player held immediately before that attempt. Null when the run had nothing
   * measurable in it, never 0.
   */
  runOutcome?: { rating: number; realized: number; total: number } | null;
  onNextPuzzle: () => void;
  onShowSolution: () => void;
}

export function PuzzleLiveCard({
  status, message, rating, prompt, isDailyPuzzle = false,
  exploring, isMidSolve, announcement, loading, sessionId,
  filterFoundNothing = false, onClearFilter, runOutcome = null,
  serverUnreachable = false,
  onNextPuzzle, onShowSolution,
}: PuzzleLiveCardProps) {
  const revealable = status === 'playing' || status === 'failed';
  const statusIcon = status === 'correct'
    ? <CheckCircle2 className="w-[1em] h-[1em] text-success" />
    : status === 'failed'
      ? <XCircle className="w-[1em] h-[1em] text-destructive" />
      : status === 'solution'
        ? <Eye className="w-[1em] h-[1em] text-muted-foreground" />
        : null;

  return (
    <>
      <LiveStatus
        chip={(
          <span className="inline-flex items-center gap-[calc(var(--card-w,208px)*0.04)]">
            {isDailyPuzzle && status === 'playing' && (
              <span className="inline-flex items-center gap-[0.35em] font-medium text-link">
                <Target className="w-[1em] h-[1em]" />
                Daily Puzzle
              </span>
            )}
            {rating != null && (
              <span className="inline-flex items-center gap-[0.35em] tabular-nums">
                <Signal className="w-[1em] h-[1em]" />
                Difficulty {rating}
              </span>
            )}
          </span>
        )}
        headline={(
          <span className="inline-flex items-start gap-[0.35em] text-foreground">
            {serverUnreachable
              ? <WifiOff className="w-[1em] h-[1em] mt-[0.1em] shrink-0 text-muted-foreground" />
              : exploring
                ? <Compass className="w-[1em] h-[1em] mt-[0.1em] shrink-0 text-muted-foreground" />
                : isMidSolve
                  ? <CheckCircle2 className="w-[1em] h-[1em] mt-[0.1em] shrink-0 text-success" />
                  : statusIcon}
            <span>
              {serverUnreachable
                ? 'Cannot reach the server'
                : filterFoundNothing
                ? 'Nothing matched that filter'
                : exploring
                  ? 'Trying a variation'
                  : isMidSolve
                    ? 'Correct so far — keep going'
                    : (message || 'Loading puzzle...')}
            </span>
          </span>
        )}
        detail={serverUnreachable
          ? 'These are offline practice puzzles, so nothing here is scored.'
          : filterFoundNothing
          ? 'Nothing in your rating range carries it. The board still has your last puzzle.'
          : status === 'playing' ? (prompt || 'Find the best move')
            /*
              The slot is empty once a puzzle is resolved, which is exactly when
              a run has just ended.

              THE RATING IS THE FIGURE (owner, 2026-08-16: *"the rating
              performance is a rating"*), and the score is what it was computed
              from - a bare number with nothing behind it invites "performance at
              what?". Partial solving is why it can read 3.5 rather than 4.
            */
            : runOutcome
              ? `Run performance: ${runOutcome.rating}, scored ${
                runOutcome.realized.toFixed(1)} of ${runOutcome.total}`
              : null}
        announce={announcement}
      />

      {/* `shrink-0`: a short card may squeeze the status region, never the
          actions. In every mode since F2 (it was columns-only, `cols:`, from the
          pre-Workspace page). */}
      <div className="live-actions shrink-0">
        {/* Same slot, same geometry: the recovery is the primary's LABEL, the
            way Start run becomes Stop run. Pressing New Puzzle again would ask
            the server the same impossible question. */}
        <Action
          tier="primary"
          onClick={filterFoundNothing && onClearFilter ? onClearFilter : onNextPuzzle}
          /*
            THE RECOVERY IS NEVER DISABLED, and it was - which made it
            unpressable in exactly the state it exists for. The disable guards
            against drawing twice while a puzzle is on its way; when the filter
            found nothing there is no puzzle and no draw in flight, so `status`
            sits at `loading`/`ready` for ever and the only way out of the dead
            end was itself dead. Found by the probe, not by reading it.

            `loading` still binds: while the recovery's own fetch is in flight,
            pressing again would issue a second draw.
          */
          disabled={filterFoundNothing
            ? loading
            : loading || status === 'loading' || status === 'ready'}
          icon={<ChevronRight className="w-[1em] h-[1em]" />}
        >
          {filterFoundNothing && onClearFilter
            ? 'Clear the filter'
            : sessionId ? 'Next Puzzle' : 'New Puzzle'}
        </Action>

        <div
          {...(!revealable ? { inert: '' as unknown as boolean } : {})}
          className={`live-reveal-row flex items-center ${revealable ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {/*
            44px, and it is the second place that number is a constant rather
            than a ratio. This control ENDS the attempt and the outcomes are not
            symmetrical (2026-08-13): revealing by accident costs the rating on
            this puzzle. It must not be easy to hit by mistake, nor so small it
            is hard to hit on purpose.
          */}
          <button
            type="button"
            onClick={onShowSolution}
            className="trainer-reveal flex-1 min-h-11 rounded-[0.4em] border border-border text-[length:var(--card-type,14px)] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground inline-flex items-center justify-center gap-[0.4em]"
          >
            <Eye className="w-[1em] h-[1em]" />
            Show solution
          </button>
        </div>
      </div>
    </>
  );
}

export default PuzzleLiveCard;
