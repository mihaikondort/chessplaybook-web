/**
 * A game, as the viewers show it (layout redesign E1, 2026-10-10).
 *
 * ONE MODEL FOR EVERY VIEWER: the champion games, the live games, `/analysis` review
 * mode and the article boards all hand a PGN to a board, and until now each went
 * through the Lichess viewer, which built its own tree out of sight. This is the
 * part of that we keep: the MAIN LINE as an array of plies, each with the position
 * after it, so a viewer steps by index and never derives a ply from a FEN.
 *
 * MAIN LINE ONLY (owner, 2026-10-01, contract §9.2). Side lines, comments and NAGs
 * are not shown, and `dropped` says which the PGN had, so a page can say so. Clock
 * commands are not comments: a `{ [%clk 0:03:00] }` that holds nothing else drops
 * nothing. Champion games carry none of the three (E0 checked all 38,278); live
 * games carry clocks; imported games can carry anything.
 *
 * chessops, not chess.js: the parser handles a `[FEN]` start and reads `[%clk]`
 * from a comment without a regex.
 */
import { parsePgn, parseComment, startingPosition, type PgnNodeData, type Game, type Node } from 'chessops/pgn';
import { parseSan } from 'chessops/san';
import { makeFen } from 'chessops/fen';
import { makeSquare, makeUci, squareRank } from 'chessops/util';
import { castlingSide, type Position } from 'chessops/chess';
import { isDrop, type Move } from 'chessops/types';

export interface GamePly {
  /** The move as written, `Nf3`. */
  san: string;
  /** `g1f3`, for engines and the review endpoints. */
  uci: string;
  /** The position after this move. */
  fen: string;
  /** From and to, for the board's last-move highlight. */
  lastMove: [string, string];
  /** The side that played it. */
  color: 'white' | 'black';
  /** True when the move gives check. */
  check: boolean;
  /** The mover's clock after the move, in seconds, when the PGN says (`[%clk]`). */
  clock?: number;
}

export interface GameHeaders {
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  whiteTitle?: string;
  blackTitle?: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: string;
  eco?: string;
  opening?: string;
}

export interface GameModel {
  headers: GameHeaders;
  /** The position before the first move: the initial position, or the `[FEN]` tag. */
  startFen: string;
  /** The main line. Ply index i is the position after `plies[i]`; -1 is `startFen`. */
  plies: GamePly[];
  /** What the PGN had that is not shown (contract §9.2). */
  dropped: { variations: boolean; comments: boolean; nags: boolean };
  /** Set when the main line stopped at an illegal move: `plies` holds what came before. */
  illegalAt?: { ply: number; san: string };
}

export type ParseGameResult = { ok: true; game: GameModel } | { ok: false; error: string };

const header = (headers: Map<string, string>, key: string): string | undefined => {
  const value = headers.get(key)?.trim();
  return value && value !== '?' && value !== '-' ? value : undefined;
};

const elo = (headers: Map<string, string>, key: string): number | undefined => {
  const n = Number(header(headers, key));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * A comment that holds something besides commands (`[%clk …]`, `[%eval …]`, shapes).
 * `parseComment` takes out the five commands it reads and leaves any other `[%…]` in
 * the text, and Chess.com writes `[%timestamp N]` after every move: counted as text,
 * every Chess.com import would say "Comments not shown" (found at E9). Any `[%…]` is a
 * command, read or not.
 */
const COMMAND = /\[%[^\]]*\]/g;
const hasText = (comments: string[] | undefined): boolean =>
  !!comments?.some(c => parseComment(c).text.replace(COMMAND, '').trim() !== '');

const clockOf = (comments: string[] | undefined): number | undefined => {
  for (const c of comments ?? []) {
    const clock = parseComment(c).clock;
    if (clock !== undefined) return clock;
  }
  return undefined;
};

/*
  CASTLING AS THE KING MOVES. chessops reads O-O as the king taking its own rook
  (`e1h1`), which is how it plays Chess960; engines, the review endpoints and the
  board's highlight all expect the king's own squares (`e1g1`). Read BEFORE the
  move is played, while the rook is still there to be recognised.
*/
function standardSquares(pos: Position, move: Move): [string, string] {
  if (isDrop(move)) return [makeSquare(move.to), makeSquare(move.to)];
  const side = castlingSide(pos, move);
  if (!side) return [makeSquare(move.from), makeSquare(move.to)];
  const rank = squareRank(move.from) + 1;
  return [makeSquare(move.from), `${side === 'h' ? 'g' : 'c'}${rank}`];
}

/** Reads the FIRST game in `pgn`. */
export function parseGame(pgn: string): ParseGameResult {
  const games = parsePgn(pgn);
  const game: Game<PgnNodeData> | undefined = games[0];
  if (!game) return { ok: false, error: 'No game found in the PGN.' };

  const start = startingPosition(game.headers);
  if (start.isErr) return { ok: false, error: 'The PGN starts from a position that is not valid.' };
  const pos: Position = start.unwrap();
  const startFen = makeFen(pos.toSetup());

  const dropped = {
    variations: false,
    comments: hasText(game.comments),
    nags: false,
  };

  // Everything the main line does not show, anywhere in the tree.
  const visit = (node: Node<PgnNodeData>) => {
    node.children.forEach((child, i) => {
      if (i > 0) dropped.variations = true;
      if (child.data.nags?.length) dropped.nags = true;
      if (hasText(child.data.comments) || hasText(child.data.startingComments)) dropped.comments = true;
      visit(child);
    });
  };
  visit(game.moves);

  const plies: GamePly[] = [];
  let illegalAt: GameModel['illegalAt'];
  for (const node of game.moves.mainlineNodes()) {
    const move = parseSan(pos, node.data.san);
    if (!move) {
      illegalAt = { ply: plies.length, san: node.data.san };
      break;
    }
    const color = pos.turn;
    const [from, to] = standardSquares(pos, move);
    const uci = isDrop(move) ? makeUci(move) : `${from}${to}${move.promotion ? makeUci(move).slice(4) : ''}`;
    pos.play(move);
    plies.push({
      san: node.data.san,
      uci,
      fen: makeFen(pos.toSetup()),
      lastMove: [from, to],
      color,
      check: pos.isCheck(),
      clock: clockOf(node.data.comments),
    });
  }

  const headers: GameHeaders = {
    white: header(game.headers, 'White') ?? 'White',
    black: header(game.headers, 'Black') ?? 'Black',
    whiteElo: elo(game.headers, 'WhiteElo'),
    blackElo: elo(game.headers, 'BlackElo'),
    whiteTitle: header(game.headers, 'WhiteTitle'),
    blackTitle: header(game.headers, 'BlackTitle'),
    event: header(game.headers, 'Event'),
    site: header(game.headers, 'Site'),
    date: header(game.headers, 'Date'),
    round: header(game.headers, 'Round'),
    result: header(game.headers, 'Result'),
    eco: header(game.headers, 'ECO'),
    opening: header(game.headers, 'Opening'),
  };

  return { ok: true, game: { headers, startFen, plies, dropped, ...(illegalAt ? { illegalAt } : {}) } };
}

/**
 * Each side's clock as it stood at `ply` (-1 is the start): the last `[%clk]` that
 * side recorded at or before it. What a players card shows when the reader steps
 * back through a finished game, as the Lichess viewer did.
 */
export function clocksAt(game: GameModel, ply: number): { white?: number; black?: number } {
  const out: { white?: number; black?: number } = {};
  for (let i = Math.min(ply, game.plies.length - 1); i >= 0 && (out.white === undefined || out.black === undefined); i--) {
    const p = game.plies[i];
    if (p.clock !== undefined && out[p.color] === undefined) out[p.color] = p.clock;
  }
  return out;
}

export interface ViewerClock {
  /** Milliseconds left, as `ChessClock` takes them. */
  timeMs: number;
  /** Counting down: the side to move at a live game's latest move. */
  running: boolean;
}

/**
 * The two clocks a players card shows at `ply` (layout redesign E3).
 *
 * Stepping through a game shows each side's clock as it stood at that move, still,
 * as the Lichess viewer did. A LIVE game at its latest move runs the clock of the
 * side to move, counting down from its last `[%clk]`, until the result is in. A side
 * with no clock recorded yet has none: no card claims a time nobody reported.
 */
export function viewerClocks(
  game: GameModel,
  ply: number,
  { live }: { live: boolean },
): { white?: ViewerClock; black?: ViewerClock } {
  const lastPly = game.plies.length - 1;
  const atLatest = ply >= lastPly;
  const seconds = clocksAt(game, atLatest ? lastPly : ply);
  const decided = !!game.headers.result && game.headers.result !== '*';
  const toMove: 'white' | 'black' = lastPly < 0
    ? (game.startFen.split(' ')[1] === 'b' ? 'black' : 'white')
    : game.plies[lastPly].color === 'white' ? 'black' : 'white';
  const clock = (side: 'white' | 'black'): ViewerClock | undefined =>
    seconds[side] === undefined
      ? undefined
      : { timeMs: seconds[side]! * 1000, running: live && atLatest && !decided && side === toMove };
  return { white: clock('white'), black: clock('black') };
}
