/**
 * Wheel-to-step, copied from `@lichess-org/pgn-viewer`.
 *
 * Copyright (c) Lichess contributors, https://github.com/lichess-org/pgn-viewer
 * Licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).
 *
 * THIS IS THE LIBRARY'S CODE, not a reimplementation of it — the champion game
 * pages get this behaviour from the viewer itself, and the owner's instruction
 * (2026-08-08) was to take the behaviour from there rather than write another.
 *
 * Source: `@lichess-org/pgn-viewer` 2.5.2, `dist/events.js`, `stepwiseScroll` (the
 * library itself was removed in layout redesign E9, 2026-10-12).
 * Copied rather than imported because the export is internal to the library's
 * view layer — `initPgnViewer` is the only public entry point, and it builds a
 * whole viewer around a PGN. Our boards are chessground with their own state.
 *
 * WHAT IT IS FOR, and why a plain `wheel` handler is not enough: it accumulates
 * `deltaY` and only steps once the total passes 4, so one notch of a mouse
 * wheel is one move and a trackpad flick does not fly through the whole game.
 * `deltaMode` scales the line-based deltas Firefox reports.
 */
export function stepwiseScroll(inner: (e: WheelEvent, scroll: boolean) => void) {
  let scrollTotal = 0;
  return (e: WheelEvent) => {
    scrollTotal += e.deltaY * (e.deltaMode ? 40 : 1);
    if (Math.abs(scrollTotal) >= 4) {
      inner(e, true);
      scrollTotal = 0;
    } else {
      inner(e, false);
    }
  };
}
