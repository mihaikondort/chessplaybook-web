/**
 * Champion Challenge API client.
 *
 * The corpus is served, never bundled: the client sees a position's FEN and
 * nothing else until it answers, at which point the server returns the verdict,
 * the champion's move and the coaching. Every number and every word rendered by
 * this feature originates here — the frontend authors none of it.
 */

import env from '@/config/env';

const BASE = `${env.apiBaseUrl}/api/champion-challenge`;

/** Session lengths the server accepts. */
export const SESSION_LENGTHS = [5, 10, 20] as const;
export type SessionLength = (typeof SESSION_LENGTHS)[number];

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'master';

/** What the client is allowed to know before answering. */
export interface PublicPosition {
  id: number;
  champion: string;
  fen: string;
  sideToMove: 'white' | 'black';
  moveNumber: number;
  difficulty: ChallengeDifficulty;
  legalMoves: number;
}

export interface ChampionSummary {
  champion: string;
  positionCount: number;
  difficulties: Record<string, number>;
}

/** Everything the server discloses once a move is committed. */
export interface AnswerVerdict {
  score: number;
  quality: string;
  /** Coach's line, authored server-side. */
  encouragement: string;
  centipawnLoss: number;
  matchedChampion: boolean;
  matchedBest: boolean;
  beatChampion: boolean;
  userMove: string;
  userEvalCp: number;
  championMove: string;
  championEvalCp: number;
  bestMove: string;
  bestEvalCp: number;
  /** StructuredExplanation, rendered by PositionExplanationCard. */
  feedback: unknown;
}

export interface SessionState {
  challengeId: string;
  champion: string;
  total: number;
  index: number;
  position: PublicPosition | null;
  finished?: boolean;
  remaining?: number;
}

export interface AnswerResult {
  verdict: AnswerVerdict;
  index: number;
  finished: boolean;
  /** Prefetched so advancing costs no round trip. */
  next: PublicPosition | null;
}

export interface SessionSummary {
  totalScore: number;
  positions: number;
  championMatches: number;
  bestMoveMatches: number;
  averageCentipawnLoss: number;
  moveQuality: Record<string, number>;
}

/** Distinguishes "your move was rejected" from "the request failed". */
export class ChallengeApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ChallengeApiError';
  }
}

/**
 * `identified: false` skips the auth headers entirely.
 *
 * Only use it for routes the backend serves without `requireIdentity` — today
 * that is `/champions` alone.
 *
 * The auth helper is imported dynamically, and that matters more than the flag
 * does. A static import puts the whole Cognito/AWS graph in this module's
 * dependency chain, so the picker's chunk could not evaluate until all of it
 * had downloaded — which held the first paint ~650ms behind /champions even
 * after the data and the route chunk were preloaded. Importing at call time
 * keeps that cost on the requests that actually need an identity.
 */
async function request<T>(
  path: string,
  init?: RequestInit,
  { identified = true }: { identified?: boolean } = {},
): Promise<T> {
  const headers = identified
    ? await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders()
    : {};
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers, ...init?.headers },
  });

  let body: { success?: boolean; data?: T; error?: string } | null = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error page (gateway, proxy) — fall through to the status.
  }

  if (!response.ok || !body?.success) {
    throw new ChallengeApiError(
      body?.error || `Request failed (${response.status})`,
      response.status,
    );
  }
  return body.data as T;
}

/** Public — the picker's first call, deliberately unauthenticated (see `request`). */
export function fetchChampions(): Promise<ChampionSummary[]> {
  return request<ChampionSummary[]>('/champions', undefined, { identified: false });
}

export function startSession(champion: string, length?: SessionLength): Promise<SessionState> {
  return request<SessionState>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ champion, ...(length ? { length } : {}) }),
  });
}

export function resumeSession(challengeId: string): Promise<SessionState & { answered: number }> {
  return request<SessionState & { answered: number }>(`/sessions/${challengeId}`);
}

export function submitMove(challengeId: string, san: string): Promise<AnswerResult> {
  return request<AnswerResult>(`/sessions/${challengeId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ san }),
  });
}

export function fetchSummary(challengeId: string): Promise<{
  challengeId: string;
  champion: string;
  finished: boolean;
  summary: SessionSummary;
  remaining: number;
}> {
  return request(`/sessions/${challengeId}/summary`);
}
