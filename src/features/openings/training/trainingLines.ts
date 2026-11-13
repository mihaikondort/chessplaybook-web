import type { RepertoireExport, ExportMove, TrainingScope } from '../services/openingsApi';

/**
 * Which lines a training session plays (plan E5, E7; owner rulings 2026-11-11). Pure functions over the repertoire
 * export: no chess is calculated here, only the export's own moves and flags are followed.
 *
 * A LINE is a path from the repertoire's root: our choice at our turn (flag 1), one reply at theirs. By scope:
 * - main: main replies only (flag 1); the line ends where no reply is main (learning mode's walk);
 * - secondary: the opponent plays a secondary reply where a main one exists, then any reply to the end of the book;
 * - both: every line to the end of the book.
 * A marked alternative of ours (flag 2, #179) opens lines too; they are sidelines (never main lines).
 * Every scope: a position already in the line ends it (owner, #179, 2026-11-11). The move that repeats is part of the
 * line; the book is a graph, and without this a line went round the loop to the book's depth.
 * A line is TRAINED when a clean run was recorded on it or on a longer line starting with it.
 *
 * Measured 2026-11-11 (London / French / Slav): main 101 / 22 / 211 lines, secondary 496 / 132 / 1,183, both 653 /
 * 159 / 1,451. Enumerating them all is cheap (well under 10 ms).
 */

export type Line = string[];

/** Every line of the scope, in book order (each position's moves as the export lists them). */
export function linesInScope(data: RepertoireExport, scope: TrainingScope): Line[] {
  const out: Line[] = [];
  const walk = (key: string, ply: number, path: string[], deviated: boolean, seen: Set<string>) => {
    const p = data.positions[key];
    const end = () => { if (scope !== 'secondary' || deviated) out.push(path); };
    // The depth is the position's (owner, 2026-11-12: one position, one set of moves): the export gives a position past
    // the repertoire's depth no moves, by every route, so the line's own ply never cuts it.
    if (!p || !p.m.length || seen.has(key)) return end();
    const below = new Set(seen).add(key);
    if (p.t === 'o') {
      const c = p.m.find((m) => m.flag === 1);
      if (!c) return end();
      walk(c.child, ply + 1, [...path, c.uci], deviated, below);
      const alt = scope === 'main' ? undefined : p.m.find((m) => m.flag === 2);
      if (alt) walk(alt.child, ply + 1, [...path, alt.uci], true, below);
      return;
    }
    // A reply the repertoire does not cover (flag 3) is theory, not a line.
    const replies = p.m.filter((m) => m.flag !== 3);
    if (!replies.length) return end();
    const hasMain = replies.some((m) => m.flag === 1);
    if (scope === 'main') {
      const mains = replies.filter((m) => m.flag === 1);
      if (!mains.length) return end();
      for (const m of mains) walk(m.child, ply + 1, [...path, m.uci], deviated, below);
      return;
    }
    for (const m of replies) walk(m.child, ply + 1, [...path, m.uci], deviated || (hasMain && m.flag === 0), below);
  };
  walk(data.repertoire.rootKey, data.repertoire.rootLine.length, [], false, new Set());
  return out;
}

/** Whether the line played returns to a position already in it (the line ends there, #179). */
export function repeatsPosition(data: RepertoireExport, played: string[]): boolean {
  const seen = new Set<string>();
  let key = data.repertoire.rootKey;
  for (const uci of played) {
    seen.add(key);
    const x = data.positions[key]?.m.find((m) => m.uci === uci);
    if (!x) return false;
    key = x.child;
  }
  return seen.has(key);
}

/** True when the path, or a longer path starting with it, is among the clean ones. */
export function makeTrainedCheck(cleanPaths: string[]): (line: Line) => boolean {
  const clean = [...new Set(cleanPaths)];
  return (line) => {
    const s = line.join(' ');
    return clean.some((c) => c === s || c.startsWith(`${s} `));
  };
}

export interface ScopeProgress { total: number; trained: number }

export function progress(lines: Line[], isTrained: (l: Line) => boolean): ScopeProgress {
  return { total: lines.length, trained: lines.filter(isTrained).length };
}

/** E7: the lines through one position (the session's start line); all of them for an empty start. */
export function linesFrom(lines: Line[], startLine: string[]): Line[] {
  return startLine.length ? lines.filter((l) => startsWith(l, startLine)) : lines;
}

export function startsWith(line: Line, prefix: string[]): boolean {
  if (line.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (line[i] !== prefix[i]) return false;
  return true;
}

/** Whether the line played so far is a whole line of the scope: the session's line ends there. */
export function isLineEnd(lines: Line[], played: string[]): boolean {
  return lines.some((l) => l.length === played.length && startsWith(l, played));
}

/**
 * The opponent's reply (owner, 2026-11-11): among the replies that lead to a line of the scope, those with an
 * untrained line below them, chosen by popularity (the book's share); when every line below is trained, any of them
 * by popularity. Null when no reply leads to a line of the scope.
 */
export function pickReply(
  moves: ExportMove[], played: string[], lines: Line[], isTrained: (l: Line) => boolean, random = Math.random,
): ExportMove | null {
  const below = moves.filter((m) => m.flag !== 3).map((m) => {
    const prefix = [...played, m.uci];
    const ls = lines.filter((l) => startsWith(l, prefix));
    return { m, any: ls.length > 0, untrained: ls.some((l) => !isTrained(l)) };
  });
  const open = below.filter((x) => x.untrained);
  const pool = (open.length ? open : below.filter((x) => x.any)).map((x) => x.m);
  if (!pool.length) return null;
  const weight = (m: ExportMove) => Math.max(m.share, 0.001);
  let r = random() * pool.reduce((s, m) => s + weight(m), 0);
  for (const m of pool) {
    r -= weight(m);
    if (r <= 0) return m;
  }
  return pool[pool.length - 1];
}

/**
 * E6: what one of our moves earned, by precedence (F8, F9): revealed (Reveal, or the repertoire's move taken after
 * another book move) > with help (a hint was shown) > after a retry (a wrong move first) > right first time.
 */
export function moveOutcome(a: { revealed: boolean; hints: number; wrongTries: number }):
  'first_time' | 'with_help' | 'after_retry' | 'revealed' {
  if (a.revealed) return 'revealed';
  if (a.hints > 0) return 'with_help';
  if (a.wrongTries > 0) return 'after_retry';
  return 'first_time';
}
