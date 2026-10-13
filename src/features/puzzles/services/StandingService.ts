/**
 * Where a guest would sit on the puzzle leaderboard.
 *
 * WHY A GUEST NEEDS TELLING AT ALL. Their rating lives in `user_preferences`
 * and the board is built from `ratings`, so they are not filtered off it —
 * they are in a table it never reads. Measured on production 2026-08-09: 53
 * people solved a puzzle that day, every one of them a guest, and the board
 * showed 9 names, none of whom had played.
 *
 * `eligible` is the whole contract. It is false below the board's own
 * thresholds and `rank` is then null — never render a number in that case. An
 * offer of fourth place to someone who would not appear at all is the offer
 * breaking on the day it is accepted.
 *
 * Note the response is NOT wrapped in `{ success, data }` — this route replies
 * with the payload directly, unlike the puzzles routes.
 */
import env from '@/config/env';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

export interface PuzzleStanding {
  identified: boolean;
  /** True only when this rating would actually be listed. */
  eligible: boolean;
  /** Ties share a rank. Null whenever `eligible` is false. */
  rank: number | null;
  /** Players on the board, counting this one when they would join it. */
  total: number;
  rating: number | null;
  ratedAttempts?: number;
}

export async function fetchPuzzleStanding(signal?: AbortSignal): Promise<PuzzleStanding> {
  const headers = await getRequestHeaders();
  const res = await fetch(`${env.apiBaseUrl}/api/leaderboard/standing`, { headers, signal });
  if (!res.ok) throw new Error(`standing request failed: ${res.status}`);
  return await res.json() as PuzzleStanding;
}

/**
 * 1st, 2nd, 3rd, 4th — and 11th, 12th, 13th, which is the case a naive
 * last-digit rule gets wrong and which a small board will eventually reach.
 */
export function ordinal(n: number): string {
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
