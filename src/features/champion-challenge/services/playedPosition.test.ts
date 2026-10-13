import { describe, it, expect } from 'vitest';
import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { makeSan } from 'chessops/san';
import { applyPlayedMove } from './playedPosition';

const START = 'r3k2r/pppq1ppp/2n1bn2/3pp3/3PP3/2N1BN2/PPPQ1PPP/R3K2R w KQkq - 0 1';

describe('applyPlayedMove', () => {
  it('keeps a normal move on the board and highlights it', () => {
    const played = applyPlayedMove(START, 'Nb5')!;
    expect(played.lastMove).toEqual(['c3', 'b5']);
    expect(played.fen.startsWith('r3k2r/pppq1ppp/2n1bn2/1N1pp3/')).toBe(true);
    expect(played.turnColor).toBe('black');
    expect(played.isCheck).toBe(false);
  });

  it('highlights the KING squares for queenside castling, not the rook square', () => {
    const played = applyPlayedMove(START, 'O-O-O')!;
    // The reported bug: chessops encodes O-O-O as e1→a1; players expect e1→c1.
    expect(played.lastMove).toEqual(['e1', 'c1']);
    // King on c1, rook on d1.
    expect(played.fen.split(' ')[0].split('/')[7]).toBe('2KR3R');
  });

  it('highlights the king squares for kingside castling', () => {
    const played = applyPlayedMove(START, 'O-O')!;
    expect(played.lastMove).toEqual(['e1', 'g1']);
    expect(played.fen.split(' ')[0].split('/')[7]).toBe('R4RK1');
  });

  it('handles castling for Black too', () => {
    const black = applyPlayedMove(START.replace(' w ', ' b '), 'O-O-O')!;
    expect(black.lastMove).toEqual(['e8', 'c8']);
    expect(black.turnColor).toBe('white');
  });

  it('reports check after a checking move', () => {
    const played = applyPlayedMove('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1', 'Ra8')!;
    expect(played.isCheck).toBe(true);
    expect(played.turnColor).toBe('black');
  });

  /**
   * The board builds SAN from orig→dest with no promotion piece, so a
   * promotion would arrive as a bare "a8". Promotions are excluded from the
   * corpus at bake time, so this cannot happen — and if one ever slipped in,
   * this returns null and the server rejects the move (400) rather than
   * scoring the wrong one. Documenting the safe-fail, not endorsing it.
   */
  it('returns null for a promotion SAN missing its piece', () => {
    expect(applyPlayedMove('8/P6k/8/8/8/8/6K1/8 w - - 0 1', 'a8')).toBeNull();
    expect(applyPlayedMove('8/P6k/8/8/8/8/6K1/8 w - - 0 1', 'a8=Q')).not.toBeNull();
  });

  it('returns null for an illegal or unparsable move', () => {
    expect(applyPlayedMove(START, 'Nxe9')).toBeNull();
    expect(applyPlayedMove(START, 'Qh8')).toBeNull();
    expect(applyPlayedMove('not a fen', 'e4')).toBeNull();
  });

  /**
   * The corpus now lives on the server, so this sweeps representative
   * positions instead: castling rights both sides, en passant, a position in
   * check (restricted move set), and a promotion-capable endgame.
   */
  it('applies every legal move of representative positions without throwing', () => {
    const fens = [
      START,
      'r3k2r/pppq1ppp/2n1bn2/3pp3/3PP3/2N1BN2/PPPQ1PPP/R3K2R b KQkq - 0 1',
      'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
      // In check with escapes (not mate — a mated position has no legal moves).
      '4k3/8/8/8/8/8/8/4RK2 b - - 0 1',
      '8/P6k/8/8/8/8/6K1/8 w - - 0 1',
    ];

    for (const fen of fens) {
      const pos = Chess.fromSetup(parseFen(fen).unwrap()).unwrap();
      const sans: string[] = [];
      for (const [from, tos] of pos.allDests()) {
        for (const to of tos) {
          const promotes = pos.board.getRole(from) === 'pawn' && (to >> 3 === 0 || to >> 3 === 7);
          sans.push(makeSan(pos, promotes ? { from, to, promotion: 'queen' } : { from, to }));
        }
      }
      expect(sans.length, `no legal moves generated for ${fen}`).toBeGreaterThan(0);

      for (const san of sans) {
        expect(applyPlayedMove(fen, san), `${fen} ${san}`).not.toBeNull();
      }
    }
  });
});
