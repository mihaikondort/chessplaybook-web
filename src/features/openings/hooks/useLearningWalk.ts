import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPosition, type PositionMove, type PositionView } from '../services/openingsApi';

/**
 * Learning mode's walk through one repertoire (opening trainer D3, D5).
 *
 * The state is the LINE played from the repertoire's root (UCI) and which ply of it is on the board. Every position is
 * asked of the server (`GET /api/openings/position`) once and kept: stepping back and forward reads the cache, so the
 * board never waits for a position it has shown. Nothing about the book is decided here; the server says which moves
 * exist, which is ours, which replies are main, which positions are junctions, and why each move is played.
 *
 * THE WALK (D5; product description F6, Q15, owner 2026-11-03):
 * - Next goes forward through the moves already played, then plays the next move: at our turn the repertoire's
 *   choice; at the opponent's turn the first reply not yet done, main replies before secondary ones (D4), each group
 *   by how often it is played.
 * - At the end of a line the board stays. "Back to the junction" returns to the nearest junction above that still has
 *   a reply not done; at it the done replies are marked, and Next goes down the next one. When everything below a
 *   junction is done, the same button goes to the junction above, and in the end to the start.
 * - DONE IS BY POSITION (plan D5): a position is done when the book ends there, or when what follows is done (our
 *   chosen move's position at our turn, every reply's position at theirs). A line that transposes into a position
 *   already covered is therefore done there, and is never walked twice.
 * - THE DEPTH IS THE POSITION'S (owner, 2026-11-12: one position, one set of moves, whatever the move order): the
 *   server gives a position past the repertoire's depth no moves by every route, so the walk never cuts a line by its
 *   own ply. (It used to: the same position showed its moves at ply 26 and none at ply 30, found on the Slav.)
 * - BY REPETITION (owner, #179, 2026-11-11): a position already in the line ends it. That end belongs to the line, not
 *   the position, so each done position records the SHALLOWEST ply at which it counts as done: 0 when everything below
 *   it was walked to the book's end, more when a repetition cut was involved; the same position reached first (or by
 *   another move order) is still walked below.
 * Progress is kept for the page's life only; saving it is training mode's sessions (plan E5).
 */

export interface LastMove extends PositionMove {
  ours: boolean;
}

const lineKey = (line: string[]) => line.join(' ');

/** A position the walk comes back to: a junction (D4), or one of ours with a marked alternative (#179). */
const isBranch = (v: PositionView) => v.position.junction || v.moves.some((m) => !!m.alternative);

/** The replies the repertoire covers (the TWIC book covers 5%+ replies); the others are theory, not walked. */
const covered = (moves: PositionMove[]) => moves.filter((m) => m.covered !== false);

/** Main replies first, then secondary ones, each group in book order (most played first); covered replies only. */
function walkOrder(moves: PositionMove[]): PositionMove[] {
  const c = covered(moves);
  return [...c.filter((m) => m.main !== false), ...c.filter((m) => m.main === false)];
}

export function useLearningWalk(repertoireId: string) {
  const cache = useRef(new Map<string, PositionView>());
  const [line, setLine] = useState<string[]>([]);
  const [viewPly, setViewPly] = useState(0);
  /** Position key -> the shallowest ply at which it counts as done. */
  const [done, setDone] = useState<Map<string, number>>(() => new Map());
  const [, setLoaded] = useState(0); // bumped when the cache gains a position, to re-render
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  // A new repertoire starts again at its root.
  useEffect(() => {
    cache.current = new Map();
    setLine([]);
    setViewPly(0);
    setDone(new Map());
    setError(null);
  }, [repertoireId]);

  const viewAt = (ply: number, l: string[] = line) => cache.current.get(lineKey(l.slice(0, ply))) ?? null;

  const viewed = line.slice(0, viewPly);
  const viewedKey = lineKey(viewed);
  useEffect(() => {
    if (cache.current.has(viewedKey)) return;
    const ctrl = new AbortController();
    fetchPosition(repertoireId, viewed, ctrl.signal)
      .then((v) => {
        cache.current.set(viewedKey, v);
        setError(null);
        setLoaded((n) => n + 1);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load this position.');
      });
    return () => ctrl.abort();
    // `viewed` is derived from `viewedKey`, which names it exactly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repertoireId, viewedKey, retry]);

  const current = cache.current.get(viewedKey) ?? null;

  /**
   * The ply from which a child counts as done; undefined while it has not been reached. A child past the depth is NOT
   * done before it is shown: the move into it is a book move to learn, and the walk would stop one move short
   * (measured: 4 French, 12 London, 15 Slav positions missed). Shown, the server calls it terminal.
   */
  const childDoneAt = (d: Map<string, number>, key: string): number | undefined => d.get(key);

  /** The shallowest ply at which this position counts as done, from what is known; undefined when not done. */
  const doneAt = useCallback((v: PositionView, d: Map<string, number>, repeated = false): number | undefined => {
    if (repeated) return v.ply;                       // the line ends at a repetition, from this ply on
    if (v.position.terminal) return 0;                // the book ends here, whatever the depth
    // Our side: the choice and a marked alternative (#179); both lines are walked.
    const kids = v.position.toMove === 'ours' ? v.moves.filter((m) => m.chosen || m.alternative) : covered(v.moves);
    if (!kids.length) return undefined;
    let worst = 0;
    for (const m of kids) {
      const c = childDoneAt(d, m.childKey);
      if (c === undefined || c > v.ply + 1) return d.get(v.position.key);
      worst = Math.max(worst, c - 1);
    }
    const stored = d.get(v.position.key);
    return stored === undefined ? worst : Math.min(stored, worst);
  }, []);
  const isDone = useCallback((v: PositionView, d: Map<string, number>, repeated = false): boolean => {
    const at = doneAt(v, d, repeated);
    return at !== undefined && at <= v.ply;
  }, [doneAt]);
  /** Whether the position a move leads to is done, seen from the position it is played in. */
  const childDone = (v: PositionView, m: PositionMove): boolean => {
    const at = childDoneAt(done, m.childKey);
    return at !== undefined && at <= v.ply + 1;
  };

  /** Whether the position at this ply of the line was already reached earlier in it (#179). */
  const repeatedAt = (ply: number): boolean => {
    const v = viewAt(ply);
    if (!v) return false;
    for (let i = 0; i < ply; i++) if (viewAt(i)?.position.key === v.position.key) return true;
    return false;
  };

  // When the viewed position is done (the book ends, or it was covered through another move order), mark it and
  // every position above it on the line that is done now.
  useEffect(() => {
    if (!current || !isDone(current, done, repeatedAt(viewPly))) return;
    const next = new Map(done);
    let changed = false;
    for (let ply = viewPly; ply >= 0; ply--) {
      const v = viewAt(ply);
      const rep = repeatedAt(ply);
      if (!v || !isDone(v, next, rep)) break;
      const at = doneAt(v, next, rep)!;
      const had = next.get(v.position.key);
      if (had === undefined || at < had) { next.set(v.position.key, at); changed = true; }
    }
    if (changed) setDone(next);
    // viewAt reads the cache for the current line; `current` and `viewPly` name the position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, viewPly, done, isDone, doneAt]);

  // The last position shown stays on the board while the next one loads, so nothing flickers.
  const shownRef = useRef<{ ply: number; view: PositionView } | null>(null);
  if (current) shownRef.current = { ply: viewPly, view: current };
  const shown = current ?? shownRef.current?.view ?? null;
  const shownPly = current ? viewPly : shownRef.current?.ply ?? 0;
  const loading = !current && !error;

  const lastMoveAt = (ply: number): LastMove | null => {
    if (ply === 0) return null;
    const parent = viewAt(ply - 1);
    const m = parent?.moves.find((x) => x.move === line[ply - 1]);
    return m && parent ? { ...m, ours: parent.position.toMove === 'ours' } : null;
  };

  /** SAN of every move played so far (each from the position it was played in). */
  const sans = line.map((uci, i) => viewAt(i)?.moves.find((m) => m.move === uci)?.san ?? uci);

  const play = useCallback((uci: string) => {
    const view = cache.current.get(lineKey(line.slice(0, viewPly)));
    const m = view?.moves.find((x) => x.move === uci);
    if (!view || !m || (view.position.toMove === 'ours' && !m.chosen && !m.alternative)) return;
    const next = [...line.slice(0, viewPly), uci];
    setLine(next);
    setViewPly(next.length);
  }, [line, viewPly]);

  const atLatest = viewPly === line.length;
  /** The viewed position ends the walk down this line: the book ends here, or it is covered already. */
  const repetition = !!current && atLatest && repeatedAt(viewPly);
  const lineEnds = !!current && atLatest && isDone(current, done, repetition);
  const coveredBefore = lineEnds && !repetition && !current!.position.terminal;

  const nextMove = (): string | null => {
    if (!current || isDone(current, done, repeatedAt(viewPly))) return null;
    if (current.position.toMove === 'ours') {
      // The choice first; then a marked alternative (#179) once the choice's line is done.
      return current.moves.filter((m) => m.chosen || m.alternative).find((m) => !childDone(current, m))?.move ?? null;
    }
    return walkOrder(current.moves).find((m) => !childDone(current, m))?.move ?? null;
  };

  const next = () => {
    if (viewPly < line.length) { setViewPly(viewPly + 1); return; }
    const m = nextMove();
    if (m) play(m);
  };
  const canNext = viewPly < line.length || nextMove() !== null;

  /** The ply "Back to the junction" goes to: the nearest junction above with work left, else the start. */
  const backTarget = (): number => {
    for (let ply = viewPly - 1; ply > 0; ply--) {
      const v = viewAt(ply);
      if (v && isBranch(v) && !isDone(v, done)) return ply;
    }
    return 0;
  };
  const target = lineEnds ? backTarget() : null;
  const backToJunction = () => {
    if (target === null) return;
    setLine(line.slice(0, target));
    setViewPly(target);
  };

  const root = viewAt(0);
  const complete = !!root && isDone(root, done);

  // The line as the left lane shows it: from the nearest junction above the viewed position (F6), else the start.
  let fromPly = 0;
  for (let ply = shownPly - 1; ply > 0; ply--) {
    if (viewAt(ply)?.position.junction) { fromPly = ply; break; }
  }

  return {
    line,
    sans,
    viewPly: shownPly,
    shown,
    loading,
    error,
    lastMove: lastMoveAt(shownPly),
    /** Whether a move's position, from the viewed one, is done: the reply list marks it. */
    isMoveDone: (m: PositionMove) => (shown ? childDone(shown, m) : false),
    /** The reply list in the walk's order. */
    order: shown ? walkOrder(shown.moves) : [],
    /** The opponent's replies the repertoire does not cover: listed as theory, not walked. */
    uncovered: shown && shown.position.toMove !== 'ours' ? shown.moves.filter((m) => m.covered === false) : [],
    canNext,
    canBack: viewPly > 0,
    lineEnds,
    /** The line ends because the position repeats one already in it (#179). */
    repetition,
    coveredBefore,
    /** Where "Back to the junction" goes; null while the line goes on. 0 is the start. */
    backTarget: target,
    backTargetMove: target ? lastMoveAt(target) : null,
    backToJunction,
    complete,
    /**
     * D9 (owner: "go to a junction above"): the plies of the line played that are junctions, in order, so the left
     * lane can jump to any of them; going there keeps the line, so forward still works.
     */
    junctionPlies: line.map((_, i) => i + 1).filter((ply) => !!viewAt(ply)?.position.junction),
    /** The left lane's line: from this ply, with the position it starts from. */
    lineFrom: { ply: fromPly, fen: viewAt(fromPly)?.position.fen ?? null, sans: sans.slice(fromPly, line.length) },
    next,
    back: () => setViewPly((p) => Math.max(0, p - 1)),
    toStart: () => setViewPly(0),
    toEnd: () => setViewPly(line.length),
    goTo: (ply: number) => setViewPly(Math.max(0, Math.min(line.length, ply))),
    play,
    retry: () => { setError(null); setRetry((n) => n + 1); },
  };
}
