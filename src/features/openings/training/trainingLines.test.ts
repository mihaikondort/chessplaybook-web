import { describe, it, expect } from 'vitest';
import type { RepertoireExport, ExportMove } from '../services/openingsApi';
import { linesInScope, linesFrom, makeTrainedCheck, progress, isLineEnd, pickReply, moveOutcome, repeatsPosition } from './trainingLines';

/*
  A White repertoire, our moves at R, A, B, C:
    R (ours) e2e4 -> X
    X (theirs) e7e5 main (0.7) -> A, c7c5 secondary (0.3) -> B
    A (ours) g1f3 -> Y
    Y (theirs) b8c6 secondary only (no main reply here) -> C
    B (ours) g1f3 -> END
    C (ours) f1b5 -> END
  Lines: main  = [e4 e5 Nf3]                       (cut at Y: no main reply)
         both  = [e4 e5 Nf3 Nc6 Bb5], [e4 c5 Nf3]
         secondary = [e4 c5 Nf3]                   (c5 is secondary where e5 is main; Nc6 is not a deviation)
*/
const mv = (uci: string, child: string, flag: 0 | 1, share = 1): ExportMove => ({ uci, san: uci, child, share, flag, explanation: null, cp: null, mate: null });
const data: RepertoireExport = {
  bookVersion: 'v', stamp: 's',
  repertoire: { id: 'r', name: 'R', side: 'white', rootLine: [], rootSan: [], rootFens: [], rootKey: 'R', maxPly: 20 },
  positions: {
    R: { f: '', t: 'o', j: 0, m: [mv('e2e4', 'X', 1)] },
    X: { f: '', t: 'x', j: 1, m: [mv('e7e5', 'A', 1, 0.7), mv('c7c5', 'B', 0, 0.3)] },
    A: { f: '', t: 'o', j: 0, m: [mv('g1f3', 'Y', 1)] },
    Y: { f: '', t: 'x', j: 0, m: [mv('b8c6', 'C', 0)] },
    B: { f: '', t: 'o', j: 0, m: [mv('g1f3', 'END', 1)] },
    C: { f: '', t: 'o', j: 0, m: [mv('f1b5', 'END', 1)] },
    END: { f: '', t: 'x', j: 0, m: [] },
  },
  explanations: {},
};

describe('linesInScope', () => {
  it('main lines stop where no reply is main', () => {
    expect(linesInScope(data, 'main')).toEqual([['e2e4', 'e7e5', 'g1f3']]);
  });
  it('both runs every line to the end of the book', () => {
    expect(linesInScope(data, 'both')).toEqual([
      ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
      ['e2e4', 'c7c5', 'g1f3'],
    ]);
  });
  it('secondary keeps only lines that leave a main reply', () => {
    expect(linesInScope(data, 'secondary')).toEqual([['e2e4', 'c7c5', 'g1f3']]);
  });
});

/*
  #179: the book is a graph. The London's loop, in miniature: our Be3 -> P, their Nf6 -> Q, our Bf4 -> back to the
  position before Be3 (L), where their Nh5 is the only reply. Without the rule the line goes round to maxPly.
    L (ours) c1e3 -> P;  P (theirs) h5f6 main -> Q, a7a6 main -> END;  Q (ours) e3f4 -> L2
    L2 (theirs) f6h5 -> L
*/
const loop: RepertoireExport = {
  ...data,
  repertoire: { ...data.repertoire, rootKey: 'L2', maxPly: 40 },
  positions: {
    L2: { f: '', t: 'x', j: 0, m: [mv('f6h5', 'L', 1)] },
    L: { f: '', t: 'o', j: 0, m: [mv('f4e3', 'P', 1)] },
    P: { f: '', t: 'x', j: 1, m: [mv('h5f6', 'Q', 1), mv('a7a6', 'END', 1)] },
    Q: { f: '', t: 'o', j: 0, m: [mv('e3f4', 'L2', 1)] },
    END: { f: '', t: 'o', j: 0, m: [] },
  },
};

describe('a position already in the line ends it (#179)', () => {
  it('the line keeps the repeating move and stops at the repeated position', () => {
    expect(linesInScope(loop, 'both')).toEqual([
      ['f6h5', 'f4e3', 'h5f6', 'e3f4'],
      ['f6h5', 'f4e3', 'a7a6'],
    ]);
    expect(linesInScope(loop, 'main')).toEqual(linesInScope(loop, 'both'));
  });
  it('repeatsPosition is true only once the line is back at an earlier position', () => {
    expect(repeatsPosition(loop, ['f6h5', 'f4e3', 'h5f6'])).toBe(false);
    expect(repeatsPosition(loop, ['f6h5', 'f4e3', 'h5f6', 'e3f4'])).toBe(true);
    expect(repeatsPosition(data, ['e2e4', 'e7e5', 'g1f3'])).toBe(false);
  });
  it('the training walk sees the end there', () => {
    expect(isLineEnd(linesInScope(loop, 'both'), ['f6h5', 'f4e3', 'h5f6', 'e3f4'])).toBe(true);
  });
});

/*
  #179: a marked alternative (flag 2) of ours opens a sideline: never a main line, a line in the other scopes.
    S (ours) a7a6 chosen -> T, b7b6 alternative -> U, c7c6 theory -> END
    T (theirs) h2h3 main -> END;  U (theirs) g2g3 main -> END
*/
const withAlt: RepertoireExport = {
  ...data,
  repertoire: { ...data.repertoire, side: 'black', rootKey: 'S' },
  positions: {
    S: { f: '', t: 'o', j: 0, m: [mv('a7a6', 'T', 1), { ...mv('b7b6', 'U', 0), flag: 2 }, mv('c7c6', 'END', 0)] },
    T: { f: '', t: 'x', j: 0, m: [mv('h2h3', 'END', 1)] },
    U: { f: '', t: 'x', j: 0, m: [mv('g2g3', 'END', 1)] },
    END: { f: '', t: 'o', j: 0, m: [] },
  },
};

describe('marked alternatives (#179)', () => {
  it('are sidelines: not in main, in secondary and both; other theory never opens a line', () => {
    expect(linesInScope(withAlt, 'main')).toEqual([['a7a6', 'h2h3']]);
    expect(linesInScope(withAlt, 'secondary')).toEqual([['b7b6', 'g2g3']]);
    expect(linesInScope(withAlt, 'both')).toEqual([['a7a6', 'h2h3'], ['b7b6', 'g2g3']]);
  });
});

/*
  The TWIC book's coverage: a reply the repertoire does not cover (flag 3) is theory, never a line, in any scope, and
  the trainer never plays it.
    R (ours) e2e4 -> X;  X (theirs) e7e5 main -> END, a7a6 not covered -> Z;  Z (ours) d2d4 -> END
*/
const withUncovered: RepertoireExport = {
  ...data,
  positions: {
    R: { f: '', t: 'o', j: 0, m: [mv('e2e4', 'X', 1)] },
    X: { f: '', t: 'x', j: 0, m: [mv('e7e5', 'END', 1, 0.95), { ...mv('a7a6', 'Z', 0, 0.05), flag: 3 }] },
    Z: { f: '', t: 'o', j: 0, m: [mv('d2d4', 'END', 1)] },
    END: { f: '', t: 'x', j: 0, m: [] },
  },
};

describe('uncovered replies (the TWIC book)', () => {
  it('are never lines, in any scope', () => {
    for (const scope of ['main', 'secondary', 'both'] as const) {
      expect(linesInScope(withUncovered, scope).some((l) => l.includes('a7a6'))).toBe(false);
    }
    expect(linesInScope(withUncovered, 'both')).toEqual([['e2e4', 'e7e5']]);
  });
  it('are never the reply the trainer plays', () => {
    const lines = linesInScope(withUncovered, 'both');
    for (let i = 0; i < 50; i++) {
      expect(pickReply(withUncovered.positions.X.m, ['e2e4'], lines, () => false, () => i / 50)?.uci).toBe('e7e5');
    }
  });
});

describe('trained lines', () => {
  it('a clean longer line trains the main line inside it, not the reverse', () => {
    const fromLong = makeTrainedCheck(['e2e4 e7e5 g1f3 b8c6 f1b5']);
    expect(fromLong(['e2e4', 'e7e5', 'g1f3'])).toBe(true);
    const fromShort = makeTrainedCheck(['e2e4 e7e5 g1f3']);
    expect(fromShort(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'])).toBe(false);
  });
  it('a move boundary is respected (e2e4 is not a prefix of e2e4x)', () => {
    expect(makeTrainedCheck(['e2e4 e7e5'])(['e2e4', 'e7'])).toBe(false);
  });
  it('counts progress per scope', () => {
    const t = makeTrainedCheck(['e2e4 e7e5 g1f3 b8c6 f1b5']);
    expect(progress(linesInScope(data, 'main'), t)).toEqual({ total: 1, trained: 1 });
    expect(progress(linesInScope(data, 'both'), t)).toEqual({ total: 2, trained: 1 });
  });
});

describe('linesFrom (E7)', () => {
  it('keeps the lines through a position, and all of them for an empty start', () => {
    const both = linesInScope(data, 'both');
    expect(linesFrom(both, ['e2e4', 'c7c5'])).toEqual([['e2e4', 'c7c5', 'g1f3']]);
    expect(linesFrom(both, [])).toEqual(both);
    expect(linesFrom(linesInScope(data, 'main'), ['e2e4', 'c7c5'])).toEqual([]);
  });
});

describe('isLineEnd', () => {
  it('ends the main scope at the cut, the full scope at the book end', () => {
    expect(isLineEnd(linesInScope(data, 'main'), ['e2e4', 'e7e5', 'g1f3'])).toBe(true);
    expect(isLineEnd(linesInScope(data, 'both'), ['e2e4', 'e7e5', 'g1f3'])).toBe(false);
  });
});

describe('pickReply', () => {
  const X = data.positions.X.m;
  it('plays the untrained line even when it is the rarer reply', () => {
    const lines = linesInScope(data, 'both');
    const trained = makeTrainedCheck(['e2e4 e7e5 g1f3 b8c6 f1b5']);
    for (let i = 0; i < 20; i++) expect(pickReply(X, ['e2e4'], lines, trained)!.uci).toBe('c7c5');
  });
  it('chooses by popularity among untrained lines, and among all once everything is trained', () => {
    const lines = linesInScope(data, 'both');
    const none = makeTrainedCheck([]);
    expect(pickReply(X, ['e2e4'], lines, none, () => 0.69)!.uci).toBe('e7e5');
    expect(pickReply(X, ['e2e4'], lines, none, () => 0.71)!.uci).toBe('c7c5');
    const all = makeTrainedCheck(['e2e4 e7e5 g1f3 b8c6 f1b5', 'e2e4 c7c5 g1f3']);
    expect(pickReply(X, ['e2e4'], lines, all, () => 0.5)!.uci).toBe('e7e5');
  });
  it('never leaves the scope: main lines get main replies only, sidelines the deviation', () => {
    const none = makeTrainedCheck([]);
    for (let i = 0; i < 20; i++) {
      expect(pickReply(X, ['e2e4'], linesInScope(data, 'main'), none)!.uci).toBe('e7e5');
      expect(pickReply(X, ['e2e4'], linesInScope(data, 'secondary'), none)!.uci).toBe('c7c5');
    }
  });
});

describe('moveOutcome', () => {
  it('ranks revealed over help over retry over first time', () => {
    expect(moveOutcome({ revealed: true, hints: 2, wrongTries: 1 })).toBe('revealed');
    expect(moveOutcome({ revealed: false, hints: 1, wrongTries: 1 })).toBe('with_help');
    expect(moveOutcome({ revealed: false, hints: 0, wrongTries: 2 })).toBe('after_retry');
    expect(moveOutcome({ revealed: false, hints: 0, wrongTries: 0 })).toBe('first_time');
  });
});
