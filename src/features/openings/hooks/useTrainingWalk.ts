import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { positionFromFen } from '@/components/chess/chessLogic';
import {
  fetchExport, type RepertoireExport, type ExportMove, type TrainingScope, type TrainingSession, type MoveOutcome,
} from '../services/openingsApi';
import { linesInScope, linesFrom, makeTrainedCheck, isLineEnd, repeatsPosition, pickReply, moveOutcome, startsWith, type Line } from '../training/trainingLines';

/**
 * Training mode (opening trainer E2-E7): the player plays the repertoire's side, the trainer the opponent's.
 *
 * Everything is a lookup in the repertoire's export (E1, fetched once): which moves are book, which one is the
 * repertoire's, and why. The only calculation in the browser is the board's legal moves (owner, E0), and in E3 the
 * browser engine's grade of a move outside the book (F7).
 *
 * - Moves are played only inside a session (Q16: it starts at Start). A resumed session starts from its saved line.
 * - At our turn the player moves. The repertoire's move is right. Another book move is theory but not this
 *   repertoire's line (C0): the board goes back and the trainer names the repertoire's move. A move outside the book
 *   stops the line until Try again or Reveal (E3 grades it).
 * - At the opponent's turn the trainer plays a reply that leads to a line of the session's scope, an untrained one
 *   first, by popularity (owner, 2026-11-11; `trainingLines.ts`).
 * - The line ends where the scope's line does (main lines stop where no reply is main).
 * - HINTS (E4; F8, owner E0): the repertoire move's hint ladder, least pointing first. After HINT_AFTER_MS without a
 *   move the first appears by itself. The explanation, which may name the piece, appears only after the move.
 * - E6: each of our moves is reported with what it earned: revealed > with help > after a retry > right first time.
 *   The repertoire's move named after another book move counts as revealed (the trainer said it).
 */

export type TrainingStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'idle' }
  | { kind: 'your-move' }
  | { kind: 'their-move' }
  | { kind: 'right'; move: ExportMove }
  | { kind: 'other-book'; played: ExportMove; chosen: ExportMove }
  | { kind: 'outside'; uci: string; san: string | null }
  | { kind: 'revealed'; chosen: ExportMove }
  | { kind: 'line-end' };

export interface PlayedMove {
  uci: string;
  san: string;
  ours: boolean;
  /** The explanation id from the export, null when none. */
  explanation: number | null;
  /** Ours only: what the move earned (E6), for the end-of-line summary. */
  outcome?: MoveOutcome;
}

export interface TrainingReport {
  lineId: string;
  line: string[];
  positionKey: string;
  outcome: MoveOutcome;
  hints: number;
  wrongTries: number;
}

export interface TrainingWalkOptions {
  /** The running session; moves are played only while it is active. */
  session: TrainingSession | null;
  scope: TrainingScope;
  /** E7: the position trained from when no session runs (a running session uses its own). */
  startLine: string[];
  /** Clean lines recorded so far (the session hook keeps them current). */
  cleanPaths: string[];
  onMove: (r: TrainingReport) => void;
  /** A line played to its end. Resolves with whether the server found it clean, or null when it could not say. */
  onLineEnd: (line: string[], lineId: string) => Promise<boolean | null>;
}

const REPLY_DELAY_MS = 600;
/** F8 / E0: the first hint appears by itself after a minute without a move. */
export const HINT_AFTER_MS = 60_000;

const newLineId = () => crypto.randomUUID();

export function useTrainingWalk(repertoireId: string, active: boolean, opts: TrainingWalkOptions) {
  const { session, scope, cleanPaths } = opts;
  /** E7: the moves up to the position trained from, played for the player at the start of every line. */
  const startLine = session ? session.startLine : opts.startLine;
  const startKey = startLine.join(' ');
  const running = !!session && session.status === 'active';
  const [data, setData] = useState<RepertoireExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState<PlayedMove[]>([]);
  const [lineId, setLineId] = useState<string>(newLineId);
  const [status, setStatus] = useState<TrainingStatus>({ kind: 'loading' });
  /** The server's word on the line just ended: trained, to repeat, or not known (null) yet. */
  const [lineResult, setLineResult] = useState<{ lineId: string; clean: boolean | null } | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Hints shown at the current position (E4); reset when the position changes. */
  const [hintsShown, setHintsShown] = useState(0);
  /** E6: what happened at the current position before the right move (reset when the position changes). */
  const attempt = useRef({ wrongTries: 0, revealed: false });
  const reported = useRef<string | null>(null);
  const callbacks = useRef(opts);
  callbacks.current = opts;

  useEffect(() => {
    if (!active) return;
    const ctrl = new AbortController();
    setData(null);
    setError(null);
    fetchExport(repertoireId, ctrl.signal)
      .then((d) => { setData(d); setLine([]); })
      .catch((e) => { if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load the repertoire.'); });
    return () => ctrl.abort();
  }, [repertoireId, active]);

  /*
    A session starts from its saved line (Resume), or from the root. The saved line is replayed through the export;
    a move the export does not have (another book) ends the replay there.
  */
  /** A list of UCI moves from the root, replayed through the export; it stops at a move the export does not have. */
  const replay = useCallback((ucis: string[]): PlayedMove[] => {
    if (!data) return [];
    const played: PlayedMove[] = [];
    let key = data.repertoire.rootKey;
    for (const uci of ucis) {
      const p = data.positions[key];
      const x = p?.m.find((m) => m.uci === uci);
      if (!p || !x) break;
      played.push({ uci, san: x.san, ours: p.t === 'o', explanation: x.explanation });
      key = x.child;
    }
    return played;
  }, [data]);

  useEffect(() => {
    if (!data || !session) return;
    // A paused line continues; otherwise the line starts with the moves up to the position trained from (E7).
    setLine(replay(session.currentLine.length ? session.currentLine : session.startLine));
    setLineId(session.currentLineId ?? newLineId());
    setLineResult(null);
    reported.current = null;
    // Only a new session restarts the line; the session object changes on every save otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, session?.id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lines = useMemo<Line[]>(() => (data ? linesFrom(linesInScope(data, scope), startLine) : []), [data, scope, startKey]);
  const isTrained = useMemo(() => makeTrainedCheck(cleanPaths), [cleanPaths]);
  const ucis = useMemo(() => line.map((m) => m.uci), [line]);

  /** The position after the line played, and its ply from the start of the game. */
  const here = useMemo(() => {
    if (!data) return null;
    let key = data.repertoire.rootKey;
    for (const m of line) {
      const x = data.positions[key]?.m.find((y) => y.uci === m.uci);
      if (!x) return null;
      key = x.child;
    }
    const p = data.positions[key];
    if (!p) return null;
    const ply = data.repertoire.rootLine.length + line.length;
    const bookEnds = !p.m.length; // past the depth the export lists no moves, by every route (owner, 2026-11-12)
    const repeats = repeatsPosition(data, ucis);
    const ended = bookEnds || repeats || isLineEnd(lines, ucis);
    /** Why the line ended (owner, 2026-11-11: the end must be said): the position repeats one already in the line
     *  (#179), the book has no more moves, or the scope's line stops here while the book goes on (main lines stop
     *  where no reply is main). */
    const endReason: 'repetition' | 'book' | 'scope' | null =
      !ended ? null : repeats ? 'repetition' : bookEnds ? 'book' : 'scope';
    return { key, p, ply, ours: p.t === 'o', ended, endReason };
  }, [data, line, lines, ucis]);

  // What happens next, after every change of position.
  useEffect(() => {
    if (replyTimer.current) { clearTimeout(replyTimer.current); replyTimer.current = null; }
    if (!active) return;
    if (error) { setStatus({ kind: 'error', message: error }); return; }
    if (!data || !here) { setStatus({ kind: 'loading' }); return; }
    if (!running) { setStatus({ kind: 'idle' }); return; }
    if (here.ended) { setStatus({ kind: 'line-end' }); return; }
    // A new position at our turn is always a fresh "your move": what was said (right, revealed) was about the last one.
    if (here.ours) {
      setStatus({ kind: 'your-move' });
      return;
    }
    setStatus((s) => (s.kind === 'right' ? s : { kind: 'their-move' }));
    replyTimer.current = setTimeout(() => {
      const r = pickReply(here.p.m, ucis, lines, isTrained);
      if (r) setLine((l) => [...l, { uci: r.uci, san: r.san, ours: false, explanation: r.explanation }]);
      else setStatus({ kind: 'line-end' });
    }, REPLY_DELAY_MS);
    return () => { if (replyTimer.current) clearTimeout(replyTimer.current); };
    // isTrained changes when a line ends; the reply already chosen does not need to be chosen again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, here, active, error, running]);

  // A line played to its end is reported once; the answer says whether it is trained.
  useEffect(() => {
    if (status.kind !== 'line-end' || !running || reported.current === lineId || !ucis.length) return;
    reported.current = lineId;
    const id = lineId;
    setLineResult({ lineId: id, clean: null });
    callbacks.current.onLineEnd(ucis, id).then((clean) => {
      setLineResult((r) => (r && r.lineId === id ? { lineId: id, clean } : r));
    });
  }, [status.kind, running, lineId, ucis]);

  /*
    The move expected at our turn (hints, Reveal): the repertoire's choice, unless (#179) a marked alternative is the
    way to the lines still untrained: every line of the scope through the choice is trained, or there is none. Both
    are accepted as right whichever is expected.
  */
  const chosen = useMemo(() => {
    if (!here?.ours) return null;
    const c = here.p.m.find((m) => m.flag === 1) ?? null;
    const alt = here.p.m.find((m) => m.flag === 2);
    if (!c || !alt) return c;
    const below = (u: string) => lines.filter((l) => startsWith(l, [...ucis, u]));
    const open = (u: string) => below(u).some((l) => !isTrained(l));
    if (open(c.uci)) return c;
    if (open(alt.uci) || !below(c.uci).length) return below(alt.uci).length ? alt : c;
    return c;
  }, [here, lines, ucis, isTrained]);
  const ladder = useMemo(() => {
    if (!data || !chosen || chosen.explanation === null) return [] as string[];
    return (data.explanations[String(chosen.explanation)]?.l ?? []).map((r) => r.h);
  }, [data, chosen]);

  // A new position starts with no hint shown and nothing tried.
  useEffect(() => {
    setHintsShown(0);
    attempt.current = { wrongTries: 0, revealed: false };
  }, [here?.key, line.length]);
  // After a minute at our turn without a move, the first hint appears by itself (owner, E0).
  useEffect(() => {
    if (!active || status.kind !== 'your-move' || hintsShown > 0 || !ladder.length) return;
    const t = setTimeout(() => setHintsShown((n) => Math.max(n, 1)), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, [active, status.kind, hintsShown, ladder.length, here?.key]);
  const hint = useCallback(() => setHintsShown((n) => Math.min(n + 1, ladder.length)), [ladder.length]);

  /** The board's legal moves (owner, E0): only whether a piece can go to a square. */
  const board = useMemo(() => (here ? positionFromFen(here.p.f) : null), [here]);

  /** Our move is on the board: report what it earned (E6) and play it. */
  const playOurs = useCallback((x: ExportMove) => {
    if (!here) return;
    const next = [...ucis, x.uci];
    const outcome = moveOutcome({ revealed: attempt.current.revealed, hints: hintsShown, wrongTries: attempt.current.wrongTries });
    callbacks.current.onMove({
      lineId,
      line: next,
      positionKey: here.key,
      outcome,
      hints: hintsShown,
      wrongTries: attempt.current.wrongTries,
    });
    setStatus({ kind: 'right', move: x });
    setLine((l) => [...l, { uci: x.uci, san: x.san, ours: true, explanation: x.explanation, outcome }]);
  }, [here, ucis, lineId, hintsShown]);

  /** A move the player made on the board, as (orig, dest). */
  const playerMove = useCallback((orig: Key, dest: Key) => {
    if (!here || !here.ours || !board || !running) return;
    // The book writes castling as the king's two-square move; a drag onto the rook means the same.
    let to = dest;
    const piece = board.chess.board.get(sqIndex(orig));
    if (piece?.role === 'king' && orig[0] === 'e' && orig[1] === dest[1] && (dest[0] === 'h' || dest[0] === 'a')) {
      to = `${dest[0] === 'h' ? 'g' : 'c'}${dest[1]}` as Key;
    }
    const promo = piece?.role === 'pawn' && (dest[1] === '8' || dest[1] === '1') ? 'q' : '';
    const uci = `${orig}${to}${promo}`;
    const x = here.p.m.find((m) => m.uci === uci);
    if (x && (x.flag === 1 || x.flag === 2)) {
      // The repertoire's move or its marked alternative (#179): both are right.
      playOurs(x);
    } else if (x) {
      // The card names the repertoire's move: from here it counts as shown (F9).
      attempt.current.wrongTries += 1;
      attempt.current.revealed = true;
      setStatus({ kind: 'other-book', played: x, chosen: chosen! });
    } else {
      attempt.current.wrongTries += 1;
      setStatus({ kind: 'outside', uci, san: null });
    }
  }, [here, board, chosen, running, playOurs]);

  /** Play the repertoire's move (after Reveal, or after another book move). */
  const playChosen = useCallback(() => {
    if (!chosen) return;
    attempt.current.revealed = true;
    playOurs(chosen);
  }, [chosen, playOurs]);

  const reveal = useCallback(() => {
    if (!chosen) return;
    attempt.current.revealed = true;
    setStatus({ kind: 'revealed', chosen });
  }, [chosen]);
  const tryAgain = useCallback(() => setStatus({ kind: 'your-move' }), []);
  const nextLine = useCallback(() => {
    setLine(replay(startLine));
    setLineId(newLineId());
    setLineResult(null);
    reported.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay, startKey]);

  const last = line.length ? line[line.length - 1] : null;
  return {
    data,
    here,
    line,
    /** The line played, as UCI moves from the root (what Pause saves). */
    ucis,
    /** E7: the moves played for the player before the position trained from. */
    startPlies: startLine.length,
    /** E7: SAN of the moves up to the position trained from (for its label). */
    startSans: replay(startLine).map((m) => m.san),
    last,
    status,
    chosen,
    board,
    running,
    lines,
    isTrained,
    /** Whether the line just ended was trained; null while the server answers or if it could not. */
    lineResult: lineResult && lineResult.lineId === lineId ? lineResult.clean : undefined,
    playerMove,
    playChosen,
    reveal,
    tryAgain,
    nextLine,
    /** The hints shown so far at this position, least pointing first; and whether more remain. */
    hints: ladder.slice(0, hintsShown),
    moreHints: hintsShown < ladder.length,
    hint,
    explanation: (id: number | null) => (id === null || !data ? null : data.explanations[String(id)] ?? null),
  };
}

/** chessops square index of a key like "e2". */
function sqIndex(k: Key): number {
  return (k.charCodeAt(1) - 49) * 8 + (k.charCodeAt(0) - 97);
}
