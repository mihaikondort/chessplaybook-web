/**
 * SearchTransport — the UCI-engine transport abstraction used by
 * CommentarySearchProtocol. Decouples the protocol logic (UCI command
 * sequence, parsing) from the underlying mechanism that ships commands
 * to the engine and receives its output lines.
 *
 * Two production implementations exist:
 *   - WorkerTransport  — browser-side, wraps a Web Worker running SF WASM
 *                        (used by AnalysisService.getCommentarySearchData)
 *   - NodeTransport    — Node.js-side, wraps the npm `stockfish` package's
 *                        Node mode (used by backend test harness)
 *
 * The protocol module (CommentarySearchProtocol.ts) is deliberately written
 * against THIS interface only — it contains no Worker code, no subprocess
 * code, no DOM access. That guarantees byte-identical UCI behaviour
 * regardless of which transport is plugged in, which is the whole point of
 * this abstraction (see TEST_PARITY_AND_SF18 plan Phase 4).
 */

export interface SearchTransport {
  /**
   * Send a raw UCI command to the engine. No trailing newline — the
   * transport adds one if the underlying channel needs it.
   */
  send(command: string): void;

  /**
   * Subscribe to engine output lines. The callback is invoked exactly once
   * per complete line of UCI output (stdout in Node, postMessage in
   * Worker). Returns an unsubscribe function; callers MUST call it when
   * they no longer need lines (typically on dispose) to avoid leaks.
   */
  onLine(listener: (line: string) => void): () => void;

  /**
   * Release transport-held resources. Semantics vary by implementation:
   *
   *   WorkerTransport — detaches listeners from the AnalysisService's
   *     shared worker. Does NOT terminate the worker (the panel flow
   *     still needs it).
   *
   *   NodeTransport — terminates the subprocess / releases the WASM
   *     instance. Further send/onLine calls are undefined behaviour.
   *
   * Calling dispose() more than once is safe (no-op after the first).
   */
  dispose(): void;
}
