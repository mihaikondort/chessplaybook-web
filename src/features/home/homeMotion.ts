import { useEffect, useRef, useState } from 'react';

/*
  ROTATION ON THE HOMEPAGE (owner, 2026-11-13; D4). The featured champion and the champions strip change on
  their own, and stop:
  - while a reader is on them (hover or keyboard focus) and in a background tab;
  - entirely under reduced motion (WCAG 2.2.2);
  - entirely on touch screens (D4): no hover there to pause it, and a tap can land on a card that just changed.
  Both are CSS's answer, never a JS media query (reentry.test.ts keeps media decisions in CSS): `--v2-motion`
  is 0 under `prefers-reduced-motion: reduce` and `--v2-rotate` is 0 under `(hover: none)` (index.css). Read on
  every tick, so a change of setting applies without a reload.
*/
function rotationAllowed(): boolean {
  const s = getComputedStyle(document.documentElement);
  return s.getPropertyValue('--v2-motion').trim() !== '0' && s.getPropertyValue('--v2-rotate').trim() !== '0';
}

/** Calls `tick` every `ms` unless paused, the tab is hidden, motion is reduced, or the screen is touch-only. */
export function useTicker(tick: () => void, ms: number, paused: boolean) {
  const ref = useRef(tick);
  ref.current = tick;
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && rotationAllowed()) ref.current();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, paused]);
}

/** Pause while the pointer is over the element or focus is inside it. */
export function usePauseHandlers() {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  return {
    paused: hover || focus,
    handlers: {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onFocus: () => setFocus(true),
      onBlur: (e: React.FocusEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(false); },
    },
  };
}

/** A 1x1 transparent GIF: what a touch screen gets instead of a hover-only image (never downloaded there). */
export const NO_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
