/**
 * Service for loading and managing chess data (players and games)
 */

import type { PlayersMap, PgnGame, ChessGame } from '../types/chess';

class ChessDataService {
  private playersCache: PlayersMap | null = null;
  private gamesCache: Map<string, PgnGame[]> = new Map();

  /**
   * Load players list from JSON
   */
  async loadPlayers(): Promise<PlayersMap> {
    if (this.playersCache) {
      return this.playersCache;
    }

    try {
      const response = await fetch('/assets/players/players_list.json');
      if (!response.ok) {
        throw new Error(`Failed to load players: ${response.statusText}`);
      }
      this.playersCache = await response.json();
      return this.playersCache!;
    } catch (error) {
      console.error('Error loading players:', error);
      throw error;
    }
  }

  /**
   * Order a list of champion slugs by reign, newest first — the order
   * `/champions` renders and the order visitors expect everywhere else.
   *
   * The order is the key order of `players_list.json`, which is authored
   * newest-first. That is deliberately the same mechanism the Champions page
   * uses (it maps `Object.entries` with no sort), so the two cannot drift: if
   * the file is ever re-ordered, both move together. Parsing
   * `championshipYears` instead would be more explicit but would introduce a
   * second, independent notion of order — exactly the drift worth avoiding.
   *
   * Champions missing from the file keep a stable place at the end rather than
   * disappearing, so a newly baked champion still shows up if the roster JSON
   * has not caught up.
   */
  orderByReign<T>(items: T[], nameOf: (item: T) => string, players: PlayersMap | null): T[] {
    if (!players) return items;
    const rank = new Map(Object.keys(players).map((name, i) => [name, i]));
    const missing = Object.keys(players).length;
    return [...items].sort((a, b) => {
      const ra = rank.get(nameOf(a)) ?? missing;
      const rb = rank.get(nameOf(b)) ?? missing;
      return ra === rb ? nameOf(a).localeCompare(nameOf(b)) : ra - rb;
    });
  }

  /**
   * Load PGN games for a specific player
   */
  async loadPlayerGames(playerName: string): Promise<PgnGame[]> {
    // Check cache first
    if (this.gamesCache.has(playerName)) {
      return this.gamesCache.get(playerName)!;
    }

    try {
      // Load the full game collection for the player
      const response = await fetch(`/assets/pgn/${playerName}.pgn`);

      if (!response.ok) {
        throw new Error(`Failed to load games for ${playerName}: ${response.statusText}`);
      }

      const pgnText = await response.text();
      const games = this.parsePgnFile(pgnText, playerName);

      // Cache the results
      this.gamesCache.set(playerName, games);

      return games;
    } catch (error) {
      console.error(`Error loading games for ${playerName}:`, error);
      throw error;
    }
  }

  /**
   * Parse a PGN file into individual games
   */
  private parsePgnFile(pgnText: string, playerName: string): PgnGame[] {
    const games: PgnGame[] = [];

    // Split by [Event tag at the start of a line (preceded by newlines or start of string)
    const gameBlocks = pgnText.split(/(?=^\[Event\s)/m);

    for (const block of gameBlocks) {
      const trimmedBlock = block.trim();
      if (!trimmedBlock || trimmedBlock.length < 10) continue;

      const game = this.parseSingleGame(trimmedBlock, playerName);
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Parse a single PGN game block
   */
  private parseSingleGame(pgnBlock: string, playerName: string): PgnGame | null {
    try {
      const lines = pgnBlock.split('\n');
      const metadata: Partial<ChessGame> = {
        playerName,
      };

      // Parse headers
      for (const line of lines) {
        const headerMatch = line.match(/\[(\w+)\s+"([^"]+)"\]/);
        if (headerMatch) {
          const [, key, value] = headerMatch;
          switch (key) {
            case 'White':
              metadata.white = value;
              break;
            case 'Black':
              metadata.black = value;
              break;
            case 'Result':
              metadata.result = value;
              break;
            case 'Event':
              metadata.event = value;
              break;
            case 'Site':
              metadata.site = value;
              break;
            case 'Date':
              metadata.date = value;
              break;
            case 'ECO':
              metadata.eco = value;
              break;
            case 'Opening':
              metadata.opening = value;
              break;
            case 'Round':
              metadata.round = value;
              break;
            case 'WhiteElo':
              metadata.whiteElo = value;
              break;
            case 'BlackElo':
              metadata.blackElo = value;
              break;
          }
        }
      }

      // Validate required fields
      if (!metadata.white || !metadata.black || !metadata.result) {
        return null;
      }

      return {
        metadata: metadata as ChessGame,
        pgn: pgnBlock,
      };
    } catch (error) {
      console.error('Error parsing game:', error);
      return null;
    }
  }

  /**
   * Get list of available player names
   */
  async getPlayerNames(): Promise<string[]> {
    const players = await this.loadPlayers();
    return Object.keys(players);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.playersCache = null;
    this.gamesCache.clear();
  }
}

// Export singleton instance
export const chessDataService = new ChessDataService();
