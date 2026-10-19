/**
 * CommentarySearchProtocol — the single source of truth for the UCI
 * commands, timing, and output parsing used by the "Explain Position"
 * commentary flow.
 *
 * Two consumers drive this module:
 *   - src/services/AnalysisService.getCommentarySearchData (browser)
 *   - backend/scripts/test-v4-sections.ts (Node test harness, Phase 5)
 *
 * Both reach the production server at POST /api/explain-position/v4
 * with exactly the same shape of search payload because they run this
 * exact same function.
 *
 * Settings are hardcoded, not configurable. They were validated in
 * SEARCH_QUALITY_PLAN.md §11.1 against the SF 18 lite-single engine
 * (+4.10 on Kasparov-Topalov #203 at depth 25 / 6s budget) and further
 * confirmed by backend/scripts/bench-sf18-validation.ts (all 10
 * canonical positions pass engine-reliability gate, anchor +4.10).
 * Changing them requires a new bench + PIPELINE_VERSION bump.
 */

import type { SearchTransport } from './SearchTransport';

// ─────────────────────────────────────────────────────────────────────────
// Prod-validated constants (SEARCH_QUALITY_PLAN §11.1)
// ─────────────────────────────────────────────────────────────────────────

/** Transposition-table size in MB for the deep commentary search. */
export const COMMENTARY_HASH_MB = 32;

/** MultiPV for the main search. Must be 1 — splitting the budget
 *  across multiple lines was the blocker fixed in SEARCH_QUALITY_PLAN. */
export const COMMENTARY_MULTIPV = 1;

/** Time budget in ms for `go movetime` on the main search. */
export const COMMENTARY_MOVETIME_MS = 6000;

/** Safety slack on top of movetime before the wait times out. */
const COMMENTARY_MOVETIME_SLACK_MS = 4000;

/**
 * A search bounded by nodes instead of time, for offline bakes (D-9).
 *
 * `go movetime` stops after a fixed TIME, so how deep it reaches depends on how busy the machine
 * is. Measured 2026-10-19 on the Capablanca-Tartakower demo: idle, depth 28 and +2.13; with every
 * core busy, depth 27 and +2.28, and the explanation's headline changed with it. A bake must give
 * the same answer twice, so it searches a fixed number of NODES: single-threaded, with the hash
 * cleared by `ucinewgame` before each search, that is the same search on any machine at any load.
 * The browser keeps `movetime`, because a visitor waits on wall-clock time, not on nodes.
 */
export interface SearchBudget {
  nodes: number;
}

/** About what 6s reaches on the bake machine when idle (7.5M-9.2M measured on six demos). */
export const BAKE_SEARCH_BUDGET: SearchBudget = { nodes: 8_000_000 };

/** A node budget's wait is generous on purpose: it must never cut a search short on a busy box. */
const NODES_PER_MS_FLOOR = 100;

/** MultiPV for the null-move search (opponent's top threats). */
const NULLMOVE_MULTIPV = 3;

/** Fixed-depth budget for the null-move search. */
const NULLMOVE_DEPTH = 8;

/** Safety timeout on the null-move search. */
const NULLMOVE_TIMEOUT_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────
// Output shape
// ─────────────────────────────────────────────────────────────────────────

export interface CommentarySearchData {
  /** Concatenated raw UCI output from the main search, used by the
   *  backend pipeline (ThreatDetector, extractPvMoves, etc.). */
  searchOutput: string;
  /** [PV1] — MultiPV=1 means we only have one PV. Kept as an array for
   *  compatibility with the backend CommentaryV4Request shape. */
  pvScores: number[];
  /** Best line's eval in pawns, White-POV. */
  searchedEval: number;
  /** True if the engine found forced mate on the best line. */
  isMate: boolean;
  /** Moves to mate (White-POV: positive = white mates, negative = black). */
  mateIn: number | null;
  /** Raw UCI output from the null-move search (side swapped, EP cleared). */
  nullMoveSearchOutput: string;
  /** Telemetry for logging / diagnostics. */
  meta: {
    finalDepth: number;
    finalHashfull: number;
    wallMs: number;
    hashMb: number;
    movetimeMs: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Private helpers — async primitives on top of the transport
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send a command and collect output lines until `predicate` matches one
 * of them. Returns the array of collected lines (including the match).
 */
function waitForLine(
  transport: SearchTransport,
  predicate: (line: string) => boolean,
  timeoutMs: number,
  label: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout after ${timeoutMs}ms waiting for ${label}`));
    }, timeoutMs);

    const unsubscribe = transport.onLine((line) => {
      lines.push(line);
      if (predicate(line)) {
        clearTimeout(timer);
        unsubscribe();
        resolve(lines);
      }
    });
  });
}

/** Send `isready` and wait for `readyok` if it arrives. Used after
 *  `ucinewgame` so the engine has finished clearing its internal tables
 *  before we send the next position.
 *
 *  Tolerant: the browser SF lite-single build does not reliably respond
 *  to isready (see AnalysisService line ~242 comment). UCI treats
 *  `ucinewgame` as a synchronous hint, so missing `readyok` is benign
 *  — we just continue. Throwing here would bubble up to
 *  getCommentarySearchData → null → "Analysis engine is still warming
 *  up" UX error on every Explain Position click. */
async function waitForReadyOk(transport: SearchTransport): Promise<void> {
  try {
    const promise = waitForLine(
      transport,
      (l) => l.trim() === 'readyok',
      500, // short — readyok is fast on engines that respond
      'readyok',
    );
    transport.send('isready');
    await promise;
  } catch {
    // Engine didn't respond to isready within the window — fine,
    // ucinewgame is synchronous enough that the next command works.
  }
}

/** Side-swap a FEN and clear the en-passant square.
 *  Used by the null-move search to see what the opponent would threaten
 *  if given a free move. Pure string manipulation — no chess library
 *  dependency required. */
function swapSideToMove(fen: string): string {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  if (parts.length >= 4) parts[3] = '-';
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────────────────

interface ParsedPv {
  searchedEval: number;
  isMate: boolean;
  mateIn: number | null;
  finalDepth: number;
  finalHashfull: number;
}

/**
 * Parse the PV1 eval, mate info, depth, and hashfull from a MultiPV=1
 * main search's UCI output. The last `info ... multipv 1 ... score ...`
 * line (or any score line if `multipv` was omitted, which some single-PV
 * engine modes do) is treated as the authoritative PV1 result.
 *
 * Scores are normalised from side-to-move POV to White POV:
 *   cp score is negated when black is to move
 *   mate score is likewise flipped
 * Mate scores are clamped to ±100 pawns for the numeric `searchedEval`.
 */
export function parseMainSearch(lines: string[], sideToMove: 'w' | 'b'): ParsedPv {
  const flip = sideToMove === 'b' ? -1 : 1;
  let latestCp: number | null = null;
  let latestMate: number | null = null;
  let finalDepth = 0;
  let finalHashfull = 0;

  for (const line of lines) {
    if (!line.startsWith('info') || !line.includes('score')) continue;

    // MultiPV=1 case: lines may carry `multipv 1` explicitly, or may
    // omit `multipv` entirely. Accept either; reject multipv > 1 (would
    // indicate stray output from a multi-PV config we don't expect).
    const pvMatch = line.match(/multipv\s+(\d+)/);
    if (pvMatch && parseInt(pvMatch[1], 10) !== 1) continue;

    const depthMatch = line.match(/depth\s+(\d+)/);
    if (depthMatch) finalDepth = Math.max(finalDepth, parseInt(depthMatch[1], 10));

    const hfMatch = line.match(/hashfull\s+(\d+)/);
    if (hfMatch) finalHashfull = parseInt(hfMatch[1], 10);

    const cpMatch = line.match(/score cp (-?\d+)/);
    const mateMatch = line.match(/score mate (-?\d+)/);
    if (cpMatch) {
      latestCp = parseInt(cpMatch[1], 10);
      latestMate = null;
    } else if (mateMatch) {
      latestMate = parseInt(mateMatch[1], 10);
      latestCp = null;
    }
  }

  let searchedEval = 0;
  let isMate = false;
  let mateIn: number | null = null;
  if (latestMate !== null) {
    const m = latestMate * flip;
    searchedEval = m > 0 ? 100 : -100;
    isMate = true;
    mateIn = m;
  } else if (latestCp !== null) {
    searchedEval = (latestCp / 100) * flip;
  }

  return { searchedEval, isMate, mateIn, finalDepth, finalHashfull };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase-level operations
// ─────────────────────────────────────────────────────────────────────────

/**
 * Main commentary search: deep single-PV analysis. Drives the transport
 * through the UCI sequence that matches prod (SEARCH_QUALITY_PLAN §11.1):
 *
 *   setoption name Hash value 32
 *   setoption name MultiPV value 1
 *   position fen <fen>
 *   go movetime 6000
 *
 * Returns the raw output, the parsed PV1 result, and wall time.
 */
export async function runMainSearch(
  fen: string,
  transport: SearchTransport,
  onDepth?: (depth: number) => void,
  budget?: SearchBudget,
): Promise<{ lines: string[]; parsed: ParsedPv; wallMs: number }> {
  const sideToMove = (fen.split(' ')[1] as 'w' | 'b') ?? 'w';
  const t0 = Date.now();

  // ucinewgame + isready before each search: tells the engine that
  // the next position is unrelated to the previous one, so it clears
  // hash + killer + history tables. Without this, repeated searches
  // in the same engine instance accumulate stale state and return
  // different evals/PVs for the same FEN depending on what was
  // searched before. UCI spec §"ucinewgame".
  transport.send('ucinewgame');
  await waitForReadyOk(transport);
  transport.send(`setoption name Hash value ${COMMENTARY_HASH_MB}`);
  transport.send(`setoption name MultiPV value ${COMMENTARY_MULTIPV}`);
  transport.send(`position fen ${fen}`);

  // Optional live-depth progress: tap the info stream and report each new
  // max depth as the search climbs. Drives the /explain "Stockfish
  // thinking — depth N" loading UX. Kept separate from the bestmove
  // waiter so it never interferes with the search result itself.
  let unsubscribeDepth: (() => void) | undefined;
  if (onDepth) {
    let maxDepth = 0;
    unsubscribeDepth = transport.onLine((l) => {
      const m = l.match(/^info .*\bdepth\s+(\d+)/);
      if (!m) return;
      const d = parseInt(m[1], 10);
      if (d > maxDepth) {
        maxDepth = d;
        onDepth(d);
      }
    });
  }

  // Install the bestmove listener BEFORE `go` is sent so we don't miss the
  // first info lines. waitForLine subscribes synchronously as soon as the
  // promise is constructed; the send() below runs after that.
  const waitPromise = waitForLine(
    transport,
    (l) => l.startsWith('bestmove'),
    budget
      ? Math.ceil(budget.nodes / NODES_PER_MS_FLOOR) + COMMENTARY_MOVETIME_SLACK_MS
      : COMMENTARY_MOVETIME_MS + COMMENTARY_MOVETIME_SLACK_MS,
    'bestmove (main search)',
  );
  transport.send(budget ? `go nodes ${budget.nodes}` : `go movetime ${COMMENTARY_MOVETIME_MS}`);
  let lines: string[];
  try {
    lines = await waitPromise;
  } finally {
    unsubscribeDepth?.();
  }

  const parsed = parseMainSearch(lines, sideToMove);
  const wallMs = Date.now() - t0;

  return { lines, parsed, wallMs };
}

/**
 * Null-move search: what does the opponent threaten if given a free move?
 * Swaps side-to-move in the FEN, clears en passant (else illegal), runs
 * MultiPV=3 at shallow depth. Output is raw UCI for the backend
 * ThreatDetector to parse via parseQuickSearch.
 */
export async function runNullMoveSearch(
  fen: string,
  transport: SearchTransport,
): Promise<string> {
  const nullMoveFen = swapSideToMove(fen);

  transport.send('ucinewgame');
  await waitForReadyOk(transport);
  transport.send(`setoption name MultiPV value ${NULLMOVE_MULTIPV}`);
  transport.send(`position fen ${nullMoveFen}`);

  // Same ordering rule as runMainSearch: subscribe before `go`.
  const waitPromise = waitForLine(
    transport,
    (l) => l.startsWith('bestmove'),
    NULLMOVE_TIMEOUT_MS,
    'bestmove (null-move search)',
  );
  transport.send(`go depth ${NULLMOVE_DEPTH}`);
  const lines = await waitPromise;

  return lines.join('\n');
}

/**
 * Full commentary search: main pass + null-move pass. Returns the exact
 * payload the production /api/explain-position/v4 endpoint consumes.
 *
 * The caller owns any panel draining or engine-state preservation that
 * needs to happen around this call — this function assumes it has
 * exclusive use of the engine for the duration.
 */
export async function getCommentarySearchData(
  fen: string,
  transport: SearchTransport,
  onDepth?: (depth: number) => void,
  budget?: SearchBudget,
): Promise<CommentarySearchData> {
  const main = await runMainSearch(fen, transport, onDepth, budget);
  const searchOutput = main.lines.join('\n');

  const nullMoveSearchOutput = await runNullMoveSearch(fen, transport);

  // MultiPV=1 produces a single PV. If the engine reported no eval at
  // all (shouldn't happen on prod settings), pvScores is empty rather
  // than containing a misleading zero.
  const hasEval = Number.isFinite(main.parsed.searchedEval)
    && (main.parsed.searchedEval !== 0 || main.parsed.isMate || main.lines.some((l) => /score\s+(cp|mate)/.test(l)));
  const pvScores = hasEval ? [main.parsed.searchedEval] : [];

  return {
    searchOutput,
    pvScores,
    searchedEval: main.parsed.searchedEval,
    isMate: main.parsed.isMate,
    mateIn: main.parsed.mateIn,
    nullMoveSearchOutput,
    meta: {
      finalDepth: main.parsed.finalDepth,
      finalHashfull: main.parsed.finalHashfull,
      wallMs: main.wallMs,
      hashMb: COMMENTARY_HASH_MB,
      movetimeMs: COMMENTARY_MOVETIME_MS,
    },
  };
}
