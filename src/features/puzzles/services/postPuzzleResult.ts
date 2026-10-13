import env from '@/config/env';

/**
 * POST a puzzle result, retrying the one failure the server says is retryable.
 *
 * WHY THIS EXISTS. The server used to record the attempt row LAST, after the
 * rating had already moved, and swallowed its errors — so a failed write left
 * the rating changed with no replay record, and a retry with the same `tryId`
 * ran the whole sequence again and moved the rating a SECOND time for one solve
 * (plan B4). That is fixed: the claim, the rating, the preferences and the
 * attempt row are now one transaction, and a failure rolls all of it back and
 * answers 503 with `retryable: true`.
 *
 * Which moved the problem here. A rolled-back result is a solve that never
 * happened, so without this the player's rating simply does not move and
 * nothing tries again — a smaller wrong than double-counting, and still wrong.
 *
 * RETRYING IS SAFE BECAUSE OF THE SAME TRANSACTION. The presentation claim rolls
 * back with everything else, so the retry is not a second attempt at scoring: it
 * is the first one, again. And if a response was lost in transit AFTER the
 * server committed, the replay guard returns the stored response verbatim rather
 * than scoring anything twice. Both paths end at exactly one result.
 *
 * ONLY `retryable` IS RETRIED, and that is deliberate. A 409 means the
 * presentation belongs to someone else and a 400 means the body is wrong; both
 * would fail identically for ever, and hammering them would turn one bad request
 * into four. A network throw is also NOT retried here: it cannot be
 * distinguished from a request the server did receive, and the caller's own
 * offline handling already covers it.
 */
const RETRYABLE_STATUS = 503;
const ATTEMPTS = 3;
const BACKOFF_MS = [250, 1_000];

export interface PuzzleResultOutcome {
  /** The parsed body when the server scored (or replayed) the result. */
  data?: { newRating: number; ratingChange: number; frozen?: boolean };
  ok: boolean;
  /** True when every attempt came back retryable — the solve was NOT recorded. */
  unrecorded: boolean;
}

export async function postPuzzleResult(
  headers: Record<string, string>,
  body: unknown,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
): Promise<PuzzleResultOutcome> {
  let lastRetryable = false;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const response = await fetch(`${env.apiBaseUrl}/api/puzzles/result`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      /* THE SAME BODY, INCLUDING THE SAME `tryId`. A fresh id would make the
         retry a new logical try and defeat the guard that makes this safe. */
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const parsed = await response.json().catch(() => null);
      return { ok: true, unrecorded: false, data: parsed?.data };
    }

    if (response.status !== RETRYABLE_STATUS) {
      return { ok: false, unrecorded: false };
    }

    lastRetryable = true;
    if (attempt < ATTEMPTS - 1) await wait(BACKOFF_MS[attempt]);
  }

  /*
    Reported rather than swallowed. The caller cannot fix it, but it can decline
    to show a rating change that did not happen — which is the honest end state
    for a solve the server rolled back.
  */
  return { ok: false, unrecorded: lastRetryable };
}
