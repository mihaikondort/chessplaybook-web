// Live broadcast types for Lichess tournament integration

export interface LiveGame {
  id: string;                    // Unique game ID from URL
  white: PlayerInfo;
  black: PlayerInfo;
  event: string;
  round: string;
  result: string;                // "*" = ongoing, "1-0", "0-1", "1/2-1/2"
  opening: string;
  eco: string;
  pgn: string;                   // Full PGN, polled; read with the game model
  lastMove: string;              // e.g., "14. Nxd5"
  moveCount: number;             // Number of moves played
  isOngoing: boolean;            // result === "*"
  updatedAt: Date;
  leg?: string;                  // "1", "2", or "TB" (extracted from broadcast URL)
}

export interface PlayerInfo {
  name: string;                  // "Xiong, Jeffery"
  rating: number;                // 2649
  title?: string;                // "GM", "IM", "FM", etc.
  team: string;                  // "USA"
  fideId: string;               // "2047640"
  clock?: string;                // "1:30:55" (from last move)
  matchScore?: number;           // Overall match score (e.g., 1.5 for winning Game 1)
}

export interface BroadcastRound {
  id: string;                    // "t8DzIZPc"
  name: string;                  // "Game 1"
  slug: string;                  // "game-1"
  tournamentName: string;        // "FIDE World Cup 2025 | Round 1"
  startsAt?: number;             // Unix timestamp
  ongoing: boolean;
  url: string;
}

export interface BroadcastTournament {
  tour: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  rounds: BroadcastRound[];
}
