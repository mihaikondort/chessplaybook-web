import { useCallback, useEffect, useRef, useState } from 'react';
import { stepwiseScroll } from './stepwiseScroll';

/**
 * Arrow keys and the mouse wheel stepping a board back and forward through its moves
 * (layout redesign Eg, 2026-10-10).
 *
 * ONE COPY. `/analysis`, `/play-online` and `/puzzles` each wrote their own, and they
 * had drifted: `/play-online`'s keys stepped the board while the reader typed in a text
 * field (the D28 defect `/analysis` had already fixed), and only `/puzzles` stopped the
 * page scrolling under the board on a wheel movement too small to step.
 *
 * INPUT ONLY. What "back" and "forward" mean is the page's: a puzzle's line has a
 * ceiling, `/play-online` uses `null` for the latest move, `/analysis` keeps its own
 * history. The page passes the two steps and the hook decides when they fire.
 *
 * The wheel binds to the element passed to the returned ref callback, usually the
 * board. Keys listen on the window, so they work wherever focus is, except in a text
 * field, where a key belongs to the text, or with a modifier held, which is a browser
 * or system shortcut.
 */
export interface BoardStepInputOptions {
  /** False while there is nothing to step through; the page then scrolls as usual. */
  enabled: boolean;
  onBack: () => void;
  onForward: () => void;
  /** Arrow keys as well as the wheel. Default true. */
  keys?: boolean;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

export function useBoardStepInput({ enabled, onBack, onForward, keys = true }: BoardStepInputOptions) {
  // The latest steps, read at the moment of the event, so a new closure on every
  // render does not rebind the listeners.
  const steps = useRef({ onBack, onForward });
  steps.current = { onBack, onForward };

  /*
    STATE, NOT A REF, for the element: a board can mount after the page's first
    render, and a ref would be null on the pass that runs the effect with nothing
    to re-run it when the element arrived (usePuzzleBoard learned this first).
  */
  const [wheelEl, setWheelEl] = useState<HTMLElement | null>(null);
  const attachWheel = useCallback((el: HTMLElement | null) => { setWheelEl(el); }, []);

  useEffect(() => {
    if (!wheelEl || !enabled) return;
    const onWheel = stepwiseScroll((e, step) => {
      // Every wheel event over the board, not only the ones that step: otherwise a
      // movement too small to step scrolls the page and the board walks away from
      // the pointer.
      e.preventDefault();
      if (!step) return;
      if (e.deltaY > 0) steps.current.onForward();
      else if (e.deltaY < 0) steps.current.onBack();
    });
    wheelEl.addEventListener('wheel', onWheel, { passive: false });
    return () => wheelEl.removeEventListener('wheel', onWheel);
  }, [wheelEl, enabled]);

  useEffect(() => {
    if (!keys || !enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (isTypingTarget(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') steps.current.onBack();
      else steps.current.onForward();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, enabled]);

  return attachWheel;
}
