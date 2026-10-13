/**
 * GameAnalysisService — Client-side computation of game quality metrics.
 *
 * Takes the raw eval array from the backend batch analysis and computes:
 * - Win percentages (Lichess formula)
 * - Move classifications (dual thresholds)
 * - Brilliant move detection
 * - Per-move accuracy (Lichess formula)
 * - Game accuracy per player
 * - Phase detection (dynamic boundaries)
 * - Game rating (composite score with bonuses)
 *
 * All formulas from chess-accuracy-analyzer (validated within 0.3% of Lichess).
 */

import { Chess, type Square } from 'chess.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type MoveClassification =
  | 'brilliant' | 'best' | 'excellent' | 'good'
  | 'inaccuracy' | 'mistake' | 'blunder' | 'severe_blunder' | 'book';

export interface ClassifiedMove {
  moveIndex: number;        // 0-based half-move index
  moveUci: string;          // the UCI move played
  classification: MoveClassification;
  cpLoss: number;           // centipawn loss (0 = best)
  winPercentLoss: number;   // win probability loss (0-100)
  evalBefore: number;       // cp before the move
  evalAfter: number;        // cp after the move
  bestMove: string;         // engine's recommended move
  isBestMove: boolean;      // player played the engine's top choice
}

export interface PlayerAccuracy {
  white: number;  // 0-100
  black: number;  // 0-100
}

export interface MoveClassificationCounts {
  brilliant: number;
  best: number;
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
  severe_blunder: number;
  book: number;
}

export interface PhaseRanges {
  opening: [number, number] | null;     // [startHalfMove, endHalfMove] inclusive
  middlegame: [number, number] | null;
  endgame: [number, number] | null;
}

export interface GameRating {
  overall: number;
  opening: number;
  middlegame: number;
  endgame: number;
  label: string;
  phaseBonus: number;
  resultBonus: number;
}

export interface FullGameAnalysis {
  classifiedMoves: ClassifiedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: MoveClassificationCounts;
  blackCounts: MoveClassificationCounts;
  phases: PhaseRanges;
  gameRating: GameRating;
  evalGraph: number[];  // cp values per half-move for plotting
}

/** LC0 policy data per position (from backend /api/analyze-game response) */
export interface PolicyEntry {
  topMoves: Array<{ move: string; policy: number }>;
  wdl: { win: number; draw: number; loss: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Lichess win percentage sigmoid multiplier */
const WIN_PCT_MULTIPLIER = -0.00368208;

/** Lichess accuracy formula constants */
const ACC_A = 103.1668100711649;
const ACC_B = -0.04354415386753951;
const ACC_C = -3.166924740191411;

/** Move classification thresholds — dual: CP loss AND win% loss */
const THRESHOLDS = {
  excellent:      { cp: 15,  winPct: 2 },
  inaccuracy:     { cp: 50,  winPct: 7 },
  mistake:        { cp: 150, winPct: 18 },
  blunder:        { cp: 350, winPct: 35 },
};

/** Escalation: if BOTH cp and win% exceed these, bump severity up */
const ESCALATION = { cp: 150, winPct: 25 };

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute full game analysis from the backend's eval array.
 *
 * @param evals     - Array of centipawn evals (White's perspective), one per position (N+1 for N moves)
 * @param bestMoves - Best move in UCI for each position
 * @param mateIn    - Mate-in-N or null for each position
 * @param moves     - UCI moves played in the game
 * @param result    - Game result: 'white' | 'black' | 'draw'
 */
export function analyzeFullGame(
  evals: number[],
  bestMoves: string[],
  mateIn: (number | null)[],
  moves: string[],
  result: 'white' | 'black' | 'draw',
  policyData?: PolicyEntry[] | null,
): FullGameAnalysis {
  // 1. Classify each move
  const classifiedMoves = classifyAllMoves(evals, bestMoves, moves);

  // 2. Brilliant move detection — two independent paths:
  //    (a) policy-based (LC0 underweighted the move), needs LC0 data
  //    (b) sacrifice-based (Chess.com primary criterion), works without LC0
  // Order matters only for tie-break: policy path runs first; sacrifice
  // path skips moves already flagged.
  if (policyData) {
    detectBrilliantMovesFromPolicy(classifiedMoves, moves, policyData);
  }
  detectSacrificeBrilliancies(classifiedMoves, moves);

  // 3. Compute accuracy per player (exact port from chess-accuracy-analyzer)
  const { white: whiteAccuracy, black: blackAccuracy } = computeBothAccuracies(evals);

  // 4. Count classifications per player (after brilliant detection so counts are correct)
  const whiteCounts = countClassifications(classifiedMoves, 'white');
  const blackCounts = countClassifications(classifiedMoves, 'black');

  // 5. Detect phases
  const phases = detectPhases(moves, evals);

  // 6. Compute game rating
  const gameRating = computeGameRating(
    classifiedMoves, phases, result, whiteAccuracy, blackAccuracy, whiteCounts, blackCounts,
  );

  return {
    classifiedMoves,
    whiteAccuracy,
    blackAccuracy,
    whiteCounts,
    blackCounts,
    phases,
    gameRating,
    evalGraph: evals,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Win percentage conversion
// ═══════════════════════════════════════════════════════════════════════════

/** Convert centipawns to win percentage (0-100) using Lichess sigmoid */
export function cpToWinPercent(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(WIN_PCT_MULTIPLIER * clamped)) - 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-move accuracy
// ═══════════════════════════════════════════════════════════════════════════

/** Compute accuracy for a single move using Lichess formula */
function moveAccuracy(winPercentBefore: number, winPercentAfter: number): number {
  const winDiff = Math.max(0, winPercentBefore - winPercentAfter);
  if (winDiff === 0) return 100;
  const accuracy = ACC_A * Math.exp(ACC_B * winDiff) + ACC_C + 1;
  return Math.max(0, Math.min(100, accuracy));
}

// ═══════════════════════════════════════════════════════════════════════════
// Move classification
// ═══════════════════════════════════════════════════════════════════════════

function classifyAllMoves(
  evals: number[], bestMoves: string[], moves: string[],
): ClassifiedMove[] {
  const classified: ClassifiedMove[] = [];

  for (let i = 0; i < moves.length; i++) {
    const isWhiteMove = i % 2 === 0;
    const evalBefore = evals[i];
    const evalAfter = evals[i + 1];
    const bestMove = bestMoves[i];
    const playedMove = moves[i];
    const isBestMove = playedMove === bestMove;

    // CP loss from the moving side's perspective
    const cpLoss = isWhiteMove
      ? Math.max(0, evalBefore - evalAfter)
      : Math.max(0, evalAfter - evalBefore);

    // Win% loss from the moving side's perspective
    const winBefore = isWhiteMove ? cpToWinPercent(evalBefore) : 100 - cpToWinPercent(evalBefore);
    const winAfter = isWhiteMove ? cpToWinPercent(evalAfter) : 100 - cpToWinPercent(evalAfter);
    const winPercentLoss = Math.max(0, winBefore - winAfter);

    let classification = classifySingleMove(cpLoss, winPercentLoss, isBestMove);

    // Override with "best" if player played the engine's top move and it's classified as good/excellent
    if (isBestMove && (classification === 'good' || classification === 'excellent')) {
      classification = 'best';
    }

    classified.push({
      moveIndex: i,
      moveUci: playedMove,
      classification,
      cpLoss,
      winPercentLoss,
      evalBefore,
      evalAfter,
      bestMove,
      isBestMove,
    });
  }

  return classified;
}

function classifySingleMove(
  cpLoss: number, winPctLoss: number, isBestMove: boolean,
): MoveClassification {
  if (isBestMove) return 'best';

  // Check from worst to best
  if (cpLoss >= THRESHOLDS.blunder.cp || winPctLoss >= THRESHOLDS.blunder.winPct) {
    // Escalation check for severe blunder
    if (cpLoss >= THRESHOLDS.blunder.cp && winPctLoss >= THRESHOLDS.blunder.winPct) {
      return 'severe_blunder';
    }
    return 'blunder';
  }

  if (cpLoss >= THRESHOLDS.mistake.cp || winPctLoss >= THRESHOLDS.mistake.winPct) {
    // Escalation: both thresholds exceeded → bump to blunder
    if (cpLoss >= ESCALATION.cp && winPctLoss >= ESCALATION.winPct) {
      return 'blunder';
    }
    return 'mistake';
  }

  if (cpLoss >= THRESHOLDS.inaccuracy.cp || winPctLoss >= THRESHOLDS.inaccuracy.winPct) {
    return 'inaccuracy';
  }

  if (cpLoss >= THRESHOLDS.excellent.cp || winPctLoss >= THRESHOLDS.excellent.winPct) {
    return 'good';
  }

  return 'excellent';
}

// ═══════════════════════════════════════════════════════════════════════════
// Brilliant move detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sacrifice-based brilliant move detection (Chess.com primary criterion).
 *
 * A move is sacrifice-brilliant when:
 *   1. It's the best or near-best move (cpLoss <= 20) — SF endorses it
 *   2. The position was not already winning (|eval| < 500)
 *   3. The move loses material on this turn:
 *      a) capture where attacker piece is more valuable than captured, OR
 *      b) non-capture that puts the moving piece on a square attacked by
 *         opponent (i.e. allows recapture for free)
 *   4. The post-move eval is at least as good as the pre-move eval
 *      (sacrifice didn't blow the position)
 *
 * This catches the classic Tal/Kasparov-style brilliancies that the policy
 * path may miss when the engine's policy network learned to "expect" the
 * sacrifice from training data (e.g. famous textbook sacs).
 *
 * Relies on chess.js for FEN navigation + attack detection. Reuses the
 * same imports already used elsewhere in the frontend.
 */
/** Material value per piece type (king intentionally high — it never gets
 *  captured, but a king recapture must be counted as the cheapest defender). */
const SEE_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 };

/**
 * Static Exchange Evaluation on a single square.
 *
 * Returns the material the side-to-move can win by resolving the capture
 * sequence on `target`, assuming both sides always recapture with their
 * least-valuable attacker and each side stops as soon as continuing is
 * unfavourable (the `Math.max(0, …)` stand-pat option).
 *
 * Implemented by mutating the live chess.js board with real legal moves, so
 * x-ray/battery attackers, pins, and check constraints are all handled for
 * free (an illegal recapture simply isn't in `moves()`), and the board is
 * left exactly as it was found (every move is undone).
 */
function seeGain(board: Chess, target: Square): number {
  const captures = board
    .moves({ verbose: true })
    .filter((m) => m.to === target && m.captured);
  if (captures.length === 0) return 0;

  // Least-valuable attacker first.
  captures.sort((a, b) => (SEE_PIECE_VALUE[a.piece] ?? 0) - (SEE_PIECE_VALUE[b.piece] ?? 0));
  const chosen = captures[0];
  const capturedValue = SEE_PIECE_VALUE[chosen.captured ?? 'p'] ?? 0;

  board.move({ from: chosen.from, to: chosen.to, promotion: chosen.promotion });
  const gain = Math.max(0, capturedValue - seeGain(board, target));
  board.undo();
  return gain;
}

function detectSacrificeBrilliancies(
  classifiedMoves: ClassifiedMove[],
  moves: string[],
): void {

  // Walk the game forward, replaying each move on a chess.js board, and
  // for each move check the sacrifice gates.
  const board = new Chess();
  for (let i = 0; i < moves.length; i++) {
    const move = classifiedMoves[i];
    const uci = moves[i];
    if (!move || !uci) continue;
    const from = uci.slice(0, 2) as Square;
    const to = uci.slice(2, 4) as Square;
    const promotion = uci.length > 4 ? uci.slice(4) : undefined;

    // Pre-move state
    const movingPiece = board.get(from);
    const targetPiece = board.get(to);

    // Apply the move so we can probe post-move attacks.
    let applied: unknown;
    try {
      applied = board.move(promotion ? { from, to, promotion } : { from, to });
    } catch {
      applied = null;
    }
    if (!applied) {
      // Move couldn't be applied — desync; bail out of this game's sacrifice detection
      // (rare: usually means the moves list and the analyzed game don't match).
      return;
    }

    // Cheap exits — same as the policy path, share the same primary gates
    if (move.cpLoss > 20) continue;
    if (Math.abs(move.evalBefore) > 500) continue;
    if (move.classification === 'brilliant') continue;  // already flagged via policy

    // Skip openings — early sacrifices are gambit theory, not brilliant
    if (i < 10) continue;

    if (!movingPiece) continue;

    // A move is a sacrifice only if it genuinely gives up material — decided
    // by resolving the capture sequence on the destination square, NOT by the
    // crude "an enemy attacks that square" test that flagged fully-defended
    // moves like a3 (Bxa3? Rxa3 just loses the bishop for a pawn → net 0).
    //
    //   netMaterial = (what this move captured) − (what the opponent can now
    //                  win back on that square by SEE)
    //
    // The board is already in the post-move state here, opponent to move, so
    // seeGain(board, to) is exactly the material the opponent can claim.
    const capturedValue = targetPiece ? (SEE_PIECE_VALUE[targetPiece.type] ?? 0) : 0;
    const netMaterial = capturedValue - seeGain(board, to);

    // Not a sacrifice if the mover comes out even or ahead on the square.
    // Real material must be surrendered (netMaterial < 0, i.e. ≥ a pawn).
    if (netMaterial >= 0) continue;

    move.classification = 'brilliant';
  }
}

/**
 * Policy-based brilliant move detection using LC0 neural network data.
 *
 * A move is brilliant when:
 *   1. It's the best or near-best move (cpLoss <= 20)
 *   2. LC0's neural network gave it LOW probability (< 5%) — meaning the NN
 *      didn't "expect" this move, but deep search proves it's strongest
 *   3. The player was NOT already completely winning (|eval| < 500)
 *   4. It's not in the opening (first 10 half-moves) — low policy is normal
 *      when many reasonable moves exist
 *   5. The move is not in the top 3 policy moves — must be truly unexpected
 *
 * This catches non-sacrifice brilliancies (quiet moves that are hard to find)
 * which the old heuristic (sacrifice-only) missed entirely.
 *
 * Calibration (Phase B of LC0_FACTS_INTEGRATION_PLAN, 2026-05-07):
 * Empirical sweep against cached games showed the previous threshold of
 * `< 2%` filtered out ALL real brilliancies (e.g. d8a8 at 4.21% policy was
 * a clear "NN didn't see it" candidate but failed the 2% gate). Threshold
 * raised to `< 5%`; rank exclusion relaxed from top-5 to top-3 to align
 * with empirical hit rate (~0.5–1 brilliancy per championship game).
 *
 * @param policyData - LC0 policy per position (index i = position BEFORE move i)
 */
function detectBrilliantMovesFromPolicy(
  classifiedMoves: ClassifiedMove[],
  moves: string[],
  policyData: PolicyEntry[],
): void {
  // Phase B threshold (2026-05-07): 5% raised from 2% based on empirical sweep
  // (scripts/sweep-brilliant-thresholds.ts). Real brilliancies in our cache
  // sit in the 4–6% policy band; 2% was unreachable.
  const POLICY_THRESHOLD = 5;
  // Top-3 (was top-5): a move ranked 4th or 5th in policy is already
  // off the obvious radar; the rank-5 cutoff was filtering out real
  // candidates without adding signal.
  const TOP_N_EXCLUSION = 3;
  // Concentration ratio kept (NN must have had clear preferences).
  const CONCENTRATION_RATIO = 3;

  for (const move of classifiedMoves) {
    // Must be best or near-best (SF confirms it's a strong move)
    if (move.cpLoss > 20) continue;

    // Not already winning — brilliant in a won position is less impressive
    if (Math.abs(move.evalBefore) > 500) continue;

    // Look up policy for the played move in the position BEFORE this move
    const posPolicy = policyData[move.moveIndex];
    if (!posPolicy || !posPolicy.topMoves || posPolicy.topMoves.length < 3) continue;

    const playedMove = moves[move.moveIndex];
    const policyEntry = posPolicy.topMoves.find(m => m.move === playedMove);

    // Must have known policy — if not found in data, we can't determine brilliance
    if (!policyEntry) continue;
    const policyProb = policyEntry.policy;

    // Must not be in the top-N expected moves — truly unexpected
    const topNMoves = posPolicy.topMoves.slice(0, TOP_N_EXCLUSION).map(m => m.move);
    if (topNMoves.includes(playedMove)) continue;

    // The NN must have had clear preferences — top move at least 3x higher
    // than the played move. In spread positions (opening), this ratio is low
    // and the move won't qualify. In focused positions, it's high.
    const topPolicy = posPolicy.topMoves[0]?.policy ?? 0;
    if (topPolicy < policyProb * CONCENTRATION_RATIO) continue;

    // Very low policy = NN didn't expect this move = hard to find = brilliant
    if (policyProb < POLICY_THRESHOLD) {
      move.classification = 'brilliant';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Player accuracy — exact port of calculate_lichess_game_accuracy
// from chess-accuracy-analyzer/src/chess_accuracy/lichess_accuracy.py
// ═══════════════════════════════════════════════════════════════════════════

/** Standard deviation of an array */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (values.length - 1));
}

/** Volatility = clamped stdev of win percentages in a window */
const MIN_VOLATILITY = 0.5;
const MAX_VOLATILITY = 12.0;

function calculateVolatility(winPercents: number[]): number {
  if (winPercents.length < 2) return MIN_VOLATILITY;
  const vol = stdev(winPercents);
  return Math.max(MIN_VOLATILITY, Math.min(MAX_VOLATILITY, vol));
}

/**
 * Calculate game accuracy for both players from eval array.
 * Exact port of calculate_lichess_game_accuracy from the chess-accuracy-analyzer.
 *
 * Uses: volatility-weighted mean + harmonic mean, sliding window volatility,
 * argument reversal for Black, initial window padding.
 */
function computeBothAccuracies(evals: number[]): { white: number; black: number } {
  if (evals.length < 2) return { white: 0, black: 0 };

  // Convert all evals to win percentages (from White's perspective)
  const winPercents = evals.map(cp => cpToWinPercent(cp));

  const numMoves = evals.length - 1; // number of half-moves
  const windowSize = Math.max(2, Math.min(8, Math.floor(numMoves / 10)));

  // Calculate volatility for sliding windows with padding
  const windows: number[] = [];

  if (winPercents.length >= windowSize) {
    const initialWindow = winPercents.slice(0, windowSize);
    const initialVolatility = calculateVolatility(initialWindow);
    const paddingCount = Math.min(windowSize - 2, winPercents.length - windowSize);
    for (let i = 0; i < paddingCount; i++) {
      windows.push(initialVolatility);
    }
  }

  for (let i = 0; i <= winPercents.length - windowSize; i++) {
    const window = winPercents.slice(i, i + windowSize);
    windows.push(calculateVolatility(window));
  }

  // Calculate move accuracies with volatility weights
  const whiteWeighted: Array<[number, number]> = []; // [accuracy, weight]
  const blackWeighted: Array<[number, number]> = [];

  for (let i = 0; i < winPercents.length - 1; i++) {
    const prevWp = winPercents[i];
    const nextWp = winPercents[i + 1];
    const weight = i < windows.length ? windows[i] : 1.0;
    const isWhiteMove = i % 2 === 0;

    if (isWhiteMove) {
      // White: fromWinPercents(prev, next)
      const acc = moveAccuracy(prevWp, nextWp);
      whiteWeighted.push([acc, weight]);
    } else {
      // Black: fromWinPercents(next, prev) — REVERSED
      const acc = moveAccuracy(nextWp, prevWp);
      blackWeighted.push([acc, weight]);
    }
  }

  // Final accuracy: average of volatility-weighted mean and harmonic mean
  function colorAccuracy(weighted: Array<[number, number]>): number {
    if (weighted.length === 0) return 0;

    // Weighted mean
    const totalWeight = weighted.reduce((s, [, w]) => s + w, 0);
    if (totalWeight === 0) return 0;
    const wmean = weighted.reduce((s, [a, w]) => s + a * w, 0) / totalWeight;

    // Harmonic mean
    const accs = weighted.map(([a]) => a);
    const nonZero = accs.filter(a => a > 0);
    if (nonZero.length === 0) return 0;
    const hmean = nonZero.length / nonZero.reduce((s, a) => s + 1 / a, 0);

    return (wmean + hmean) / 2;
  }

  return {
    white: colorAccuracy(whiteWeighted),
    black: colorAccuracy(blackWeighted),
  };
}

/** Wrapper for backward compatibility */
function computePlayerAccuracy(
  _classifiedMoves: ClassifiedMove[], _side: 'white' | 'black',
  evals?: number[],
): number {
  // This is now computed via computeBothAccuracies in analyzeFullGame
  // Fallback if called directly without evals
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Classification counts
// ═══════════════════════════════════════════════════════════════════════════

function countClassifications(
  classifiedMoves: ClassifiedMove[], side: 'white' | 'black',
): MoveClassificationCounts {
  const isWhiteSide = side === 'white';
  const playerMoves = classifiedMoves.filter((_, i) => isWhiteSide ? i % 2 === 0 : i % 2 === 1);

  const counts: MoveClassificationCounts = {
    brilliant: 0, best: 0, excellent: 0, good: 0,
    inaccuracy: 0, mistake: 0, blunder: 0, severe_blunder: 0, book: 0,
  };

  for (const m of playerMoves) {
    counts[m.classification]++;
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect game phases dynamically based on the move list and eval array.
 * - Opening ends: move 15 or when a major piece trade occurs
 * - Middlegame ends: when total piece count drops below a threshold
 */
export function detectPhases(moves: string[], evals: number[]): PhaseRanges {
  const totalMoves = moves.length;
  if (totalMoves === 0) return { opening: null, middlegame: null, endgame: null };

  // Simple heuristic: use move number thresholds with material-based adjustment
  // A more accurate version would parse positions, but that requires chess.js on the frontend
  let openingEnd = Math.min(totalMoves - 1, 20);  // default: first 10 full moves

  // Look for large eval swings in the first 20 half-moves (suggests opening has ended)
  for (let i = 2; i < Math.min(20, totalMoves); i++) {
    const swing = Math.abs(evals[i] - evals[i - 1]);
    if (swing > 100) {
      // A big swing suggests a tactical moment — opening is likely over
      openingEnd = Math.max(i - 1, 6); // at least 3 full moves
      break;
    }
  }

  // Endgame detection: look for when evals become very stable or extreme
  // (simplified — a proper version would count pieces)
  let middlegameEnd = totalMoves - 1;
  if (totalMoves > 50) {
    middlegameEnd = Math.min(totalMoves - 1, 60); // ~move 30
  } else if (totalMoves > 30) {
    middlegameEnd = totalMoves - 1; // no endgame for short-to-medium games
  }

  const hasEndgame = middlegameEnd < totalMoves - 1;

  return {
    opening: [0, openingEnd],
    middlegame: openingEnd < totalMoves - 1 ? [openingEnd + 1, middlegameEnd] : null,
    endgame: hasEndgame ? [middlegameEnd + 1, totalMoves - 1] : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Game Quality — 70/30 weighted by winner
// ═══════════════════════════════════════════════════════════════════════════

function computeGameRating(
  classifiedMoves: ClassifiedMove[],
  phases: PhaseRanges,
  result: 'white' | 'black' | 'draw',
  whiteAccuracy: number,
  blackAccuracy: number,
  _whiteCounts: MoveClassificationCounts,
  _blackCounts: MoveClassificationCounts,
): GameRating {
  // Game quality: 60% winner + 40% loser, or 50/50 for draws
  let overall: number;
  if (result === 'white') {
    overall = whiteAccuracy * 0.6 + blackAccuracy * 0.4;
  } else if (result === 'black') {
    overall = blackAccuracy * 0.6 + whiteAccuracy * 0.4;
  } else {
    overall = (whiteAccuracy + blackAccuracy) / 2;
  }
  overall = Math.max(0, Math.min(100, overall));

  // Phase accuracies — raw, then normalized so weighted avg = overall
  let openingAcc = phases.opening ? computePhaseAccuracy(classifiedMoves, phases.opening, result) : null;
  let middlegameAcc = phases.middlegame ? computePhaseAccuracy(classifiedMoves, phases.middlegame, result) : null;
  let endgameAcc = phases.endgame ? computePhaseAccuracy(classifiedMoves, phases.endgame, result) : null;

  // Normalize: scale raw phase scores so their move-weighted average equals the overall
  const phaseEntries: Array<{ raw: number; moves: number }> = [];
  if (openingAcc !== null && phases.opening) phaseEntries.push({ raw: openingAcc, moves: phases.opening[1] - phases.opening[0] + 1 });
  if (middlegameAcc !== null && phases.middlegame) phaseEntries.push({ raw: middlegameAcc, moves: phases.middlegame[1] - phases.middlegame[0] + 1 });
  if (endgameAcc !== null && phases.endgame) phaseEntries.push({ raw: endgameAcc, moves: phases.endgame[1] - phases.endgame[0] + 1 });

  if (phaseEntries.length > 0) {
    const totalPhaseMoves = phaseEntries.reduce((s, p) => s + p.moves, 0);
    const rawWeightedAvg = phaseEntries.reduce((s, p) => s + p.raw * p.moves, 0) / totalPhaseMoves;
    if (rawWeightedAvg > 0) {
      const scale = overall / rawWeightedAvg;
      const clamp = (v: number) => Math.max(0, Math.min(100, v * scale));
      if (openingAcc !== null) openingAcc = clamp(openingAcc);
      if (middlegameAcc !== null) middlegameAcc = clamp(middlegameAcc);
      if (endgameAcc !== null) endgameAcc = clamp(endgameAcc);
    }
  }

  let label: string;
  if (overall >= 90) label = 'Excellent';
  else if (overall >= 80) label = 'Very Good';
  else if (overall >= 70) label = 'Good';
  else if (overall >= 60) label = 'Decent';
  else if (overall >= 50) label = 'Average';
  else label = 'Below Average';

  return {
    overall: Math.round(overall * 10) / 10,
    opening: openingAcc !== null ? Math.round(openingAcc * 10) / 10 : 0,
    middlegame: middlegameAcc !== null ? Math.round(middlegameAcc * 10) / 10 : 0,
    endgame: endgameAcc !== null ? Math.round(endgameAcc * 10) / 10 : 0,
    label,
    phaseBonus: 0,
    resultBonus: 0,
  };
}

function computePhaseAccuracy(
  classifiedMoves: ClassifiedMove[],
  range: [number, number],
  result: 'white' | 'black' | 'draw',
): number {
  const [start, end] = range;
  const phaseMoves = classifiedMoves.filter(m => m.moveIndex >= start && m.moveIndex <= end);
  if (phaseMoves.length === 0) return 0;

  // Compute per-player accuracies
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];
  for (const m of phaseMoves) {
    const isWhiteMove = m.moveIndex % 2 === 0;
    const wpBefore = cpToWinPercent(m.evalBefore);
    const wpAfter = cpToWinPercent(m.evalAfter);
    const acc = isWhiteMove
      ? moveAccuracy(wpBefore, wpAfter)
      : moveAccuracy(wpAfter, wpBefore);
    if (isWhiteMove) whiteAccs.push(acc);
    else blackAccs.push(acc);
  }

  // Harmonic mean per player (more punishing for bad moves, consistent with overall accuracy)
  function harmonicMean(arr: number[]): number {
    if (arr.length === 0) return 0;
    const nonZero = arr.filter(a => a > 0);
    if (nonZero.length === 0) return 0;
    return nonZero.length / nonZero.reduce((s, a) => s + 1 / a, 0);
  }

  const whitePhaseAcc = harmonicMean(whiteAccs);
  const blackPhaseAcc = harmonicMean(blackAccs);

  // Combine with same winner weighting as overall game rating
  if (result === 'white') return whitePhaseAcc * 0.6 + blackPhaseAcc * 0.4;
  if (result === 'black') return blackPhaseAcc * 0.6 + whitePhaseAcc * 0.4;
  return (whitePhaseAcc + blackPhaseAcc) / 2;
}
