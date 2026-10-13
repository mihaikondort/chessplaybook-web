import { useRef, useEffect, type KeyboardEvent } from 'react';
import { announceMove, pliesBefore } from '@/lib/game/moveSpeech';

interface GameMoveListProps {
  /** Array of SAN moves ["e4", "e5", "Nf3", ...] */
  moves: string[];
  /** Index of the currently displayed move (0-based, -1 for start) */
  currentMoveIndex?: number;
  /**
   * Go to a move (0-based, -1 for the starting position). Without it the moves are
   * text, not controls: a page passes it only while the reader may step (on
   * `/play-online`, in a game).
   */
  onMoveClick?: (moveIndex: number) => void;
  /** Additional CSS class */
  className?: string;
  /**
   * Whether the list is its own scroller (the default, for the pre-Workspace
   * pages). On a Workspace page pass `false` and put it in a `WorkspaceList`:
   * inside a card only that may scroll (spec §5, contract §9.1), and the list
   * then follows the current move in the `WorkspaceList` instead (Dg).
   */
  scrolls?: boolean;
  /**
   * The position the game starts from, when it is not the initial one (a `[FEN]`
   * tag): the moves are numbered from its move number, and a game starting with
   * Black to move opens on "40. ... Kd7".
   */
  startFen?: string;
}

/**
 * A game's moves in two-column notation, the one move list for every board page
 * (layout redesign E2, 2026-10-10; grew from `MoveList`).
 *
 * - The current move is marked, and kept in view inside the list's own box.
 * - A move is a button: click it, or reach it with Tab (one stop, on the current
 *   move) and step with the arrow keys: Left/Right one move, Up/Down a full move,
 *   Home/End to the start and the end. Focus follows the move.
 * - A polite live region says the move whenever the board shows another one, in
 *   the Lichess viewer's wording (owner, 2026-10-10), so a screen-reader user hears
 *   each step and each new move without leaving the board.
 */
export function GameMoveList({
  moves,
  currentMoveIndex = moves.length - 1,
  onMoveClick,
  className = '',
  scrolls = true,
  startFen,
}: GameMoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeMoveRef = useRef<HTMLElement | null>(null);
  const last = moves.length - 1;
  const current = Math.min(currentMoveIndex, last);

  // Auto-scroll to current move within the container only (never scroll the page)
  useEffect(() => {
    /* The box that scrolls: this list, or the `WorkspaceList` it sits in. */
    const container = scrolls
      ? scrollRef.current
      : scrollRef.current?.closest<HTMLElement>('[data-workspace-list]') ?? null;
    const active = activeMoveRef.current;
    if (!active || !container) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    // Only scroll if the active move is outside the visible area of the container
    if (activeRect.bottom > containerRect.bottom) {
      container.scrollTop += activeRect.bottom - containerRect.bottom + 4;
    } else if (activeRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - activeRect.top + 4;
    }
  }, [current, scrolls]);

  /*
    FOCUS FOLLOWS THE MOVE, but only when it is already in the list: stepping with
    the keys moves the tab stop to the new current move, while a step made anywhere
    else (the toolbar, the wheel, a new move arriving) never pulls focus here.
  */
  useEffect(() => {
    const list = scrollRef.current;
    if (!list || !list.contains(document.activeElement)) return;
    if (activeMoveRef.current && activeMoveRef.current !== document.activeElement) {
      activeMoveRef.current.focus({ preventScroll: true });
    }
  }, [current]);

  /*
    THE KEYS STOP HERE. A page may also listen for Left/Right on the window
    (`useBoardStepInput`); stopping the event keeps one key press one step.
  */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onMoveClick || e.altKey || e.ctrlKey || e.metaKey) return;
    const to: Record<string, number> = {
      ArrowLeft: current - 1, ArrowRight: current + 1,
      ArrowUp: current - 2, ArrowDown: current + 2,
      Home: -1, End: last,
    };
    if (!(e.key in to)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = Math.max(-1, Math.min(last, to[e.key]));
    if (target !== current) onMoveClick(target);
  };

  /*
    Group the moves into rows by move number (1. e4 e5, 2. Nf3 Nc6, ...). Index i is
    ply `firstPly + i` of the game, so a game from a FEN starts at its own number,
    and one starting with Black to move has no White move in its first row.
  */
  const firstPly = pliesBefore(startFen);
  const movePairs: Array<{ number: number; white?: number; black?: number }> = [];
  moves.forEach((_, i) => {
    const ply = firstPly + i;
    const number = Math.floor(ply / 2) + 1;
    let row = movePairs[movePairs.length - 1];
    if (!row || row.number !== number) {
      row = { number };
      movePairs.push(row);
    }
    if (ply % 2 === 0) row.white = i;
    else row.black = i;
  });

  /* One tab stop: the current move, or the first move at the starting position. */
  const tabStop = current >= 0 ? current : 0;

  const renderMove = (san: string, index: number, extra: string) => {
    const isCurrent = current === index;
    const look = `px-1 rounded ${extra} ${isCurrent ? 'bg-accent text-accent-foreground font-bold' : ''}`;
    if (!onMoveClick) {
      return (
        <span ref={isCurrent ? (el => { activeMoveRef.current = el; }) : undefined} className={look}
          aria-current={isCurrent ? 'step' : undefined}>
          {san}
        </span>
      );
    }
    return (
      <button
        type="button"
        ref={isCurrent ? (el => { activeMoveRef.current = el; }) : undefined}
        className={`${look} cursor-pointer text-left hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        aria-current={isCurrent ? 'step' : undefined}
        tabIndex={index === tabStop ? 0 : -1}
        onClick={() => onMoveClick(index)}
      >
        {san}
      </button>
    );
  };

  return (
    <>
      <div
        ref={scrollRef}
        className={`${scrolls ? 'overflow-y-auto ' : ''}text-sm font-mono ${className}`}
        onKeyDown={onKeyDown}
      >
        {movePairs.map((pair) => (
          <div key={pair.number} className="flex items-baseline gap-1 py-0.5">
            <span className="text-muted-foreground w-8 text-right shrink-0">
              {pair.number}.
            </span>
            {pair.white !== undefined
              ? renderMove(moves[pair.white], pair.white, 'w-14 shrink-0')
              : <span className="w-14 shrink-0 px-1 text-muted-foreground" aria-hidden>...</span>}
            {pair.black !== undefined && renderMove(moves[pair.black], pair.black, '')}
          </div>
        ))}
        {moves.length === 0 && (
          <div className="text-muted-foreground italic py-2">No moves yet</div>
        )}
      </div>
      {/* Beside the list, not in it: a guard counts the list's children as its rows. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceMove(moves, current, firstPly)}
      </div>
    </>
  );
}

export default GameMoveList;
