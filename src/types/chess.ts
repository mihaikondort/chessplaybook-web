/**
 * Chess domain types for the ChessPlaybook application
 */

/**
 * Represents a chess player/world champion
 */
export interface Player {
  fullName: string;
  imagePath: string;
  championshipYears: string;
  biography: string;
}

/**
 * Map of player short names to Player objects
 */
export interface PlayersMap {
  [key: string]: Player;
}

/**
 * Represents metadata for a chess game
 */
export interface ChessGame {
  playerName: string;
  white: string;
  black: string;
  result: string;
  event: string;
  site: string;
  date: string;
  eco?: string;
  opening?: string;
  round?: string;
  whiteElo?: string;
  blackElo?: string;
  /** Marks a curated "best game" ('1' when set); populated by future best-games ingestion. */
  bestGame?: string;
}

/**
 * Alias for game metadata (same as ChessGame)
 */
export type GameMetadata = ChessGame;

/**
 * Represents a parsed PGN game with metadata and moves
 */
export interface PgnGame {
  metadata: ChessGame;
  pgn: string;
}
