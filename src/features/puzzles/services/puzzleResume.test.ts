/**
 * Surviving a refresh — storage contract.
 *
 * The owner's rule (2026-08-08): "the puzzle just survives the refresh; if they
 * close the browser we just forget about it." That is sessionStorage, and these
 * tests pin the parts that are not obvious — chiefly that `attemptRecorded`
 * round-trips, because `puzzle_attempts` has no unique key on
 * (identity_id, puzzle_id) and losing that flag means a refresh reports the
 * attempt a second time and moves the rating twice.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  RESUME_STORAGE_KEY,
  clearResumeState,
  loadResumeState,
  parseResumeState,
  saveResumeState,
  type ResumeState,
} from './puzzleResume';

const PUZZLE = {
  id: 'AAAAA',
  fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 4',
  moves: ['c6d4', 'f3f7', 'e8f7'],
  rating: 1000,
  themes: ['mateIn1'],
};

const STATE: ResumeState = {
  version: 1,
  puzzle: PUZZLE,
  moveIndex: 1,
  resolvedAs: null,
  fen: 'some/fen w - - 0 1',
  attemptRecorded: true,
  hasFailed: true,
  rungsShown: 2,
  sessionId: 'run-1',
  isDaily: false,
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  } as Storage;
}

describe('puzzleResume', () => {
  let store: Storage;
  beforeEach(() => { store = memoryStorage(); });

  it('round-trips a mid-solve puzzle', () => {
    saveResumeState(STATE, store);
    expect(loadResumeState(store)).toEqual(STATE);
  });

  it('preserves that the attempt was already scored', () => {
    // The whole point: B1 recorded the attempt on the first wrong move, and the
    // in-memory guard against reporting it twice does not survive a reload.
    saveResumeState({ ...STATE, attemptRecorded: true }, store);
    expect(loadResumeState(store)?.attemptRecorded).toBe(true);

    saveResumeState({ ...STATE, attemptRecorded: false }, store);
    expect(loadResumeState(store)?.attemptRecorded).toBe(false);
  });

  it('preserves the hint count, which decides whether the puzzle is rated', () => {
    saveResumeState({ ...STATE, rungsShown: 3 }, store);
    expect(loadResumeState(store)?.rungsShown).toBe(3);
  });

  it('clears', () => {
    saveResumeState(STATE, store);
    clearResumeState(store);
    expect(loadResumeState(store)).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(loadResumeState(store)).toBeNull();
  });

  /*
    A SOLVED PUZZLE SURVIVES LEAVING THE PAGE (owner, 2026-08-09). The board was
    being replaced on return because nothing was stored for a resolved attempt, so
    `PuzzleTrainer` could not tell the puzzle on screen belonged to the run.
  */
  describe('a resolved attempt', () => {
    const SOLVED: ResumeState = {
      ...STATE, resolvedAs: 'correct', moveIndex: PUZZLE.moves.length,
    };

    it('round-trips, at the end of the line', () => {
      saveResumeState(SOLVED, store);
      expect(loadResumeState(store)).toEqual(SOLVED);
    });

    it('round-trips a revealed solution', () => {
      const revealed: ResumeState = { ...SOLVED, resolvedAs: 'solution' };
      saveResumeState(revealed, store);
      expect(loadResumeState(store)?.resolvedAs).toBe('solution');
    });

    it('still carries that the attempt was scored — a return visit must not report it twice', () => {
      saveResumeState(SOLVED, store);
      expect(loadResumeState(store)?.attemptRecorded).toBe(true);
    });

    /*
      THE COMPATIBILITY CLAUSE, and the reason the shape stays at version 1. A tab
      holding a payload written before this change has no `resolvedAs` — and it was
      a mid-solve snapshot, which is exactly what `null` means. Bumping the version
      would have thrown that player's puzzle away to add a field.
    */
    it('reads an older payload as mid-solve rather than discarding it', () => {
      const { resolvedAs: _dropped, ...older } = STATE;
      const parsed = parseResumeState(JSON.stringify(older));
      expect(parsed).not.toBeNull();
      expect(parsed?.resolvedAs).toBeNull();
    });
  });

  describe('rejects anything it cannot trust', () => {
    // This is attacker-controllable text in the player's own browser, and it
    // reaches both the board and the rating report.
    const cases: Array<[string, unknown]> = [
      ['not JSON', undefined],
      ['a future version', { ...STATE, version: 2 }],
      ['no puzzle', { ...STATE, puzzle: undefined }],
      ['a puzzle with no moves', { ...STATE, puzzle: { ...PUZZLE, moves: [] } }],
      ['non-string moves', { ...STATE, puzzle: { ...PUZZLE, moves: [1, 2] } }],
      ['a missing fen', { ...STATE, fen: '' }],
      ['index 0 — before the setup move', { ...STATE, moveIndex: 0 }],
      ['a negative index', { ...STATE, moveIndex: -1 }],
      // Mid-solve only: an index AT the end is a puzzle with no move left to
      // expect. The resolved case is allowed to reach it — see below.
      ['an index past the solution', { ...STATE, moveIndex: PUZZLE.moves.length }],
      ['an index past the solution even when resolved', { ...STATE, resolvedAs: 'correct', moveIndex: PUZZLE.moves.length + 1 }],
      ['an unknown resolution', { ...STATE, resolvedAs: 'abandoned', moveIndex: PUZZLE.moves.length }],
      ['a fractional index', { ...STATE, moveIndex: 1.5 }],
      ['a negative hint count', { ...STATE, rungsShown: -1 }],
    ];

    for (const [name, payload] of cases) {
      it(name, () => {
        const raw = payload === undefined ? '{not json' : JSON.stringify(payload);
        expect(parseResumeState(raw)).toBeNull();
      });
    }

    it('a corrupt entry already in storage', () => {
      store.setItem(RESUME_STORAGE_KEY, '{"version":1,"puzzle":null}');
      expect(loadResumeState(store)).toBeNull();
    });
  });

  it('never throws when storage is unavailable', () => {
    // Private modes and embedded webviews throw on access alone. Losing the
    // resume is survivable; breaking the trainer is not.
    const hostile = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
      removeItem: () => { throw new Error('denied'); },
    } as unknown as Storage;

    expect(() => saveResumeState(STATE, hostile)).not.toThrow();
    expect(loadResumeState(hostile)).toBeNull();
    expect(() => clearResumeState(hostile)).not.toThrow();
  });
});
