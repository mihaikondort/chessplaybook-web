import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

/**
 * A step button that keeps stepping while it is held (owner, 2026-10-10, E0: carried
 * over from the Lichess viewer). The library's own timing (`events.js`,
 * `eventRepeater`): one step on the press, then after 500ms a step every 350ms,
 * speeding up to every 100ms, until the button is let go.
 *
 * THE LATEST HANDLER, NOT THE FIRST. A page's `onBack` closes over the move it was
 * rendered at (`setViewPly(currentPly - 1)`), so calling the handler captured at the
 * press would set the same move again and again. Each repeat reads the ref, which
 * every render refreshes.
 *
 * A pointer press steps on `pointerdown`; the `click` that follows it is ignored
 * (`detail > 0`), or one press would be two steps. Enter and Space still work: a
 * keyboard click has `detail === 0`.
 */
function useRepeatingPress(action: (() => void) | undefined) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || e.currentTarget.disabled) return;
    stopRef.current?.();
    let delay = 350;
    let timer = window.setTimeout(function repeat() {
      actionRef.current?.();
      delay = Math.max(100, delay - delay / 15);
      timer = window.setTimeout(repeat, delay);
    }, 500);
    actionRef.current?.();
    const stop = () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      stopRef.current = null;
    };
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
    stopRef.current = stop;
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) actionRef.current?.();
  };
  // A long press must not open the touch context menu instead of stepping.
  const onContextMenu = (e: MouseEvent<HTMLButtonElement>) => e.preventDefault();
  return { onPointerDown, onClick, onContextMenu };
}

interface BoardControlsProps {
  /** History navigation — omit on boards without a move history. */
  onStart?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  /** Flip applies to any board. */
  onFlip?: () => void;
  onReset?: () => void;
  /**
   * History controls are rendered but not usable.
   *
   * The PGN viewer's own pattern (`.lpv__fbt.disabled`, opacity 0.4). A board
   * whose history only becomes navigable later shows the controls greyed rather
   * than hiding them, so the reader can see they exist and are waiting.
   */
  historyDisabled?: boolean;
  className?: string;
}

/**
 * The control strip under an interactive board.
 *
 * Consumers (verified 2026-08-08, not taken from this docstring's own earlier
 * claim, which listed two pages that do not use it): `/analysis` via
 * `useLiveAnalysisBoard` (a hook since D3b), `/puzzles` via `PuzzleTrainer`, and the Champion
 * Challenge via `ChallengeBoard`. `/explain` renders `viewOnly` boards with no
 * controls at all.
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 *
 * It is the champion-game viewer's control bar, rebuilt (owner, 2026-08-08:
 * "look into the game viewer for the champions, there the implementation is
 * correct"). That bar was not our markup: `@lichess-org/pgn-viewer` rendered it
 * as `.lpv__controls` / `.lpv__fbt`, and our custom stylesheet for the library
 * styled it: full width, `flex: 1 1 auto` segments, `min-height: 3rem`, a 1px
 * divider between them, and a real disabled state. (The library, its viewer and
 * both stylesheets were deleted in layout redesign E9, 2026-10-12; every board
 * page uses this bar since Phase E.)
 *
 * THE STYLESHEET COULD NOT SIMPLY BE REUSED: every rule was scoped under `.lpv`
 * and marked `!important`, and its unscoped `cg-board { background-color: ...
 * !important }` would have repainted every chessground board site-wide.
 *
 * So this reproduces the FORM from design tokens. The reference's `#1e293b` /
 * `#475569` / `#334155` / `#64748b` are hardcoded literals belonging to no
 * palette — copying them is exactly how the Champion Challenge cards ended up
 * unable to follow any theme change.
 *
 * A button with no handler is not rendered.
 */
export function BoardControls({
  onStart, onBack, onForward, onFlip, onReset,
  historyDisabled = false, className = '',
}: BoardControlsProps) {
  /*
    A LONE FLIP IS NOT A BAR.

    The bar earns its width by having a history to navigate. The Champion
    Challenge commits one move per position and passes only `onFlip`, and a
    single button stretched across a 600px board is not the reference — it is a
    mistake that looks like a submit button. Derived from the handlers rather
    than from a prop so a caller cannot get it wrong, and stated here because a
    derived rule that is not written down is a surprise.
  */
  const hasHistory = !!(onStart || onBack || onForward);
  const backPress = useRepeatingPress(onBack);
  const forwardPress = useRepeatingPress(onForward);

  /*
    NO PLACEMENT OF ITS OWN (F2). The bar carried a top margin (`mt-1 cols:mt-2`,
    owner 2026-08-05: tighter under the board on a phone) from before the
    Workspace, which zeroes it in its toolbar row. The one other caller, an
    article's board (`ArticleGameViewer`), sets its own, at its own breakpoint.
  */
  const spacing = '';

  if (!hasHistory) {
    return (
      <div className={`${spacing} flex items-center gap-1 px-1 ${className}`}>
        {onFlip && (
          <button onClick={onFlip} className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Flip board" aria-label="Flip board">
          <ArrowUpDown className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  /*
    `min-h-11` is 44px — the reference's `min-height: 3rem` brought onto this
    site's tap-target scale. The strip it replaces was a 16px icon in `p-1.5`,
    i.e. 28px controls: WCAG 2.5.8's 24px minimum and nothing more, and the
    smallest targets on a page whose primary action is 48px.
  */
  /*
    THE CLASSES ARE THE PGN VIEWER'S OWN, copied into `src/index.css` — see the
    long note there. Three earlier versions rebuilt this look in Tailwind from
    measurements and each was wrong in a different way: a flush strip instead of
    a padded frame, then segments too dark to read as buttons. Using the
    library's actual rules removes the guessing.
  */

  return (
    /*
      `.surface-card` ALONGSIDE `.board-controls` (owner, 2026-08-09: "can we do
      the trough same as the cards").

      The trough was flat `hsl(var(--card))` while every card on the page carries
      the 2026-08-07 surface — the same fill plus a 5% white top gradient, an
      inner top highlight and a soft shadow. Level with the puzzle page's
      analysis card and directly under the board, a flat block read as a
      different kind of object at a different depth.

      Worn rather than copied. `.surface-card` lives in `@layer utilities` and
      this class in `@layer components`, so the utility wins and `.board-controls`
      declares no background at all — one source for the surface, which is the
      thing that would otherwise drift. That layering is also why `.surface-card`
      exists as a utility: shadcn's `Card` hardcodes `shadow-sm`, which beat it in
      `components` and left those cards with no elevation at all.

      SHARED SURFACE, SHARED CHANGE: this bar is also on `/analysis` and the
      Champion Challenge, and both get the same treatment. That is the point —
      the alternative was a puzzles-only variant, i.e. two troughs.
    */
    <div className={`${spacing} board-controls surface-card ${className}`}>
      {onStart && (
        <button onClick={onStart} disabled={historyDisabled} className="board-controls__fbt"
          title="Go to start" aria-label="Go to start">
          <SkipBack className="w-5 h-5" />
        </button>
      )}
      {onBack && (
        <button {...backPress} disabled={historyDisabled} className="board-controls__fbt"
          title="Previous move" aria-label="Previous move">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {onForward && (
        <button {...forwardPress} disabled={historyDisabled} className="board-controls__fbt"
          title="Next move" aria-label="Next move">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      {/*
        No spacer. The old strip had `<div className="flex-1" />` here, which
        pushed flip and reset to the far edge — 440px of empty space at 1440 on
        `/analysis`, reading as two unrelated toolbars sharing a row. The
        reference distributes with `flex-1` on the buttons themselves, which is
        what that spacer was imitating badly.
      */}
      {onReset && (
        <button onClick={onReset} disabled={historyDisabled} className="board-controls__fbt"
          title="Go to final position" aria-label="Go to final position">
          <SkipForward className="w-5 h-5" />
        </button>
      )}
      {onFlip && (
        <button onClick={onFlip} className="board-controls__fbt" title="Flip board" aria-label="Flip board">
          <ArrowUpDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
