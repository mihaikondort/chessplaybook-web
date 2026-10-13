/**
 * Best Games types for the ChessPlaybook application
 * Used for displaying curated top 100 games for each World Champion
 */

/**
 * Quality metrics for a best game
 */
export interface GameQualityMetrics {
  gameQualityScore: number;
  playerAccuracy?: number;
  opponentAccuracy?: number;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  whiteACPL?: number;
  blackACPL?: number;
  whiteBlunders: number;
  whiteMistakes: number;
  whiteInaccuracies: number;
  blackBlunders: number;
  blackMistakes: number;
  blackInaccuracies: number;
}

/**
 * Represents a best game from the curated collection
 */
export interface BestGame {
  id: number;
  playerId: number;
  rank: number;
  sourceGameId: string;
  pgn: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
  whitePlayer: string;
  blackPlayer: string;
  whiteElo?: number;
  blackElo?: number;
  ecoCode?: string;
  openingName?: string;
  playerColor: 'white' | 'black';
  resultForPlayer?: string;
  metrics: GameQualityMetrics;
}

/**
 * Sort options for best games
 */
export type BestGamesSortField =
  | 'rank'
  | 'date'
  | 'game_quality_score'
  | 'white_player'
  | 'black_player'
  | 'result'
  | 'event';

export type SortOrder = 'asc' | 'desc';

/**
 * Query options for fetching best games
 */
export interface BestGamesQueryOptions {
  limit?: number;
  offset?: number;
  sort?: BestGamesSortField;
  order?: SortOrder;
}

/**
 * Response from best games API
 */
export interface BestGamesResponse {
  games: BestGame[];
  total: number;
  hasMore: boolean;
  player?: {
    id: number;
    name: string;
    slug: string;
  };
}
