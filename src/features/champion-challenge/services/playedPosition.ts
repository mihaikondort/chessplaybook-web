/**
 * Applying the user's move for display: the board keeps showing the move that
 * was played, so the analysis beside it refers to a matching board.
 */

import type { Key } from '@lichess-org/chessground/types';
import type { Color } from 'chessops/types';
import { Chess } from 'chessops/chess';
import { parseFen, makeFen } from 'chessops/fen';
import { parseSan } from 'chessops/san';

export interface PlayedPosition {
  /** FEN after the move. */
  fen: string;
  /** Squares to highlight — king origin→target for castling. */
  lastMove: [Key, Key];
  isCheck: boolean;
  /** Side to move after the move (i.e. the opponent). */
  turnColor: Color;
}

function square(index: number): Key {
  return `${String.fromCharCode(97 + (index & 7))}${(index >> 3) + 1}` as Key;
}

export function applyPlayedMove(fen: string, san: string): PlayedPosition | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;
  const pos = Chess.fromSetup(setup.unwrap());
  if (pos.isErr) return null;

  const before = pos.unwrap();
  const move = parseSan(before, san);
  if (!move || !('from' in move)) return null;

  const after = before.clone();
  after.play(move);

  // chessops encodes castling as king→rook square; players expect the king
  // highlighted on g/c file, which is also what chessground rendered.
  const bare = san.replace(/[+#]/g, '');
  const castleFile = bare === 'O-O' ? 6 : bare === 'O-O-O' ? 2 : null;
  const to =
    castleFile === null ? square(move.to) : square((move.from >> 3) * 8 + castleFile);

  return {
    fen: makeFen(after.toSetup()),
    lastMove: [square(move.from), to],
    isCheck: after.isCheck(),
    turnColor: after.turn,
  };
}
