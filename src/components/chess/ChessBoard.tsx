import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Key, Color, Dests } from '@lichess-org/chessground/types';
import { coordinateInk, getBoardTheme, type BoardTheme } from '@/config/boardThemes';
import { useBoardTheme } from '@/hooks/useBoardTheme';

// Import chessground CSS + our theme overrides
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
import '@lichess-org/chessground/assets/chessground.cburnett.css';
import './chessboard.css';

export interface ChessBoardProps {
  /** FEN string for the current position */
  fen?: string;
  /** Board orientation */
  orientation?: Color;
  /** Legal move destinations map (from chessops chessgroundDests) */
  dests?: Dests;
  /** Which color can move, or 'both', or undefined for view-only */
  turnColor?: Color;
  /** Color allowed to move pieces */
  movableColor?: Color | 'both';
  /** Last move to highlight [from, to] */
  lastMove?: Key[];
  /** Color currently in check */
  check?: Color | boolean;
  /** View-only mode (no interaction) */
  viewOnly?: boolean;
  /** Enable premoves */
  premovable?: boolean;
  /** Board theme ID from our theme config */
  themeId?: string;
  /** Enable coordinates */
  coordinates?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Minimum pointer movement before a piece drag starts. */
  dragDistance?: number;
  /** Let Chessground remove the drag threshold after detecting drag usage. */
  autoDragDistance?: boolean;
  /**
   * Board size.
   *
   * A **number** is CSS pixels and is applied as an exact width, not merely a
   * cap. That distinction is a bug fix: with only a `max-width`, the board's
   * real width came from whatever the surrounding column resolved to, so it
   * measured 469px while solving and 519px once the finished state added a
   * card — the board visibly growing at the moment the puzzle ended.
   *
   * A **string** is a raw CSS value applied as `max-width`, which is what the
   * board pages other than the puzzle trainer still pass.
   */
  size?: string | number;
  /** Called when a move is made */
  onMove?: (orig: Key, dest: Key, capturedPiece?: { role: string; color: string }) => void;
  /** Called when the board state changes */
  onChange?: () => void;
  /** SVG shapes to draw on the board (arrows, circles) */
  shapes?: Array<{ orig: Key; dest?: Key; brush: string }>;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * Builds a Set of "fileIdx,rankIdx" screen-coordinate keys for every square
 * that contains a piece, computed purely from the FEN string.
 * Screen coordinates depend on board orientation:
 *   white: file a = fIdx 0 (left), rank 8 = rIdx 0 (top)
 *   black: file h = fIdx 0 (left), rank 1 = rIdx 0 (top)
 */
function fenToOccupied(fen: string, orientation: Color): Set<string> {
  const set = new Set<string>();
  const board = fen.split(' ')[0];
  if (!board) return set;
  board.split('/').forEach((rank, fenRankIdx) => {
    let f = 0;
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const sf = orientation === 'white' ? f : 7 - f;
      const sr = orientation === 'white' ? fenRankIdx : 7 - fenRankIdx;
      set.add(`${sf},${sr}`);
      f++;
    }
  });
  return set;
}

/**
 * Shared interactive chess board component.
 * Wraps @lichess-org/chessground with React lifecycle management.
 *
 * Used by: play (vs computer), puzzles, online play, game viewer.
 */
export function ChessBoard({
  fen,
  orientation = 'white',
  dests,
  turnColor,
  movableColor,
  lastMove,
  check,
  viewOnly = false,
  premovable = false,
  themeId,
  coordinates = true,
  animationDuration = 200,
  dragDistance = 3,
  autoDragDistance = true,
  size = '100%',
  onMove,
  onChange,
  shapes,
  className = '',
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);

  // Build theme CSS variables for the board.
  // Chessground uses: background-color (= light square) + SVG with opacity overlay (= dark squares).
  // We generate an SVG where dark squares use the actual dark color and light squares are transparent,
  // then set background-color to the light square color.
  //
  // THE THEME COMES FROM THE ONE RESOLVER (B4). This used to resolve it again
  // in a `useState` initialiser, reading the legacy `boardTheme` key BEFORE the
  // current one, so a visitor carrying both saw an older theme here than on
  // every other board. `themeId` is still an explicit override.
  const { currentTheme } = useBoardTheme();
  const buildThemeStyle = (theme: BoardTheme): React.CSSProperties => {
    // SVG: light squares = opacity 0 (transparent, background-color shows through),
    //       dark squares = actual dark color
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><g id="a"><g id="b"><g id="c"><g id="d"><rect width="1" height="1" opacity="0"/><use x="1" y="1" href="#e"/><rect y="1" width="1" height="1" id="e" fill="${theme.colors.darkSquare}"/><use x="1" y="-1" href="#e"/></g><use x="2" href="#d"/></g><use x="4" href="#c"/></g><use y="2" href="#b"/></g><use y="4" href="#a"/></svg>`;
    return {
      '--cg-light': theme.colors.lightSquare,
      '--cg-dark': theme.colors.darkSquare,
      '--cg-lastmove': theme.colors.lastMove,
      '--cg-selected': theme.colors.selected,
      '--cg-board-pattern': `url("data:image/svg+xml;base64,${btoa(svg)}")`,
      /* The coordinates' ink on each square colour (D26, `coordinateInk`). */
      '--cg-coord-on-light': coordinateInk(theme.colors.lightSquare),
      '--cg-coord-on-dark': coordinateInk(theme.colors.darkSquare),
    } as React.CSSProperties;
  };

  // The store resolves synchronously, so the first render already has the
  // right theme: no flash of the default board.
  const theme = themeId ? getBoardTheme(themeId) : currentTheme;
  const boardThemeStyle = useMemo(() => buildThemeStyle(theme), [theme]);

  // Initialize chessground
  useEffect(() => {
    if (!boardRef.current) return;

    const config: Config = {
      fen,
      orientation,
      turnColor,
      coordinates,
      viewOnly,
      check,
      lastMove,
      animation: { enabled: true, duration: animationDuration },
      highlight: { lastMove: true, check: true },
      movable: {
        free: false,
        color: viewOnly ? undefined : movableColor,
        dests: viewOnly ? undefined : dests,
        showDests: true,
        events: {
          after: (orig, dest, metadata) => {
            onMove?.(orig, dest);
          },
        },
      },
      premovable: {
        enabled: premovable,
      },
      draggable: {
        enabled: !viewOnly,
        showGhost: true,
        distance: dragDistance,
        autoDistance: autoDragDistance,
      },
      selectable: {
        enabled: !viewOnly,
      },
      events: {
        change: onChange,
        move: (orig, dest, capturedPiece) => {
          // This fires with captured piece info
          if (capturedPiece && onMove) {
            // The after event already fires without capture info,
            // so we use this for internal tracking only
          }
        },
      },
    };

    apiRef.current = Chessground(boardRef.current, config);

    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []); // Only initialize once

  // Store latest onMove in a ref to avoid stale closures
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Update board when props change
  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.set({
      fen,
      orientation,
      turnColor,
      check,
      lastMove,
      movable: {
        free: false,
        color: viewOnly ? undefined : movableColor,
        dests: viewOnly ? undefined : dests,
        showDests: true,
        events: {
          after: (orig, dest) => {
            onMoveRef.current?.(orig, dest);
          },
        },
      },
      viewOnly,
    });
  }, [fen, orientation, turnColor, check, lastMove, dests, movableColor, viewOnly]);

  /*
    NO `redrawAll()` ON A POSITION CHANGE (D21, layout redesign Eg, 2026-10-10).

    An effect here called `redrawAll()` 50ms after every change of position,
    orientation, movable colour or view-only, to clear chessground's cached
    bounds in case a re-render had moved the board. Every `redrawAll()` makes
    chessground bind another `ResizeObserver` to the board that is never
    disconnected: measured on `/analysis`, 4 after load, 10 after six moves.
    The bounds are now read fresh at every touch (D29, below), which covers a
    board moved by anything, and `set()` redraws by itself when the orientation
    changes. With the effect gone the count stays at 4.
  */

  /*
    NO RESIZE OBSERVER HERE: CHESSGROUND HAS ITS OWN (layout redesign C4).

    Chessground binds a `ResizeObserver` to this very element (`events.js`
    `bindBoard`, in 9.8.4 and 10.1.0 alike) and on every resize clears its
    memoised bounds and resizes its container. It also clears them on window
    resize and on any scroll. A second observer here, added 2026-08-10 on the
    premise that chessground "clears bounds only on scroll", was a duplicate,
    and a costly one: it called `redrawAll()`, and every `redrawAll()` makes
    chessground bind ANOTHER observer that is never disconnected, so ten window
    resizes left 13 observers on one board, each running on every later resize.

    `scripts/verify-board-drop.mjs` drags a piece after the board resizes across
    the Workspace threshold, after a theme change and in and out of focus mode:
    6/6 without this observer, and 4/6 with no `ResizeObserver` at all, which is
    what shows it can see stale bounds. Do not add one back without a failing
    run of that test.
  */

  /*
    THE BOUNDS ARE READ FRESH AT EVERY TOUCH (D29, 2026-10-09).

    Chessground caches the board's rectangle and clears it on a resize, a
    scroll or a window resize. A board that MOVES without resizing keeps the old
    rectangle, and every click and drag is then resolved against a board that
    is not there. Leaving focus mode does exactly that: the board shrinks (the
    cache is cleared and refilled) and only then does the nav row come back and
    push it down, with no resize. Measured on every Workspace page: after a
    focus-mode exit no click-move registered, two seconds later included, until
    a window resize; inside focus mode, and without the cycle, moves worked.

    Clearing the cache when a pointer goes down, in the capture phase so it runs
    before chessground's own handler, makes every interaction measure the board
    where it is, whatever moved it. One `getBoundingClientRect` per touch.
    Found by `verify-workspace-contract`'s Champion Challenge entry (D4c).
  */
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const fresh = () => apiRef.current?.state.dom.bounds.clear();
    el.addEventListener('mousedown', fresh, { capture: true, passive: true });
    el.addEventListener('touchstart', fresh, { capture: true, passive: true });
    return () => {
      el.removeEventListener('mousedown', fresh, { capture: true });
      el.removeEventListener('touchstart', fresh, { capture: true });
    };
  }, []);

  // Update shapes
  useEffect(() => {
    if (!apiRef.current || !shapes) return;
    apiRef.current.setAutoShapes(shapes);
  }, [shapes]);

  // Pre-computed set of "fIdx,rIdx" screen-coordinate keys for squares that have pieces.
  // Updated from FEN — no DOM querying, so pointermove handler is a pure O(1) lookup.
  const occupiedRef = useRef<Set<string>>(fenToOccupied(fen ?? '', orientation));
  useEffect(() => {
    occupiedRef.current = fenToOccupied(fen ?? '', orientation);
  }, [fen, orientation]);

  // Cursor: listen on boardRef (the cg-wrap div we own), toggle a CSS class on
  // the wrapper div. Chessground never touches the wrapper, so the class persists.
  // chessboard.css rules `.cursor-piece cg-board` and `.cursor-empty cg-board`
  // (loaded after chessground CSS) apply the correct cursor with !important.
  useEffect(() => {
    const wrap = boardRef.current;
    if (!wrap) return;
    const wrapper = wrap.parentElement; // .chess-board-wrapper
    if (!wrapper) return;

    const update = (e: MouseEvent) => {
      const r = wrap.getBoundingClientRect();
      const f = Math.max(0, Math.min(7, Math.floor(((e.clientX - r.left) / r.width) * 8)));
      const rk = Math.max(0, Math.min(7, Math.floor(((e.clientY - r.top) / r.height) * 8)));
      const onPiece = occupiedRef.current.has(`${f},${rk}`);
      wrapper.classList.toggle('cursor-piece', onPiece);
      wrapper.classList.toggle('cursor-empty', !onPiece);
    };
    const clear = () => wrapper.classList.remove('cursor-piece', 'cursor-empty');

    wrap.addEventListener('mousemove', update);
    wrap.addEventListener('mouseleave', clear);
    return () => {
      wrap.removeEventListener('mousemove', update);
      wrap.removeEventListener('mouseleave', clear);
    };
  }, []);

  // Expose API for imperative actions
  const flip = useCallback(() => {
    apiRef.current?.toggleOrientation();
  }, []);

  const sizeStyle: React.CSSProperties = typeof size === 'number'
    ? { width: `${size}px`, maxWidth: '100%' }
    : { maxWidth: size };

  /*
    THE BOARD IS A SURFACE LIKE THE CARDS ARE — every board, not one page.

    Owner, 2026-08-07: *"somehow the board doesn't look from the same design
    set"*. It gets the same radius and the same drop shadow the cards carry, so
    the board and the panels beside it read as one system.

    Applied HERE rather than on the trainer's board, which is where it went
    first. `ChessBoard` is also what Play Online and the Champion Challenge
    render, so scoping it to `/puzzles` left the site with two board treatments —
    rounded and raised on one page, square and flat on three others. That is the
    same defect one layer up from the one this change set out to fix.

    The clip is what makes the radius visible at all — chessground paints the
    squares as a background image on `cg-board`, so nothing else rounds them.

    `overflow-clip`, NOT `overflow-hidden`, and that is not a style preference.
    `hidden` makes the element a SCROLL CONTAINER, and chessground's file-
    coordinate row is `left: 24px; width: 100%`, so it hangs 24px past the
    board's right edge — which made every board scrollable inside itself and
    dropped `measure-board-fit` from 109/109 to 93/109 on the "board does not
    scroll internally" assertion. `clip` suppresses the overflow without
    creating the scroll container. Same reasoning, and the same overhang, as the
    `html, body { overflow-x: clip }` rule in index.css.
  */
  return (
    <div
      className={`chess-board-wrapper rounded-lg overflow-clip shadow-[0_2px_12px_rgba(0,0,0,0.5)] ${className}`}
      style={{ ...sizeStyle, ...boardThemeStyle }}
    >
      <div
        ref={boardRef}
        className="cg-wrap"
        style={{ width: '100%', paddingBottom: '100%' }}
      />
    </div>
  );
}

/**
 * Hook to get the chessground API ref for imperative control.
 * Example: const api = useChessBoardApi(); api.current?.toggleOrientation();
 */
export function useChessBoardApi() {
  return useRef<Api | null>(null);
}

export default ChessBoard;
