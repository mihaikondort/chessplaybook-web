/**
 * Stockfish opponent for Play vs Computer.
 * Manages a Web Worker running Stockfish WASM and controls its strength
 * via depth limits and skill level settings.
 */

export interface StockfishLevel {
  level: number;         // 1-8
  name: string;
  description: string;
  approxRating: number;
  depth: number;         // search depth limit
  skillLevel: number;    // UCI Skill Level (0-20)
  moveTime: number;      // max time per move in ms
}

export const DIFFICULTY_LEVELS: StockfishLevel[] = [
  { level: 1, name: 'Beginner',      description: 'Just learning',       approxRating: 800,  depth: 1,  skillLevel: 0,  moveTime: 100 },
  { level: 2, name: 'Casual',        description: 'Plays for fun',       approxRating: 1000, depth: 2,  skillLevel: 3,  moveTime: 200 },
  { level: 3, name: 'Club Player',   description: 'Knows the basics',    approxRating: 1200, depth: 4,  skillLevel: 6,  moveTime: 300 },
  { level: 4, name: 'Intermediate',  description: 'Solid player',        approxRating: 1400, depth: 6,  skillLevel: 9,  moveTime: 500 },
  { level: 5, name: 'Advanced',      description: 'Experienced player',  approxRating: 1600, depth: 8,  skillLevel: 12, moveTime: 700 },
  { level: 6, name: 'Expert',        description: 'Tournament player',   approxRating: 1800, depth: 10, skillLevel: 15, moveTime: 1000 },
  { level: 7, name: 'Master',        description: 'Title-level play',    approxRating: 2000, depth: 12, skillLevel: 18, moveTime: 1500 },
  { level: 8, name: 'Grandmaster',   description: 'Maximum strength',    approxRating: 2500, depth: 20, skillLevel: 20, moveTime: 3000 },
];

type StockfishState = 'idle' | 'initializing' | 'ready' | 'thinking';

export class StockfishOpponent {
  private worker: Worker | null = null;
  private state: StockfishState = 'idle';
  private currentLevel: StockfishLevel = DIFFICULTY_LEVELS[3]; // Default: Intermediate
  private onMoveCallback: ((move: string) => void) | null = null;
  private onReadyCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {}

  /**
   * Initialize the Stockfish engine.
   * Uses the lite single-threaded WASM build which works as a
   * self-contained Web Worker (no CORS headers required).
   */
  async init(): Promise<void> {
    if (this.state !== 'idle') return;
    this.state = 'initializing';

    return new Promise<void>((resolve, reject) => {
      try {
        // Use the same lite single-threaded build as AnalysisService
        this.worker = new Worker('/stockfish/stockfish-18-lite-single.js');

        this.worker.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : '';
          if (line) this.handleMessage(line);
        };

        this.worker.onerror = (e) => {
          console.error('Stockfish worker error:', e);
          this.state = 'idle';
          this.onErrorCallback?.('Failed to load chess engine');
          reject(new Error('Worker error'));
        };

        this.onReadyCallback = () => resolve();
        this.send('uci');
      } catch (err) {
        this.state = 'idle';
        reject(err);
      }
    });
  }

  /**
   * Set the difficulty level.
   */
  setLevel(level: number): void {
    const lvl = DIFFICULTY_LEVELS.find(l => l.level === level);
    if (!lvl) return;
    this.currentLevel = lvl;

    if (this.state === 'ready') {
      this.send(`setoption name Skill Level value ${lvl.skillLevel}`);
    }
  }

  /**
   * Get the best move for a position.
   */
  async getMove(fen: string): Promise<string> {
    if (this.state !== 'ready') {
      throw new Error('Engine not ready');
    }

    return new Promise<string>((resolve) => {
      this.state = 'thinking';
      this.onMoveCallback = (move) => {
        this.state = 'ready';
        resolve(move);
      };

      this.send(`position fen ${fen}`);
      this.send(`go depth ${this.currentLevel.depth} movetime ${this.currentLevel.moveTime}`);
    });
  }

  /**
   * Stop the engine and clean up.
   */
  destroy(): void {
    if (this.worker) {
      this.send('quit');
      this.worker.terminate();
      this.worker = null;
    }
    this.state = 'idle';
    this.onMoveCallback = null;
    this.onReadyCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Register error callback.
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  get isReady(): boolean {
    return this.state === 'ready';
  }

  get isThinking(): boolean {
    return this.state === 'thinking';
  }

  get level(): StockfishLevel {
    return this.currentLevel;
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private handleMessage(line: string): void {
    if (line === 'uciok') {
      this.configureEngine();
    } else if (line === 'readyok') {
      this.state = 'ready';
      this.onReadyCallback?.();
      this.onReadyCallback = null;
    } else if (line.startsWith('bestmove')) {
      const move = line.split(' ')[1];
      if (move && this.onMoveCallback) {
        // Add a small delay to feel more human-like at lower levels
        const delay = this.currentLevel.level <= 3
          ? Math.random() * 500 + 200
          : 0;
        setTimeout(() => {
          this.onMoveCallback?.(move);
          this.onMoveCallback = null;
        }, delay);
      }
    }
  }

  private configureEngine(): void {
    this.send('setoption name Hash value 32');
    this.send('setoption name Threads value 1');
    this.send(`setoption name Skill Level value ${this.currentLevel.skillLevel}`);
    this.send('isready');
  }
}
