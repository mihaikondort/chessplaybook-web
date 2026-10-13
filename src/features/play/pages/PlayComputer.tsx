import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Color, Key } from '@lichess-org/chessground/types';
import { parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import { ChevronDown, ChevronRight, Minimize2, Radio, Swords, Trophy, CircleUserRound } from 'lucide-react';

import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { GameMoveList } from '@/components/chess/GameMoveList';
import { Workspace, WorkspaceList, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { useAnchoredPopover } from '@/components/workspace/useAnchoredPopover';
import { PlayerCard, PLAYER_CLOCK_CLASS } from '@/components/chess/PlayWorkspaceCards';
import { useChrome } from '@/app/SiteShell';
import SeoHead from '@/components/SeoHead';
import RouteHeading from '@/components/RouteHeading';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { positionFromFen, applyMove, isPromotion, toUci } from '@/components/chess/chessLogic';
import type { ChessPosition } from '@/components/chess/chessLogic';
import { PuzzleAppearanceCard } from '@/features/puzzles/components/PuzzleAppearanceCard';
import { PuzzleAnalysisCard } from '@/features/puzzles/components/PuzzleAnalysisCard';
import { ChessClock } from '@/features/online/components/ChessClock';
import { soundService } from '@/services/SoundService';
import { useComputerGame } from '../hooks/useComputerGame';
import { DIFFICULTY_LEVELS } from '../services/StockfishOpponent';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const TIME_CONTROLS = [
  { id: 'unlimited', label: 'Unlimited', initial: null, increment: 0 },
  { id: '3+0', label: '3+0', initial: 180, increment: 0 },
  { id: '5+0', label: '5+0', initial: 300, increment: 0 },
  { id: '10+0', label: '10+0', initial: 600, increment: 0 },
  { id: '15+10', label: '15+10', initial: 900, increment: 10 },
] as const;

interface HistoryEntry {
  fen: string;
  lastMove?: Key[];
  turnColor: Color;
  isCheck: boolean;
}

function EngineLevelPicker({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  const { open, setOpen, triggerRef, panelRef: menuRef, style: position, room } = useAnchoredPopover({ matchWidth: true });
  const selected = DIFFICULTY_LEVELS.find(level => level.level === value)!;

  return (
    <div className="flex flex-col" style={{ gap: 'var(--card-air)' }}>
      <span className="text-[0.8em] uppercase tracking-wide text-muted-foreground">Engine level</span>
      <button ref={triggerRef} type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-haspopup="listbox" className="flex w-full items-center justify-between rounded-[0.4em] border border-border bg-accent/20 px-[0.6em] py-[0.3em] text-left text-[0.92em] font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
        <span className="truncate">Level {selected.level} · {selected.name}</span><ChevronDown className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && createPortal(
        <div ref={menuRef} role="listbox" aria-label="Engine level" className="fixed z-[100] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-2xl thin-scroll" style={{ ...position, maxHeight: Math.min(320, room) }}>
          {DIFFICULTY_LEVELS.map(level => (
            <button key={level.level} type="button" role="option" aria-selected={level.level === value} onClick={() => { onChange(level.level); setOpen(false); }} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent/60 ${level.level === value ? 'bg-primary/10 text-link' : ''}`}>
              <span className="font-medium">Level {level.level} · {level.name}</span>
              <span className="ml-3 text-xs text-muted-foreground">~{level.approxRating}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

function buildHistory(moves: string[]): HistoryEntry[] {
  let position = positionFromFen(STARTING_FEN);
  if (!position) return [];
  const history: HistoryEntry[] = [{
    fen: STARTING_FEN,
    turnColor: position.turnColor,
    isCheck: position.isCheck,
  }];
  for (const san of moves) {
    const move = parseSan(position.chess, san);
    if (!move) break;
    const uci = makeUci(move);
    const next = applyMove(position, uci);
    if (!next) break;
    position = next;
    history.push({
      fen: next.fen,
      lastMove: [uci.slice(0, 2) as Key, uci.slice(2, 4) as Key],
      turnColor: next.turnColor,
      isCheck: next.isCheck,
    });
  }
  return history;
}

export function PlayComputer() {
  const navigate = useNavigate();
  const [gameState, actions] = useComputerGame();
  const { timeout } = actions;
  const [selectedColor, setSelectedColor] = useState<Color>('white');
  const [activeColor, setActiveColor] = useState<Color>('white');
  const [selectedDifficulty, setSelectedDifficulty] = useState(4);
  const [selectedTimeControl, setSelectedTimeControl] = useState<(typeof TIME_CONTROLS)[number]>(TIME_CONTROLS[0]);
  const [activeTimeControl, setActiveTimeControl] = useState<(typeof TIME_CONTROLS)[number]>(TIME_CONTROLS[0]);
  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const previousPlyRef = useRef(0);
  const [focusMode, setFocusMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundService.enabled);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [reviewPosition, setReviewPosition] = useState<{ position: ChessPosition; lastMove: Key[] } | null>(null);
  /*
    THE WORKSPACE SIZES EVERYTHING (layout redesign D1). The tier widths, the
    board chrome, `useBoardSize`, `useNavTotal` and `layoutMode` are gone: the
    board and the lanes are CSS from the layout tokens, as on /puzzles.

    FOCUS MODE IS COLUMNS-ONLY and offered only where focus itself stays columns
    (owner, 2026-10-08; the rule /puzzles follows): the Workspace reports its
    mode from its container query, and stacking leaves focus mode.
  */
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => {
    if (workspaceMode?.mode === 'stacked') setFocusMode(false);
  }, [workspaceMode]);
  /* Focus mode asks the shell to hide the nav, and gives it back on unmount. */
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focusMode);
    return () => setChromeHidden(false);
  }, [focusMode, setChromeHidden]);
  const { currentTheme, changeTheme } = useBoardTheme();
  const history = useMemo(() => buildHistory(gameState.sanMoves), [gameState.sanMoves]);
  const latestPly = history.length - 1;
  const currentPly = viewPly ?? latestPly;
  const historyEntry = viewPly === null ? null : history[currentPly];
  const difficulty = DIFFICULTY_LEVELS.find(level => level.level === gameState.difficulty)
    ?? DIFFICULTY_LEVELS.find(level => level.level === selectedDifficulty)!;
  const isEnded = gameState.gameStatus === 'ended';

  useEffect(() => {
    if (viewPly !== null && viewPly >= latestPly) setViewPly(null);
  }, [latestPly, viewPly]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  useEffect(() => {
    if (gameState.gameStatus !== 'playing' || activeTimeControl.initial === null) return;
    const timer = window.setInterval(() => {
      const update = gameState.turnColor === 'white' ? setWhiteMs : setBlackMs;
      update(current => {
        if (current === null) return null;
        const next = Math.max(0, current - 250);
        if (next === 0) timeout(gameState.turnColor);
        return next;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [activeTimeControl.initial, gameState.gameStatus, gameState.turnColor, timeout]);

  useEffect(() => {
    const ply = gameState.sanMoves.length;
    if (ply <= previousPlyRef.current || activeTimeControl.increment === 0) {
      previousPlyRef.current = ply;
      return;
    }
    const mover = ply % 2 === 1 ? 'white' : 'black';
    const add = activeTimeControl.increment * 1000;
    (mover === 'white' ? setWhiteMs : setBlackMs)(current => current === null ? null : current + add);
    previousPlyRef.current = ply;
  }, [activeTimeControl.increment, gameState.sanMoves.length]);

  const startGame = (color = selectedColor, level = selectedDifficulty) => {
    setSelectedColor(color);
    setActiveColor(color);
    setSelectedDifficulty(level);
    const initialMs = selectedTimeControl.initial === null ? null : selectedTimeControl.initial * 1000;
    setActiveTimeControl(selectedTimeControl);
    setWhiteMs(initialMs);
    setBlackMs(initialMs);
    previousPlyRef.current = 0;
    setViewPly(null);
    setReviewPosition(null);
    actions.startGame(color, level);
  };

  const challengeFriend = () => navigate('/play-online?setup=friend');

  const reviewMove = (orig: Key, dest: Key) => {
    if (!isEnded) return;
    const base = reviewPosition?.position ?? positionFromFen(historyEntry?.fen ?? gameState.fen);
    if (!base) return;
    const promotion = isPromotion(base, orig, dest) ? 'q' : undefined;
    const next = applyMove(base, toUci(orig, dest, promotion));
    if (next) setReviewPosition({ position: next, lastMove: [orig, dest] });
  };

  const boardFen = reviewPosition?.position.fen ?? historyEntry?.fen ?? gameState.fen;
  const boardTurn = reviewPosition?.position.turnColor ?? historyEntry?.turnColor ?? gameState.turnColor;
  const boardCheck = reviewPosition?.position.isCheck ?? historyEntry?.isCheck ?? gameState.isCheck;
  const boardLastMove = reviewPosition?.lastMove ?? historyEntry?.lastMove ?? gameState.lastMove;
  const canMove = gameState.gameStatus === 'playing' && viewPly === null;
  // The move list shows and sets the VIEWED move, as the step buttons do (D30): ply k is
  // the position after move k-1 in the list's 0-based count, ply 0 the start.
  const jumpToMove = (moveIndex: number) => {
    setReviewPosition(null);
    const ply = moveIndex + 1;
    setViewPly(ply >= latestPly ? null : ply);
  };
  const displayColor = gameState.gameStatus === 'idle' ? selectedColor : activeColor;
  const playerClockMs = displayColor === 'white' ? whiteMs : blackMs;
  const opponentColor: Color = displayColor === 'white' ? 'black' : 'white';
  const opponentClockMs = opponentColor === 'white' ? whiteMs : blackMs;

  const level = gameState.gameStatus === 'idle' ? selectedDifficulty : gameState.difficulty;
  const timeControl = gameState.gameStatus === 'idle' ? selectedTimeControl : activeTimeControl;
  /* The two ways off this page, offered on the idle card and again when a game ends. */
  const otherWays = (
    <div className="grid grid-cols-2" style={{ gap: 'calc(var(--card-air) * 2)' }}>
      <button type="button" onClick={challengeFriend} className="card-btn px-[0.5em] text-[0.86em] text-muted-foreground hover:text-foreground">
        <span className="truncate">Challenge a friend</span>
      </button>
      <button type="button" onClick={() => navigate('/play-online')} className="card-btn px-[0.5em] text-[0.86em] text-muted-foreground hover:text-foreground">
        <span className="truncate">Play online</span>
      </button>
    </div>
  );

  return (
    <main className="contents">
      {/* Both read `src/config/route-meta.json`; the `<h1>` is `sr-only` because
          nothing may sit above the board (PRD 5.2). */}
      <SeoHead routeKey="play" />
      <div className="sr-only"><RouteHeading routeKey="play" /></div>

      {/* The toggle lives in the context lane's foot, which focus mode removes,
          so the exit is a fixed control with the shortcut named on it. */}
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
          <div data-skeleton-card="board" className="w-full" role="group" aria-label="Chess board, playing against the computer">
            <ChessBoard fen={boardFen} orientation={gameState.playerColor} dests={canMove ? gameState.dests : reviewPosition?.position.dests} turnColor={boardTurn} movableColor={canMove ? gameState.movableColor : isEnded ? boardTurn : undefined} lastMove={boardLastMove} check={boardCheck ? boardTurn : undefined} onMove={canMove ? actions.onMove : reviewMove} themeId={currentTheme.id} dragDistance={7} autoDragDistance={false} />
          </div>
        }
        toolbar={
          <BoardControls onStart={() => { setReviewPosition(null); setViewPly(0); }} onBack={() => { setReviewPosition(null); setViewPly(Math.max(0, currentPly - 1)); }} onForward={() => { setReviewPosition(null); setViewPly(currentPly + 1 >= latestPly ? null : currentPly + 1); }} onReset={() => { setReviewPosition(null); setViewPly(null); }} onFlip={actions.flipBoard} historyDisabled={history.length <= 1} />
        }
        activity={{
          title: 'Game',
          cards: [
            /*
              THE GAME CARD, KEPT IN FOCUS MODE. Its phase changes what it holds
              (an invitation to start, the moves, the result) but never its size:
              the move list takes whatever height is left and scrolls inside a
              `WorkspaceList`, the one scroller a card may hold (spec §5).
            */
            slot('play-live', 'playLive', (
              <div className="card-body">
                <span className="card-row">
                  <Swords className="shrink-0 text-link" />
                  <span className="truncate font-semibold text-foreground">Play computer</span>
                  <span className="ml-auto shrink-0 text-[0.8em] text-success">Engine {gameState.isEngineReady ? 'ready' : 'loading'}</span>
                </span>
                <span className="card-row text-[0.86em]">Level {level} · {timeControl.label}</span>
                {gameState.gameStatus === 'idle' ? (
                  <div className="mt-auto flex flex-col" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                    <button type="button" onClick={() => startGame()} disabled={!gameState.isEngineReady} className="card-btn card-btn-primary w-full disabled:opacity-50">
                      {gameState.isEngineReady ? 'New game' : 'Loading engine…'}
                    </button>
                    {otherWays}
                  </div>
                ) : (
                  <>
                    <span className="card-row justify-between text-[0.8em] uppercase tracking-wide">
                      <span>Moves</span>
                      {/* No position label (owner: "Latest position" removed 2026-10-08,
                          "Move N" removed 2026-10-10): the list marks the move shown. */}
                    </span>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <WorkspaceList label="Moves">
                        <GameMoveList moves={gameState.sanMoves} currentMoveIndex={currentPly - 1} onMoveClick={jumpToMove} scrolls={false} className="text-[0.92em]" />
                      </WorkspaceList>
                    </div>
                    {gameState.gameResult && (
                      <span className="card-row justify-center rounded-[0.4em] border border-primary/30 bg-primary/5 py-[0.3em] font-medium text-foreground">
                        <span className="truncate">{gameState.gameResult}</span>
                      </span>
                    )}
                    {gameState.gameStatus === 'playing' && (
                      <button type="button" onClick={actions.resign} className="card-btn w-full border border-destructive/50 text-destructive" style={{ background: 'transparent' }}>
                        Resign
                      </button>
                    )}
                    {isEnded && (
                      <>
                        <button type="button" onClick={() => startGame()} className="card-btn card-btn-primary w-full">New game</button>
                        {otherWays}
                      </>
                    )}
                  </>
                )}
              </div>
            ), 1, true),
          ],
          foot: footSlot('analysis', (
            <PuzzleAnalysisCard enabled={isEnded} fen={boardFen} orientation={gameState.playerColor} surface="play_computer" />
          )),
        }}
        context={{
          title: 'Game setup',
          cards: [
            slot('play-settings', 'playSettings', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Swords className="text-link" />
                  Game settings
                </span>
                <div className="card-body">
                  <EngineLevelPicker value={selectedDifficulty} onChange={setSelectedDifficulty} />
                  {/* Label over its control, as the engine level above it: on one
                      row, at 18px type in the 240px lane, the label truncated to
                      "TIME CONT..." (D1, 1920x947). */}
                  <div className="flex flex-col" style={{ gap: 'var(--card-air)' }}>
                    <label className="text-[0.8em] uppercase tracking-wide text-muted-foreground" htmlFor="computer-time-control">Time control</label>
                    <select id="computer-time-control" value={selectedTimeControl.id} onChange={event => setSelectedTimeControl(TIME_CONTROLS.find(control => control.id === event.target.value) ?? TIME_CONTROLS[0])} className="w-full rounded-[0.4em] border border-border bg-transparent px-[0.6em] py-[0.3em] text-[0.92em] text-foreground">
                      {TIME_CONTROLS.map(control => <option className="bg-card" key={control.id} value={control.id}>{control.label}</option>)}
                    </select>
                  </div>
                  <span className="card-row text-[0.8em] uppercase tracking-wide">Play as</span>
                  <div className="grid grid-cols-2" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                    {(['white', 'black'] as Color[]).map(color => (
                      <button key={color} type="button" onClick={() => setSelectedColor(color)} aria-pressed={selectedColor === color} className={`rounded-[0.3em] border px-[0.5em] py-[0.2em] text-[0.86em] capitalize ${selectedColor === color ? 'border-primary bg-primary/10 text-link' : 'border-border text-muted-foreground'}`}>
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            /* Share 2: it holds the most rows in the lane. At an equal share its
               type fell under the other titles' and at 800x600 its rows overlapped. */
            ), 2),
            slot('play-opponent', 'playPlayer', (
              <PlayerCard
                icon={<CircleUserRound />}
                label="Opponent"
                name={`Stockfish Level ${level}`}
                detail={`${difficulty.name} · Rating ~${difficulty.approxRating}`}
                status={gameState.isThinking ? 'Thinking…' : undefined}
                clock={opponentClockMs === null ? undefined : <ChessClock timeMs={opponentClockMs} isActive={gameState.gameStatus === 'playing' && gameState.turnColor === opponentColor} isGameOver={gameState.gameStatus !== 'playing'} className={PLAYER_CLOCK_CLASS} />}
              />
            )),
            slot('play-you', 'playPlayer', (
              <PlayerCard
                icon={<Trophy />}
                label="You"
                name="Player"
                detail={`Playing ${displayColor}`}
                clock={playerClockMs === null ? undefined : <ChessClock timeMs={playerClockMs} isActive={gameState.gameStatus === 'playing' && gameState.turnColor === displayColor} isGameOver={gameState.gameStatus !== 'playing'} className={PLAYER_CLOCK_CLASS} />}
              />
            )),
            slot('play-go-to', 'playGoTo', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Radio />
                  Go to
                </span>
                <div className="card-body" style={{ gap: 0 }}>
                  <button type="button" onClick={() => navigate('/play-online')} className="card-row w-full py-[0.16em] text-left hover:text-foreground">
                    <span>Play online</span>
                    <ChevronRight className="ml-auto shrink-0" />
                  </button>
                </div>
              </>
            )),
          ],
          foot: footSlot('theme-focus', (
            <PuzzleAppearanceCard currentThemeId={currentTheme.id} onThemeChange={changeTheme} analyticsSurface="play_computer" focusMode={focusMode} onToggleFocusMode={canFocus ? () => setFocusMode(value => !value) : undefined} soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(soundService.toggleEnabled())} />
          )),
        }}
      />
    </main>
  );
}

export default PlayComputer;
