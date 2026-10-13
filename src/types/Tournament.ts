/**
 * Tournament Template System Types
 *
 * Generic types for tournament configuration that work with:
 * - Swiss tournaments (Tata Steel, Isle of Man)
 * - Elimination tournaments (World Cup, Candidates)
 * - Round Robin tournaments (Norway Chess)
 */

export type TournamentFormat = 'swiss' | 'elimination' | 'round-robin';

export type GameDayStatus = 'finished' | 'live' | 'upcoming' | 'upcoming-next';

/**
 * Individual game day within a tournament
 * Represents a single day of play (e.g., "Round 1 - Game 1" or "Round 5")
 */
export interface GameDay {
  // Identification
  slug: string;              // URL identifier (e.g., "round-1-game-1")
  roundNumber: number;       // Round number (1, 2, 3...)
  gameNumber?: number;       // Optional: For elimination (1, 2, 3=tiebreak)

  // Display
  displayName: string;       // Display name (e.g., "Round 1 - Game 1")
  date: string;              // Human-readable date (e.g., "November 1, 2025")

  // Lichess broadcast
  lichessRoundId: string | null;  // Lichess round ID or null if not yet created
  womenLichessRoundId?: string | null; // Women's section round ID (displayed below Open games)

  // YouTube live stream video IDs (updated per round)
  youtubeVideoId?: string;        // Open section stream
  womenYoutubeVideoId?: string;   // Women's section stream

  // Schedule
  startTime: Date;           // Game start time
  estimatedEndTime: Date;    // Estimated end time

  // Optional: Format-specific metadata
  metadata?: {
    // Elimination: match description
    matchDescription?: string;  // "Round of 64", "Quarterfinals"

    // Swiss: leading players
    leadingPlayers?: string[];  // ["Carlsen", "Gukesh"]

    // Round Robin: rest day flag
    isRestDay?: boolean;
  };
}

/**
 * Lichess round mapping for dynamic tiebreak discovery
 * Maps tournament round numbers to Lichess broadcast tournament IDs
 */
export interface LichessRoundMapping {
  roundNumber: number;          // Tournament round number (1, 2, 3...)
  lichessTournamentId: string;  // Lichess broadcast tournament ID (e.g., "C8xGMEpX")
}

/**
 * Complete tournament configuration
 */
export interface TournamentConfig {
  // Basic info
  id: string;                // URL-safe ID (e.g., "world-cup-2025")
  name: string;              // Full name (e.g., "FIDE World Cup 2025")
  shortName: string;         // Short name (e.g., "World Cup 2025")
  location: string;          // Location (e.g., "Goa, India")
  startDate: Date;           // Tournament start date
  endDate: Date;             // Tournament end date
  timezone: string;          // IANA timezone (e.g., "Asia/Kolkata")

  // Format
  format: TournamentFormat;  // Tournament format
  totalRounds: number;       // Total number of rounds

  // Optional: Live video stream (YouTube channel ID for auto-live embed)
  youtubeChannelId?: string;

  // Optional: Branding
  logo?: string;             // Logo URL
  colors?: {
    primary: string;         // Primary color (hex)
    secondary: string;       // Secondary color (hex)
  };

  // Optional: Dynamic tiebreak discovery
  // For elimination tournaments, provide Lichess tournament IDs per round
  // to automatically discover all tiebreak rounds
  lichessRoundMappings?: LichessRoundMapping[];

  // Game days (core of the system)
  gameDays: GameDay[];
}

/**
 * Compute game day status based on current time
 */
export function computeGameDayStatus(gameDay: GameDay): GameDayStatus {
  const now = new Date();

  if (now > gameDay.estimatedEndTime) {
    return 'finished';
  }

  if (now >= gameDay.startTime && now <= gameDay.estimatedEndTime) {
    return 'live';
  }

  return 'upcoming';
}

/**
 * Get human-readable format name
 */
export function getFormatDisplayName(format: TournamentFormat, totalRounds: number): string {
  switch (format) {
    case 'swiss':
      return `Swiss System • ${totalRounds} Rounds`;
    case 'elimination':
      return `Knockout • ${totalRounds} Rounds`;
    case 'round-robin':
      return `Round Robin • ${totalRounds} Rounds`;
  }
}
