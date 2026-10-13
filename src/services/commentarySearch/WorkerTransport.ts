/**
 * WorkerTransport — SearchTransport implementation for the browser's
 * Web Worker that runs Stockfish WASM.
 *
 * The Worker is OWNED by AnalysisService (which also uses it for the
 * live eval panel). This transport doesn't create or terminate the
 * Worker; it attaches a line-subscriber via an AnalysisService hook
 * for the duration of the commentary search, then detaches on dispose.
 *
 * Exclusivity of the engine during the search is the CALLER's
 * responsibility (AnalysisService drains any in-flight panel search
 * before constructing the transport and marks commentary-active so
 * the panel's parseInfoLine dispatch doesn't also consume the same
 * lines — see AnalysisService.getCommentarySearchData).
 */

import type { SearchTransport } from './SearchTransport';

/**
 * Minimal interface for what the transport needs from the owning
 * AnalysisService. Avoids a circular import and lets us stub the
 * transport easily in unit tests.
 */
export interface AnalysisServiceHook {
  /** Post a raw UCI command string to the engine. */
  dispatchCommand(command: string): void;
  /** Subscribe to UCI output lines for the duration of a transport's
   *  lifetime. Must be callable multiple times (one per transport
   *  instance); each returns its own unsubscribe. */
  onEngineOutput(listener: (line: string) => void): () => void;
}

export class WorkerTransport implements SearchTransport {
  private unsubscribeOutput: (() => void) | null = null;
  private listeners: Set<(line: string) => void> = new Set();
  private disposed = false;

  constructor(private readonly service: AnalysisServiceHook) {
    this.unsubscribeOutput = service.onEngineOutput((line) => {
      if (this.disposed) return;
      // Clone to avoid concurrent-modification issues if a subscriber
      // unsubscribes from within its own callback.
      [...this.listeners].forEach((l) => l(line));
    });
  }

  send(command: string): void {
    if (this.disposed) {
      throw new Error('WorkerTransport.send called after dispose()');
    }
    this.service.dispatchCommand(command);
  }

  onLine(listener: (line: string) => void): () => void {
    if (this.disposed) {
      throw new Error('WorkerTransport.onLine called after dispose()');
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.unsubscribeOutput?.();
    this.unsubscribeOutput = null;
  }
}
