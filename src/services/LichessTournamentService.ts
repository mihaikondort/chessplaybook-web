/**
 * Service for fetching tournament metadata from Lichess Broadcast API
 * Used to dynamically discover tournament rounds, including tiebreaks
 */

export interface LichessRoundInfo {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
  rated: boolean;
  finished: boolean;
  finishedAt?: number;
  startsAt: number;
  url: string;
}

export interface LichessTournamentInfo {
  id: string;
  name: string;
  slug: string;
  rounds: LichessRoundInfo[];
  group?: {
    id: string;
    slug: string;
    name: string;
  };
}

// Dev-only logging helper
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) console.log('[LichessTournamentService]', ...args);
};

export class LichessTournamentService {
  private readonly API_BASE = 'https://lichess.org/api/broadcast';
  private cache = new Map<string, { data: LichessTournamentInfo; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch tournament metadata including all rounds
   * @param tournamentId - The Lichess tournament ID (e.g., "C8xGMEpX")
   * @returns Tournament info with all rounds
   */
  async fetchTournamentInfo(tournamentId: string): Promise<LichessTournamentInfo | null> {
    // Check cache first
    const cached = this.cache.get(tournamentId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      log(`Using cached data for tournament ${tournamentId}`);
      return cached.data;
    }

    try {
      const url = `${this.API_BASE}/${tournamentId}`;
      log('Fetching tournament info:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to fetch tournament info: ${response.status}`);
        return null;
      }

      const data = await response.json();

      const tournamentInfo: LichessTournamentInfo = {
        id: data.tour.id,
        name: data.tour.name,
        slug: data.tour.slug,
        rounds: data.rounds || [],
        group: data.group,
      };

      // Cache the result
      this.cache.set(tournamentId, {
        data: tournamentInfo,
        timestamp: Date.now(),
      });

      log(`Fetched ${tournamentInfo.rounds.length} rounds for tournament ${tournamentId}`);

      return tournamentInfo;
    } catch (error) {
      console.error('Error fetching tournament info:', error);
      return null;
    }
  }

  /**
   * Get all tiebreak rounds from a tournament
   * @param tournamentId - The Lichess tournament ID
   * @returns Array of tiebreak rounds
   */
  async getTiebreakRounds(tournamentId: string): Promise<LichessRoundInfo[]> {
    const tournamentInfo = await this.fetchTournamentInfo(tournamentId);

    if (!tournamentInfo) {
      return [];
    }

    // Filter for rounds that contain "tiebreak" or "sudden death" in their name
    const tiebreakRounds = tournamentInfo.rounds.filter(round =>
      round.name.toLowerCase().includes('tiebreak') ||
      round.name.toLowerCase().includes('sudden death')
    );

    log(`Found ${tiebreakRounds.length} tiebreak rounds in tournament ${tournamentId}`);

    return tiebreakRounds;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    log('Cache cleared');
  }
}

// Export singleton instance
export const lichessTournamentService = new LichessTournamentService();
