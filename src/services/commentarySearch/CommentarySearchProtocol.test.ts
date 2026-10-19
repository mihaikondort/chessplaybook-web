/**
 * Unit tests for the commentary-search UCI output parsers.
 *
 * Focus: feed in recorded prod-shape UCI output, assert that searchedEval,
 * isMate/mateIn, finalDepth, and finalHashfull come out correctly. These
 * parsers are the single source of truth for the entire commentary
 * pipeline's eval assessment — a regression here would silently ship
 * bad commentary.
 */

import { describe, it, expect } from 'vitest';
import { BAKE_SEARCH_BUDGET, parseMainSearch, runMainSearch } from './CommentarySearchProtocol';
import type { SearchTransport } from './SearchTransport';

describe('parseMainSearch', () => {
  it('parses a standard MultiPV=1 search output with cp score (white to move)', () => {
    const lines = [
      'info depth 1 seldepth 1 multipv 1 score cp 42 nodes 50 time 0 pv e2e4',
      'info depth 10 seldepth 14 multipv 1 score cp 55 hashfull 123 nodes 12000 pv e2e4 e7e5',
      'info depth 25 seldepth 38 multipv 1 score cp 410 hashfull 827 nodes 5000000 pv e1e7 a7b8',
      'bestmove e1e7 ponder a7b8',
    ];

    const parsed = parseMainSearch(lines, 'w');

    expect(parsed.searchedEval).toBeCloseTo(4.10, 2);
    expect(parsed.isMate).toBe(false);
    expect(parsed.mateIn).toBeNull();
    expect(parsed.finalDepth).toBe(25);
    expect(parsed.finalHashfull).toBe(827);
  });

  it('flips cp score sign when black is to move', () => {
    // SF reports from side-to-move POV. A cp +396 reported when black is
    // to move means "black is winning by +3.96 from black's POV" → -3.96
    // from White's POV.
    const lines = [
      'info depth 25 multipv 1 score cp 396 hashfull 500 nodes 100 pv b2b1',
      'bestmove b2b1',
    ];

    const parsed = parseMainSearch(lines, 'b');

    expect(parsed.searchedEval).toBeCloseTo(-3.96, 2);
    expect(parsed.isMate).toBe(false);
  });

  it('parses mate scores, clamping numeric eval to ±100 and preserving signed mateIn', () => {
    const lines = [
      'info depth 1 multipv 1 score mate 5 nodes 10 pv e1e7',
      'info depth 15 multipv 1 score mate 3 hashfull 100 nodes 50 pv e1e7 a7b8 d1d8',
      'bestmove e1e7',
    ];

    const parsed = parseMainSearch(lines, 'w');

    expect(parsed.searchedEval).toBe(100);
    expect(parsed.isMate).toBe(true);
    expect(parsed.mateIn).toBe(3);
  });

  it('flips mate sign for black to move', () => {
    const lines = [
      'info depth 12 multipv 1 score mate 4 hashfull 80 pv h8h1',
      'bestmove h8h1',
    ];

    const parsed = parseMainSearch(lines, 'b');

    expect(parsed.searchedEval).toBe(-100);
    expect(parsed.isMate).toBe(true);
    expect(parsed.mateIn).toBe(-4); // White gets mated in 4
  });

  it('uses the LATEST score line (engine refines as it searches)', () => {
    const lines = [
      'info depth 1 multipv 1 score cp 20 pv e2e4',
      'info depth 10 multipv 1 score cp 60 pv e2e4',
      'info depth 20 multipv 1 score cp 200 pv e2e4',  // shallower — stale
      'info depth 25 multipv 1 score cp 410 pv e1e7',  // deepest
      'bestmove e1e7',
    ];

    const parsed = parseMainSearch(lines, 'w');
    expect(parsed.searchedEval).toBeCloseTo(4.10, 2);
    expect(parsed.finalDepth).toBe(25);
  });

  it('accepts info lines without explicit `multipv` field (single-PV mode)', () => {
    // Some engines omit `multipv` entirely in single-PV mode. Parser
    // treats these as PV1.
    const lines = [
      'info depth 20 score cp 100 nodes 1000 pv e2e4',
      'info depth 25 score cp 150 hashfull 500 pv e2e4',
      'bestmove e2e4',
    ];

    const parsed = parseMainSearch(lines, 'w');
    expect(parsed.searchedEval).toBeCloseTo(1.50, 2);
    expect(parsed.finalDepth).toBe(25);
    expect(parsed.finalHashfull).toBe(500);
  });

  it('rejects lines with multipv > 1 (defensive — we expect MultiPV=1 only)', () => {
    const lines = [
      'info depth 20 multipv 1 score cp 100 pv e2e4',
      'info depth 20 multipv 2 score cp 80 pv d2d4',
      'info depth 20 multipv 3 score cp 50 pv c2c4',
      'bestmove e2e4',
    ];

    const parsed = parseMainSearch(lines, 'w');
    // Only the multipv=1 line should contribute to the eval
    expect(parsed.searchedEval).toBeCloseTo(1.00, 2);
  });

  it('returns zero eval and depth=0 when no score line is present', () => {
    const lines = [
      'info string some unrelated info',
      'bestmove (none)',
    ];

    const parsed = parseMainSearch(lines, 'w');
    expect(parsed.searchedEval).toBe(0);
    expect(parsed.isMate).toBe(false);
    expect(parsed.mateIn).toBeNull();
    expect(parsed.finalDepth).toBe(0);
  });

  it('records the maximum depth seen across all info lines', () => {
    // Engine output isn't always monotonic on `depth` — seldepth
    // changes can cause it to report the same depth multiple times
    // with progress. We always keep the MAX.
    const lines = [
      'info depth 10 multipv 1 score cp 50 pv e2e4',
      'info depth 15 multipv 1 score cp 60 pv e2e4',
      'info depth 12 multipv 1 score cp 55 pv e2e4',  // regressed — ignore for maxDepth
      'info depth 20 multipv 1 score cp 80 pv e2e4',
      'bestmove e2e4',
    ];

    const parsed = parseMainSearch(lines, 'w');
    expect(parsed.finalDepth).toBe(20);
  });

  it('parses the #203 Kasparov-Topalov prod bench output (anchor regression test)', () => {
    // Minimized version of what SF 18 lite-single outputs on Kasparov-
    // Topalov #203 at Hash=32 MB / MultiPV=1 / movetime=6000. The
    // SEARCH_QUALITY_PLAN §11.1 bench measured +4.10 @ depth 25;
    // bench-sf18-validation.ts anchors this exact position.
    const lines = [
      'info depth 1 multipv 1 score cp 50 nodes 100 time 1 pv e1e7',
      'info depth 15 multipv 1 score cp 221 hashfull 100 nodes 100000 pv e1e7 a7b8',
      'info depth 20 multipv 1 score cp 180 hashfull 350 nodes 700000 pv e1e7',
      'info depth 25 multipv 1 score cp 410 hashfull 827 nodes 4500000 time 6000 pv e1e7 a7b8 d1d8',
      'bestmove e1e7 ponder a7b8',
    ];

    const parsed = parseMainSearch(lines, 'w');

    // Anchor: must be ≥ +3.5 (decisive) with depth ≥ 20
    expect(parsed.searchedEval).toBeGreaterThanOrEqual(3.5);
    expect(parsed.finalDepth).toBeGreaterThanOrEqual(20);
    expect(parsed.isMate).toBe(false);
  });
});

/** A fake engine: answers isready and go, and records what it was told. */
function recordingTransport(): { transport: SearchTransport; sent: string[] } {
  const sent: string[] = [];
  const listeners = new Set<(l: string) => void>();
  const emit = (l: string) => setTimeout(() => listeners.forEach(fn => fn(l)), 0);
  const transport: SearchTransport = {
    send(cmd) {
      sent.push(cmd);
      if (cmd === 'isready') emit('readyok');
      if (cmd.startsWith('go ')) { emit('info depth 1 score cp 10 pv e2e4'); emit('bestmove e2e4'); }
    },
    onLine(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    dispose() {},
  };
  return { transport, sent };
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('runMainSearch budget (D-9)', () => {
  it('a bake searches a fixed number of nodes, after clearing the hash', async () => {
    const { transport, sent } = recordingTransport();
    await runMainSearch(START, transport, undefined, BAKE_SEARCH_BUDGET);
    expect(sent).toContain(`go nodes ${BAKE_SEARCH_BUDGET.nodes}`);
    expect(sent.some(c => c.startsWith('go movetime'))).toBe(false);
    expect(sent.indexOf('ucinewgame')).toBeLessThan(sent.indexOf(`go nodes ${BAKE_SEARCH_BUDGET.nodes}`));
  });

  it('the browser, with no budget, keeps the time limit', async () => {
    const { transport, sent } = recordingTransport();
    await runMainSearch(START, transport);
    expect(sent.some(c => c.startsWith('go movetime'))).toBe(true);
    expect(sent.some(c => c.startsWith('go nodes'))).toBe(false);
  });
});
