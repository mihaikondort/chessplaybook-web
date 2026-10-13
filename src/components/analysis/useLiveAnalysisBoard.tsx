/**
 * useLiveAnalysisBoard — the interactive board for free analysis.
 *
 * Users can move pieces freely (both sides). Every position change feeds
 * the FEN to the parent, which passes it to the AnalysisService.
 * Maintains a move history with back/forward navigation.
 *
 * A HOOK THAT RETURNS TWO PIECES (layout redesign D3b). The Workspace places the
 * board and its toolbar in separate slots and sizes the board itself, so the
 * component that wrapped both in one box sized to the window
 * (`useBoardSize` with a declared budget) became this.
 */

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { useBoardStepInput } from '@/components/chess/useBoardStepInput';
import { BoardControls } from '@/components/chess/BoardControls';
import type { Key } from '@lichess-org/chessground/types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface LiveAnalysisBoardOptions {
  disabled?: boolean;
  initialFen?: string;
  initialOrientation?: 'white' | 'black';
  onPositionChange?: (fen: string) => void;
}

export function useLiveAnalysisBoard({
  disabled = false,
  initialFen = START_FEN,
  initialOrientation = 'white',
  onPositionChange,
}: LiveAnalysisBoardOptions): { board: ReactNode; toolbar: ReactNode } {
  const baseFenRef = useRef(initialFen);
  const chessRef = useRef(new Chess(initialFen));
  const [fen, setFen] = useState(initialFen);
  const [orientation, setOrientation] = useState<'white' | 'black'>(initialOrientation);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0); // 0 = current position

  // Compute legal dests for current position
  const getDests = useCallback(() => {
    const chess = chessRef.current;
    const dests = new Map<Key, Key[]>();
    const moves = chess.moves({ verbose: true });
    for (const move of moves) {
      const from = move.from as Key;
      if (!dests.has(from)) dests.set(from, []);
      dests.get(from)!.push(move.to as Key);
    }
    return dests;
  }, []);

  const [dests, setDests] = useState(() => getDests());

  const turnColor = chessRef.current.turn() === 'w' ? 'white' : 'black';
  const isCheck = chessRef.current.isCheck();

  const updateState = useCallback(() => {
    const newFen = chessRef.current.fen();
    setFen(newFen);
    setDests(getDests());
    onPositionChange?.(newFen);
  }, [getDests, onPositionChange]);

  // Handle piece move
  const handleMove = useCallback((orig: Key, dest: Key) => {
    if (disabled) return;

    const chess = chessRef.current;

    // If viewing history, truncate future moves and resume from here
    if (viewIndex > 0) {
      const newHistory = moveHistory.slice(0, moveHistory.length - viewIndex);
      setMoveHistory(newHistory);
      setViewIndex(0);
      // Replay position from start
      const replay = new Chess(baseFenRef.current);
      for (const san of newHistory) replay.move(san);
      chessRef.current = replay;
    }

    // Try the move (handle promotions)
    const move = chess.move({ from: orig, to: dest, promotion: 'q' });
    if (!move) return;

    setMoveHistory(prev => [...prev, move.san]);
    setLastMove([orig, dest]);
    updateState();
  }, [disabled, viewIndex, moveHistory, updateState]);

  // Navigation
  const goToStart = useCallback(() => {
    const chess = new Chess(baseFenRef.current);
    chessRef.current = chess;
    setViewIndex(moveHistory.length);
    setLastMove(undefined);
    updateState();
  }, [moveHistory.length, updateState]);

  const goBack = useCallback(() => {
    if (viewIndex >= moveHistory.length) return;
    const newViewIndex = viewIndex + 1;
    const replay = new Chess(baseFenRef.current);
    const movesToPlay = moveHistory.slice(0, moveHistory.length - newViewIndex);
    for (const san of movesToPlay) replay.move(san);
    chessRef.current = replay;
    setViewIndex(newViewIndex);
    const history = replay.history({ verbose: true });
    const lastMv = history[history.length - 1];
    setLastMove(lastMv ? [lastMv.from as Key, lastMv.to as Key] : undefined);
    updateState();
  }, [viewIndex, moveHistory, updateState]);

  const goForward = useCallback(() => {
    if (viewIndex <= 0) return;
    const newViewIndex = viewIndex - 1;
    const replay = new Chess(baseFenRef.current);
    const movesToPlay = moveHistory.slice(0, moveHistory.length - newViewIndex);
    for (const san of movesToPlay) replay.move(san);
    chessRef.current = replay;
    setViewIndex(newViewIndex);
    const history = replay.history({ verbose: true });
    const lastMv = history[history.length - 1];
    setLastMove(lastMv ? [lastMv.from as Key, lastMv.to as Key] : undefined);
    updateState();
  }, [viewIndex, moveHistory, updateState]);

  const resetBoard = useCallback(() => {
    chessRef.current = new Chess(baseFenRef.current);
    setMoveHistory([]);
    setViewIndex(0);
    setLastMove(undefined);
    updateState();
  }, [updateState]);

  const flipBoard = useCallback(() => {
    setOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  /*
    Arrow keys and wheel-to-step (owner, 2026-08-09), never while typing in the
    PGN import box beside the board (D28). Only when there is something to step
    through: with no moves played the wheel scrolls the page as usual.
  */
  const attachWheel = useBoardStepInput({
    enabled: moveHistory.length > 0,
    onBack: goBack,
    onForward: goForward,
  });

  // Reset when a reusable analysis tab receives another linked position.
  useEffect(() => {
    baseFenRef.current = initialFen;
    chessRef.current = new Chess(initialFen);
    setFen(initialFen);
    setOrientation(initialOrientation);
    setMoveHistory([]);
    setViewIndex(0);
    setLastMove(undefined);
    setDests(getDests());
    onPositionChange?.(initialFen);
  }, [getDests, initialFen, initialOrientation, onPositionChange]);


  const board = (
    <div className="relative w-full" ref={attachWheel}>
      <ChessBoard
        fen={fen}
        orientation={orientation}
        dests={disabled ? undefined : dests}
        turnColor={turnColor}
        movableColor={disabled ? undefined : 'both'}
        lastMove={lastMove}
        check={isCheck ? turnColor : undefined}
        viewOnly={disabled}
        onMove={handleMove}
      />
      {disabled && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-sm">
          <div className="bg-card border border-border rounded-lg px-4 py-3 text-center shadow-lg">
            <p className="text-sm font-medium">Analysis disabled</p>
            <p className="text-xs text-muted-foreground mt-1">You have an active online game</p>
          </div>
        </div>
      )}
    </div>
  );

  const toolbar = (
    <BoardControls
      onStart={goToStart}
      onBack={goBack}
      onForward={goForward}
      onFlip={flipBoard}
      onReset={resetBoard}
    />
  );

  return { board, toolbar };
}
