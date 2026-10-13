/**
 * GameFilterService
 *
 * Service for filtering, searching, and sorting chess games.
 * Provides utilities for extracting unique values from game metadata.
 */

import type { GameMetadata } from '@/types/chess';
import type { FilterState, SortState } from '@/types/filter';

export class GameFilterService {
  /**
   * Filter games based on filter criteria
   */
  static filterGames(
    games: GameMetadata[],
    filters: FilterState,
    championName: string
  ): GameMetadata[] {
    return games.filter((game) => {
      // Best games filter (future feature)
      if (filters.bestGamesOnly && game.bestGame !== '1') {
        return false;
      }

      // Result filter
      if (filters.result !== 'any') {
        if (filters.result === 'white-win' && game.result !== '1-0') return false;
        if (filters.result === 'black-win' && game.result !== '0-1') return false;
        if (filters.result === 'draw' && game.result !== '1/2-1/2') return false;
      }

      // Color filter (check if champion played that color)
      if (filters.color !== 'any') {
        const championIsWhite = game.white.toLowerCase().includes(championName.toLowerCase());
        if (filters.color === 'white' && !championIsWhite) return false;
        if (filters.color === 'black' && championIsWhite) return false;
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        if (!game.date) return false; // Skip games without dates

        // Parse date - supports both YYYY.MM.DD (PGN) and ISO format (2021-07-10T...)
        let year: number;
        if (game.date.includes('T') || game.date.includes('-')) {
          // ISO date format
          year = new Date(game.date).getFullYear();
        } else {
          // PGN date format (YYYY.MM.DD or YYYY.??.??)
          const yearStr = game.date.split('.')[0];
          year = parseInt(yearStr);
        }

        if (isNaN(year)) return false; // Skip invalid dates

        if (filters.dateFrom && year < filters.dateFrom) return false;
        if (filters.dateTo && year > filters.dateTo) return false;
      }

      // Opponent filter (case-insensitive partial match)
      if (filters.opponent) {
        const opponent = game.white.toLowerCase().includes(championName.toLowerCase())
          ? game.black
          : game.white;

        if (!opponent.toLowerCase().includes(filters.opponent.toLowerCase())) {
          return false;
        }
      }

      // Opening family filter
      if (filters.openingFamily) {
        if (!game.opening) return false;
        if (!game.opening.toLowerCase().includes(filters.openingFamily.toLowerCase())) {
          return false;
        }
      }

      // Event type filter
      if (filters.eventType) {
        if (!game.event) return false;
        if (!game.event.toLowerCase().includes(filters.eventType.toLowerCase())) {
          return false;
        }
      }

      // Game length filter (based on move count)
      // DISABLED: estimateMoveCount() always returns 40, making this filter non-functional
      // TODO: Implement PGN parsing to count actual moves, then uncomment this
      /*
      if (filters.gameLength !== 'any') {
        // Count moves from move list (if available) or estimate from PGN
        const moveCount = this.estimateMoveCount(game);

        if (filters.gameLength === 'short' && moveCount >= 30) return false;
        if (filters.gameLength === 'medium' && (moveCount < 30 || moveCount >= 60)) return false;
        if (filters.gameLength === 'long' && moveCount < 60) return false;
      }
      */

      // ECO code filter
      if (filters.hasEcoCode !== 'any') {
        const hasEco = !!game.eco;
        if (filters.hasEcoCode === 'yes' && !hasEco) return false;
        if (filters.hasEcoCode === 'no' && hasEco) return false;
      }

      return true;
    });
  }

  /**
   * Search games by text across multiple fields
   */
  static searchGames(games: GameMetadata[], searchText: string): GameMetadata[] {
    if (!searchText || searchText.trim() === '') {
      return games;
    }

    const searchLower = searchText.toLowerCase().trim();

    return games.filter((game) => {
      // Build searchable text from all relevant fields
      const searchableFields = [
        game.event || '',
        game.site || '',
        game.white || '',
        game.black || '',
        game.opening || '',
        game.eco || '',
      ];

      const searchableText = searchableFields.join(' ').toLowerCase();

      return searchableText.includes(searchLower);
    });
  }

  /**
   * Sort games by specified criteria
   */
  static sortGames(games: GameMetadata[], sort: SortState): GameMetadata[] {
    // Create a copy to avoid mutating original array
    const sorted = [...games];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'date':
          comparison = this.compareDates(a.date, b.date);
          break;

        case 'opponent': {
          const opponentA = this.getOpponentName(a, '');
          const opponentB = this.getOpponentName(b, '');
          comparison = opponentA.localeCompare(opponentB);
          break;
        }

        case 'opening':
          comparison = (a.opening || '').localeCompare(b.opening || '');
          break;

        case 'event':
          comparison = (a.event || '').localeCompare(b.event || '');
          break;

        case 'moves': {
          const movesA = this.estimateMoveCount(a);
          const movesB = this.estimateMoveCount(b);
          comparison = movesA - movesB;
          break;
        }

        case 'result': {
          const resultOrder = { '1-0': 1, '1/2-1/2': 2, '0-1': 3, '*': 4 };
          const orderA = resultOrder[a.result as keyof typeof resultOrder] || 5;
          const orderB = resultOrder[b.result as keyof typeof resultOrder] || 5;
          comparison = orderA - orderB;
          break;
        }
      }

      // Apply sort order (asc/desc)
      return sort.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  /**
   * Get unique opponents from games list
   */
  static getUniqueOpponents(games: GameMetadata[], championName: string): string[] {
    const opponents = new Set<string>();

    games.forEach((game) => {
      const isWhite = game.white.toLowerCase().includes(championName.toLowerCase());
      const opponent = isWhite ? game.black : game.white;

      if (opponent && opponent.trim()) {
        opponents.add(opponent.trim());
      }
    });

    return Array.from(opponents).sort();
  }

  /**
   * Get unique opening families from games
   */
  static getUniqueOpenings(games: GameMetadata[]): string[] {
    const openings = new Set<string>();

    games.forEach((game) => {
      if (game.opening) {
        // Extract opening family (before ':' or ',')
        const family = game.opening.split(/[:，]/)[0].trim();
        if (family) {
          openings.add(family);
        }
      }
    });

    return Array.from(openings).sort();
  }

  /**
   * Get unique event types from games
   */
  static getUniqueEventTypes(games: GameMetadata[]): string[] {
    const eventTypes = new Set<string>();

    games.forEach((game) => {
      if (game.event) {
        eventTypes.add(game.event.trim());
      }
    });

    return Array.from(eventTypes).sort();
  }

  /**
   * Get date range (min and max years) from games
   */
  static getDateRange(games: GameMetadata[]): { min: number; max: number } {
    let min = 9999;
    let max = 0;

    games.forEach((game) => {
      if (game.date) {
        const yearStr = game.date.split('.')[0];
        const year = parseInt(yearStr);

        if (!isNaN(year)) {
          if (year < min) min = year;
          if (year > max) max = year;
        }
      }
    });

    // Return sensible defaults if no valid dates found
    if (min === 9999) min = 1900;
    if (max === 0) max = new Date().getFullYear();

    return { min, max };
  }

  /**
   * Count active filters
   */
  static countActiveFilters(filters: FilterState): number {
    let count = 0;

    if (filters.searchText) count++;
    if (filters.result !== 'any') count++;
    if (filters.color !== 'any') count++;
    if (filters.dateFrom !== null || filters.dateTo !== null) count++;
    if (filters.opponent) count++;
    if (filters.openingFamily) count++;
    if (filters.eventType) count++;
    // Game length filter is currently disabled (no move count data available)
    // if (filters.gameLength !== 'any') count++;
    if (filters.hasEcoCode !== 'any') count++;
    if (filters.bestGamesOnly) count++;

    return count;
  }

  // ========== Private Helper Methods ==========

  /**
   * Estimate move count from game metadata
   * (In the future, could parse actual PGN to count moves)
   */
  private static estimateMoveCount(game: GameMetadata): number {
    // For now, return a rough estimate
    // In future, parse PGN or add move count to metadata
    // Default to medium length if unknown
    return 40;
  }

  /**
   * Get opponent name for a given champion
   */
  private static getOpponentName(game: GameMetadata, championName: string): string {
    const isWhite = game.white.toLowerCase().includes(championName.toLowerCase());
    return isWhite ? game.black : game.white;
  }

  /**
   * Compare two date strings (format: YYYY.MM.DD)
   */
  private static compareDates(dateA?: string, dateB?: string): number {
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Parse dates - supports both YYYY.MM.DD (PGN) and ISO format (2021-07-10T...)
    const parseDate = (date: string): number => {
      if (date.includes('T') || date.includes('-')) {
        // ISO date format
        return new Date(date).getTime();
      } else {
        // PGN date format (YYYY.MM.DD or YYYY.??.??)
        const parts = date.split('.').map((p) => (p === '??' ? '01' : p));
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).getTime();
      }
    };

    const timeA = parseDate(dateA);
    const timeB = parseDate(dateB);

    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;

    return timeA - timeB;
  }
}
