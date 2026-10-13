/**
 * The client half of bounded training sessions (TRAINING_SYSTEM D2/D3).
 *
 * Shaped after `ChampionChallengeApi` deliberately — same `request<T>` wrapper,
 * same `{success, data, error}` unwrapping, same call-time import of the auth
 * headers. That last one is not style: a STATIC import of `getAuthToken` pulls
 * the Cognito/AWS graph into whichever chunk touches it, which is what kept the
 * Champion Challenge picker ~650ms behind /champions until it was found.
 *
 * Nothing here is reachable from free solving. `/puzzles` without a session is
 * exactly what it was, which `verify-free-solving-unbounded.ts` asserts.
 */
import env from '@/config/env';

const BASE = `${env.apiBaseUrl}/api/puzzles`;

export type SessionSelection = 'adaptive' | 'weak_areas' | 'failed_review' | 'random';
export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type SessionArea = 'tactics' | 'middlegame' | 'endgame';

export interface SessionProgress {
  completed: number;
  solved: number;
  failed: number;
  ratedAttempts: number;
  /** Null means nothing has been timed yet — never "instant". */
  averageSolveMs: number | null;
  finished: boolean;
  /**
   * What the run scored, against what was expected of it.
   *
   * `realizedScore` counts PARTIAL solving - 3 correct moves of 5 is 0.6 - and
   * `expectedScore` is the Elo expectation of each puzzle against the rating the
   * player held immediately before that attempt. Both null when nothing in the
   * run can be measured, never 0.
   */
  expectedScore: number | null;
  realizedScore: number | null;
  /** How many attempts both sums are over. */
  scoredAttempts: number;
  /**
   * The run's PERFORMANCE RATING, calculated the way a tournament's is: the
   * rating at which this score would have been the expected one, solved exactly
   * from each puzzle's own rating rather than from their average. Capped at the
   * average +-800, where FIDE caps its own table, because a clean sweep is
   * asymptotic.
   */
  performanceRating: number | null;
}

export interface PuzzleSession {
  id: string;
  identityId: string;
  total: number;
  selection: SessionSelection;
  area: SessionArea | null;
  rated: boolean;
  status: SessionStatus;
  createdAt: string;
  endedAt: string | null;
  progress: SessionProgress;
}

export class SessionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** On a 409 the server returns the run that is in the way. */
    readonly active: PuzzleSession | null = null,
  ) {
    super(message);
    this.name = 'SessionApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
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
    throw new SessionApiError(
      body?.error || `Request failed (${response.status})`,
      response.status,
      // A 409 carries the active session in `data`; keeping it is what lets the
      // caller offer "resume or abandon" instead of a dead end.
      (body?.data as PuzzleSession | null) ?? null,
    );
  }
  return body.data as T;
}

export interface SelectionOption {
  id: string;
  /** False for a mode that is declared but not built yet (D5/D6). */
  available: boolean;
}

/**
 * Which modes this server will actually serve (D4b).
 *
 * Asked rather than hardcoded: `weak_areas` and `failed_review` are declared
 * and refused until D5/D6 build them, and a client with its own copy of the
 * list would offer a control the server rejects.
 */
export function fetchSelectionOptions(): Promise<{
  selections: SelectionOption[];
  areas: SessionArea[];
}> {
  return request('/selections');
}

export interface StartSessionInput {
  total: number;
  selection?: SessionSelection;
  area?: SessionArea | null;
  rated?: boolean;
}

export function startSession(input: StartSessionInput): Promise<PuzzleSession> {
  return request<PuzzleSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** The run this player is in the middle of, or null. The reload path. */
export function fetchActiveSession(): Promise<PuzzleSession | null> {
  return request<PuzzleSession | null>('/sessions/active');
}

export function fetchSession(id: string): Promise<PuzzleSession> {
  return request<PuzzleSession>(`/sessions/${id}`);
}

/**
 * Abandon a run.
 *
 * **Abandon is the only thing a client can ask for.** `completed` is set by the
 * server when the last attempt lands, and as of E8a it is *refused* here — a
 * run is completed by finishing it, not by saying so. The parameter is kept
 * rather than dropped so the request body still names what it is doing, but it
 * has one legal value and the server would reject the other anyway.
 */
export function endSession(id: string, status: 'abandoned' = 'abandoned'): Promise<PuzzleSession> {
  return request<PuzzleSession>(`/sessions/${id}/end`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
