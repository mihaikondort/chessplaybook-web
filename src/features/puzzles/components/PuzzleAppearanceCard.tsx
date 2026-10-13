import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Palette, Volume2, VolumeX } from 'lucide-react';

import { BoardThemePicker } from '@/components/chess/BoardThemePicker';
import { logGA4Event } from '@/services/analytics';

/**
 * PZ-043 D1 — the LEFT footer card, in the band beside the board's control
 * strip.
 *
 * The mirror of `PuzzleAnalysisCard`: same `.surface-card`, same `p-1.5`, same
 * 40px interior, because they are the two ends of one band and anything that
 * differs between them reads as a mistake. **`bg-card` is not the same thing** —
 * it resolves to the identical colour and measures identically, but without
 * `.surface-card`'s top gradient and inner highlight it renders visibly darker
 * and reads as set back. That mistake shipped on the right-hand card for an
 * hour and was reported twice, first as a wrong height and then as a wrong
 * width. Neither was a size.
 *
 * ── WHY A POPOVER AND NOT SIX SWATCHES IN THE BAR ─────────────────────────
 *
 * The band is 52px tall and shares its width with the board. Six swatches with
 * captions do not fit, and shrinking them to fit would produce tap targets
 * below WCAG 2.5.8's 24px minimum on the page whose whole left column exists to
 * be usable. The trigger is a 40px control, matching the strip beside it.
 *
 * THE CARD'S HEIGHT IS GIVEN TO IT BY `TrainerLayout`, which measures the real
 * control strip. It asks for no height of its own and must never do so — a card
 * that sizes itself from its content is the defect that shrank the plan card
 * three times in one day. The popover is therefore absolutely positioned and
 * takes the card out of nothing.
 */
export interface PuzzleAppearanceCardProps {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
  /** Analytics owner when this shared control is reused outside Puzzles. */
  analyticsSurface?: 'puzzles' | 'play_online' | 'play_computer' | 'analysis' | 'champion_challenge' | 'champion_game' | 'live_game';
  /**
   * PZ-043 D2. Absent on viewports where the mode does nothing — the control is
   * not rendered rather than rendered disabled, because a disabled control
   * makes a promise about a state that cannot be reached here.
   */
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export function PuzzleAppearanceCard({
  currentThemeId,
  onThemeChange,
  analyticsSurface = 'puzzles',
  focusMode = false,
  onToggleFocusMode,
  soundEnabled = true,
  onToggleSound,
}: PuzzleAppearanceCardProps) {
  /*
    THREE CONTROLS SHOW ICONS ONLY (layout redesign D1, 2026-10-08). With the
    sound toggle the band holds three, and measured on /play's Workspace lane
    (176-240px) the labelled row did not fit at ANY width: 18-26px over at
    176-206, and 5px over even at 240 with the 18px type of a 1920x947 window.
    The sound toggle was already icon-only; Theme and Focus join it. Their names
    stay in `aria-label` and the tooltip. Two controls (/puzzles) keep labels.
  */
  const iconsOnly = Boolean(onToggleSound);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);

  /*
    THE POPOVER IS PORTALLED, AND A `z-index` COULD NOT HAVE FIXED THIS.

    The footer slot carries `panel-scroll` with `overflow-y-auto` — deliberately,
    so it reserves the same scrollbar gutter as the cards above it and its
    contents stay aligned with them (see `TrainerLayout`'s FOOTER_SLOT note).
    A panel opening UPWARD out of that slot is therefore CLIPPED, and clipped
    content is not hit-testable: the swatches rendered, looked completely
    correct, and every click fell through to the *Puzzle rankings* link behind
    them.

    Found by driving it — Playwright reported that link intercepting pointer
    events — and a screenshot would have shown nothing wrong, because the
    popover is visible. Only the clicks were gone. Raising `z-index` was tried
    first and did nothing, which is the useful part: `z-index` orders painting,
    it does not escape a clipping ancestor.

    So the panel goes to `document.body` and is positioned from the trigger's
    own rectangle. `position: fixed` matches that measurement, which is in
    viewport coordinates.
  */
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ left: rect.left, bottom: window.innerHeight - rect.top + 6 });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  /*
    Re-measured while open, because a fixed panel anchored to a moving element
    drifts away from it. `true` on the scroll listener is what catches the
    trainer's own scrolling columns — a scroll inside them does not bubble.
  */
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  /*
    Dismissal, and the two ways people expect it.

    Escape returns focus to the trigger — without that, dismissing with the
    keyboard drops focus to the document body and a keyboard user has to walk
    the page again from the top. A pointer dismissal deliberately does NOT move
    focus: the pointer user is already looking somewhere else, and yanking
    focus back would scroll the page under them.
  */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // The panel is portalled, so it is NOT inside `containerRef` any more —
      // checking only the container would dismiss on every click on a swatch.
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <section
      /*
        `relative z-30` ON THE CARD, not just on the popover — and the popover's
        own `z-20` was not enough, which is the part worth recording.

        The footer slot and the column's scrolling card stack are SIBLINGS. A
        `z-index` only orders an element among its siblings inside the same
        stacking context, so a `z-20` two levels down could not lift the popover
        above a sibling of its own grandparent: the panel painted over it, and
        the *Puzzle rankings* link sat on top of the swatches and swallowed the
        clicks. Found by driving it — Playwright reported that link intercepting
        pointer events — and it would have looked completely fine in a
        screenshot, because the popover IS visible. Only the clicks were gone.
      */
      /*
        `px-2.5 py-1.5` AND NOT `p-1.5` — the two axes answer to different
        things, which is why they are written separately.

        VERTICAL is the band: 52px minus 2×6px leaves exactly the 40px control
        height the strip beside it uses, so `py-1.5` is load-bearing and must
        not become 10.

        HORIZONTAL is the COLUMN. Every other card in this column insets its
        content by 10px, and at 6px this card's icon sat 4px further right than
        the four above it — reported 2026-08-10 as *"bigger padding than the
        'go to' card"*. Four stacked cards make a vertical line of icons and the
        eye reads a 4px break in it immediately, even though nothing about the
        card's own box is wrong.
      */
      className="surface-card relative z-30 flex h-full w-full items-center overflow-visible rounded-lg px-2.5 py-1.5"
      aria-label="Board appearance"
    >
      {/*
        `overflow-visible`, unlike the analysis card's `overflow-hidden`. That
        card clips a principal variation that outgrows it; this one has to let a
        popover escape its 52px band. The two differ for a reason, which is why
        it is written down rather than left to look like an inconsistency.
      */}
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          title="Board theme"
          /*
            `aria-label`, NOT a visible word plus an `sr-only` one.

            An `sr-only` span APPENDS to the accessible name rather than
            replacing it, so the button announced as "Theme Board theme" — the
            redundancy only a screen reader hears, and only if someone listens.
            Found by this session's own a11y probe printing the computed names.
            `aria-label` overrides the content outright.
          */
          aria-label="Board theme"
          className={
            /*
              No LEFT padding: the card's own 10px is what aligns the icon with
              the column, and any added here would push it back out of line.
              The right side keeps `pr-2` so the hover fill does not end flush
              against the label.
            */
            'inline-flex items-center gap-1.5 rounded-md pr-2 font-medium ' +
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
            (open
              ? 'bg-accent/50 text-foreground'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          <Palette className="h-[1.5em] w-[1.5em]" aria-hidden />
          {/*
            BOTH CONTROLS KEEP THEIR WORDS (owner, 2026-08-10: *"can we have the
            wording back? Board theme was fine"*).

            The icons-only version was written against a space constraint I
            asserted instead of measuring: 218px of card, 198 of content, and
            the two labelled controls come to about 180. It fits, and the card
            reads as part of the record column rather than as a toolbar — which
            is what "doesn't look as good as before" was.

            The card width does not vary: the column is `cols:w-60` at every
            desktop size, so this is not a measurement that holds at one
            viewport and fails at another.
          */}
          {/*
            "Theme", not "Board theme" (owner, 2026-08-10). Two labelled
            controls in a 218px card left "Board theme" on TWO LINES, and my
            measurement missed it because it tested `scrollWidth > width` — the
            button did not overflow, it SHRANK AND WRAPPED, which that check
            cannot see. A wrapped label is not an overflowing one.

            `whitespace-nowrap` on both labels so this can never happen
            silently again: with it, too little space becomes a visible overlap
            or an overflow that a measurement CAN detect, instead of a quiet
            second line. The full phrase stays in the tooltip and the
            screen-reader name, where there is no space constraint.
          */}
          <span className={`whitespace-nowrap${iconsOnly ? ' hidden' : ''}`}>Theme</span>
        </button>

        {open && anchor && createPortal(
          /*
            Opens UPWARD. This card sits on the last row of the page's content,
            so a downward panel would open into the footer or off the fold — the
            same reason Play Online's popover opens upward from its own control
            bar. Expressed as a `bottom` offset from the trigger's top edge
            rather than `bottom-full`, since it no longer shares an offset
            parent with the trigger.
          */
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Board theme"
            style={{ position: 'fixed', left: anchor.left, bottom: anchor.bottom }}
            className="z-50 w-52 rounded-lg border border-border bg-card p-3 shadow-lg"
          >
            <BoardThemePicker
              currentThemeId={currentThemeId}
              onSelect={(id: string) => {
                logGA4Event({ name: 'board_theme_changed', params: { theme_id: id, surface: analyticsSurface } });
                onThemeChange(id);
              }}
              /*
                Closes on choice, matching Play Online. The board is behind the
                popover, so staying open would hide the thing being judged —
                and re-opening to try another is one click.
              */
              onAfterSelect={() => setOpen(false)}
            />
          </div>,
          document.body,
        )}
      </div>

      {onToggleSound && (
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundEnabled}
          title={soundEnabled ? 'Mute move sounds' : 'Enable move sounds'}
          aria-label={soundEnabled ? 'Mute move sounds' : 'Enable move sounds'}
          className="ml-auto inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
        </button>
      )}

      {/*
        FOCUS MODE, beside the theme rather than in a menu. It is a thing you
        reach for mid-solve, and burying a one-press toggle under a popover
        would cost more than the space it saves.

        The icon states the DESTINATION, not the state: `Minimize2` while
        focused, because pressing it leaves. A control that shows what you are
        currently in gives you nothing to predict from.
      */}
      {onToggleFocusMode && (
        <button
          type="button"
          onClick={() => {
            // `!focusMode` is the state being entered, not the one being left.
            logGA4Event({ name: 'focus_mode_toggled', params: { enabled: !focusMode, surface: analyticsSurface } });
            onToggleFocusMode();
          }}
          aria-pressed={focusMode}
          title={focusMode ? 'Leave focus mode (Esc)' : 'Focus mode — hide everything but the board'}
          /* Same reason as the theme trigger above: it announced as
             "Focus mode — hide everything but the board", visible word first. */
          aria-label={focusMode ? 'Leave focus mode' : 'Focus mode — hide everything but the board'}
          className={
            `${onToggleSound ? '' : 'ml-auto '}inline-flex items-center gap-1.5 rounded-md px-2 font-medium ` +
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
            (focusMode
              ? 'bg-accent/50 text-foreground'
              : 'text-muted-foreground hover:text-foreground')
          }
        >
          {focusMode
            ? <Minimize2 className="h-[1.5em] w-[1.5em]" aria-hidden />
            : <Maximize2 className="h-[1.5em] w-[1.5em]" aria-hidden />}
          {/*
            "Focus", not "Focus mode" — the shorter word is what fits beside
            "Board theme", and the icon carries the rest. The full phrase stays
            in the tooltip and in the screen-reader name, where there is no
            space constraint at all.

            `ml-auto` pins it to the card's right edge, so it lands on the same
            10px inset from that edge as the analysis card's link does on its
            own. Its position then does not move if the other label ever
            changes length.
          */}
          <span className={`whitespace-nowrap${iconsOnly ? ' hidden' : ''}`}>Focus</span>
        </button>
      )}
    </section>
  );
}

export default PuzzleAppearanceCard;
