import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { clocksAt, parseGame, viewerClocks, type GameModel } from './gameModel';

const parsed = (pgn: string): GameModel => {
  const r = parseGame(pgn);
  // `=== false`, not `!r.ok`: with strict off, TypeScript narrows only the former.
  if (r.ok === false) throw new Error(r.error);
  return r.game;
};

/** A champion game as the corpus stores it: headers and bare SAN (E0: no comments, no clocks). */
const CHAMPION = `[Event "World Blitz Final KO 2024"]
[Site "New York USA"]
[Date "2024.12.30"]
[Round "1.1"]
[White "Carlsen,M"]
[Black "Niemann,Hans Moke"]
[Result "1-0"]
[WhiteElo "2890"]
[BlackElo "2733"]
[ECO "C65"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. Re1 Nd6 6. Nxe5 Be7 7. Bf1 Nxe5 8. Rxe5 O-O 1-0`;

/** A broadcast game, as Lichess sends it: titles and a clock after every move. */
const LIVE = `[White "Gukesh D"]
[Black "Ding Liren"]
[WhiteTitle "GM"]
[BlackTitle "GM"]
[WhiteElo "2783"]
[BlackElo "2728"]
[Result "*"]

1. d4 { [%clk 1:59:58] } 1... Nf6 { [%clk 1:59:51] } 2. c4 { [%clk 1:59:40] } 2... e6 { [%clk 1:58:02] } *`;

describe('parseGame', () => {
  it('reads the headers a players card needs, as numbers where they are numbers', () => {
    const g = parsed(CHAMPION);
    expect(g.headers).toMatchObject({ white: 'Carlsen,M', black: 'Niemann,Hans Moke', whiteElo: 2890, blackElo: 2733, result: '1-0', eco: 'C65', event: 'World Blitz Final KO 2024' });
    expect(parsed(LIVE).headers).toMatchObject({ whiteTitle: 'GM', blackTitle: 'GM' });
  });

  it('gives every ply the position after it, matching chess.js move for move', () => {
    const g = parsed(CHAMPION);
    const ref = new Chess();
    ref.loadPgn(CHAMPION);
    const history = ref.history({ verbose: true });
    expect(g.plies.map(p => p.san)).toEqual(history.map(m => m.san));
    expect(g.plies.map(p => p.fen)).toEqual(history.map(m => m.after));
    expect(g.plies.map(p => p.uci)).toEqual(history.map(m => m.lan));
  });

  it('writes castling as the king moves (e1g1), not king takes rook', () => {
    const castle = parsed(CHAMPION).plies[6];
    expect(castle.san).toBe('O-O');
    expect(castle.uci).toBe('e1g1');
    expect(castle.lastMove).toEqual(['e1', 'g1']);
    const black = parsed(CHAMPION).plies[15];
    expect(black.san).toBe('O-O');
    expect(black.uci).toBe('e8g8');
  });

  it('marks the mover and check', () => {
    const g = parsed('1. e4 f5 2. Qh5+ g6 *');
    expect(g.plies.map(p => p.color)).toEqual(['white', 'black', 'white', 'black']);
    expect(g.plies[2].check).toBe(true);
    expect(g.plies[1].check).toBe(false);
  });

  it('starts from a [FEN] tag', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const g = parsed(`[SetUp "1"]\n[FEN "${fen}"]\n\n1. e4 Kd7 *`);
    expect(g.startFen).toBe(fen);
    expect(g.plies.map(p => p.uci)).toEqual(['e2e4', 'e8d7']);
  });

  it('reads each move\'s clock, in seconds', () => {
    const g = parsed(LIVE);
    expect(g.plies.map(p => p.clock)).toEqual([7198, 7191, 7180, 7082]);
  });

  it('reports nothing dropped for a champion game or for clock-only comments', () => {
    expect(parsed(CHAMPION).dropped).toEqual({ variations: false, comments: false, nags: false });
    expect(parsed(LIVE).dropped).toEqual({ variations: false, comments: false, nags: false });
  });

  it('counts a command the parser does not read as a command, not a comment (Chess.com)', () => {
    const chesscom = '1. e4 {[%clk 0:09:58.4][%timestamp 12]} 1... e5 {[%clk 0:09:57][%timestamp 9]} *';
    expect(parsed(chesscom).dropped).toEqual({ variations: false, comments: false, nags: false });
    expect(parsed('1. e4 {[%timestamp 12] A good start.} *').dropped.comments).toBe(true);
  });

  it('reports side lines, comments and NAGs, and still shows the main line', () => {
    const g = parsed('1. e4 { The king\'s pawn. } 1... e5 (1... c5 2. Nf3) 2. Nf3 $1 Nc6 *');
    expect(g.dropped).toEqual({ variations: true, comments: true, nags: true });
    expect(g.plies.map(p => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('finds a comment or NAG that only a side line holds', () => {
    expect(parsed('1. e4 e5 (1... c5 { Sicilian } 2. Nf3 $2) *').dropped).toEqual({ variations: true, comments: true, nags: true });
  });

  it('stops at an illegal move and says where', () => {
    // Qh5 is illegal: the king on e2 blocks the queen's diagonal.
    const g = parsed('1. e4 e5 2. Ke2 Ke7 3. Qh5 *');
    expect(g.plies.map(p => p.san)).toEqual(['e4', 'e5', 'Ke2', 'Ke7']);
    expect(g.illegalAt).toEqual({ ply: 4, san: 'Qh5' });
  });

  it('refuses a starting position that is not valid', () => {
    expect(parseGame('[SetUp "1"]\n[FEN "not a fen"]\n\n1. e4 *').ok).toBe(false);
  });
});

describe('clocksAt', () => {
  const g = parsed(LIVE);
  it('gives each side\'s last clock at or before the ply', () => {
    expect(clocksAt(g, -1)).toEqual({});
    expect(clocksAt(g, 0)).toEqual({ white: 7198 });
    expect(clocksAt(g, 2)).toEqual({ white: 7180, black: 7191 });
    expect(clocksAt(g, 3)).toEqual({ white: 7180, black: 7082 });
    expect(clocksAt(g, 99)).toEqual({ white: 7180, black: 7082 });
  });
});

describe('viewerClocks', () => {
  const g = parsed(LIVE); // four plies, White to move next, result "*"
  it('shows each side\'s clock as it stood, still, when stepping back', () => {
    expect(viewerClocks(g, 1, { live: true })).toEqual({
      white: { timeMs: 7198000, running: false },
      black: { timeMs: 7191000, running: false },
    });
  });
  it('runs the side to move at a live game\'s latest move', () => {
    expect(viewerClocks(g, 3, { live: true })).toEqual({
      white: { timeMs: 7180000, running: true },
      black: { timeMs: 7082000, running: false },
    });
  });
  it('runs nothing in a finished game, or a game that is not live', () => {
    expect(viewerClocks(g, 3, { live: false }).white?.running).toBe(false);
    const done = parsed(LIVE.replace(/\*/g, '1-0'));
    expect(viewerClocks(done, 3, { live: true }).white?.running).toBe(false);
  });
  it('shows no clock for a side with none recorded, and none for a game without clocks', () => {
    expect(viewerClocks(g, 0, { live: false })).toEqual({ white: { timeMs: 7198000, running: false }, black: undefined });
    expect(viewerClocks(parsed(CHAMPION), 5, { live: false })).toEqual({ white: undefined, black: undefined });
  });
});
