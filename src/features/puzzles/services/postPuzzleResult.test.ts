/**
 * The client half of the one-result-per-solve guarantee (plan B4b).
 *
 * The server now rolls a failed result back completely and answers 503 with
 * `retryable: true`. Before this, both call sites acted on `res.ok` alone and
 * dropped everything else, so a rolled-back solve simply vanished: no rating
 * change, no attempt row, nothing tried again.
 *
 * What these assert is the pair of rules that make retrying safe rather than
 * reckless — the same `tryId` every time, and only on the status the server
 * declared retryable.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { postPuzzleResult } from './postPuzzleResult';

const BODY = { puzzleId: 'p1', tryId: 'try-1', solved: true, correctMoves: 2, totalMoves: 2 };
const HEADERS = { 'X-Anonymous-Id': 'someone' };
/** No real waiting — the backoff is a policy, not something to sit through. */
const noWait = () => Promise.resolve();

function reply(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('postPuzzleResult', () => {
  it('returns the server figures on the first success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(reply(200, { data: { newRating: 1234, ratingChange: 6 } }));

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome).toEqual({ ok: true, unrecorded: false, data: { newRating: 1234, ratingChange: 6 } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries a 503 and reports the result that finally lands', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply(503, { retryable: true, tryId: 'try-1' }))
      .mockResolvedValueOnce(reply(200, { data: { newRating: 1240, ratingChange: 8 } }));

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome.ok).toBe(true);
    expect(outcome.data?.newRating).toBe(1240);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  /*
    THE RULE THAT MAKES RETRYING SAFE. A fresh id would make the retry a new
    logical try and defeat the guard the server uses to score it once. This is
    the assertion that would fail if anyone ever "helpfully" regenerated it.
  */
  it('sends the same tryId on every attempt', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply(503, { retryable: true }))
      .mockResolvedValueOnce(reply(503, { retryable: true }))
      .mockResolvedValueOnce(reply(200, { data: { newRating: 1, ratingChange: 0 } }));

    await postPuzzleResult(HEADERS, BODY, noWait);

    const sent = vi.mocked(fetch).mock.calls.map(call => JSON.parse((call[1] as RequestInit).body as string));
    expect(sent).toHaveLength(3);
    for (const payload of sent) expect(payload.tryId).toBe('try-1');
  });

  /*
    AND THE RULE THAT KEEPS IT FROM BEING RECKLESS. A 409 means the presentation
    belongs to another identity and a 400 means the body is wrong; both fail
    identically for ever, so retrying turns one bad request into three.
  */
  it.each([409, 400, 401, 500])('does not retry a %i', async status => {
    vi.mocked(fetch).mockResolvedValue(reply(status, {}));

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome).toEqual({ ok: false, unrecorded: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after three attempts and says the solve went unrecorded', async () => {
    vi.mocked(fetch).mockResolvedValue(reply(503, { retryable: true }));

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome).toEqual({ ok: false, unrecorded: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  /*
    A REPLAY IS A SUCCESS, NOT A SPECIAL CASE. If the first response was lost in
    transit after the server had committed, the retry gets the stored response
    back verbatim and the caller cannot tell the difference — which is the whole
    point of storing it.
  */
  it('treats a replayed response as an ordinary success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reply(503, { retryable: true }))
      .mockResolvedValueOnce(reply(200, { data: { newRating: 1300, ratingChange: 5 } }));

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome.ok).toBe(true);
    expect(outcome.data).toEqual({ newRating: 1300, ratingChange: 5 });
  });

  it('backs off between attempts rather than hammering', async () => {
    vi.mocked(fetch).mockResolvedValue(reply(503, { retryable: true }));
    const waits: number[] = [];

    await postPuzzleResult(HEADERS, BODY, async ms => { waits.push(ms); });

    expect(waits).toEqual([250, 1_000]);
  });

  it('does not treat an unparseable success as a failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true, status: 200, json: async () => { throw new Error('not JSON'); },
    } as unknown as Response);

    const outcome = await postPuzzleResult(HEADERS, BODY, noWait);

    expect(outcome.ok).toBe(true);
    expect(outcome.data).toBeUndefined();
  });
});
