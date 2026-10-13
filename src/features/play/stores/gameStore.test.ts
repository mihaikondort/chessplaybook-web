import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayGameStore } from './gameStore';

describe('PlayGameStore', () => {
  beforeEach(() => {
    usePlayGameStore.getState().reset();
  });

  it('starts in idle state', () => {
    const state = usePlayGameStore.getState();
    expect(state.status).toBe('idle');
    expect(state.result).toBeNull();
    expect(state.moves).toEqual([]);
  });

  it('starts a game with the correct player color', () => {
    usePlayGameStore.getState().startGame('black');
    const state = usePlayGameStore.getState();
    expect(state.status).toBe('playing');
    expect(state.playerColor).toBe('black');
    expect(state.isPlayerTurn).toBe(false);
  });

  it('records moves and updates FEN', () => {
    usePlayGameStore.getState().startGame('white');
    usePlayGameStore.getState().makeMove('e2e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    const state = usePlayGameStore.getState();
    expect(state.moves).toEqual(['e2e4']);
    expect(state.fen).toContain('4P3');
    expect(state.isPlayerTurn).toBe(false);
  });

  it('ends a game with a result', () => {
    usePlayGameStore.getState().startGame('white');
    usePlayGameStore.getState().endGame('white');
    const state = usePlayGameStore.getState();
    expect(state.status).toBe('ended');
    expect(state.result).toBe('white');
  });

  it('resets to initial state', () => {
    usePlayGameStore.getState().startGame('white');
    usePlayGameStore.getState().makeMove('e2e4', 'some-fen');
    usePlayGameStore.getState().reset();
    const state = usePlayGameStore.getState();
    expect(state.status).toBe('idle');
    expect(state.moves).toEqual([]);
    expect(state.isPlayerTurn).toBe(true);
  });
});
