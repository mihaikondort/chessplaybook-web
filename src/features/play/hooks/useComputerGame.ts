import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayGameStore } from '../stores/gameStore';
import { StockfishOpponent, DIFFICULTY_LEVELS } from '../services/StockfishOpponent';
import {
  positionFromFen,
  applyMove,
  toUci,
  uciToSan,
  initialPosition,
  isPromotion,
} from '@/components/chess/chessLogic';
import type { ChessPosition } from '@/components/chess/chessLogic';
import type { Key, Color, Dests } from '@lichess-org/chessground/types';
import { soundService } from '@/services/SoundService';

export interface ComputerGameState {
  position: ChessPosition | null;
  fen: string;
  dests: Dests | undefined;
  turnColor: Color;
  movableColor: Color | undefined;
  lastMove: Key[] | undefined;
  isCheck: boolean;
  isThinking: boolean;
  isEngineReady: boolean;
  sanMoves: string[];
  gameStatus: 'idle' | 'playing' | 'ended';
  gameResult: string | null;
  playerColor: Color;
  difficulty: number;
}

export interface ComputerGameActions {
  startGame: (playerColor: Color, difficulty: number) => void;
  onMove: (orig: Key, dest: Key) => void;
  resign: () => void;
  timeout: (loser: Color) => void;
  reset: () => void;
  flipBoard: () => void;
}

/**
 * Hook that manages a complete game against the computer.
 * Wires together: ChessBoard, chessops, Stockfish WASM, game store.
 */
export function useComputerGame(): [ComputerGameState, ComputerGameActions] {
  const engineRef = useRef<StockfishOpponent | null>(null);
  const positionRef = useRef<ChessPosition | null>(null);
  const [position, setPosition] = useState<ChessPosition | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);
  const [sanMoves, setSanMoves] = useState<string[]>([]);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Color>('white');
  const [difficulty, setDifficulty] = useState(4);

  const store = usePlayGameStore();

  // Initialize engine on mount
  useEffect(() => {
    const engine = new StockfishOpponent();
    engineRef.current = engine;

    engine.init().then(() => {
      setIsEngineReady(true);
    }).catch(() => {
      console.error('Failed to initialize Stockfish');
    });

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Play sound based on SAN notation
  const playMoveSound = useCallback((san: string | null) => {
    if (!san) { soundService.move(); return; }
    if (san.includes('+') || san.includes('#')) soundService.check();
    else if (san.startsWith('O-O')) soundService.castle();
    else if (san.includes('x')) soundService.capture();
    else soundService.move();
  }, []);

  // Handle game over
  const handleGameOver = useCallback((pos: ChessPosition, myColor: Color) => {
    let result: string;
    if (pos.isCheckmate) {
      const winner = pos.turnColor === 'white' ? 'Black' : 'White';
      result = `${winner} wins by checkmate`;
      const iWon = (pos.turnColor === 'white' && myColor === 'black') ||
                   (pos.turnColor === 'black' && myColor === 'white');
      soundService.gameEnd(iWon ? 'win' : 'loss');
    } else if (pos.isStalemate) {
      result = 'Draw by stalemate';
      soundService.gameEnd('draw');
    } else if (pos.isInsufficientMaterial) {
      result = 'Draw by insufficient material';
      soundService.gameEnd('draw');
    } else {
      result = 'Game over';
      soundService.gameEnd('draw');
    }
    setGameResult(result);
    store.endGame(pos.isCheckmate
      ? (pos.turnColor === 'white' ? 'black' : 'white')
      : 'draw');
  }, [store]);

  // Engine makes a move
  const engineMove = useCallback(async (pos: ChessPosition) => {
    const engine = engineRef.current;
    if (!engine?.isReady || pos.isGameOver) return;

    setIsThinking(true);
    try {
      const uciMove = await engine.getMove(pos.fen);
      const san = uciToSan(pos, uciMove);
      const newPos = applyMove(pos, uciMove);

      if (newPos) {
        positionRef.current = newPos;
        setPosition(newPos);
        setLastMove([uciMove.substring(0, 2) as Key, uciMove.substring(2, 4) as Key]);
        if (san) setSanMoves(prev => [...prev, san]);
        playMoveSound(san);

        store.makeMove(uciMove, newPos.fen);

        if (newPos.isGameOver) {
          handleGameOver(newPos, store.playerColor as Color);
        }
      }
    } catch (err) {
      console.error('Engine move error:', err);
    } finally {
      setIsThinking(false);
    }
  }, [store, playMoveSound, handleGameOver]);

  // Player makes a move
  const onMove = useCallback((orig: Key, dest: Key) => {
    const pos = positionRef.current;
    if (!pos || store.status !== 'playing') return;

    // Handle promotion (default to queen for now)
    const promo = isPromotion(pos, orig, dest) ? 'q' : '';
    const uciMove = toUci(orig, dest, promo);
    const san = uciToSan(pos, uciMove);
    const newPos = applyMove(pos, uciMove);

    if (newPos) {
      positionRef.current = newPos;
      setPosition(newPos);
      setLastMove([orig, dest]);
      if (san) setSanMoves(prev => [...prev, san]);
      playMoveSound(san);

      store.makeMove(uciMove, newPos.fen);

      if (newPos.isGameOver) {
        handleGameOver(newPos, store.playerColor as Color);
      } else {
        // Engine's turn
        engineMove(newPos);
      }
    }
  }, [store, engineMove, handleGameOver, playMoveSound]);

  // Start a new game
  const startGame = useCallback((playerColor: Color, diff: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.setLevel(diff);
    setDifficulty(diff);

    const pos = initialPosition();
    positionRef.current = pos;
    setPosition(pos);
    setLastMove(undefined);
    setSanMoves([]);
    setGameResult(null);
    setOrientation(playerColor);

    store.startGame(playerColor);

    // If player is black, engine moves first
    if (playerColor === 'black') {
      engineMove(pos);
    }
  }, [store, engineMove]);

  // Resign
  const resign = useCallback(() => {
    if (store.status !== 'playing') return;
    const winner = store.playerColor === 'white' ? 'Black' : 'White';
    setGameResult(`${winner} wins by resignation`);
    store.endGame(store.playerColor === 'white' ? 'black' : 'white');
    soundService.gameEnd('loss');
  }, [store]);

  const timeout = useCallback((loser: Color) => {
    if (store.status !== 'playing') return;
    const winner = loser === 'white' ? 'Black' : 'White';
    setGameResult(`${winner} wins on time`);
    store.endGame(loser === 'white' ? 'black' : 'white');
    soundService.gameEnd(loser === store.playerColor ? 'loss' : 'win');
  }, [store]);

  // Reset
  const reset = useCallback(() => {
    positionRef.current = null;
    setPosition(null);
    setLastMove(undefined);
    setSanMoves([]);
    setGameResult(null);
    setIsThinking(false);
    store.reset();
  }, [store]);

  // Flip board
  const flipBoard = useCallback(() => {
    setOrientation(prev => prev === 'white' ? 'black' : 'white');
  }, []);

  const state: ComputerGameState = {
    position,
    fen: position?.fen || 'start',
    dests: position?.dests,
    turnColor: position?.turnColor || 'white',
    movableColor: store.status === 'playing' && !isThinking
      ? store.playerColor as Color
      : undefined,
    lastMove,
    isCheck: position?.isCheck || false,
    isThinking,
    isEngineReady,
    sanMoves,
    gameStatus: store.status,
    gameResult,
    playerColor: orientation,
    difficulty,
  };

  const actions: ComputerGameActions = {
    startGame,
    onMove,
    resign,
    timeout,
    reset,
    flipBoard,
  };

  return [state, actions];
}
