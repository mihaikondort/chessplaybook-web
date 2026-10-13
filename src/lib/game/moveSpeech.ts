/**
 * What a screen reader hears when the board shows a move (layout redesign E2, 2026-10-10).
 *
 * THE LICHESS VIEWER'S OWN WORDING (owner, 2026-10-10: "as Lichess today"), ported from
 * `@lichess-org/pgn-viewer` (`view/aria.js` and `view/util.js`, `formatMoveForScreenReader`
 * with its English strings), so the champion pages sound the same after E9 deletes the
 * library as they did before:
 *
 *   Nf3    -> "Move 2, white, knight F 3"
 *   Nxe5+  -> "Move 4, black, knight takes E 5 check"
 *   O-O    -> "Move 5, white, short castling"
 *
 * Files are spoken UPPERCASE on purpose: a lowercase "a" is read as the word "a". Pawn
 * moves name no piece, as in the notation. The library also appends NAG names, clocks and
 * comments; the viewers show none of those (contract §9.2), so neither does this.
 */

const PIECES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };

/** A SAN move as words: `Nxe5+` -> "knight takes E 5 check". */
export function sanToWords(san: string): string {
  return san
    .split('')
    .map(c => {
      if (c === 'x') return 'takes';
      if (c === '+') return 'check';
      if (c === '#') return 'checkmate';
      if (c === '=') return 'promotes to';
      if (c === '@') return 'dropped on';
      if (c >= '1' && c <= '8') return c;
      if (c >= 'a' && c <= 'h') return c.toUpperCase();
      return PIECES[c] ?? c;
    })
    .join(' ')
    // The library's order: long castling first, or "O - O - O" would read as short castling.
    .replace('O - O - O', 'long castling')
    .replace('O - O', 'short castling');
}

/**
 * The plies played before a position, read off its FEN's move number and side to move:
 * 0 for the initial position, 79 for Black to move at move 40. A game imported from a
 * `[FEN]` tag numbers its moves from there (E6), as the Lichess viewer did.
 */
export function pliesBefore(fen: string | undefined): number {
  if (!fen) return 0;
  const parts = fen.trim().split(/\s+/);
  const fullmove = Number.parseInt(parts[5] ?? '1', 10);
  return (Number.isFinite(fullmove) && fullmove > 0 ? fullmove - 1 : 0) * 2 + (parts[1] === 'b' ? 1 : 0);
}

/**
 * The announcement for the move at `moveIndex` (0-based; -1 is the starting position).
 * `firstPly` is `pliesBefore` the game's starting position: 0 when it starts at move 1
 * with White to move.
 */
export function announceMove(moves: readonly string[], moveIndex: number, firstPly = 0): string {
  if (moves.length === 0) return '';
  if (moveIndex < 0) return 'Starting position';
  const san = moves[Math.min(moveIndex, moves.length - 1)];
  const ply = firstPly + Math.min(moveIndex, moves.length - 1) + 1;
  const color = ply % 2 === 1 ? 'white' : 'black';
  return `Move ${Math.ceil(ply / 2)}, ${color}, ${sanToWords(san)}`;
}
