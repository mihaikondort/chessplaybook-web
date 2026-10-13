import { Chess } from 'chess.js';
import type { LiveGame, PlayerInfo, BroadcastRound } from '@/types/LiveBroadcast';

// Dev-only logging helper
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => {
  if (isDev) console.log('[LichessBroadcastService]', ...args);
};

/**
 * Service for fetching and parsing live chess games from Lichess Broadcast API
 */
export class LichessBroadcastService {
  private readonly API_BASE = 'https://lichess.org/api/broadcast';

  /**
   * Fetch PGN data for a specific broadcast round
   * @param roundId - The Lichess round ID (e.g., "t8DzIZPc")
   * @returns Raw PGN text containing all games
   */
  async fetchRoundPGN(roundId: string): Promise<string> {
    try {
      // Add cache-busting query parameter to ensure fresh data
      const timestamp = Date.now();
      const url = `${this.API_BASE}/round/${roundId}.pgn?_=${timestamp}`;
      log('Fetching:', url);

      const response = await fetch(url, {
        cache: 'no-store', // Disable browser caching
        headers: {
          'Cache-Control': 'no-cache',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch round PGN: ${response.status} ${response.statusText}`);
      }

      const pgnText = await response.text();
      log('Received PGN:', pgnText.length, 'chars');

      return pgnText;
    } catch (error) {
      console.error('Error fetching round PGN:', error);
      throw error;
    }
  }

  /**
   * Parse PGN text into structured LiveGame objects
   * @param pgnText - Raw PGN text with multiple games separated by double newlines
   * @returns Array of LiveGame objects
   */
  parsePGNText(pgnText: string): LiveGame[] {
    if (!pgnText || pgnText.trim().length === 0) {
      return [];
    }

    // Split by double newline to separate individual games
    const gameBlocks = pgnText.split(/\n\n(?=\[Event)/);
    const games: LiveGame[] = [];

    for (const block of gameBlocks) {
      if (block.trim().length === 0) continue;

      try {
        const game = this.parseGameBlock(block);
        if (game) {
          games.push(game);
        }
      } catch (error) {
        console.warn('Failed to parse game block:', error);
        // Continue parsing other games even if one fails
      }
    }

    // Calculate match scores for all games
    this.calculateMatchScores(games);

    return games;
  }

  /**
   * Parse a single PGN game block into a LiveGame object
   */
  private parseGameBlock(block: string): LiveGame | null {
    try {
      // Extract PGN tags (everything between square brackets)
      const tags = this.extractPGNTags(block);

      if (!tags.Event || !tags.White || !tags.Black) {
        return null; // Skip invalid games
      }

      // Extract the moves (everything after the tags)
      const movesMatch = block.match(/\n\n(.+)$/s);
      const movesText = movesMatch ? movesMatch[1].trim() : '';

      // Parse with chess.js to validate and extract move count
      const chess = new Chess();
      let moveCount = 0;
      let lastMove = '';

      if (movesText) {
        try {
          chess.loadPgn(block);
          const history = chess.history();
          moveCount = history.length;
          lastMove = history[history.length - 1] || '';
        } catch {
          // If PGN is invalid, continue with what we have
        }
      }

      // Generate game ID from player names and round
      const gameId = this.generateGameId(tags);

      // Determine if game is ongoing
      const result = tags.Result || '*';
      const isOngoing = result === '*';

      // Extract player info
      const white = this.extractPlayerInfo(tags, 'White');
      const black = this.extractPlayerInfo(tags, 'Black');

      // Extract leg information from BroadcastURL
      const broadcastUrl = tags.BroadcastURL || '';
      const leg = this.extractLegFromBroadcastUrl(broadcastUrl);

      // Extract time control (e.g., "90+30" or "5400+30")
      const timeControl = tags.TimeControl || '';

      // Extract last clock times from the moves text
      const { whiteClock, blackClock } = this.extractLastClockTimes(movesText, timeControl);
      white.clock = whiteClock;
      black.clock = blackClock;

      const game: LiveGame = {
        id: gameId,
        white,
        black,
        event: tags.Event || 'Unknown Event',
        round: tags.Round || '?',
        result,
        opening: tags.Opening || 'Unknown Opening',
        eco: tags.ECO || '',
        pgn: block,
        lastMove,
        moveCount,
        isOngoing,
        updatedAt: new Date(),
        leg, // Add leg information
      };

      return game;
    } catch (error) {
      console.error('Error parsing game block:', error);
      return null;
    }
  }

  /**
   * Extract PGN tags into a key-value object
   */
  private extractPGNTags(pgn: string): Record<string, string> {
    const tags: Record<string, string> = {};
    const tagRegex = /\[(\w+)\s+"([^"]+)"\]/g;
    let match;

    while ((match = tagRegex.exec(pgn)) !== null) {
      const [, key, value] = match;
      tags[key] = value;
    }

    return tags;
  }

  /**
   * Extract player information from PGN tags
   */
  private extractPlayerInfo(tags: Record<string, string>, color: 'White' | 'Black'): PlayerInfo {
    const name = tags[color] || 'Unknown';
    const rating = parseInt(tags[`${color}Elo`] || '0', 10);
    const title = tags[`${color}Title`] || undefined;
    const team = tags[`${color}Team`] || '';
    const fideId = tags[`${color}FideId`] || '';

    return {
      name,
      rating,
      title,
      team,
      fideId,
    };
  }

  /**
   * Generate a unique game ID from PGN tags
   */
  private generateGameId(tags: Record<string, string>): string {
    const white = tags.White?.replace(/\s+/g, '-').toLowerCase() || 'unknown';
    const black = tags.Black?.replace(/\s+/g, '-').toLowerCase() || 'unknown';
    const round = tags.Round?.replace(/\./g, '-') || '0';
    return `${round}-${white}-vs-${black}`;
  }

  /**
   * Fetch list of active broadcasts
   * Note: This endpoint may require pagination or filtering in production
   */
  async fetchActiveBroadcasts(): Promise<BroadcastRound[]> {
    try {
      const response = await fetch(this.API_BASE);

      if (!response.ok) {
        throw new Error(`Failed to fetch broadcasts: ${response.status}`);
      }

      const data = await response.json();

      // Transform API response to our BroadcastRound format
      // Note: Actual API structure may vary, adjust as needed
      const rounds: BroadcastRound[] = [];

      if (Array.isArray(data)) {
        for (const broadcast of data) {
          if (broadcast.rounds) {
            for (const round of broadcast.rounds) {
              rounds.push({
                id: round.id,
                name: round.name,
                slug: round.slug,
                tournamentName: broadcast.tour?.name || '',
                startsAt: round.startsAt,
                ongoing: round.ongoing || false,
                url: `https://lichess.org/broadcast/${broadcast.tour?.slug}/${round.slug}/${round.id}`,
              });
            }
          }
        }
      }

      return rounds;
    } catch (error) {
      console.error('Error fetching active broadcasts:', error);
      throw error;
    }
  }

  /**
   * Fetch broadcast round metadata to get round name (Game 1, Game 2, Tiebreaks, etc.)
   * @param roundId - The Lichess round ID
   * @returns Round metadata including name
   */
  async fetchRoundMetadata(roundId: string): Promise<{ name: string; slug: string } | null> {
    try {
      const response = await fetch(`${this.API_BASE}/round/${roundId}`);

      if (!response.ok) {
        console.warn(`Failed to fetch round metadata: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        name: data.round?.name || data.name || 'Unknown',
        slug: data.round?.slug || data.slug || '',
      };
    } catch (error) {
      console.error('Error fetching round metadata:', error);
      return null;
    }
  }

  /**
   * Parse round name to extract game/leg information
   * Examples:
   * - "Game 1" -> "1"
   * - "Game 2" -> "2"
   * - "Tiebreaks" or "Tiebreak" -> "TB"
   * - "Rapid" or "Blitz" -> "TB"
   */
  parseRoundLeg(roundName: string): string {
    const lowerName = roundName.toLowerCase();

    // Check for tiebreaks/rapid/blitz
    if (lowerName.includes('tiebreak') || lowerName.includes('rapid') || lowerName.includes('blitz')) {
      return 'TB';
    }

    // Extract game number (Game 1, Game 2, etc.)
    const gameMatch = roundName.match(/game\s*(\d+)/i);
    if (gameMatch) {
      return gameMatch[1];
    }

    // Default to empty string if we can't determine
    return '';
  }

  /**
   * Extract leg information from Lichess broadcast URL
   * Example URLs:
   * - "https://lichess.org/broadcast/fide-world-cup-2025--round-1/game-1/t8DzIZPc" -> "1"
   * - "https://lichess.org/broadcast/fide-world-cup-2025--round-1/game-2/t8DzIZPc" -> "2"
   * - "https://lichess.org/broadcast/fide-world-cup-2025--round-1/tiebreaks/t8DzIZPc" -> "TB"
   */
  private extractLegFromBroadcastUrl(broadcastUrl: string): string {
    if (!broadcastUrl) {
      return '';
    }

    // Check for tiebreaks
    if (broadcastUrl.toLowerCase().includes('/tiebreak')) {
      return 'TB';
    }

    // Extract game number from URL (e.g., "/game-1/", "/game-2/")
    const gameMatch = broadcastUrl.match(/\/game-(\d+)\//);
    if (gameMatch) {
      return gameMatch[1];
    }

    // Default to empty string
    return '';
  }

  /**
   * Extract last clock times from PGN moves text
   * Clock times are embedded as [%clk H:MM:SS] after each move
   * If no moves yet, return initial time from timeControl
   * @param movesText - The moves portion of the PGN
   * @param timeControl - Time control string (e.g., "90+30" or "5400+30")
   * @returns Object with whiteClock and blackClock strings (e.g., "1:30:45")
   */
  private extractLastClockTimes(movesText: string, timeControl: string): { whiteClock: string; blackClock: string } {
    // Parse initial time from time control (format: "seconds+increment" or "minutes+increment")
    const initialTime = this.parseTimeControl(timeControl);

    // Find all clock times in the moves text
    // Format: [%clk H:MM:SS] or [%clk M:SS]
    const clockRegex = /\[%clk\s+(\d+):(\d+):(\d+)\]/g;
    const matches = Array.from(movesText.matchAll(clockRegex));

    if (matches.length === 0) {
      // No moves yet, return initial time for both players
      return {
        whiteClock: initialTime,
        blackClock: initialTime,
      };
    }

    // Last clock time is for the player who just moved
    // Second to last is for the other player
    const lastMatch = matches[matches.length - 1];
    const secondLastMatch = matches.length > 1 ? matches[matches.length - 2] : null;

    // Determine which player moved last based on move count
    const moveCount = matches.length;
    const whiteMovedLast = moveCount % 2 === 1; // Odd number means white moved last

    const lastClock = `${parseInt(lastMatch[1])}:${lastMatch[2]}:${lastMatch[3]}`;
    const secondLastClock = secondLastMatch
      ? `${parseInt(secondLastMatch[1])}:${secondLastMatch[2]}:${secondLastMatch[3]}`
      : initialTime;

    if (whiteMovedLast) {
      return {
        whiteClock: lastClock,
        blackClock: secondLastClock,
      };
    } else {
      return {
        whiteClock: secondLastClock,
        blackClock: lastClock,
      };
    }
  }

  /**
   * Parse time control string to initial clock display
   * Formats: "90+30" (90 minutes), "5400+30" (5400 seconds = 90 minutes)
   * @returns Formatted time string (e.g., "1:30:00")
   */
  private parseTimeControl(timeControl: string): string {
    if (!timeControl) {
      return '1:30:00'; // Default to 90 minutes
    }

    // Extract base time (before the +)
    const baseTimeStr = timeControl.split('+')[0];
    const baseTimeSeconds = parseInt(baseTimeStr, 10);

    if (isNaN(baseTimeSeconds)) {
      return '1:30:00';
    }

    // Convert seconds to H:MM:SS format
    const hours = Math.floor(baseTimeSeconds / 3600);
    const minutes = Math.floor((baseTimeSeconds % 3600) / 60);
    const seconds = baseTimeSeconds % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  /**
   * Get the current round ID for World Cup 2025
   * In production, this should dynamically fetch the active round
   * For now, returns hardcoded Round 1 ID
   */
  getCurrentWorldCupRoundId(): string {
    // TODO: Make this dynamic by checking which round is currently live
    return 't8DzIZPc'; // Round 1
  }

  /**
   * Get the current round ID for Norwegian Team League 2025/26
   * For testing live updates on dev server
   */
  getNorwegianLeagueRoundId(): string {
    return 'VqXI2unT'; // Round 2
  }

  /**
   * Calculate cumulative match scores for all games in a round
   * For World Cup format, each game card shows score up to and including that game
   * Example: Game 1 card shows only Game 1 score, Game 2 card shows Game 1 + Game 2
   * Mutates the games array to add match scores to player info
   */
  private calculateMatchScores(games: LiveGame[]): void {
    // Group games by player pair (normalized so order doesn't matter)
    const matchMap = new Map<string, LiveGame[]>();

    for (const game of games) {
      const matchId = this.getMatchId(game.white.name, game.black.name);
      if (!matchMap.has(matchId)) {
        matchMap.set(matchId, []);
      }
      matchMap.get(matchId)!.push(game);
    }

    // Calculate cumulative scores for each match
    for (const [matchId, matchGames] of matchMap) {
      // Sort games by leg to ensure correct order (1, 2, TB)
      const sortedGames = matchGames.sort((a, b) => {
        const legA = a.leg === 'TB' ? 999 : parseInt(a.leg || '0');
        const legB = b.leg === 'TB' ? 999 : parseInt(b.leg || '0');
        return legA - legB;
      });

      if (isDev) {
        log(`\n=== Match: ${matchId} ===`);
        log(`Found ${sortedGames.length} games for this match`);
      }

      // Track cumulative scores across all games in the match
      let whiteScore = 0;
      let blackScore = 0;

      // Calculate cumulative score for each game
      for (let i = 0; i < sortedGames.length; i++) {
        const currentGame = sortedGames[i];

        // Determine which player is white in the current game
        const player1Name = sortedGames[0].white.name; // First game white player
        const isPlayer1White = currentGame.white.name === player1Name;

        if (isDev) {
          log(`\nGame ${i + 1} (leg: ${currentGame.leg}):`);
          log(`  ${currentGame.white.name} (W) vs ${currentGame.black.name} (B)`);
          log(`  Result: ${currentGame.result}`);
          log(`  Player1 (${player1Name}) is ${isPlayer1White ? 'White' : 'Black'} in this game`);
        }

        // Add current game's result to cumulative scores (if finished)
        if (currentGame.result !== '*') {
          if (currentGame.result === '1-0') {
            // White won
            if (isPlayer1White) {
              whiteScore += 1;
            } else {
              blackScore += 1;
            }
          } else if (currentGame.result === '0-1') {
            // Black won
            if (isPlayer1White) {
              blackScore += 1;
            } else {
              whiteScore += 1;
            }
          } else if (currentGame.result === '1/2-1/2') {
            // Draw
            whiteScore += 0.5;
            blackScore += 0.5;
          }
        }

        // Apply scores based on current game's color arrangement
        if (isPlayer1White) {
          currentGame.white.matchScore = whiteScore;
          currentGame.black.matchScore = blackScore;
        } else {
          currentGame.white.matchScore = blackScore;
          currentGame.black.matchScore = whiteScore;
        }

        if (isDev) {
          log(`  After this game: ${currentGame.white.name}=${currentGame.white.matchScore}, ${currentGame.black.name}=${currentGame.black.matchScore}`);
          log(`  Cumulative: Player1(${player1Name})=${whiteScore}, Player2=${blackScore}`);
        }
      }
    }
  }

  /**
   * Generate a normalized match ID from two player names
   * Always returns the same ID regardless of player order
   */
  private getMatchId(player1: string, player2: string): string {
    const names = [player1, player2].sort();
    return `${names[0]}-vs-${names[1]}`;
  }
}

// Export singleton instance
export const lichessBroadcastService = new LichessBroadcastService();
