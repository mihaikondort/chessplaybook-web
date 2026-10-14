/**
 * Puzzle Service — fetches puzzles from backend API with fallback to sample data.
 */

export interface PuzzleData {
  id: string;
  /** Server-issued logical presentation id; absent only for offline fallback. */
  tryId?: string;
  /**
   * This puzzle came from the hardcoded offline list, not from the server.
   *
   * IT EXISTS BECAUSE THE FALLBACK WAS INDISTINGUISHABLE FROM THE PRODUCT
   * WORKING (2026-08-22). A dev backend that was running but had never bound
   * its port left the trainer serving the same five puzzles for a whole
   * session, and nothing on the page said so - the owner reported it as
   * production repeating itself. The absence of `tryId` already meant "not
   * scored"; nobody could see that either.
   *
   * Read it, never infer it from a missing `tryId`: a saved last-puzzle record
   * and every test fixture also lack one, and neither is offline.
   */
  offline?: true;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  openingTags?: string[];
  /** Pre-move line, built server-side from the shared expression layer. */
  prompt?: string;
  nbPlays?: number;
  popularity?: number;
}

import env from '@/config/env';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

const API_URL = env.apiBaseUrl;

// Fallback puzzles when API is unavailable (verified from Lichess)
const FALLBACK_PUZZLES: PuzzleData[] = [
  {
    id: '3H6vB', rating: 1429, themes: ['short', 'endgame', 'mateIn2'],
    fen: '3r2k1/6pp/Rp1rbp2/2p5/3Np3/PP2P1P1/2P2P1P/4K2R w K - 0 21',
    moves: ['d4e6', 'd6d1', 'e1e2', 'd8d2'],
  },
  {
    id: 'cIYia', rating: 1459, themes: ['middlegame', 'fork', 'long', 'advantage'],
    fen: 'r3r1k1/pp3ppp/2pq4/2b1p3/1PPn4/P2P1B2/1B3PPP/R2QR1K1 b - - 0 15',
    moves: ['c5b6', 'c4c5', 'd4f3', 'd1f3', 'b6c5', 'b4c5'],
  },
  {
    id: 'EUSZO', rating: 1528, themes: ['advantage', 'short', 'middlegame'],
    fen: '1r4k1/pp1b1rpp/3Pp3/2Ppn2P/6B1/2P1B1R1/PP3P2/2KR4 w - - 1 27',
    moves: ['e3d4', 'e5g4', 'g3g4', 'e6e5'],
  },
  {
    id: 'IgbPz', rating: 1495, themes: ['endgame', 'crushing', 'fork', 'veryLong'],
    fen: '1k6/2Rn2p1/p7/6Pp/P2pQp1K/1q5P/8/8 w - - 2 46',
    moves: ['e4c6', 'b3g3', 'h4h5', 'g3h3', 'h5g6', 'd7e5', 'g6g7', 'e5c6'],
  },
  {
    id: '4Osgg', rating: 1723, themes: ['veryLong', 'endgame', 'mateIn4'],
    fen: '5r2/bpp2q1k/p2p2p1/3P4/1PP3QP/P7/1B2R1P1/7K w - - 2 32',
    moves: ['e2e6', 'f7f1', 'h1h2', 'f1g1', 'h2h3', 'g1h1', 'h3g3', 'a7f2'],
  },
];

/*
  Every route out of the fallback list goes through here, so a new one cannot
  forget the flag. Returns a COPY: the list is module-level and shared, and a
  consumer writing to a puzzle it was handed would otherwise poison it for the
  rest of the session.
*/
function asOffline(p: PuzzleData): PuzzleData {
  /*
    THE ARRAYS ARE COPIED TOO, and a shallow spread was not enough - the first
    version of this shared `moves` with the list and a consumer truncating it
    emptied the puzzle for every later draw in the session. `usePuzzle` reads
    `moves` on every ply, so that is the one field a bug like it would be
    invisible in until the board stopped responding.
  */
  return { ...p, moves: [...p.moves], themes: [...p.themes], offline: true };
}

let apiAvailable: boolean | null = null; // null = untested
let apiLastChecked = 0;
const API_RETRY_MS = 30_000; // re-check after 30s if previously unavailable

/**
 * The last thing the gate learned: `false` means the API could not be reached,
 * `null` means it has not been asked yet.
 *
 * The card needs this rather than the puzzle's own `offline` flag, because the
 * two answer different questions. A FILTERED request returns an empty list
 * without a fallback puzzle at all, so the board keeps whatever it was showing -
 * possibly a real server puzzle - and reading the board would report "nothing
 * matched that filter" when nothing was ever asked.
 */
export function isApiReachable(): boolean | null {
  return apiAvailable;
}

async function checkApi(): Promise<boolean> {
  const now = Date.now();
  // Skip re-check if confirmed available, or if last failure was recent
  if (apiAvailable === true) return true;
  if (apiAvailable === false && now - apiLastChecked < API_RETRY_MS) return false;
  try {
    const res = await fetch(`${API_URL}/api/puzzles/stats`, { signal: AbortSignal.timeout(3000) });
    apiAvailable = res.ok;
  } catch {
    apiAvailable = false;
  }
  apiLastChecked = Date.now();
  return apiAvailable;
}

export async function fetchPuzzles(options?: {
  /** Ask the server to put already-explained puzzles first (D1 / PZ-026).
   *  A preference, not a filter — an unexplained puzzle is still served. */
  preferExplained?: boolean;
  theme?: string;
  /** Training area (C9): 'tactics' | 'middlegame' | 'endgame'. */
  area?: string;
  minRating?: number;
  maxRating?: number;
  count?: number;
  /**
   * D4a — how the server chooses candidates: 'random' (the default, and what
   * this always did) or 'adaptive', which derives the rating window from the
   * caller's own record. Omit the window when asking for 'adaptive', or the
   * pinned one wins and the mode does nothing.
   */
  selection?: string;
}): Promise<PuzzleData[]> {
  /*
    A request is SPECIFIC when it names a theme, an area, or a run mode that
    chooses for itself ("Missed before", weak spots, baseline). The sample
    puzzles below ignore all three, so a specific request that gets nothing
    must say nothing rather than hand over an unrelated puzzle. A replay run
    used to end in sample puzzles presented as missed ones (2026-10-14).
  */
  const specific = Boolean(
    options?.theme || options?.area
    || (options?.selection && options.selection !== 'adaptive' && options.selection !== 'random'),
  );
  const isOnline = await checkApi();

  if (isOnline) {
    try {
      const params = new URLSearchParams();
      if (options?.theme) params.set('theme', options.theme);
      if (options?.area) params.set('area', options.area);
      if (options?.minRating) params.set('minRating', String(options.minRating));
      if (options?.maxRating) params.set('maxRating', String(options.maxRating));
      // One at a time. The pool of ten was the original 2026-03-25 default, never
      // a decision; the server now caps this anyway (MAX_PUZZLES_PER_REQUEST).
      params.set('count', String(options?.count ?? 1));
      if (options?.preferExplained) params.set('preferExplained', '1');
      if (options?.selection) params.set('selection', options.selection);

      /*
        Identify the caller so the server can skip puzzles this person has
        already answered (PZ-020). The endpoint stays ungated — `resolveIdentity`
        never rejects — so an anonymous visitor with no header still gets
        puzzles; they simply get no history applied.

        Anonymous ids matter most here: most traffic has no account, and the
        repeat problem is theirs too.
      */
      const headers = await getRequestHeaders();
      const res = await fetch(`${API_URL}/api/puzzles/next?${params}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          return json.data;
        }
        /*
          THE SERVER ANSWERED, AND THE ANSWER WAS "NOTHING" (2026-08-05).

          This used to fall through to the hardcoded sample list below, which
          ignores the caller's theme and area — so a player who clicked "Train
          back-rank mates" and matched nothing was handed an unrelated puzzle
          and told nothing. That is the same class of untrue link C9 spent a day
          removing, arriving through the back door.

          An empty answer to a FILTERED request is information: it means the
          filter found nothing in the sampled windows. Returning it lets the
          trainer say so. Only a request with no filter can honestly be topped
          up from a generic sample, and even then the server returning zero is a
          server problem, not something to paper over.
        */
        // Answered or refused, a specific request gets the server's answer.
        if (specific) {
          return [];
        }
      }
    } catch {
      // Network or parse failure — the fallback below is a real safety net for
      // an unreachable API, which is a different situation from "no match".
    }
  }

  /*
    A filtered request never gets generic puzzles (2026-08-05). If the API is
    unreachable AND the caller asked for something specific, an empty list is
    the truthful answer; the sample puzzles would silently be the wrong ones.
  */
  if (specific) return [];

  // Fallback: return shuffled sample puzzles
  const filtered = FALLBACK_PUZZLES.filter(p => {
    if (options?.minRating && p.rating < options.minRating) return false;
    if (options?.maxRating && p.rating > options.maxRating) return false;
    if (options?.theme && !p.themes.includes(options.theme)) return false;
    return true;
  });

  // Shuffle
  const shuffled = [...(filtered.length > 0 ? filtered : FALLBACK_PUZZLES)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, options?.count ?? 5).map(asOffline);
}

export async function fetchDailyPuzzle(): Promise<PuzzleData | null> {
  const isOnline = await checkApi();

  if (isOnline) {
    try {
      const headers = await getRequestHeaders();
      const res = await fetch(`${API_URL}/api/puzzles/daily`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fall through
    }
  }

  // Fallback: deterministic daily from samples
  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % FALLBACK_PUZZLES.length;
  return asOffline(FALLBACK_PUZZLES[dayIndex]);
}

export async function fetchPuzzleById(id: string): Promise<PuzzleData | null> {
  const isOnline = await checkApi();

  if (isOnline) {
    try {
      const headers = await getRequestHeaders();
      const res = await fetch(`${API_URL}/api/puzzles/${id}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json.data;
      }
    } catch {
      // Fall through
    }
  }

  const offline = FALLBACK_PUZZLES.find(p => p.id === id);
  return offline ? asOffline(offline) : null;
}

/**
 * Fetch the engine-derived explanation of what a puzzle's solution achieved
 * (D1/D2 · PZ-026/PZ-036).
 *
 * `pending` is a normal, expected answer, not an error: the backend never
 * blocks a request on Stockfish, so the first solver of an un-baked puzzle is
 * told to come back rather than made to wait. Callers render the card's
 * existing missing-content state for it — do not turn this into a spinner that
 * outlives the user's attention, and do not poll on the puzzle page.
 */
export type PuzzleExplanation =
  | { status: 'ready'; structured: unknown; action: string | null }
  | { status: 'pending' }
  | { status: 'unavailable' };

export interface PuzzleHintRung {
  level: number;
  label: string;
  text: string;
}

export type PuzzleHints =
  | { status: 'unavailable' }
  | { status: 'pending' }
  | { status: 'ready'; rungs: PuzzleHintRung[] };

/**
 * Graded hints for a solver who is stuck (B6/B8).
 *
 * The rungs are built and sanitised server-side, so nothing here has to know
 * what counts as giving the move away — see `services/puzzleHint.ts`. Fetched
 * only when the solver asks, because a hint nobody wanted is a request nobody
 * needed.
 */
export async function fetchPuzzleHints(id: string): Promise<PuzzleHints> {
  try {
    const res = await fetch(`${API_URL}/api/puzzles/${encodeURIComponent(id)}/hint`);
    if (!res.ok) return { status: 'unavailable' };
    const json = await res.json();
    return json?.data ?? { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}

export async function fetchPuzzleExplanation(id: string): Promise<PuzzleExplanation> {
  try {
    const res = await fetch(`${API_URL}/api/puzzles/${encodeURIComponent(id)}/explanation`);
    if (!res.ok) return { status: 'unavailable' };
    const json = await res.json();
    return json?.data ?? { status: 'unavailable' };
  } catch {
    // A network failure is not a missing explanation, but it looks identical
    // to the user and there is nothing useful to say about the difference.
    return { status: 'unavailable' };
  }
}
