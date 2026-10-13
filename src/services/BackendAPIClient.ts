/**
 * Backend API Client Service
 * Handles all communication with the Fastify backend API
 */

import env from '@/config/env';
import { portraitPath } from '@/config/championPortraits';
import type { PlayersMap, PgnGame, ChessGame } from '../types/chess';
import type {
  BestGame,
  BestGamesQueryOptions,
  BestGamesResponse,
  BestGamesSortField,
  SortOrder,
} from '../types/bestGames';

// Backend response types
interface APIResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  player?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface APIError {
  success: false;
  error: string;
  message: string;
}

/**
 * Issue #10 (2026-04-19): custom Error subclass that carries the HTTP
 * status through the client → caller boundary. The prior implementation
 * threw plain `Error(message)` which forced callers to substring-match
 * the message ("429", "rate", "limit", "unavailable", etc.) to classify
 * the failure. That matching was unreliable — the backend's 429 body
 * reads "Too many requests. Please try again in N seconds." and
 * contains none of those substrings, so rate-limit hits silently fell
 * through to generic error UI.
 *
 * Callers can now check `err instanceof APIHTTPError && err.status ===
 * 429` for reliable classification. `err.message` still carries the
 * server-provided human-readable message for display when no specific
 * code path matches.
 */
export class APIHTTPError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly serverError?: string;

  constructor(status: number, statusText: string, message: string, serverError?: string) {
    super(message);
    this.name = 'APIHTTPError';
    this.status = status;
    this.statusText = statusText;
    this.serverError = serverError;
  }
}

// Backend player type (from database)
interface BackendPlayer {
  id: number;
  name: string;
  slug: string;
  player_type: string;
  title: string;
  years_champion: string;
  peak_rating: number;
  display_order: number;
  is_featured: boolean;
  category: string;
  birth_year: number;
  death_year: number | null;
  nationality: string;
  bio: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Backend game type (from database)
interface BackendGame {
  id: number;
  pgn: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
  white_player: string;
  black_player: string;
  white_elo?: number;
  black_elo?: number;
  white_player_id?: number;
  black_player_id?: number;
  eco_code?: string;
  move_count?: number;
  is_featured: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Backend best game type (from database)
interface BackendBestGame {
  id: number;
  player_id: number;
  rank: number;
  source_game_id: string;
  pgn: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
  white_player: string;
  black_player: string;
  white_elo?: number;
  black_elo?: number;
  eco_code?: string;
  opening_name?: string;
  game_quality_score: number;
  player_color: string;
  player_accuracy?: number;
  opponent_accuracy?: number;
  white_accuracy?: number;
  black_accuracy?: number;
  result_for_player?: string;
  white_blunders: number;
  white_mistakes: number;
  white_inaccuracies: number;
  black_blunders: number;
  black_mistakes: number;
  black_inaccuracies: number;
  white_acpl?: number;
  black_acpl?: number;
  source_file?: string;
  created_at: string;
  updated_at: string;
}

interface GetPlayerGamesOptions {
  limit?: number;
  offset?: number;
  result?: string;
  opponent?: string;
}

interface PlayerGamesResponse {
  games: PgnGame[];
  total: number;
  hasMore: boolean;
  player?: {
    id: number;
    name: string;
    slug: string;
  };
}

class BackendAPIClient {
  private apiUrl: string;
  private cache: Map<string, any> = new Map();

  constructor(apiUrl?: string) {
    // Empty string is valid (for proxy in dev mode)
    this.apiUrl = apiUrl ?? env.apiBaseUrl;
  }

  /**
   * Generic fetch wrapper with error handling and timeout.
   * Default timeout is 5s; callers can override (e.g. shorter for pages with static fallbacks).
   */
  private async fetch<T>(endpoint: string, timeoutMs = 5000): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        const error: APIError = await response.json().catch(() => ({
          success: false as const, error: 'Network error', message: `HTTP ${response.status}`,
        }));
        throw new APIHTTPError(
          response.status, response.statusText,
          error.message || `HTTP ${response.status}: ${response.statusText}`,
          error.error,
        );
      }

      const data: APIResponse<T> = await response.json();

      if (!data.success) {
        throw new Error('API request failed');
      }

      return data.data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generic POST wrapper with error handling.
   * Returns the full API response (not just data) so callers can check success/cached flags.
   */
  async post<T = any>(endpoint: string, body: unknown): Promise<APIResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error: APIError = await response.json().catch(() => ({
          success: false as const, error: 'Network error', message: `HTTP ${response.status}`,
        }));
        throw new APIHTTPError(
          response.status, response.statusText,
          error.message || `HTTP ${response.status}: ${response.statusText}`,
          error.error,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API POST Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Generic GET wrapper with error handling.
   * Parallels `post` but for GET requests. Returns the raw JSON response
   * as-is (not wrapped in APIResponse<T>) so it works for endpoints that
   * return arbitrary shapes like cache-check ({ cached, result }).
   *
   * Use this for new lightweight GET endpoints that don't follow the
   * standard success/data wrapping convention. For the old standard
   * endpoints, prefer the private `fetch` helper which validates the
   * success flag.
   */
  async get<T = any>(endpoint: string): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        const error: APIError = await response.json().catch(() => ({
          success: false as const, error: 'Network error', message: `HTTP ${response.status}`,
        }));
        throw new APIHTTPError(
          response.status, response.statusText,
          error.message || `HTTP ${response.status}: ${response.statusText}`,
          error.error,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API GET Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Transform backend player to frontend Player type
   */
  private transformPlayer(backendPlayer: BackendPlayer): { slug: string; player: any } {
    return {
      slug: backendPlayer.slug,
      player: {
        fullName: backendPlayer.name,
        imagePath: backendPlayer.image_url || portraitPath(backendPlayer.slug.charAt(0).toUpperCase() + backendPlayer.slug.slice(1)),
        championshipYears: backendPlayer.years_champion,
        biography: backendPlayer.bio,
      },
    };
  }

  /**
   * Transform backend game to frontend PgnGame type
   */
  private transformGame(backendGame: BackendGame, playerName: string): PgnGame {
    const metadata: ChessGame = {
      playerName,
      white: backendGame.white_player,
      black: backendGame.black_player,
      result: backendGame.result || '*',
      event: backendGame.event || 'Unknown Event',
      site: backendGame.site || 'Unknown',
      date: backendGame.date || '????.??.??',
      eco: backendGame.eco_code,
      round: backendGame.round,
      whiteElo: backendGame.white_elo?.toString(),
      blackElo: backendGame.black_elo?.toString(),
    };

    return {
      metadata,
      pgn: backendGame.pgn,
    };
  }

  /**
   * Transform backend best game to frontend BestGame type
   */
  private transformBestGame(backendGame: BackendBestGame): BestGame {
    return {
      id: backendGame.id,
      playerId: backendGame.player_id,
      rank: backendGame.rank,
      sourceGameId: backendGame.source_game_id,
      pgn: backendGame.pgn,
      event: backendGame.event,
      site: backendGame.site,
      date: backendGame.date,
      round: backendGame.round,
      result: backendGame.result,
      whitePlayer: backendGame.white_player,
      blackPlayer: backendGame.black_player,
      whiteElo: backendGame.white_elo,
      blackElo: backendGame.black_elo,
      ecoCode: backendGame.eco_code,
      openingName: backendGame.opening_name,
      playerColor: backendGame.player_color as 'white' | 'black',
      resultForPlayer: backendGame.result_for_player,
      metrics: {
        gameQualityScore: backendGame.game_quality_score,
        playerAccuracy: backendGame.player_accuracy,
        opponentAccuracy: backendGame.opponent_accuracy,
        whiteAccuracy: backendGame.white_accuracy,
        blackAccuracy: backendGame.black_accuracy,
        whiteACPL: backendGame.white_acpl,
        blackACPL: backendGame.black_acpl,
        whiteBlunders: backendGame.white_blunders,
        whiteMistakes: backendGame.white_mistakes,
        whiteInaccuracies: backendGame.white_inaccuracies,
        blackBlunders: backendGame.black_blunders,
        blackMistakes: backendGame.black_mistakes,
        blackInaccuracies: backendGame.black_inaccuracies,
      },
    };
  }

  /**
   * Get all players
   */
  async getPlayers(): Promise<PlayersMap> {
    const cacheKey = 'players';

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const players = await this.fetch<BackendPlayer[]>('/api/players');

      // Transform to frontend format
      const playersMap: PlayersMap = {};
      players.forEach((backendPlayer) => {
        const transformed = this.transformPlayer(backendPlayer);
        playersMap[transformed.slug] = transformed.player;
      });

      // Cache the result
      this.cache.set(cacheKey, playersMap);

      return playersMap;
    } catch (error) {
      console.error('Failed to load players:', error);
      throw new Error('Failed to load chess champions. Please try again.');
    }
  }

  /**
   * Get single player by slug
   */
  async getPlayer(slug: string): Promise<any> {
    try {
      const player = await this.fetch<BackendPlayer>(`/api/players/${slug}`);
      return this.transformPlayer(player).player;
    } catch (error) {
      console.error(`Failed to load player ${slug}:`, error);
      throw new Error(`Failed to load player information. Please try again.`);
    }
  }

  /**
   * Get player's games with pagination
   */
  async getPlayerGames(
    slug: string,
    options: GetPlayerGamesOptions = {}
  ): Promise<PlayerGamesResponse> {
    const { limit = 50, offset = 0, result, opponent } = options;

    // Build query string
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (result) params.append('result', result);
    if (opponent) params.append('opponent', opponent);

    const queryString = params.toString();
    const endpoint = `/api/players/${slug}/games${queryString ? `?${queryString}` : ''}`;

    try {
      const url = `${this.apiUrl}${endpoint}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data: APIResponse<BackendGame[]> = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch games');
      }

      // Get player name from first game or use slug
      const playerName = data.player?.name || slug;

      // Transform games to frontend format
      const games = data.data.map((game) => this.transformGame(game, playerName));

      return {
        games,
        total: data.pagination?.total || games.length,
        hasMore: data.pagination?.hasMore || false,
        player: data.player,
      };
    } catch (error) {
      console.error(`Failed to load games for ${slug}:`, error);
      throw new Error('Failed to load games. Please try again.');
    }
  }

  /**
   * Get single game by ID
   */
  async getGame(id: number): Promise<PgnGame> {
    try {
      const game = await this.fetch<BackendGame>(`/api/games/${id}`);
      // Use white player as playerName (can be refined)
      return this.transformGame(game, game.white_player);
    } catch (error) {
      console.error(`Failed to load game ${id}:`, error);
      throw new Error('Failed to load game. Please try again.');
    }
  }

  /**
   * Get featured games
   */
  async getFeaturedGames(limit?: number): Promise<PgnGame[]> {
    try {
      const endpoint = limit ? `/api/games/featured?limit=${limit}` : '/api/games/featured';
      const games = await this.fetch<BackendGame[]>(endpoint);

      return games.map((game) => this.transformGame(game, game.white_player));
    } catch (error) {
      console.error('Failed to load featured games:', error);
      throw new Error('Failed to load featured games. Please try again.');
    }
  }

  /**
   * Get player's best games with pagination and sorting
   */
  async getPlayerBestGames(
    slug: string,
    options: BestGamesQueryOptions = {}
  ): Promise<BestGamesResponse> {
    const { limit = 50, offset = 0, sort, order } = options;

    // Build query string
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (sort) params.append('sort', sort);
    if (order) params.append('order', order);

    const queryString = params.toString();
    const endpoint = `/api/players/${slug}/best-games${queryString ? `?${queryString}` : ''}`;

    try {
      const url = `${this.apiUrl}${endpoint}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data: APIResponse<BackendBestGame[]> = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch best games');
      }

      // Transform games to frontend format
      const games = data.data.map((game) => this.transformBestGame(game));

      return {
        games,
        total: data.pagination?.total || games.length,
        hasMore: data.pagination?.hasMore || false,
        player: data.player,
      };
    } catch (error) {
      console.error(`Failed to load best games for ${slug}:`, error);
      throw new Error('Failed to load best games. Please try again.');
    }
  }

  /**
   * Get single best game by player slug and game index (0-based)
   */
  async getBestGameByIndex(slug: string, index: number): Promise<BestGame> {
    try {
      const url = `${this.apiUrl}/api/players/${slug}/best-games/${index}`;
      const response = await fetch(url);

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data: APIResponse<BackendBestGame> = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch best game');
      }

      return this.transformBestGame(data.data);
    } catch (error) {
      console.error(`Failed to load best game ${index} for ${slug}:`, error);
      throw new Error('Failed to load game. Please try again.');
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance. The API origin (and the empty-string-in-dev
// proxy case) is resolved once, in src/config/env.ts.
export const backendAPIClient = new BackendAPIClient(env.apiBaseUrl);

// Also export class for testing
export default BackendAPIClient;
