import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Key } from '@lichess-org/chessground/types';
import { ChevronLeft, ChevronRight, Circle, ListOrdered, Minimize2, Trophy, List, Radio } from 'lucide-react';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { GameMoveList } from '@/components/chess/GameMoveList';
import { PlayerCard, PLAYER_CLOCK_CLASS } from '@/components/chess/PlayWorkspaceCards';
import { useBoardStepInput } from '@/components/chess/useBoardStepInput';
import { Workspace, WorkspaceList, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { useChrome } from '@/app/SiteShell';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { PuzzleAppearanceCard } from '@/features/puzzles/components/PuzzleAppearanceCard';
import { PuzzleAnalysisCard } from '@/features/puzzles/components/PuzzleAnalysisCard';
import { ChessClock } from '@/features/online/components/ChessClock';
import { parseGame, viewerClocks } from '@/lib/game/gameModel';
import type { ChessGame } from '@/types/chess';
import { GameReviewActions } from './GameReviewActions';

/**
 * A game on the Workspace, for every viewer (layout redesign E4b, E5; 2026-10-10).
 *
 * The owner's composition (plan §7 *E4a findings*): the context lane holds the game,
 * the two players and Go to; the activity lane holds the moves, kept in focus mode,
 * over the one-line analysis band; the toolbar steps through the game. The champion
 * viewers add Game report and Explain position; the live viewer adds running clocks
 * and follows new moves.
 *
 * The game is read with the E1 model, so a step is an index into its plies and the
 * board, the list, the clocks and the band all follow that one number. A page keys
 * this component by the game, so a different game starts fresh while a longer PGN of
 * the same game is new moves.
 *
 * THE BOARD CANNOT BE MOVED ON, but it can be drawn on (owner, E0: arrows carried
 * over from the Lichess viewer). A view-only chessground ignores drawing too, so the
 * board is interactive with no movable colour and no destinations: nothing can be
 * selected or moved, and a right-drag still draws.
 */
export interface ViewerPlayer {
  name: string;
  title?: string;
  rating?: number;
  /** One short line under the name: the result for that side, or "Live". */
  detail: string;
}

export interface ViewerGoTo {
  label: string;
  /** A route, or an action on the same page (`/analysis` review mode back to its live board). */
  to?: string;
  onClick?: () => void;
  /** A chevron pointing back or on. */
  direction: 'back' | 'forward';
}

/** One side's line on its players card, from the PGN result. */
export function sideResult(side: 'white' | 'black', result: string | undefined): string {
  if (result === '1-0') return side === 'white' ? 'Won' : 'Lost';
  if (result === '0-1') return side === 'black' ? 'Won' : 'Lost';
  if (result === '1/2-1/2') return 'Draw';
  return 'Game in progress';
}

/**
 * The main-line note (contract §9.2): the page shows the main line only and says
 * so when the PGN had more. Null when nothing was dropped, which is always the case
 * for champion and live games.
 */
export function droppedNote(dropped: { variations: boolean; comments: boolean; nags: boolean }): string | null {
  const notes = dropped.comments || dropped.nags;
  if (dropped.variations && notes) return 'Side lines and comments not shown';
  if (dropped.variations) return 'Side lines not shown';
  if (notes) return 'Comments not shown';
  return null;
}

export interface GameViewerWorkspaceProps {
  pgn: string;
  /** The game card: a headline, then up to two lines, then the status. */
  info: { headline: string; lines: string[]; status: string; live?: boolean };
  players: { white: ViewerPlayer; black: ViewerPlayer };
  goTo: ViewerGoTo[];
  /** Live: the side to move's clock runs, and new moves are followed (D31). */
  live?: boolean;
  /** Where the board opens: the starting position or the latest move. */
  initialPly: 'start' | 'latest';
  /** Game report and Explain position, for a finished game (the champion viewers). */
  review?: { metadata: ChessGame; gameResult: 'white' | 'black' | 'draw' };
  analyticsSurface: 'champion_game' | 'live_game' | 'analysis';
  boardLabel: string;
  /** The position on the board, for the page's engagement event. */
  onPositionChange?: (fen: string) => void;
}

export function GameViewerWorkspace({
  pgn, info, players, goTo, live = false, initialPly, review, analyticsSurface, boardLabel, onPositionChange,
}: GameViewerWorkspaceProps) {
  const parsed = useMemo(() => parseGame(pgn), [pgn]);
  const model = parsed.ok ? parsed.game : null;
  const plies = model?.plies ?? [];
  const last = plies.length - 1;
  const [ply, setPly] = useState(() => (initialPly === 'latest' ? last : -1));

  /*
    A NEW MOVE MOVES THE BOARD ONLY IF THE READER WAS AT THE LATEST ONE (D31).
    The Lichess viewer pulled the board to the newest position whatever the reader
    was looking at, and left its move list on the old PGN. Here the list, the clocks
    and the board all read the same plies, and a reader stepping back stays put.
  */
  const lastSeen = useRef(last);
  useEffect(() => {
    const previous = lastSeen.current;
    lastSeen.current = last;
    setPly(p => (p === previous ? last : Math.min(p, last)));
  }, [last]);

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const current = ply >= 0 ? plies[ply] : null;
  const fen = current?.fen ?? model?.startFen ?? '';
  // Read through a ref: the page passes a new function on every render.
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  useEffect(() => { if (fen) onPositionChangeRef.current?.(fen); }, [fen]);

  const stepTo = (to: number) => setPly(Math.max(-1, Math.min(last, to)));
  const attachWheel = useBoardStepInput({
    enabled: last >= 0,
    onBack: () => setPly(p => Math.max(-1, p - 1)),
    onForward: () => setPly(p => Math.min(last, p + 1)),
  });

  /* Focus mode, as on /play: columns only, and only where focus itself holds. */
  const [focusMode, setFocusMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => { if (workspaceMode?.mode === 'stacked') setFocusMode(false); }, [workspaceMode]);
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focusMode);
    return () => setChromeHidden(false);
  }, [focusMode, setChromeHidden]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && focusMode) setFocusMode(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);
  const { currentTheme, changeTheme } = useBoardTheme();

  /* The clocks at the viewed move (E3): still when stepping back, running live. */
  const clocks = model ? viewerClocks(model, ply, { live }) : {};

  const playerCard = (side: 'white' | 'black') => {
    const player = players[side];
    const clock = clocks[side];
    return (
      <PlayerCard
        /* A light dot for White and a dark one for Black, both outlined so each reads
           on the card; a hollow ring read as "empty" rather than "black". */
        icon={<Circle className={side === 'white' ? 'fill-foreground' : 'fill-background'} aria-hidden />}
        label={side === 'white' ? 'White' : 'Black'}
        name={player.name}
        title={player.title ?? (side === 'white' ? model?.headers.whiteTitle : model?.headers.blackTitle)}
        rating={player.rating ?? (side === 'white' ? model?.headers.whiteElo : model?.headers.blackElo)}
        detail={player.detail}
        clock={clock ? <ChessClock timeMs={clock.timeMs} isActive={clock.running} isGameOver={!clock.running} className={PLAYER_CLOCK_CLASS} /> : undefined}
      />
    );
  };

  const goToRow = 'card-row w-full py-[0.16em] text-left hover:text-foreground';

  /* Two lines under the headline; the main-line note, when there is one, takes the
     second, so the card keeps its declared four rows. */
  const note = model ? droppedNote(model.dropped) : null;
  const infoLines = info.lines.filter(Boolean).slice(0, note ? 1 : 2).concat(note ? [note] : []);

  return (
    <>
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="surface-card fixed right-4 top-4 z-50 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minimize2 className="h-4 w-4" aria-hidden />
          Leave focus mode
          <kbd className="rounded border border-border px-1 text-[10px] text-muted-foreground">Esc</kbd>
        </button>
      )}
      <Workspace
        focus={focusMode}
        onModeChange={setWorkspaceMode}
        board={
          <div ref={attachWheel} data-skeleton-card="board" className="w-full" role="group" aria-label={boardLabel}>
            <ChessBoard
              fen={fen}
              orientation={orientation}
              lastMove={current ? (current.lastMove as Key[]) : undefined}
              check={current?.check ? (current.color === 'white' ? 'black' : 'white') : undefined}
              turnColor={fen.split(' ')[1] === 'b' ? 'black' : 'white'}
              themeId={currentTheme.id}
            />
          </div>
        }
        toolbar={
          <BoardControls
            onStart={() => stepTo(-1)}
            onBack={() => stepTo(ply - 1)}
            onForward={() => stepTo(ply + 1)}
            onReset={() => stepTo(last)}
            onFlip={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))}
            historyDisabled={last < 0}
          />
        }
        activity={{
          title: 'Moves',
          cards: [
            slot('viewer-moves', 'viewerMoves', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <ListOrdered className="text-link" />
                  Moves
                </span>
                <div className="card-body">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <WorkspaceList label="Moves">
                      <GameMoveList moves={plies.map(p => p.san)} startFen={model?.startFen} currentMoveIndex={ply} onMoveClick={stepTo} scrolls={false} className="text-[0.92em]" />
                    </WorkspaceList>
                  </div>
                  {review && model && (
                    <GameReviewActions fen={fen} startFen={model.startFen} plies={plies} ply={ply} onGoTo={stepTo} metadata={review.metadata} gameResult={review.gameResult} />
                  )}
                </div>
              </>
            ), 1, true),
          ],
          foot: footSlot('analysis', (
            <PuzzleAnalysisCard enabled={!!fen} fen={fen} orientation={orientation} surface={analyticsSurface} />
          )),
        }}
        context={{
          title: 'Game',
          cards: [
            slot('viewer-info', 'viewerInfo', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  {info.live ? <Radio className="text-live" /> : <Trophy className="text-link" />}
                  Game
                </span>
                <div className="card-body">
                  <span className="card-row"><span className="truncate font-semibold text-foreground">{info.headline}</span></span>
                  {infoLines.map(line => (
                    <span key={line} className="card-row text-[0.86em]"><span className="truncate">{line}</span></span>
                  ))}
                  <span className="card-row">
                    <span className={`font-semibold tabular-nums ${info.live ? 'text-live' : 'text-foreground'}`}>{info.status}</span>
                  </span>
                </div>
              </>
            ), 2),
            slot('viewer-white', 'playPlayer', playerCard('white')),
            slot('viewer-black', 'playPlayer', playerCard('black')),
            slot('viewer-go-to', 'viewerGoTo', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <List />
                  Go to
                </span>
                <div className="card-body" style={{ gap: 0 }}>
                  {goTo.map(item => {
                    const content = (
                      <>
                        <span>{item.label}</span>
                        {item.direction === 'back'
                          ? <ChevronLeft className="ml-auto shrink-0" />
                          : <ChevronRight className="ml-auto shrink-0" />}
                      </>
                    );
                    return item.to
                      ? <Link key={item.to + item.label} to={item.to} className={goToRow}>{content}</Link>
                      : <button key={item.label} type="button" onClick={item.onClick} className={goToRow}>{content}</button>;
                  })}
                </div>
              </>
            )),
          ],
          foot: footSlot('theme-focus', (
            <PuzzleAppearanceCard currentThemeId={currentTheme.id} onThemeChange={changeTheme} analyticsSurface={analyticsSurface} focusMode={focusMode} onToggleFocusMode={canFocus ? () => setFocusMode(value => !value) : undefined} />
          )),
        }}
      />
    </>
  );
}
