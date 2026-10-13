/**
 * Chess Position Analysis Types
 *
 * Data structures for chess engine analysis using Stockfish.js
 */

export interface PrincipalVariation {
  evaluation: string;           // Evaluation score for this line
  moves: string;                // Line of moves in SAN (e.g., "1.e4 c5 2.Nf3 d6")
  multipv: number;              // PV number (1 = best, 2 = second best, etc.)
}

export interface AnalysisResult {
  fen: string;                  // Position analyzed (Forsyth-Edwards Notation)
  evaluation: string;           // Evaluation score of BEST line: "+2.50" (white advantage), "-1.25" (black advantage), "M3" (mate in 3)
  principalVariation: string;   // Best line of moves in Standard Algebraic Notation (e.g., "1.e4 c5 2.Nf3 d6")
  lines?: PrincipalVariation[];  // All principal variations (when MultiPV > 1)
  depth: number;                // Analysis depth reached (number of half-moves)
  nodes?: number;               // Number of positions evaluated
  timeMs?: number;              // Time taken for analysis in milliseconds
  wdl?: {                       // Win-Draw-Loss probabilities (permille: parts per thousand, 0-1000)
    win: number;                // White winning chances (0-1000, where 1000 = 100%)
    draw: number;               // Draw chances (0-1000)
    loss: number;               // Black winning chances (0-1000)
  };                            // Note: win + draw + loss should always equal 1000
}

export interface AnalysisConfig {
  enabled: boolean;             // Whether analysis is enabled (default: false for battery saving)
  depth: number;                // Analysis depth (default: 15)
  hashSizeMb: number;           // Hash table size in MB (default: 128)
}

export interface AnalysisState {
  isAnalyzing: boolean;         // Currently analyzing a position
  currentResult: AnalysisResult | null;  // Latest analysis result
  error: string | null;         // Error message if analysis failed
}

