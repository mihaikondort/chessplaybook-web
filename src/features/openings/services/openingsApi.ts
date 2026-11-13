import env from '@/config/env';

/**
 * The opening trainer's read-only API (backend `routes/openings.ts`, plan D1). Everything the page shows comes from
 * here: book moves, names, the end of a line and the explanations. Nothing is calculated in the browser (owner,
 * 2026-11-05).
 */
const BASE = `${env.apiBaseUrl}/api/openings`;

export interface PositionMove {
  move: string;   // UCI
  san: string;
  /** The position it leads to: the walk tracks what is done by position (D5). */
  childKey: string;
  weight: number;
  share: number;  // 0-1 of the position's book moves
  games: number;
  /** The evaluation after the move, White's point of view (owner, 2026-11-13): cp, or mate in moves (+ White mates). */
  cp: number | null;
  mate: number | null;
  /** Our side: the repertoire's choice. */
  chosen: boolean;
  /** Our side (#179, Black only): a marked playable alternative, where the chosen line repeats a position. */
  alternative?: { cpWorse: number } | null;
  /** The opponent's turn: false for theory the repertoire does not cover (the TWIC book covers 5%+ replies). */
  covered?: boolean;
  /** The reasons as sentences, biggest first; [] when none was found; null for a book move outside the repertoire. */
  explanation: Array<{ key: string; text: string }> | null;
  /** The opponent's turn: a main reply (walked first) or secondary; null at our turn. */
  main: boolean | null;
}

export interface PositionView {
  bookVersion: string;
  /** `rootSan`: the moves played before the repertoire starts, in SAN (from the book's records). */
  repertoire: { id: string; name: string; side: 'white' | 'black'; rootLine: string[]; rootSan: string[]; rootFens: string[]; maxPly: number };
  line: string[];
  ply: number;
  position: {
    key: string;
    fen: string;
    name: string | null;
    eco: string | null;
    named: boolean;
    toMove: 'ours' | 'theirs';
    terminal: boolean;
    /** A branch point the walk returns to (D4). */
    junction: boolean;
  };
  moves: PositionMove[];
}

export interface RepertoireListing {
  id: string;
  name: string;
  side: 'white' | 'black';
  rootLine: string[];
  target: string;
  positions: number;
  ourMoves: number;
  terminals: number;
}

export class OpeningsApiError extends Error {
  /** The answer's body, when there was one (a daily limit's details, freePlanLimit.ts). */
  constructor(message: string, readonly status: number, readonly body: unknown = null) {
    super(message);
  }
}

async function getJson<T>(url: string, signal?: AbortSignal, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, { signal, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new OpeningsApiError(body?.error ?? `Request failed (${res.status})`, res.status, body);
  return body as T;
}

export async function fetchPosition(repertoire: string, line: string[], signal?: AbortSignal): Promise<PositionView> {
  const q = new URLSearchParams({ repertoire });
  if (line.length) q.set('line', line.join(','));
  // Who is asking: learning mode's one variation a day on the free plan is counted per player (2026-11-14).
  const headers = await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
  return (await getJson<{ data: PositionView }>(`${BASE}/position?${q}`, signal, headers)).data;
}

/** One book move in the training export (E1), unpacked from its compact array. */
export interface ExportMove {
  uci: string;
  san: string;
  child: string;
  share: number;
  /** At our turn: 1 the repertoire's choice, 2 a marked playable alternative (#179), 0 also theory.
   *  At theirs: 1 main, 0 secondary, 3 theory the repertoire does not cover (no line goes through it). */
  flag: 0 | 1 | 2 | 3;
  explanation: number | null;
  /** The evaluation after the move, White's point of view: cp, or mate in moves (+ White mates). */
  cp: number | null;
  mate: number | null;
}

export interface RepertoireExport {
  bookVersion: string;
  stamp: string;
  repertoire: { id: string; name: string; side: 'white' | 'black'; rootLine: string[]; rootSan: string[]; rootFens: string[]; rootKey: string; maxPly: number };
  positions: Record<string, { f: string; t: 'o' | 'x'; j: 0 | 1; m: ExportMove[] }>;
  explanations: Record<string, { r: Array<{ k: string; t: string }>; l?: Array<{ k: string; h: string; c: number | null }> }>;
}

/**
 * Training mode's repertoire, once per session (E1). The server packs each move as an array, and every sentence and hint
 * once in `s`, an explanation naming them by index (backend repertoireExport.ts, WHAT IS SENT); it is unpacked here.
 */
export async function fetchExport(repertoire: string, signal?: AbortSignal): Promise<RepertoireExport> {
  type Packed = [string, string, string, number, 0 | 1, number | null, number | null, number | null];
  type Raw = Omit<RepertoireExport, 'positions' | 'explanations'> & {
    positions: Record<string, { f: string; t: 'o' | 'x'; j: 0 | 1; m: Packed[] }>;
    s: string[];
    e: Record<string, { r: Array<[number, number]>; l?: Array<[number, number, number | null]> }>;
  };
  const { s, e, ...raw } = (await getJson<{ data: Raw }>(`${BASE}/export?${new URLSearchParams({ repertoire })}`, signal)).data;
  const explanations: RepertoireExport['explanations'] = {};
  for (const [id, x] of Object.entries(e)) {
    const r = x.r.map(([k, t]) => ({ k: s[k], t: s[t] }));
    explanations[id] = x.l ? { r, l: x.l.map(([k, h, c]) => ({ k: s[k], h: s[h], c })) } : { r };
  }
  const positions: RepertoireExport['positions'] = {};
  for (const [key, p] of Object.entries(raw.positions)) {
    positions[key] = {
      f: p.f, t: p.t, j: p.j,
      m: p.m.map((x) => ({ uci: x[0], san: x[1], child: x[2], share: x[3], flag: x[4], explanation: x[5], cp: x[6] ?? null, mate: x[7] ?? null })),
    };
  }
  return { ...raw, positions, explanations };
}

export async function fetchRepertoires(signal?: AbortSignal): Promise<RepertoireListing[]> {
  return (await getJson<{ data: RepertoireListing[] }>(`${BASE}/repertoires`, signal)).data;
}

/* ---------------------------------------------------------------------------------------------------------------
 * Training sessions and progress (plan E5-E7). These carry the player's identity (a token or the anonymous id), so the
 * auth headers are imported at call time: a static import pulls the Cognito graph into this chunk.
 * ------------------------------------------------------------------------------------------------------------- */

export type TrainingScope = 'main' | 'secondary' | 'both';
export type MoveOutcome = 'first_time' | 'with_help' | 'after_retry' | 'revealed';

export interface TrainingSession {
  id: string;
  repertoireId: string;
  bookVersion: string;
  scope: TrainingScope;
  /** E7: where the session trains from, UCI moves from the repertoire's root; [] for the whole repertoire. */
  startLine: string[];
  status: 'active' | 'paused' | 'stopped' | 'resumed' | 'abandoned';
  currentLine: string[];
  currentLineId: string | null;
  resumedFrom: string | null;
}

export interface TrainingState {
  bookVersion: string;
  open: TrainingSession | null;
  lastScope: TrainingScope | null;
  /** Every clean line since the last reset, UCI moves joined by spaces. */
  cleanPaths: string[];
  linesPlayed: number;
}

async function sendJson<T>(method: 'GET' | 'POST', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers = await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
  const res = await fetch(`${BASE}/training${path}`, {
    method,
    signal,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new OpeningsApiError(json?.error ?? `Request failed (${res.status})`, res.status, json);
  return json.data as T;
}

export const trainingApi = {
  state: (repertoire: string, signal?: AbortSignal) =>
    sendJson<TrainingState>('GET', `?${new URLSearchParams({ repertoire })}`, undefined, signal),
  start: (repertoire: string, scope: TrainingScope, resume: boolean, startLine: string[] = []) =>
    sendJson<TrainingSession>('POST', '/sessions', { repertoire, scope, resume, ...(startLine.length ? { startLine } : {}) }),
  move: (sessionId: string, m: { lineId: string; line: string[]; positionKey: string; outcome: MoveOutcome; hints: number; wrongTries: number }) =>
    sendJson<{ ok: true }>('POST', `/sessions/${sessionId}/moves`, m),
  line: (sessionId: string, lineId: string, path: string[]) =>
    sendJson<{ clean: boolean }>('POST', `/sessions/${sessionId}/lines`, { lineId, path }),
  end: (sessionId: string, how: 'paused' | 'stopped', line?: string[]) =>
    sendJson<TrainingSession>('POST', `/sessions/${sessionId}/end`, { how, ...(line?.length ? { line } : {}) }),
  reset: (repertoire: string, startLine: string[] = []) =>
    sendJson<{ reset: number }>('POST', '/reset', { repertoire, ...(startLine.length ? { startLine } : {}) }),
};
