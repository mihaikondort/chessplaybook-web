import { create } from 'zustand';

/**
 * Game state store for Play vs Computer.
 * Manages board position, move history, clock, and game lifecycle.
 *
 * Convention:
 * - Store files live in features/{name}/stores/
 * - One store per major state domain (game, settings, etc.)
 * - Use selectors to avoid unnecessary re-renders:
 *     const fen = usePlayGameStore(s => s.fen);
 * - Actions are defined inside the store, not as separate functions
 */

export type GameStatus = 'idle' | 'playing' | 'ended';
export type GameResult = 'white' | 'black' | 'draw' | null;

interface PlayGameState {
  // State
  fen: string;
  moves: string[];
  status: GameStatus;
  result: GameResult;
  playerColor: 'white' | 'black';
  isPlayerTurn: boolean;

  // Actions
  startGame: (playerColor: 'white' | 'black') => void;
  makeMove: (move: string, newFen: string) => void;
  endGame: (result: GameResult) => void;
  reset: () => void;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const usePlayGameStore = create<PlayGameState>()((set) => ({
  fen: INITIAL_FEN,
  moves: [],
  status: 'idle',
  result: null,
  playerColor: 'white',
  isPlayerTurn: true,

  startGame: (playerColor) => set({
    fen: INITIAL_FEN,
    moves: [],
    status: 'playing',
    result: null,
    playerColor,
    isPlayerTurn: playerColor === 'white',
  }),

  makeMove: (move, newFen) => set((state) => ({
    fen: newFen,
    moves: [...state.moves, move],
    isPlayerTurn: !state.isPlayerTurn,
  })),

  endGame: (result) => set({
    status: 'ended',
    result,
  }),

  reset: () => set({
    fen: INITIAL_FEN,
    moves: [],
    status: 'idle',
    result: null,
    isPlayerTurn: true,
  }),
}));
