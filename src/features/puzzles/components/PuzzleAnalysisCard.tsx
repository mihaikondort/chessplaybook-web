import { useEffect, useLayoutEffect, useState } from 'react';
import { ExternalLink, Fish } from 'lucide-react';

import { buildPositionHref } from '@/lib/positionDeepLink';
import { logGA4Event } from '@/services/analytics';
import { analysisService } from '@/services/AnalysisService';
import type { AnalysisResult } from '@/types/analysis';

/*
  ONE NAMED TAB, REUSED — not a new tab per click.

  A named `target` is the whole mechanism: the browser reuses the window that
  already carries this name, so pressing Full analysis on three positions in a
  row updates one tab rather than opening three. The acceptance bar in the plan
  is exactly that, and no more: a tab the visitor opened themselves is a
  different window and stays separate, because a page cannot reliably focus one.

  THE CROSS-TAB WORKER LEASE IS DELIBERATELY NOT HERE YET. Its job is to stop
  two Stockfish workers existing at once (§0.3a), and today this card runs no
  engine at all — so opening `/analysis` creates exactly one analysis worker,
  the same as a visitor typing the URL. **It becomes required the moment C1
  starts an engine in this card**, and that is the commit that must add it, not
  this one.
*/
const ANALYSIS_TAB = 'chessplaybook-analysis';

/**
 * PZ-043 — the compact analysis card, in the band beside the board's control
 * strip.
 *
 * ── WHAT THIS IS TODAY: THE FRAME, AND ONLY THE FRAME ─────────────────────
 *
 * Owner, 2026-08-09: *"the first step is to have the card visible, just with
 * Stockfish version and we take it from there"*. So it renders the one thing
 * that is true in every state and never changes, and it holds a box of exactly
 * the right size and position. There is no engine here, no subscription, no
 * FEN prop and no actions — deliberately, and this file is the record of that.
 *
 * The previous attempt built the card and its engine wiring together and could
 * not be judged in parts: when the box was the wrong size there was no way to
 * tell a layout mistake from an analysis one. The frame is settled first.
 *
 * ── WHY IT LOOKS LIKE THE CONTROL STRIP ───────────────────────────────────
 *
 * IT BELONGS TO ITS COLUMN, NOT TO THE CONTROL BAR (owner, 2026-08-09: *"the
 * card should be the same as the cards above, same style and other properties
 * apart from the height, obviously"*).
 *
 * So `.surface-card`, exactly as every card in this column wears it. It takes
 * the trough's geometry — `0.375rem` padding, the same radius, an interior of
 * exactly the strip's 40px control height — because it is level with the bar,
 * and its SURFACE from the cards above, because that is what it is one of.
 *
 * **`bg-card` IS NOT THE SAME THING, AND THAT MISTAKE WAS SHIPPED HERE FOR AN
 * HOUR.** Both resolve to `hsl(var(--card))`, so the swap looks like a no-op in
 * the source and the box measures identically — same left, same right, same
 * width, same height. But `.surface-card` also carries
 * `linear-gradient(to bottom, rgb(255 255 255 / 0.05), transparent)` and an
 * inner top highlight, and without them the card measured **43.3 mean RGB
 * against its neighbours' 52.3** in the owner's own screenshot. On a dark page a
 * darker block of identical size reads as smaller and set back — which is
 * exactly how it was reported, first as "not the same height" and then as "the
 * width seems less". Neither was a size. **A DOM measurement cannot see this
 * class of defect at all**; only the rendered pixels can, which is why the rule
 * in CLAUDE.md says to measure the screenshot first.
 *
 * ── THE RULE THAT OUTLIVES THIS STEP ──────────────────────────────────────
 *
 * The card's height is given to it by `TrainerLayout`, which measures the real
 * control strip. It asks for no height of its own and must never do so. A card
 * that sizes itself from its content is the defect that shrank the plan card
 * three times in one day, and this one is going to gain a line of engine output
 * that arrives after the layout has settled.
 */
export interface PuzzleAnalysisCardProps {
  /**
   * `isResolved` AND NOTHING ELSE — see §0.3 of the plan.
   *
   * `failed` is a transient status: a wrong move sets it and an auto-revert
   * returns to `playing` ~700ms later, so anything keyed on "not playing" opens
   * for a fraction of a second on EVERY wrong move. A control that opens a full
   * engine board mid-attempt hands over the answer, which is the defect B1
   * exists to prevent and which has already shipped on this page twice.
   */
  enabled: boolean;
  /**
   * The position ON THE BOARD, which after Phase A is not always the last one.
   * This is what the compact engine follows: stepping back through the solved
   * line re-analyses, which is the *"what if"* the card exists for.
   */
  fen: string;
  /**
   * THE POSITION THE SOLVER WAS GIVEN — where `Full analysis` opens.
   *
   * Owner, 2026-08-10: *"the full analysis page should open the original puzzle
   * position, so the user can test whatever they want to test, not only the
   * final position."*
   *
   * It deliberately DIFFERS from `fen`, and the two must not be collapsed. The
   * engine belongs to the board, because the reader is looking at the board;
   * the link belongs to the puzzle, because someone opening a full board wants
   * to play alternatives to the move they were asked to find — and the end of
   * the solution is the one position from which none of those are reachable.
   *
   * Falls back to `fen` when absent, so a caller with no line to offer still
   * gets a working link rather than none.
   */
  linkFen?: string;
  orientation: 'white' | 'black';
  /** Feature semantics for inactive copy, accessibility text, and analytics. */
  surface?: 'puzzles' | 'play_online' | 'play_computer' | 'champion_game' | 'live_game' | 'analysis';
}

/**
 * The one line of engine output, and the states that stand in for it.
 *
 * EVERY BRANCH RETURNS THE SAME SHAPE — a fixed-width evaluation followed by
 * a single truncating line — because the card's box is given to it by
 * `TrainerLayout` and may not change. `tabular-nums` on the evaluation is what
 * stops the line jittering sideways as the number refines from `+0.3` to
 * `+0.42`; without it every digit change nudges the moves along.
 */
function CompactLine({
  enabled,
  result,
  inactiveLabel,
}: {
  enabled: boolean;
  result: AnalysisResult | null;
  inactiveLabel: string;
}) {
  // The gate's own state. Not "loading" — nothing is loading, and saying so
  // during an attempt would advertise that an answer is coming.
  if (!enabled) {
    /* 75%, not 70% (layout redesign D18, 2026-10-08): at 70 these four status
       lines measured 4.40:1 on the card, under AA's 4.5; 75 is 4.83:1, the
       smallest step that passes. */
    return <span className="truncate text-xs text-muted-foreground">{inactiveLabel}</span>;
  }

  if (!result) {
    return <span className="truncate text-xs text-muted-foreground">Thinking…</span>;
  }

  if (result.evaluation === 'OTHER_TAB') {
    return <span className="truncate text-xs text-muted-foreground">Analysis is running in another tab</span>;
  }

  if (result.evaluation === 'ERROR' || result.evaluation === 'TIMEOUT') {
    return <span className="truncate text-xs text-muted-foreground">Analysis unavailable</span>;
  }

  /*
    A finished game — checkmate, stalemate or a draw. There is no evaluation
    because there is nothing left to evaluate, and saying so is the whole point:
    this state used to render "Thinking…" indefinitely.

    `text-foreground`, not the muted treatment the other non-result states wear.
    This is the real answer for this position, not an apology for the absence of
    one — and after a mating puzzle it is the answer the solver just produced.
  */
  if (result.evaluation === 'TERMINAL') {
    return <span className="truncate text-sm font-medium">{result.principalVariation}</span>;
  }

  const isWhiteBetter =
    result.evaluation.startsWith('+') ||
    (result.evaluation.startsWith('M') && !result.evaluation.startsWith('M-'));

  return (
    <>
      <span
        className={
          'shrink-0 font-mono text-sm font-semibold tabular-nums ' +
          (isWhiteBetter ? 'text-foreground' : 'text-muted-foreground')
        }
      >
        {result.evaluation}
      </span>
      {/*
        `min-w-0` is what actually lets `truncate` work inside a flex row —
        a flex item's default `min-width: auto` refuses to shrink below its
        content, so a long principal variation would push the Full analysis
        link out of the card instead of being clipped.
      */}
      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
        {result.principalVariation}
      </span>
    </>
  );
}

export function PuzzleAnalysisCard({
  enabled,
  fen,
  linkFen,
  orientation,
  surface = 'puzzles',
}: PuzzleAnalysisCardProps) {
  const href = buildPositionHref('/analysis', linkFen ?? fen, orientation);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inactiveLabel = surface !== 'puzzles'
    ? 'Available once the game is over'
    : 'Available once the puzzle is over';

  /*
    ONE SUBSCRIPTION FOR THE LIFE OF THE CARD, and it is separate from the
    panel's. Results arrive per `info` line, so this fires many times during a
    single search and the evaluation refines in place — which is the whole of
    §0.3b's "appears as soon as possible", and why the box must be fixed.
  */
  useEffect(() => analysisService.subscribeCompact(setResult), []);

  /*
    THE GATE AND THE POSITION, IN ONE EFFECT.

    `enabled` is `isResolved` and nothing else (see the prop's own note): a
    wrong move sets `failed` transiently and auto-reverts, so anything keyed on
    "not playing" would run the engine for a fraction of a second on EVERY
    wrong move — handing over the answer mid-attempt, which is the defect B1
    exists to prevent.

    The cleanup is what stops the previous puzzle's search: it runs on every
    FEN change and on unmount, so walking the solved line cancels and re-issues
    rather than stacking searches, and starting the next puzzle stops the work
    outright. `stopCompactAnalysis` deliberately leaves the worker alive — see
    its own note; terminating it here would cost a WASM reload per puzzle.
  */
  /*
    A LAYOUT EFFECT, so a finished game never flashes "Thinking…".

    `useEffect` runs AFTER paint, so React drew one frame of the placeholder
    before the request was even made. For a real position that is invisible and
    honest — the engine genuinely is about to think. For a terminal one it is a
    lie the width of a frame, and `requestCompactAnalysis` answers those
    synchronously, without touching the engine: running here means the answer is
    in state before the browser paints, and the placeholder is never shown at
    all rather than merely shown briefly.

    Safe for the ordinary path too: the request is `void`ed either way, so
    nothing about a real search is made synchronous by this.
  */
  useLayoutEffect(() => {
    if (!enabled || !fen) {
      analysisService.stopCompactAnalysis();
      setResult(null);
      return;
    }

    setResult(null);
    void analysisService.requestCompactAnalysis(fen);

    return () => analysisService.stopCompactAnalysis();
  }, [enabled, fen]);

  /*
    COMING BACK TO THIS TAB RECLAIMS THE ENGINE.

    Reported 2026-08-10: the card said *"Analysis is running in another tab"*
    when it no longer was. The lease-loss state was STICKY AND HAD NO EXIT —
    the effect above only re-runs when `enabled` or `fen` changes, so closing
    the analysis tab left this card showing the notice until the next puzzle.
    `/analysis` survives the same loss because its toggle re-initialises the
    engine; this card has no control at all, so nothing could ever clear it.

    Re-claiming on visibility is not a special case bolted on — it is the
    lease's own rule (`engineLease.ts`: the tab you are LOOKING AT is the one
    that should be analysing) applied to focus as well as to load. Stealing was
    always how ownership moves; this makes returning to the tab a way of asking.

    Usually free: the result for this position is normally still cached, and
    `requestCompactAnalysis` serves a cache hit without touching the engine, so
    the common path replaces the stale notice with the evaluation and starts
    nothing. Guarded on `leaseLost` so an ordinary tab switch, with the engine
    already ours, does no work whatsoever.
  */
  useEffect(() => {
    if (!enabled || !fen) return;

    const reclaim = () => {
      if (document.visibilityState !== 'visible') return;
      if (!analysisService.isEngineHeldElsewhere()) return;
      void analysisService.requestCompactAnalysis(fen);
    };

    /*
      TWO WAYS BACK, because there are two ways the claim stops being true.

      The listeners cover *"the other tab still has it and I have come back
      here"* — the visitor asking for it, which steals.

      `subscribeEngineAvailable` covers *"the other tab closed while I was
      looking at this one"*, which needs no interaction at all: the lease
      queues an ordinary, non-stealing request that is granted the instant the
      holder releases — and Web Locks releases on unload, so a closed tab
      counts. Without it, a visible card would sit on a false message until the
      visitor happened to click away and back.

      Re-requesting rather than merely clearing the text: the result for this
      position is normally still cached, so the honest evaluation comes back
      instead of a blank, and no engine is started at all.
    */
    document.addEventListener('visibilitychange', reclaim);
    window.addEventListener('focus', reclaim);
    const offAvailable = analysisService.subscribeEngineAvailable(() => {
      if (document.visibilityState !== 'visible') return;
      void analysisService.requestCompactAnalysis(fen);
    });

    // Also on mount: the tab may already be focused with the lease long gone,
    // which is exactly the reported case — the event fired while this effect
    // did not exist.
    reclaim();

    return () => {
      document.removeEventListener('visibilitychange', reclaim);
      window.removeEventListener('focus', reclaim);
      offAvailable();
    };
  }, [enabled, fen]);

  /*
    The event is recorded, and the navigation is left to the browser.

    `preventDefault` + `window.open` was the previous shape and it buys nothing
    here: the anchor already has the href and the named target, so letting it
    proceed keeps middle-click, ctrl-click and "open in new window" working
    exactly as the visitor expects. Modified clicks are not counted, because
    they are a different intent and often a different window.

    Its own event name, not `analysis_enabled`: that one means the visitor
    turned the analysis product on, and reusing it would silently inflate a
    number two other surfaces already report.
  */
  const openFullAnalysis = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (surface === 'play_online') {
      logGA4Event({ name: 'online_full_analysis_opened', params: { source: 'compact' } });
    } else if (surface === 'play_computer') {
      logGA4Event({ name: 'computer_full_analysis_opened', params: { source: 'compact' } });
    } else if (surface === 'champion_game') {
      logGA4Event({ name: 'champion_full_analysis_opened', params: { source: 'compact' } });
    } else if (surface === 'live_game') {
      logGA4Event({ name: 'live_full_analysis_opened', params: { source: 'compact' } });
    } else if (surface === 'analysis') {
      logGA4Event({ name: 'review_full_analysis_opened', params: { source: 'compact' } });
    } else {
      logGA4Event({ name: 'puzzle_full_analysis_opened', params: { source: 'compact' } });
    }

    /*
      THE THREE `postMessage` CONSOLE ERRORS COME FROM THIS LINK, AND THEY ARE
      LEFT IN DELIBERATELY. The owner traced them; the connection is real and it
      is ours.

      Opening this named tab gives the new window an `opener`, and gtag walks
      that relationship for its cross-domain sync — posting to a SAME-ORIGIN
      window with a Google target origin, which can never match. Measured on
      production: **0 before opening Full analysis, 3 immediately after**
      (www.google.com, www.youtube.com, m.youtube.com). I twice reported this as
      third-party noise that production did not reproduce; both times my probe
      had never clicked this link.

      THE CALLER WAS CAPTURED, not guessed: `AL` ← `FL` ← `GS` inside
      `gtag/js`, calling `window.postMessage(msg, 'https://www.google.com')` on
      OUR OWN window. gtag hooks window opening for cross-domain linking and
      pings a set of Google origins on the current window, which by definition
      cannot match. Isolated to the window itself — a plain gtag EVENT with no
      navigation produces nothing, and an unrelated tab taking focus produces
      nothing; only opening a window that shares our browsing-context group
      does it.

      FOUR FIXES WERE TRIED AND MEASURED. NONE BOTH WORKS AND IS FREE:

      | `rel="noopener"`                        | 0 errors — BREAKS the feature |
      | `window.open` + `opened.opener = null`  | 3 errors — too late to help   |
      | `allow_google_signals: false`           | 3 errors — no effect          |
      | `allow_ad_personalization_signals:false`| 3 errors — no effect          |

      `noopener` puts the new window in a separate browsing-context group, so
      the named target stops finding it and a second click opens a THIRD tab.
      One reused tab is this control's acceptance bar in the plan.

      The two Signals flags are recorded because an earlier note claimed turning
      Google Signals off was "the honest lever". IT IS NOT — tested on
      production against the live tag, and neither flag changes anything. That
      claim would have cost someone demographics and remarketing audiences for
      no gain.

      So: three cosmetic warnings, visible only with DevTools open, against a
      stack of tabs for everyone. The warnings stay.
    */
  };

  return (
    <section
      /*
        `px-2.5 py-1.5` AND NOT `p-1.5`, for the reason `PuzzleAppearanceCard`
        records: the vertical 6px is the band's arithmetic (52 − 2×6 = the 40px
        control height beside it) while the horizontal is the COLUMN's, and
        every other card here insets its content by 10px.

        This card was out by 4px in the OTHER direction from the left one — 6
        against 10 — and was not reported, because the right column's cards do
        not put icons in a vertical line the way the record cards do. Found by
        measuring every `.surface-card` while fixing the one that WAS reported.
      */
      className="surface-card flex h-full w-full items-center overflow-hidden rounded-lg px-2.5 py-1.5"
      aria-label={surface !== 'puzzles' ? 'Game analysis' : 'Puzzle analysis'}
    >
      {/*
        A FISH, NOT THE WORD (owner, 2026-08-09: "this would save us lots of
        space and everybody would know what it means. and is also funny").

        "STOCKFISH 18" is ~95px of a 394px card that has an evaluation, a depth,
        a principal variation and two actions still to come. The mark costs 20.

        `Fish` and NOT `FishSymbol`, which lucide also offers and which is the
        cleaner shape at this size: `FishSymbol` is the **ichthys**, the
        Christian fish. It would read as a statement nobody here is making, on
        a card about a chess engine.

        THE NAME IS NOT LOST, it is just not printed. `title` puts it in the
        hover tooltip for anyone who does not get the joke, and the `sr-only`
        span is what a screen reader announces — an `aria-hidden` glyph on its
        own would leave the engine unnamed for exactly the readers who cannot
        see that it is a fish.
      */}
      {/*
        No horizontal padding of its own, so the mark and the link sit the SAME
        distance from their respective card edges — the card's `p-1.5`, and
        nothing added on one side only. It had `px-1`, which put the fish 10px
        in while the link ended up 6px in: symmetric-looking code, visibly
        lopsided card.
      */}
      <span className="flex shrink-0 items-center text-muted-foreground" title="Stockfish 18">
        <Fish className="h-6 w-6" aria-hidden />
        <span className="sr-only">Stockfish 18</span>
      </span>

      {/*
        The engine's output, between the mark and the link exactly where the
        frame commit reserved room for it. `min-w-0` on the wrapper for the
        same flexbox reason given inside `CompactLine`, and `flex-1` so it
        absorbs the whole of whatever the fish and the link leave over —
        which is what keeps the link's position independent of how long the
        principal variation happens to be.
      */}
      {/* `mx-1` and `gap-1` (owner, 2026-08-16: *"space between fish and actual
          analysis text should be made smaller"*). This span sits between the
          mark and the link, and both of its margins were 8px of the line the
          moves are trying to fit in. */}
      <span className="mx-1 flex min-w-0 flex-1 items-baseline gap-1">
        <CompactLine enabled={enabled} result={result} inactiveLabel={inactiveLabel} />
      </span>

      {/*
        The button is pinned to the right with `ml-auto` rather than following
        the mark. Its width is its own; nothing that arrives later may move it.
      */}
      <a
        href={href}
        target={ANALYSIS_TAB}
        onClick={openFullAnalysis}
        aria-disabled={!enabled}
        tabIndex={enabled ? 0 : -1}
        title={enabled ? 'Open this position on the analysis board' : inactiveLabel}
        /*
          A LINK, NOT A BUTTON (owner, 2026-08-09: "leave just the text and the
          icon and move it a bit more to the right").

          It had the control bar's filled treatment, which made it the loudest
          thing in a card whose actual subject — the evaluation — is not built
          yet. It is also not the card's primary action; it is the way OUT of
          the trainer, and the page already has one filled primary (New Puzzle).

          `min-h-10` SURVIVES the chrome. The visible box is gone but the hit
          area is still the strip's 40px, which is the tap-target scale this
          page settled on; a text link 16px tall would be the smallest target
          on the page and the only one below WCAG 2.5.8's minimum.
        */
        className={
          'ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-medium ' +
          'underline-offset-4 transition-colors ' +
          (enabled
            ? 'text-muted-foreground hover:text-foreground hover:underline'
            : 'pointer-events-none text-muted-foreground opacity-40')
        }
      >
        Full analysis
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </section>
  );
}

export default PuzzleAnalysisCard;
