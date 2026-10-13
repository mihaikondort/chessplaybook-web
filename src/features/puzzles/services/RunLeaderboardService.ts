import env from '@/config/env';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

/**
 * The best runs, by performance rating.
 *
 * A DIFFERENT QUANTITY FROM THE RATING BOARD, which is why it is a different
 * call and a different type. The rating board ranks a PLAYER, accumulated over
 * every attempt they have ever made; this ranks one run, scored the way a
 * tournament performance is. Sharing a response shape would invite sharing a
 * column called "rating", and the two numbers do not mean the same thing.
 */
export interface RunEntry {
  rank: number;
  /**
   * An account's username, or a signed-out player's generated two-word handle.
   *
   * NEVER NULL SINCE 2026-08-20. It used to be, and the page printed the word `Guest` in its
   * place, so a board of guests was a column reading Guest twenty times over. The server names
   * every row now, which is what let guests back onto the board at all.
   */
  username: string;
  /**
   * True when that name was generated rather than chosen.
   *
   * Needed because the two are not otherwise distinguishable: nothing stops an account being
   * called `Silent Solver`, and `users.username` carries no unique constraint. It is also what
   * the caller's own sign-in invitation keys on.
   */
  isGuest: boolean;
  performanceRating: number;
  /** Partial solving included, so this can read 4.5 of 5. */
  score: number;
  total: number;
  playedOn: string;
  /** True on the caller's own row. */
  you?: boolean;
}

export async function fetchRunLeaderboard(
  length: number,
  signal?: AbortSignal,
): Promise<RunEntry[]> {
  /*
    The identity headers are sent so the server can mark the caller's own row.
    Nothing about the board is private, and a guest gets the same board.
  */
  const headers = await getRequestHeaders();
  const response = await fetch(
    `${env.apiBaseUrl}/api/leaderboard/runs?length=${length}`,
    { headers, signal },
  );
  if (!response.ok) throw new Error(`Run leaderboard failed (${response.status})`);
  const body = await response.json();
  return body.entries ?? [];
}
