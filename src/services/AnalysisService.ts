/**
 * Analysis Service
 *
 * Manages Stockfish chess engine via Web Worker.
 * Provides API for chess position analysis with debouncing and caching.
 */

import { Chess } from 'chess.js';
import type { AnalysisResult, AnalysisConfig } from '@/types/analysis';
import {
  WorkerTransport,
  getCommentarySearchData as runCommentaryProtocol,
  type CommentarySearchData,
} from './commentarySearch';
import { claimEngineLease, releaseEngineLease } from './engineLease';

/**
 * Which surface a search belongs to.
 *
 * `panel` is the long-standing interactive path — the user's persisted enable
 * preference, their 1-3 PV choice, `go depth 15`. `compact` is the resolved-
 * puzzle card: one PV, time-bounded, and owned by the service rather than by
 * a preference the player never set.
 *
 * IT IS ALSO THE CACHE NAMESPACE, and that is not a detail. The cache was
 * keyed on FEN alone and stayed correct only because `setMultiPvCount` cleared
 * it wholesale — the one call the compact path must not make. Without a
 * namespace a one-line compact result would be handed to the three-line panel,
 * which renders one line and two "Calculating..." placeholders forever.
 */
export type AnalysisProfile = 'panel' | 'compact';

/**
 * The compact search's time bound (PZ-043 §0.3b, fixed in C0).
 *
 * A TIME bound, not a depth one, because the requirement is "appears as soon
 * as possible after the position changes" and only a clock answers that.
 * `go depth 15` — what the panel sends — is instant in a simple endgame and
 * seconds in a sharp middlegame, so it cannot promise anything about waiting.
 *
 * 300ms is deliberately shallow. Stockfish reports rising depth as it
 * searches and the card refines in place, so the reader sees a number almost
 * at once and a better one a moment later; what they never see is an empty
 * card while the engine thinks.
 */
const COMPACT_MOVETIME_MS = 300;

/**
 * Name the ending, for a position the engine has no move for.
 *
 * Checkmate and stalemate are told apart because they are opposite results and
 * a solver reading "Draw" under a mate they just delivered would rightly
 * distrust the whole card. The fallbacks are deliberately vaguer: insufficient
 * material, the fifty-move rule and repetition are all draws and naming the
 * wrong one is worse than naming none.
 *
 * Falls back to "No moves" if the FEN will not parse at all — the card must say
 * something rather than hang, which is the entire defect this exists to fix.
 */
function terminalDescription(fen: string): string | null {
  try {
    const position = new Chess(fen);
    if (position.isCheckmate()) {
      // Whose win, not merely that it ended: the side to move is the mated one.
      return position.turn() === 'w' ? 'Checkmate — Black wins' : 'Checkmate — White wins';
    }
    if (position.isStalemate()) return 'Stalemate — draw';
    if (position.isDraw()) return 'Draw';
    return null;
  } catch {
    return null;
  }
}

/** As above, but for the engine having already told us there is no move. */
function describeTerminalPosition(fen: string): string {
  return terminalDescription(fen) ?? 'No moves available';
}

// Worker wrapper interface
interface WorkerWrapper {
  postMessage: (message: string) => void;
  terminate: () => void;
}

export class AnalysisService {
  private static instance: AnalysisService;
  private worker: WorkerWrapper | null = null;
  private isInitialized = false;
  private isEnabled = false; // Default: OFF for battery saving
  private currentFen = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Set<(result: AnalysisResult | null) => void> = new Set();
  private enabledCallbacks: Set<(enabled: boolean) => void> = new Set();
  private cache: Map<string, AnalysisResult> = new Map();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEBOUNCE_MS = 400; // Same as Flutter app
  private readonly THROTTLE_MS = 500; // Throttle UI updates to reduce CPU usage
  private isAnalyzing = false;
  private lastNotificationTime = 0;
  private pendingResult: AnalysisResult | null = null;
  // FEN waiting to be analyzed after the current search stops, with the
  // profile it belongs to — a queued compact request must not resume as a
  // panel search, or it would run `go depth 15` under the compact card.
  private pendingAnalysis: { fen: string; profile: AnalysisProfile } | null = null;
  private analysisTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly ANALYSIS_TIMEOUT_MS = 10000; // 10 seconds timeout
  private multiPvCount = 1; // Number of principal variations to calculate (1-3)
  // Engine config. Commentary search temporarily bumps Hash to 32 and
  // MultiPV to 1 via CommentarySearchProtocol; restored from these
  // values by getCommentarySearchData when done.
  // See SEARCH_QUALITY_PLAN.md §11.1 and
  // src/services/commentarySearch/CommentarySearchProtocol.ts.
  private engineThreads = 1;
  private engineHashMb = 16;
  private currentPvLines: Map<number, { evaluation: string; moves: string; multipv: number }> = new Map(); // Accumulate PV lines
  private currentWdl: { win: number; draw: number; loss: number } | undefined = undefined; // Current WDL statistics (from PV 1)

  // P.6: Raw UCI output capture for commentary pipeline
  private rawOutputLines: string[] = [];

  // ── Compact mode (PZ-043 C1) ──────────────────────────────────────────
  // Separate subscribers, separate debounce timer, and a flag saying which
  // surface the in-flight search belongs to. Only one search runs at a time
  // on the one worker, so a single flag is sufficient to route its output.
  private compactCallbacks: Set<(result: AnalysisResult | null) => void> = new Set();
  private compactDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private activeProfile: AnalysisProfile = 'panel';
  // True while the engine's MultiPV has been bent to 1 for a compact search
  // and still owes the panel its setting back.
  private compactMultiPvApplied = false;
  // Set when another tab steals the engine. Sticky until this tab claims it
  // back, so a surface mounting afterwards learns the truth immediately
  // instead of rendering an empty panel.
  private leaseLost = false;
  // Told when the engine becomes free again — see `handleLeaseAvailable`.
  private engineAvailableCallbacks: Set<() => void> = new Set();

  // Game Report: client-side batch analysis — dedicated mode so the
  // engine output loop routes info/bestmove lines to our accumulator
  // instead of firing the panel's notifyCallbacks pipeline.
  private batchSearchMode = false;
  private batchSearchOutput: string[] = [];
  private batchSearchResolve: (() => void) | null = null;
  // Commentary search is active (getCommentarySearchData is running).
  // While true, handleEngineOutput suppresses the panel's
  // parseInfoLine dispatch so commentary's deep MultiPV=1 search
  // doesn't pollute the user-visible evaluation display. The WorkerTransport
  // + CommentarySearchProtocol handle the actual UCI collection via
  // the `engineOutputSubscribers` listener fan-out below.
  private commentaryActive = false;
  // Phase 4 of TEST_PARITY_AND_SF18: subscriber-based engine output
  // fan-out. Lets the CommentarySearchProtocol consume raw UCI lines
  // without AnalysisService knowing about the protocol. See
  // WorkerTransport and src/services/commentarySearch/.
  private engineOutputSubscribers: Set<(line: string) => void> = new Set();
  // One-shot hook used to wait until the engine emits bestmove after
  // we've issued `stop` on an in-flight panel search. Needed so the
  // game-report batch doesn't race against a leftover panel search.
  private stopDrainResolve: (() => void) | null = null;

  private constructor() {
    this.loadPreferences();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  /**
   * Initialize Stockfish engine.
   *
   * ── WHY THERE IS AN IN-FLIGHT PROMISE AND NOT JUST A BOOLEAN ─────────────
   *
   * `isInitialized` is not set until ~100ms AFTER `uciok` — this build does not
   * answer `isready` reliably, so the flag is set on a timer. The guard below
   * was that flag alone, which leaves a window several hundred milliseconds
   * wide in which two overlapping callers BOTH pass it and BOTH reach
   * `new Worker(...)`. Two Stockfish workers, in one tab, which is precisely
   * what §0.3a of the PZ-043 plan forbids — and the cross-tab lease cannot see
   * it, because a re-claim by the tab that already holds the lease is
   * deliberately a no-op.
   *
   * It was latent while one surface per page started the engine. The compact
   * card makes two surfaces plausible on one page, so it is fixed here rather
   * than left for whoever hits it. Observed as `[AnalysisService] Engine
   * config` logged twice.
   *
   * Awaiting the same promise makes every concurrent caller share one
   * initialization; the field is cleared on failure so a later attempt can
   * genuinely retry rather than await a promise that already rejected.
   */
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeOnce().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async initializeOnce(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      /*
        THE LEASE IS CLAIMED BEFORE THE WORKER IS CONSTRUCTED, and this is the
        only place in the codebase that constructs one — which is exactly why
        it goes here rather than in the compact card. §0.3a's rule is "one
        Stockfish", and a module singleton only delivers that within a tab.

        Claiming STEALS, so this resolves immediately; the previous holder is
        the one that has to react. Claiming also clears our own `leaseLost`,
        because we have just become the holder again.
      */
      await claimEngineLease(
        () => this.handleLeaseLost(),
        () => this.handleLeaseAvailable(),
      );
      this.leaseLost = false;

      // SF 18 lite-single WASM. The multi-threaded SF 18 lite variant
      // was trialled but its WebAssembly.Memory allocation is unreliable
      // in Chrome under COOP+COEP enforcing — see SEARCH_QUALITY_PLAN.md
      // §11.2. The MultiPV=1 config on lite-single delivers decisive
      // commentary evals without needing cross-origin isolation, so we
      // stay on this path. Upgraded from SF 17.1 → SF 18 per
      // TEST_PARITY_AND_SF18_IMPLEMENTATION_PLAN.md Phase 3; validated
      // by bench-sf18-validation.ts (10/10 sanity + #203 anchor +4.10).
      this.engineThreads = 1;
      this.engineHashMb = 16;
      const workerPath = '/stockfish/stockfish-18-lite-single.js';

      if (import.meta.env.DEV) console.info('[AnalysisService] Engine config', {
        variant: 'lite-single',
        threads: this.engineThreads,
        hashMb: this.engineHashMb,
      });

      // Create Web Worker
      const worker = new Worker(workerPath);

      // Set up message handler
      worker.onmessage = (e: MessageEvent) => {
        this.handleEngineOutput(e.data);
      };

      worker.onerror = (error) => {
        console.warn('[AnalysisService] Worker error', {
          message: (error as ErrorEvent | undefined)?.message ?? String(error),
        });

        // Terminate the failed worker so a subsequent analyzePosition
        // call doesn't leave it running alongside a fresh worker. Also
        // clear pending work to avoid an automatic re-init loop.
        // Through the one teardown — this path used to clear the worker and
        // leave the engine bookkeeping behind, which is the gap that made
        // "every teardown" a list rather than a rule.
        this.teardownEngine();
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        if (this.analysisTimeoutTimer) {
          clearTimeout(this.analysisTimeoutTimer);
          this.analysisTimeoutTimer = null;
        }
        this.pendingAnalysis = null;

        const result: AnalysisResult = {
          fen: this.currentFen || '',
          evaluation: 'ERROR',
          principalVariation: 'Engine error occurred',
          depth: 0,
        };
        // A worker failure used to notify only the full analysis panel. When
        // the compact card owned the search, it consequently remained on
        // “Thinking…” forever even though the engine had already failed.
        if (this.activeProfile === 'compact') this.notifyCompact(result);
        else this.notifyCallbacks(result);

      };

      // Wrap worker
      this.worker = {
        postMessage: (msg: string) => worker.postMessage(msg),
        terminate: () => worker.terminate(),
      };

      // Initialize engine with UCI protocol
      this.sendCommand('uci');

      // Wait for ready
      await this.waitForReady(10000);
    } catch (error) {
      console.error('[AnalysisService] Failed to initialize engine', {
        error: (error as Error | undefined)?.message ?? String(error),
      });
      throw new Error('Failed to load chess engine. Please refresh the page and try again.');
    }
  }

  /**
   * Phase 4 hook: subscribe to raw UCI output lines for the duration
   * of a CommentarySearchProtocol invocation. Returns an unsubscribe
   * function. See src/services/commentarySearch/WorkerTransport.ts for
   * the consumer.
   *
   * Safe to call outside a commentary window (no lines will fire until
   * commentaryActive is true, which getCommentarySearchData manages).
   */
  onEngineOutput(listener: (line: string) => void): () => void {
    this.engineOutputSubscribers.add(listener);
    return () => {
      this.engineOutputSubscribers.delete(listener);
    };
  }

  /**
   * Another tab took the engine.
   *
   * Stop, terminate, and TELL EVERY SUBSCRIBER. A surface that simply went
   * quiet would read as a broken engine — which is worse than the two workers
   * this lease exists to prevent, because the player cannot tell it from a
   * bug. `OTHER_TAB` rides the existing error channel, so `/analysis` reports
   * it in the box it already has and its layout does not move.
   */
  private handleLeaseLost(): void {
    this.leaseLost = true;
    this.stopAnalysis();
    this.stopCompactAnalysis();

    this.teardownEngine();
    // The next search must actually run: `startAnalysisNow` skips a FEN equal
    // to `currentFen`, and after a lease loss there is no result to show for it.
    this.currentFen = '';

    const notice: AnalysisResult = {
      fen: '',
      evaluation: 'OTHER_TAB',
      principalVariation: 'Analysis is running in another tab',
      depth: 0,
    };
    this.callbacks.forEach(cb => cb(notice));
    this.compactCallbacks.forEach(cb => cb(notice));
  }

  /**
   * The engine is free again — the tab that took it released or closed.
   *
   * REPORTED 2026-08-10: the card went on saying *"Analysis is running in
   * another tab"* when it no longer was. The lease-loss state was sticky and
   * had no exit, because nothing was watching for the thief to go away.
   *
   * NO SEARCH IS STARTED HERE. This can fire in a tab nobody is looking at,
   * and spending a core on a background tab is precisely the waste the lease
   * exists to prevent — it would undo the feature in order to implement its own
   * message. It is announced, and whichever surface is actually on screen
   * decides whether to ask for anything.
   *
   * ANNOUNCED ON ITS OWN CHANNEL, NOT AS A `null` RESULT. Emitting `null` was
   * the first attempt and it trades one false statement for another: `null` is
   * the card's "nothing yet" state, which renders *"Thinking…"* — so the card
   * would stop claiming another tab was analysing and start claiming THIS one
   * was, with no search running either way.
   */
  private handleLeaseAvailable(): void {
    if (!this.leaseLost) return;
    this.leaseLost = false;
    this.engineAvailableCallbacks.forEach(cb => cb());
  }

  /**
   * Told when the engine becomes free after another tab had taken it.
   *
   * Deliberately not a result stream: this says *"you may ask again"*, not
   * *"here is an evaluation"*.
   */
  subscribeEngineAvailable(callback: () => void): () => void {
    this.engineAvailableCallbacks.add(callback);
    return () => this.engineAvailableCallbacks.delete(callback);
  }

  /**
   * END THE ENGINE — the ONE way, so "every teardown" is enforced rather than
   * remembered.
   *
   * There were four places that terminated a worker and each maintained its own
   * idea of what else had to be undone. The pre-deploy review found the gap that
   * arrangement guarantees: the `onerror` path terminated and cleared the worker
   * without resetting `compactMultiPvApplied`, and because `this.worker` was then
   * null, `setEnabled(false)`'s reset — which sat inside `if (this.worker)` —
   * was skipped too. A replacement worker could be built while the service still
   * believed the ENGINE owed the panel its MultiPV back, so the next compact
   * search skipped `MultiPV 1` on a worker never told otherwise.
   *
   * `compactMultiPvApplied` is a fact about a LIVE ENGINE. A worker that no
   * longer exists owes nothing, and a replacement is configured from scratch by
   * `configureEngine()`.
   *
   * Releasing the lease belongs here for the same reason: no worker, no claim.
   * It is a no-op when the lease was already lost, which is the case that brings
   * `handleLeaseLost` through here.
   */
  private teardownEngine(): void {
    if (this.worker) {
      try { this.worker.terminate(); } catch { /* already gone */ }
      this.worker = null;
    }
    this.isInitialized = false;
    this.isAnalyzing = false;
    this.compactMultiPvApplied = false;
    this.currentPvLines.clear();
    this.currentWdl = undefined;
    releaseEngineLease();
  }

  /** Has another tab taken the engine from under us? */
  isEngineHeldElsewhere(): boolean {
    return this.leaseLost;
  }

  /**
   * Phase 4 hook: public UCI command dispatch for transports. Mirrors
   * the internal sendCommand but exposed for WorkerTransport. Prefer
   * the internal sendCommand within this class.
   */
  dispatchCommand(command: string): void {
    this.sendCommand(command);
  }

  /**
   * Fire a UCI output line to all registered subscribers. Clone the
   * subscriber set first to avoid concurrent-modification if a
   * subscriber unsubscribes from within its own callback.
   */
  private fireEngineOutput(line: string): void {
    if (this.engineOutputSubscribers.size === 0) return;
    for (const listener of [...this.engineOutputSubscribers]) {
      try {
        listener(line);
      } catch (err) {
        // A misbehaving subscriber must not break the engine loop.
        if (import.meta.env.DEV) {
          console.warn('[AnalysisService] engine output subscriber threw:', err);
        }
      }
    }
  }

  /**
   * Send UCI command to engine
   */
  private sendCommand(command: string): void {
    if (this.worker) {
      this.worker.postMessage(command);
    } else {
      if (import.meta.env.DEV) {
        console.error('[AnalysisService] Cannot send command - worker not initialized');
      }
    }
  }

  /**
   * Handle output from Stockfish engine
   */
  private handleEngineOutput(line: string): void {
    // UCI handshake complete
    if (line === 'uciok') {
      this.configureEngine();

      // This Stockfish build doesn't respond to isready commands reliably
      // Mark as initialized after uciok and a short delay for commands to process
      setTimeout(() => {
        if (!this.isInitialized) {
          this.isInitialized = true;
        }
      }, 100);
      return;
    }

    // Engine is ready (if it responds - some builds don't)
    if (line === 'readyok') {
      this.isInitialized = true;
      return;
    }

    // Check for errors
    if (line.startsWith('error') || line.startsWith('info string Error')) {
      if (import.meta.env.DEV) {
        console.error('[AnalysisService] Engine error:', line);
      }
      return;
    }

    // Phase 4: commentary search routes through the engineOutputSubscribers
    // fan-out (WorkerTransport → CommentarySearchProtocol). When
    // commentaryActive is true we fire subscribers and suppress the panel
    // dispatch below so the commentary's MultiPV=1 search doesn't hijack
    // the panel's evaluation display. The protocol's getCommentarySearchData
    // also covers the null-move search via the same fan-out.
    if (this.commentaryActive) {
      this.fireEngineOutput(line);
      return;
    }

    // Game Report client-side batch search — routes output away from the
    // panel's parseInfoLine / notifyCallbacks so batch results don't
    // pollute the user-visible analysis display.
    if (this.batchSearchMode) {
      if (line.startsWith('info') || line.startsWith('bestmove')) {
        this.batchSearchOutput.push(line);
      }
      if (line.startsWith('bestmove')) {
        const resolver = this.batchSearchResolve;
        this.batchSearchMode = false;
        this.batchSearchResolve = null;
        resolver?.();
      }
      return;
    }

    // Analysis output
    if (line.startsWith('info') && this.isAnalyzing) {
      this.rawOutputLines.push(line);
      this.parseInfoLine(line);
    }

    // Analysis complete
    if (line.startsWith('bestmove')) {
      this.rawOutputLines.push(line);

      // Clear timeout timer
      if (this.analysisTimeoutTimer) {
        clearTimeout(this.analysisTimeoutTimer);
        this.analysisTimeoutTimer = null;
      }

      this.isAnalyzing = false;

      // Send any pending result that was throttled. Only the panel throttles,
      // so only the panel can have one waiting here.
      if (this.pendingResult) {
        this.callbacks.forEach(cb => cb(this.pendingResult));
        this.pendingResult = null;
      }

      // If someone is waiting for the engine to drain after a `stop`
      // (game-report batch taking over from the panel), notify them
      // BEFORE starting any pending analysis — we want the batch to
      // run next, not the queued panel search.
      if (this.stopDrainResolve) {
        const resolver = this.stopDrainResolve;
        this.stopDrainResolve = null;
        this.pendingAnalysis = null;
        resolver();
        return;
      }

      /*
        A SEARCH THAT PRODUCED NOTHING STILL HAS TO SAY SOMETHING.

        Reported 2026-08-10: the compact card stuck on "Thinking…" forever, and
        the owner's diagnosis was right — the position was checkmate.

        `parseInfoLine` only emits a result for an `info` line carrying a `pv`,
        which is correct: a line with no principal variation has nothing to
        show. But in a TERMINAL position Stockfish has no move to report, so it
        emits no such line and answers `bestmove (none)`. Nothing ever reached
        the card, and "Thinking…" was not a delay — it was the final state.

        Reachable from the trainer in one click: after a puzzle whose solution
        is mate, stepping to the end of the line lands exactly here, and most
        puzzles end in mate. It is the COMMON case, not an edge one.

        chess.js names which ending it is. That is a display string for a
        position already on screen, not a chess fact being derived to reason
        with — the engine remains the authority on evaluation, and here it has
        correctly reported that there is nothing to evaluate.
      */
      /*
        AND ONLY WHEN THE POSITION REALLY IS OVER.

        "No PV lines arrived" is not the same as "the game has ended". A search
        that is STOPPED before its first `info` line — by a timeout, or by the
        player stepping to the next position fast enough — also produces a
        `bestmove` with nothing accumulated, and the fallback would then announce
        *"No moves available"* over a perfectly ordinary position. Found by an
        independent review before deploy, 2026-08-10.

        So it needs corroboration, and there are two independent kinds: the
        engine answering `bestmove (none)`, which it does only when it has no
        move, and chess.js agreeing the position is terminal. Either is enough;
        with neither, this was a stopped search and the correct thing to say is
        nothing — whatever stopped it is already sending its own result.
      */
      if (this.activeProfile === 'compact' && this.currentPvLines.size === 0) {
        const engineHasNoMove = /^bestmove\s+\(?none\)?/.test(line);
        const ending = terminalDescription(this.currentFen);
        if (engineHasNoMove || ending) {
          this.notifyCompact({
            fen: this.currentFen,
            evaluation: 'TERMINAL',
            principalVariation: ending ?? describeTerminalPosition(this.currentFen),
            depth: 0,
          });
        }
      }

      // Start pending analysis if one is queued
      if (this.pendingAnalysis) {
        const queued = this.pendingAnalysis;
        this.pendingAnalysis = null;
        this.startAnalysisNow(queued.fen, queued.profile);
      }
    }
  }

  /**
   * Configure engine settings
   */
  private configureEngine(): void {
    // Hash + Threads come from initialize() (lite-single = 16 MB / 1).
    // Commentary search bumps both temporarily via CommentarySearchProtocol.
    this.sendCommand(`setoption name Hash value ${this.engineHashMb}`);

    // Principal variation count (1-3 lines)
    this.sendCommand(`setoption name MultiPV value ${this.multiPvCount}`);

    this.sendCommand(`setoption name Threads value ${this.engineThreads}`);

    // Enable WDL (Win-Draw-Loss) statistics for accurate winning chances
    this.sendCommand('setoption name UCI_ShowWDL value true');

    // Check if ready - engine will respond with readyok
    this.sendCommand('isready');
  }

  /**
   * Parse UCI info line and extract analysis data
   * With MultiPV, Stockfish sends multiple info lines per depth
   * We emit results immediately with all lines received so far
   */
  private parseInfoLine(line: string): void {
    // Only process lines with full analysis data
    if (!line.includes('depth') || !line.includes('score') || !line.includes('pv')) {
      return;
    }

    try {
      // Extract multipv number (defaults to 1 if not present)
      const multipvMatch = line.match(/multipv (\d+)/);
      const multipvNum = multipvMatch ? parseInt(multipvMatch[1]) : 1;

      // Extract depth
      const depthMatch = line.match(/depth (\d+)/);
      if (!depthMatch) return;
      const depth = parseInt(depthMatch[1]);

      // No depth filtering - using time-limited analysis (movetime 1000)
      // Engine will reach whatever depth it can in 1 second

      // Extract score (centipawns or mate)
      const cpMatch = line.match(/score cp ([-+]?\d+)/);
      const mateMatch = line.match(/score mate ([-+]?\d+)/);

      let evaluation: string;
      if (cpMatch) {
        const centipawns = parseInt(cpMatch[1]);
        evaluation = this.formatCentipawns(centipawns);
      } else if (mateMatch) {
        const mateIn = parseInt(mateMatch[1]);
        evaluation = this.formatMate(mateIn);
      } else {
        return; // No valid score
      }

      // Extract principal variation (PV) - match " pv " with spaces to avoid matching "multipv"
      const pvMatch = line.match(/ pv (.+)$/);
      if (!pvMatch) return;

      const uciMoves = pvMatch[1].split(' ').slice(0, 10); // Limit to 10 moves
      const principalVariation = this.convertUciToSan(uciMoves, this.currentFen);

      // Update the PV line in our accumulator
      this.currentPvLines.set(multipvNum, {
        evaluation,
        moves: principalVariation,
        multipv: multipvNum,
      });

      // Extract nodes if available
      const nodesMatch = line.match(/nodes (\d+)/);
      const nodes = nodesMatch ? parseInt(nodesMatch[1]) : undefined;

      // Extract WDL (Win-Draw-Loss) statistics if available (only from first PV line)
      // Store in class variable so it persists across multiple PV lines
      if (multipvNum === 1) {
        const wdlMatch = line.match(/wdl (\d+) (\d+) (\d+)/);
        if (wdlMatch) {
          const val1 = parseInt(wdlMatch[1]);
          const val2 = parseInt(wdlMatch[2]);
          const val3 = parseInt(wdlMatch[3]);

          // IMPORTANT: Stockfish WDL is from the perspective of the side to move
          // If White to move: val1=white wins, val2=draw, val3=black wins
          // If Black to move: val1=black wins, val2=draw, val3=white wins
          // We always want: win=white wins, draw=draw, loss=black wins
          const isWhiteToMove = this.isWhiteToMove(this.currentFen);

          this.currentWdl = isWhiteToMove ? {
            win: val1,   // White to move: first value = white wins
            draw: val2,  // Draw is always middle value
            loss: val3,  // White to move: third value = black wins
          } : {
            win: val3,   // Black to move: third value = white wins (flipped!)
            draw: val2,  // Draw is always middle value
            loss: val1,  // Black to move: first value = black wins (flipped!)
          };
        }
      }

      // Sort lines by multipv number and convert to array
      const sortedLines = Array.from(this.currentPvLines.values()).sort((a, b) => a.multipv - b.multipv);

      // Create result with all lines received so far (incrementally updating)
      // Use this.currentWdl to persist WDL across multiple PV line updates
      const result: AnalysisResult = {
        fen: this.currentFen,
        evaluation: sortedLines[0].evaluation, // Best line's evaluation
        principalVariation: sortedLines[0].moves, // Best line's moves
        lines: sortedLines,
        depth,
        nodes,
        wdl: this.currentWdl, // Use persisted WDL from class variable
      };

      // Cache and notify immediately (don't wait for all PVs).
      //
      // Cached under the ACTIVE PROFILE, so a one-line compact result can
      // never be served to the three-line panel. Compact results are not
      // throttled: the card is one short line, the 500ms throttle exists to
      // stop the multi-line panel thrashing React, and applying it here would
      // delay exactly the first evaluation this card is judged on.
      this.cacheResult(result, this.activeProfile);
      if (this.activeProfile === 'compact') {
        this.notifyCompact(result);
      } else {
        this.notifyCallbacks(result);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AnalysisService] Error parsing info line:', error);
      }
    }
  }

  /**
   * Check if it's White's turn from FEN
   */
  private isWhiteToMove(fen: string): boolean {
    const parts = fen.split(' ');
    if (parts.length >= 2) {
      return parts[1] === 'w';
    }
    return true; // Default to white if parsing fails
  }

  /**
   * Format centipawns as decimal string
   * Example: 250 -> "+2.50", -125 -> "-1.25"
   * IMPORTANT: Scores are negated when it's Black's turn
   */
  private formatCentipawns(cp: number): string {
    let pawns = cp / 100;

    // Flip sign for black to move (from White's perspective)
    if (!this.isWhiteToMove(this.currentFen)) {
      pawns = -pawns;
    }

    return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
  }

  /**
   * Format mate score
   *
   * UCI Protocol: mate score is from perspective of side to move
   * - Positive: side to move delivers mate
   * - Negative: side to move gets mated
   *
   * We normalize to White's perspective:
   * - Positive: White delivers mate (display "M3")
   * - Negative: Black delivers mate (display "M-3")
   *
   * Example transformations:
   * - White to move, score mate 3 → M3 (White mates in 3)
   * - White to move, score mate -3 → M-3 (Black mates in 3)
   * - Black to move, score mate 3 → M-3 (Black mates in 3, flipped to White's perspective)
   * - Black to move, score mate -3 → M3 (White mates in 3, flipped to White's perspective)
   */
  private formatMate(moves: number): string {
    let adjustedMoves = moves;

    // Flip sign for black to move (convert to White's perspective)
    if (!this.isWhiteToMove(this.currentFen)) {
      adjustedMoves = -adjustedMoves;
    }

    // Display with proper sign: positive = White mates, negative = Black mates
    return adjustedMoves > 0 ? `M${adjustedMoves}` : `M-${Math.abs(adjustedMoves)}`;
  }

  /**
   * Convert UCI moves to Standard Algebraic Notation (SAN)
   * Example: ["e2e4", "c7c5"] -> "1.e4 c5"
   */
  private convertUciToSan(uciMoves: string[], fen: string): string {
    try {
      const chess = new Chess(fen);
      const sanMoves: string[] = [];
      let moveNumber = chess.moveNumber();
      let isWhiteTurn = chess.turn() === 'w';

      for (let i = 0; i < uciMoves.length; i++) {
        const uciMove = uciMoves[i];

        // Skip empty or invalid moves
        if (!uciMove || uciMove.length < 4) {
          continue;
        }

        // Parse UCI move (e.g., "e2e4" or "e7e8q" for promotion)
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        // Make move
        const move = chess.move({
          from,
          to,
          promotion,
        });

        if (!move) {
          break;
        }

        // Format with move numbers
        if (isWhiteTurn) {
          sanMoves.push(`${moveNumber}.${move.san}`);
        } else {
          // For Black's move: if it's the first move in the variation, show "1..."
          if (i === 0) {
            sanMoves.push(`${moveNumber}...${move.san}`);
          } else {
            sanMoves.push(move.san);
          }
          moveNumber++;
        }

        isWhiteTurn = !isWhiteTurn;
      }

      return sanMoves.join(' ');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AnalysisService] Error converting UCI to SAN:', error);
      }
      return uciMoves.join(' '); // Fallback to UCI notation
    }
  }

  /**
   * Wait for engine to be ready
   */
  private async waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.isInitialized) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this.isInitialized) {
          reject(new Error('Engine initialization timeout'));
        }
      }, timeoutMs);
    });
  }

  /**
   * Analyze a chess position
   * @param fen Position in Forsyth-Edwards Notation
   */
  async analyzePosition(fen: string): Promise<void> {
    if (!this.isEnabled) {
      this.notifyCallbacks(null);
      return;
    }

    // Auto-initialize if enabled but not yet initialized
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[AnalysisService] Auto-initialization failed:', error);
        }
        this.notifyCallbacks(null);
        return;
      }
    }

    // Check cache first — the panel's own namespace only.
    const cachedResult = this.getCachedResult(fen, 'panel');
    if (cachedResult) {
      this.notifyCallbacks(cachedResult);
      return;
    }

    // Debounce rapid position changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      /*
        Skip if the PANEL is already on this position.

        `&& this.activeProfile === 'panel'` is load-bearing and was missing.
        `currentFen` is shared by both profiles, so after the compact card
        analysed a position the panel's request for the SAME position returned
        here — a cache miss in its own namespace, then an early return, so it
        received no result at all. Worse, the MultiPV restore lives in
        `startAnalysisNow`, which this return skips: the panel would also have
        been left on the compact search's MultiPV=1, rendering one line and two
        permanent "Calculating…" placeholders.

        Reachable in one step: open /analysis in the named tab from a puzzle,
        which hands it exactly the FEN the compact card just evaluated. Found by
        an independent review on 2026-08-10.
      */
      if (fen === this.currentFen && this.activeProfile === 'panel') {
        return;
      }

      // If engine is currently analyzing, queue this position for later
      if (this.isAnalyzing) {
        // Replaces any previously pending analysis, compact or panel.
        this.pendingAnalysis = { fen, profile: 'panel' };
        this.sendCommand('stop'); // Request engine to stop current analysis
        return;
      }

      // Start analysis immediately if engine is idle
      this.startAnalysisNow(fen, 'panel');
    }, this.DEBOUNCE_MS);
  }

  /**
   * Start analysis immediately (no debouncing, no queue check)
   * @param fen Position to analyze
   */
  private startAnalysisNow(fen: string, profile: AnalysisProfile = 'panel'): void {
    this.currentFen = fen;
    this.isAnalyzing = true;
    this.activeProfile = profile;

    /*
      MULTIPV IS SNAPSHOT AND RESTORED AROUND COMPACT WORK, not changed
      through `setMultiPvCount`.

      That method mutates the shared preference, CLEARS THE WHOLE CACHE and
      resets `currentFen` — so calling it on every puzzle resolution would
      wipe `/analysis`'s cache from the puzzles page. Sending the option
      directly is the same pattern commentary and batch searches already use.

      `compactMultiPvApplied` is what owes the panel its setting back; the
      restore happens here rather than on `bestmove` because a compact search
      followed by another compact search must not pay for two round trips.
    */
    if (profile === 'compact') {
      if (this.multiPvCount !== 1 && !this.compactMultiPvApplied) {
        this.sendCommand('setoption name MultiPV value 1');
        this.compactMultiPvApplied = true;
      }
    } else if (this.compactMultiPvApplied) {
      this.sendCommand(`setoption name MultiPV value ${this.multiPvCount}`);
      this.compactMultiPvApplied = false;
    }

    // Clear accumulated PV lines, WDL, and raw output for new analysis
    this.currentPvLines.clear();
    this.currentWdl = undefined;
    this.rawOutputLines = [];

    /*
      Set the timeout for this search, and REPORT IT TO WHOEVER ASKED.

      It always notified the panel. So a compact search that timed out left the
      card saying "Thinking…" for ever — the exact defect fixed for terminal
      positions, by another route — while `/analysis` was handed a TIMEOUT for a
      search it never made. Found by an independent review on 2026-08-10.
    */
    this.analysisTimeoutTimer = setTimeout(() => {
      if (this.isAnalyzing) {
        this.sendCommand('stop');
        this.isAnalyzing = false;

        const timedOut: AnalysisResult = {
          fen: this.currentFen,
          evaluation: 'TIMEOUT',
          principalVariation: 'Analysis took too long',
          depth: 0,
        };
        if (this.activeProfile === 'compact') this.notifyCompact(timedOut);
        else this.notifyCallbacks(timedOut);
      }
    }, this.ANALYSIS_TIMEOUT_MS);

    // Set position and start analysis.
    this.sendCommand(`position fen ${fen}`);

    /*
      THE PANEL SEARCHES BY DEPTH; THE COMPACT CARD SEARCHES BY THE CLOCK.

      The panel's `go depth 15` is long-standing and stays — it is a surface
      someone is studying on, where a better answer is worth a wait.

      (A comment here used to claim `movetime 1000`. It was false: this line
      has sent `go depth 15` throughout, and the parser's "no depth filtering
      — using time-limited analysis" note was written against a contract that
      no longer existed. Corrected in this commit, PZ-043 C0/C1.)
    */
    if (profile === 'compact') {
      this.sendCommand(`go movetime ${COMPACT_MOVETIME_MS}`);
    } else {
      this.sendCommand('go depth 15');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Compact mode — the resolved-puzzle card (PZ-043 C1)
  //
  // Service-owned and NON-PERSISTENT. It never reads or writes the player's
  // `analysisEnabled` preference, because they never set one for this card:
  //
  //  - `analyzePosition` no-ops while that preference is false, so the panel
  //    path cannot serve the card at all for anyone who turned analysis off.
  //  - `setEnabled(true)` would silently switch analysis on for `/analysis`
  //    and the Champions viewers on their next visit.
  //  - `setEnabled(false)` persists that change AND terminates the worker,
  //    which would force a ~7MB WASM reload after every single puzzle.
  // ═══════════════════════════════════════════════════════════════════════

  /** Subscribe to compact results. Separate from the panel's subscribers. */
  subscribeCompact(callback: (result: AnalysisResult | null) => void): () => void {
    this.compactCallbacks.add(callback);
    return () => this.compactCallbacks.delete(callback);
  }

  /**
   * Ask for a compact evaluation of a position.
   *
   * Debounced on its own timer: stepping through a solved line with the arrow
   * keys held down must produce one search for the position you stop on, not
   * one per ply.
   */
  async requestCompactAnalysis(fen: string): Promise<void> {
    if (!fen) return;

    /*
      A FINISHED GAME IS ANSWERED IMMEDIATELY, BEFORE THE DEBOUNCE AND WITHOUT
      THE ENGINE.

      Reported 2026-08-10: after delivering mate the card showed "Thinking…" for
      about half a second first. That was the honest cost of the general path —
      400ms of debounce, then a worker spin-up, then a `movetime 300` search —
      all spent on a position with nothing to search, to arrive at an answer
      chess.js already knows. The delay was not the engine being slow; it was
      the engine being asked at all.

      It is also the common case for this card: most puzzles end in mate, so
      this is the FIRST thing a solver sees after succeeding, and "Thinking…"
      over a finished game reads as the card not having noticed.

      Placed before the cache check as well, since a terminal position is
      cheaper to recompute than to look up and can never change.
    */
    const terminal = terminalDescription(fen);
    if (terminal) {
      if (this.compactDebounceTimer) {
        clearTimeout(this.compactDebounceTimer);
        this.compactDebounceTimer = null;
      }
      this.notifyCompact({
        fen, evaluation: 'TERMINAL', principalVariation: terminal, depth: 0,
      });
      return;
    }

    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch {
        this.notifyCompact({
          fen,
          evaluation: 'ERROR',
          principalVariation: 'Engine failed to load',
          depth: 0,
        });
        return;
      }
    }

    // A cached compact result is exact — same profile, same position — so it
    // is served without touching the engine. This is what makes stepping BACK
    // through a line you have already walked instant.
    const cached = this.getCachedResult(fen, 'compact');
    if (cached) {
      this.notifyCompact(cached);
      return;
    }

    if (this.compactDebounceTimer) clearTimeout(this.compactDebounceTimer);
    this.compactDebounceTimer = setTimeout(() => {
      this.compactDebounceTimer = null;

      if (this.isAnalyzing) {
        // Queue and pre-empt, exactly as the panel path does. The queued
        // entry carries its profile so it cannot resume as a panel search.
        this.pendingAnalysis = { fen, profile: 'compact' };
        this.sendCommand('stop');
        return;
      }

      this.startAnalysisNow(fen, 'compact');
    }, this.DEBOUNCE_MS);
  }

  /**
   * Stop compact work.
   *
   * NOT `setEnabled(false)`: that persists a preference the player never set
   * and terminates the worker. An idle worker is cheap and is exactly what
   * makes the next puzzle's first evaluation fast. Worker termination is
   * reserved for an explicit user disable, a fatal error, cleanup, or losing
   * the cross-tab lease.
   */
  stopCompactAnalysis(): void {
    if (this.compactDebounceTimer) {
      clearTimeout(this.compactDebounceTimer);
      this.compactDebounceTimer = null;
    }

    if (this.pendingAnalysis?.profile === 'compact') {
      this.pendingAnalysis = null;
    }

    if (this.isAnalyzing && this.activeProfile === 'compact') {
      this.sendCommand('stop');
      this.isAnalyzing = false;
      if (this.analysisTimeoutTimer) {
        clearTimeout(this.analysisTimeoutTimer);
        this.analysisTimeoutTimer = null;
      }
      // The panel is owed its MultiPV back even though no panel search is
      // pending — the next one may start from a code path that assumes the
      // engine already matches the user's preference.
      if (this.compactMultiPvApplied) {
        this.sendCommand(`setoption name MultiPV value ${this.multiPvCount}`);
        this.compactMultiPvApplied = false;
      }
    }

    this.compactCallbacks.forEach(cb => cb(null));
  }

  /** Compact results are not throttled — the card shows one short line. */
  private notifyCompact(result: AnalysisResult | null): void {
    this.compactCallbacks.forEach(cb => cb(result));
  }

  /**
   * Stop current analysis
   */
  stopAnalysis(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clear timeout timer
    if (this.analysisTimeoutTimer) {
      clearTimeout(this.analysisTimeoutTimer);
      this.analysisTimeoutTimer = null;
    }

    // Clear any pending analysis
    this.pendingAnalysis = null;

    if (this.isAnalyzing) {
      this.sendCommand('stop');
      this.isAnalyzing = false;
    }
  }

  /**
   * Enable or disable analysis
   * @param enabled Whether analysis should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.savePreferences();

    if (!enabled) {
      this.stopAnalysis();

      /*
        CRITICAL: terminate the worker to prevent background CPU usage — and
        UNCONDITIONALLY, not inside `if (this.worker)`.

        The guard was the second half of the defect the pre-deploy review found:
        once the `onerror` path had already nulled the worker, this reset was
        skipped as well, so the stale bookkeeping outlived both. `teardownEngine`
        is safe with no worker, and releasing a lease we do not hold is a no-op.
      */
      this.teardownEngine();

      this.notifyCallbacks(null);
    }

    // Notify enabled state change listeners
    this.notifyEnabledCallbacks(enabled);
  }

  /**
   * Get the current number of principal variations
   * @returns Current PV count (1-3)
   */
  getMultiPvCount(): number {
    return this.multiPvCount;
  }

  /**
   * Set the number of principal variations to calculate
   * @param count Number of PVs (1-3)
   */
  setMultiPvCount(count: number): void {
    if (count < 1 || count > 3) {
      return;
    }

    this.multiPvCount = count;

    // Clear cache since cached results have different PV counts
    this.cache.clear();

    // Clear current FEN so next analyzePosition() is not skipped
    this.currentFen = '';

    // If engine is initialized, update the setting
    // According to UCI protocol, setoption must be sent when engine is NOT calculating
    if (this.isInitialized && this.worker) {
      // Stop any ongoing analysis first
      if (this.isAnalyzing) {
        this.sendCommand('stop');
        this.isAnalyzing = false;
      }

      // Now safe to change the option
      this.sendCommand(`setoption name MultiPV value ${count}`);

      // If there was a pending analysis, it will restart automatically
    }
  }

  /**
   * Check if analysis is enabled
   */
  isAnalysisEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get cached result for a position (if it exists)
   * @param fen Position to look up
   * @returns Cached result or null if not cached
   */
  getCachedResult(fen: string, profile: AnalysisProfile = 'panel'): AnalysisResult | null {
    return this.cache.get(this.cacheKey(fen, profile)) || null;
  }

  /**
   * THE CACHE KEY CARRIES THE PROFILE, and this is load-bearing.
   *
   * It used to be the bare FEN, and that was safe only because
   * `setMultiPvCount` cleared the entire cache whenever the line count
   * changed — the one call the compact path is forbidden to make. Without
   * this namespace, a compact one-line result for a position would be
   * returned to `/analysis` running three lines, which renders one line and
   * two "Calculating..." placeholders that never resolve. Silent, and it
   * looks exactly like a stuck engine.
   */
  private cacheKey(fen: string, profile: AnalysisProfile): string {
    return `${profile}:${fen}`;
  }

  /**
   * Subscribe to analysis results
   * @param callback Function to call when analysis completes
   * @returns Unsubscribe function
   */
  subscribe(callback: (result: AnalysisResult | null) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to enabled state changes
   * @param callback Function to call when enabled state changes
   * @returns Unsubscribe function
   */
  subscribeToEnabledState(callback: (enabled: boolean) => void): () => void {
    this.enabledCallbacks.add(callback);
    return () => this.enabledCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers (with throttling to reduce CPU/UI thrashing)
   */
  private notifyCallbacks(result: AnalysisResult | null): void {
    const now = Date.now();
    const timeSinceLastNotification = now - this.lastNotificationTime;

    // If null result (clearing), notify immediately
    if (result === null) {
      this.callbacks.forEach(cb => cb(result));
      this.pendingResult = null;
      return;
    }

    // Throttle notifications to prevent excessive React re-renders
    if (timeSinceLastNotification < this.THROTTLE_MS) {
      // Store for later, but don't notify yet
      this.pendingResult = result;
      return;
    }

    // Enough time has passed, notify now
    this.lastNotificationTime = now;
    this.callbacks.forEach(cb => cb(result));
    this.pendingResult = null;
  }

  /**
   * Notify enabled state change subscribers
   */
  private notifyEnabledCallbacks(enabled: boolean): void {
    this.enabledCallbacks.forEach(cb => cb(enabled));
  }

  /**
   * Cache analysis result
   */
  private cacheResult(result: AnalysisResult, profile: AnalysisProfile = 'panel'): void {
    // LRU eviction (remove oldest entry)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(this.cacheKey(result.fen, profile), result);
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('analysis_config');
      if (saved) {
        const config: AnalysisConfig = JSON.parse(saved);
        this.isEnabled = config.enabled ?? true; // Default: ON for desktop users
      } else {
        // First time user - default to ON
        this.isEnabled = true;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load analysis preferences:', error);
      }
      this.isEnabled = true; // Default to ON on error
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      const config: AnalysisConfig = {
        enabled: this.isEnabled,
        depth: 15,
        hashSizeMb: 128,
      };
      localStorage.setItem('analysis_config', JSON.stringify(config));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to save analysis preferences:', error);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Commentary search data for V4 endpoint (Phase 4 of TEST_PARITY_AND_SF18)
  //
  // All UCI protocol logic moved to src/services/commentarySearch/
  // CommentarySearchProtocol.ts so the backend test harness (Phase 5)
  // can call the same code via a NodeTransport. This method is now a
  // thin delegator that handles browser-specific concerns (panel drain,
  // panel settings restore) and hands off to the shared protocol.
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Get commentary search data for the V4 endpoint.
   * Runs the shared CommentarySearchProtocol (MultiPV=1, Hash=32 MB,
   * movetime=6s main search + MultiPV=3 depth=8 null-move search) via
   * a WorkerTransport over this service's Worker. Independent of the
   * live eval panel — the panel is drained first and restored after.
   */
  async getCommentarySearchData(
    fen: string,
    onDepth?: (depth: number) => void,
  ): Promise<CommentarySearchData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Drain the panel so its in-flight search doesn't steal our output.
    // This is browser-specific — the Worker is shared with the panel,
    // unlike the Node test's dedicated subprocess.
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.analysisTimeoutTimer) {
      clearTimeout(this.analysisTimeoutTimer);
      this.analysisTimeoutTimer = null;
    }
    this.pendingAnalysis = null;
    if (this.isAnalyzing) {
      await new Promise<void>((drainResolve) => {
        this.stopDrainResolve = drainResolve;
        this.sendCommand('stop');
        setTimeout(() => {
          if (this.stopDrainResolve === drainResolve) {
            this.stopDrainResolve = null;
            drainResolve();
          }
        }, 1500);
      });
    }

    const transport = new WorkerTransport(this);
    this.commentaryActive = true;
    try {
      const result = await runCommentaryProtocol(fen, transport, onDepth);

      if (!result.searchOutput.includes('bestmove')) {
        console.warn(
          '[AnalysisService] commentary search produced no bestmove',
          { fen: fen.substring(0, 40), wallMs: result.meta.wallMs },
        );
        return null;
      }

      console.info('[AnalysisService] commentary search', {
        threads: this.engineThreads,
        hashMbCommentary: result.meta.hashMb,
        movetimeMs: result.meta.movetimeMs,
        wallMs: result.meta.wallMs,
        finalDepth: result.meta.finalDepth,
        finalHashfull: result.meta.finalHashfull,
        pv1Eval: result.searchedEval.toFixed(2),
      });

      return result;
    } catch (err) {
      console.warn('[AnalysisService] commentary search failed:', err);
      return null;
    } finally {
      this.commentaryActive = false;
      transport.dispose();
      // Restore panel settings: commentary temporarily bumps Hash to 32
      // and forces MultiPV=1 for deep main-line focus. Put both back so
      // the next panel search matches the user's preference.
      this.sendCommand(`setoption name Hash value ${this.engineHashMb}`);
      this.sendCommand(`setoption name MultiPV value ${this.multiPvCount}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Game Report: client-side batch analysis
  //
  // Replaces the old POST /api/analyze-game round-trip. We iterate through
  // every position of a game, run `go depth 16` on each, and return the
  // raw eval / best move / mate arrays in the same shape the backend used
  // to return. The caller (GameAnalysisWrapper.handleGameReport) then
  // feeds this into analyzeFullGame and POSTs to /api/game-summary for
  // LC0 + summary + caching.
  //
  // Depth 16 matches the backend's node-limited search strength while
  // being fast enough to run in-browser (~150ms/position on desktop).
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Run browser Stockfish over every position of a game.
   *
   * @param moves UCI half-moves played in the game
   * @param onProgress Called after each position completes — drives the
   *                   progress UI. `latestEval` is centipawns from White's
   *                   perspective (matches backend convention).
   */
  async analyzeFullGameClientSide(
    moves: string[],
    onProgress?: (progress: { current: number; total: number; latestEval: number }) => void,
  ): Promise<{ evals: number[]; bestMoves: string[]; mateIn: (number | null)[] }> {
    // Ensure the worker is spun up. Initialize (not setEnabled) — we
    // don't want to flip the user-visible panel toggle from here.
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Drain the panel: clear debounce, cancel any pending analysis, and
    // if a panel search is in flight wait for its bestmove before we
    // start issuing our own `position`/`go` commands. Without this the
    // leftover bestmove would arrive AFTER batchSearchMode is set and
    // get mis-routed as our first batch result.
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.analysisTimeoutTimer) {
      clearTimeout(this.analysisTimeoutTimer);
      this.analysisTimeoutTimer = null;
    }
    this.pendingAnalysis = null;

    if (this.isAnalyzing) {
      await new Promise<void>((resolve) => {
        this.stopDrainResolve = resolve;
        this.sendCommand('stop');
        // Safety timeout — if the engine somehow doesn't emit bestmove,
        // proceed anyway after 1.5s.
        setTimeout(() => {
          if (this.stopDrainResolve === resolve) {
            this.stopDrainResolve = null;
            resolve();
          }
        }, 1500);
      });
    }

    // Force MultiPV 1 for batch (fastest, cleanest output).
    this.sendCommand('setoption name MultiPV value 1');

    // Walk the game via chess.js to derive a FEN for every position.
    const chess = new Chess();
    const fens: string[] = [chess.fen()];
    for (const uci of moves) {
      const from = uci.substring(0, 2);
      const to = uci.substring(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      chess.move({ from, to, promotion });
      fens.push(chess.fen());
    }

    const evals: number[] = [];
    const bestMoves: string[] = [];
    const mateInArr: (number | null)[] = [];

    for (let i = 0; i < fens.length; i++) {
      const fen = fens[i];
      const result = await this.runBatchSearch(fen, 16);
      evals.push(result.evalCp);
      bestMoves.push(result.bestMove);
      mateInArr.push(result.mateIn);
      onProgress?.({
        current: i + 1,
        total: fens.length,
        latestEval: result.evalCp,
      });
    }

    // Restore the panel's MultiPV setting so the next panel search runs
    // with the user's preference.
    this.sendCommand(`setoption name MultiPV value ${this.multiPvCount}`);

    return { evals, bestMoves, mateIn: mateInArr };
  }

  /**
   * Single `go depth N` search for the batch pipeline. Parses the raw
   * UCI output to extract the final score + bestmove, normalising eval
   * to centipawns from White's perspective.
   */
  private runBatchSearch(
    fen: string,
    depth: number,
  ): Promise<{ evalCp: number; bestMove: string; mateIn: number | null }> {
    return new Promise((resolve) => {
      const isWhite = this.isWhiteToMove(fen);
      const flip = isWhite ? 1 : -1;

      this.batchSearchOutput = [];
      this.batchSearchMode = true;

      // Safety timeout — if Stockfish never returns bestmove (shouldn't
      // happen for depth 16), unblock the loop after 10s with zeros.
      const safetyTimer = setTimeout(() => {
        if (this.batchSearchMode) {
          this.batchSearchMode = false;
          this.batchSearchResolve = null;
          this.sendCommand('stop');
          resolve({ evalCp: 0, bestMove: '', mateIn: null });
        }
      }, 10000);

      this.batchSearchResolve = () => {
        clearTimeout(safetyTimer);

        let evalCp = 0;
        let mateIn: number | null = null;
        let bestMove = '';

        for (const line of this.batchSearchOutput) {
          if (line.startsWith('bestmove')) {
            const m = line.match(/bestmove\s+(\S+)/);
            if (m) bestMove = m[1];
            continue;
          }
          if (!line.startsWith('info')) continue;
          if (!line.includes('score')) continue;
          // Only consume lines that have a pv — depth filler lines
          // without a score+pv aren't useful and lowerbound/upperbound
          // lines have stale scores we should skip.
          if (line.includes('lowerbound') || line.includes('upperbound')) continue;

          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (cpMatch) {
            evalCp = parseInt(cpMatch[1], 10) * flip;
            mateIn = null;
          } else if (mateMatch) {
            mateIn = parseInt(mateMatch[1], 10) * flip;
            evalCp = mateIn > 0 ? 10000 : -10000;
          }
        }

        resolve({ evalCp, bestMove, mateIn });
      };

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAnalysis();
    this.stopCompactAnalysis();

    this.teardownEngine();
    this.callbacks.clear();
    this.compactCallbacks.clear();
    this.cache.clear();
  }
}

// Export singleton instance
export const analysisService = AnalysisService.getInstance();
