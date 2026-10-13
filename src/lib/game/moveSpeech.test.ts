import { describe, expect, it } from 'vitest';
import { announceMove, sanToWords, pliesBefore } from './moveSpeech';

describe('sanToWords (the Lichess viewer\'s wording)', () => {
  it.each([
    ['Nf3', 'knight F 3'],
    ['e4', 'E 4'],
    ['Nxe5+', 'knight takes E 5 check'],
    ['exd5', 'E takes D 5'],
    ['Qh5#', 'queen H 5 checkmate'],
    ['e8=Q#', 'E 8 promotes to queen checkmate'],
    ['O-O', 'short castling'],
    ['O-O-O', 'long castling'],
    ['O-O+', 'short castling check'],
    ['O-O-O#', 'long castling checkmate'],
    ['Rad1', 'rook A D 1'],
    ['N5xd4', 'knight 5 takes D 4'],
  ])('%s -> %s', (san, words) => {
    expect(sanToWords(san)).toBe(words);
  });
});

describe('announceMove', () => {
  const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O'];
  it('numbers the move and names the side, as the Lichess viewer does', () => {
    expect(announceMove(moves, 0)).toBe('Move 1, white, E 4');
    expect(announceMove(moves, 3)).toBe('Move 2, black, knight C 6');
    expect(announceMove(moves, 6)).toBe('Move 4, white, short castling');
  });
  it('says the starting position before the first move, and nothing with no moves', () => {
    expect(announceMove(moves, -1)).toBe('Starting position');
    expect(announceMove([], -1)).toBe('');
  });
});

describe('a game from a FEN (E6)', () => {
  it('counts the plies before the position', () => {
    expect(pliesBefore(undefined)).toBe(0);
    expect(pliesBefore('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(0);
    expect(pliesBefore('4k3/8/8/8/8/8/4P3/4K3 w - - 0 40')).toBe(78);
    expect(pliesBefore('4k3/8/8/8/8/8/4P3/4K3 b - - 0 40')).toBe(79);
  });
  it('numbers and colours the move from the game start', () => {
    expect(announceMove(['Kd7', 'e4'], 0, 79)).toBe('Move 40, black, king D 7');
    expect(announceMove(['Kd7', 'e4'], 1, 79)).toBe('Move 41, white, E 4');
  });
});
