import { useMemo } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { parseUci } from 'chessops/util';
import { normalizeMove } from 'chessops/chess';
import { makeSan } from 'chessops/san';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { positionFromFen } from '@/components/chess/chessLogic';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { applyPlayedMove } from '../services/playedPosition';

interface ChallengeBoardProps {
  /** Position to solve. */
  fen: string;
  /** Called with the SAN of the move the user played. */
  onMove: (san: string) => void;
  /**
   * SAN of the move already played on this position. When set the board shows
   * the resulting position with the move highlighted, and is not playable —
   * so the analysis beside it refers to a board that matches.
   */
  playedMove?: string;
  /** Block input without changing the display (e.g. a move is in flight). */
  frozen?: boolean;
  /**
   * Seen from the other side. The session owns it (layout redesign D4b): the
   * Flip control is in the Workspace's toolbar, a different slot from the
   * board, so the state cannot live in either one alone.
   */
  flipped?: boolean;
}

/**
 * The interactive turn: the champion's position, user to move.
 *
 * Promotion positions are filtered out at bake time, so an orig→dest pair from
 * chessground is unambiguous — no promotion picker needed.
 *
 * The board only: it takes its size from the Workspace slot (D4b), where it
 * used to be passed a size and draw its own control strip.
 */
export function ChallengeBoard({
  fen, onMove, playedMove, frozen = false, flipped = false,
}: ChallengeBoardProps) {
  const { currentTheme } = useBoardTheme();
  const chessPosition = useMemo(() => positionFromFen(fen), [fen]);

  /** Position after the played move, so the board keeps showing it. */
  const played = useMemo(
    () => (playedMove ? applyPlayedMove(fen, playedMove) : null),
    [playedMove, fen],
  );

  if (!chessPosition) {
    return <p className="text-destructive">This position could not be loaded.</p>;
  }

  const locked = Boolean(played) || frozen;

  const handleMove = (orig: Key, dest: Key) => {
    if (locked) return;
    const move = parseUci(`${orig}${dest}`);
    if (!move) return;
    // Castling: chessground reports king→g1/c1, chessops encodes king→rook square.
    const san = makeSan(chessPosition.chess, normalizeMove(chessPosition.chess, move));
    onMove(san);
  };

  const orientation = flipped
    ? chessPosition.turnColor === 'white' ? 'black' : 'white'
    : chessPosition.turnColor;

  return (
    <ChessBoard
      fen={played ? played.fen : fen}
      // Defaults to the solver's colour, never the new turn after their move.
      orientation={orientation}
      dests={locked ? new Map() : chessPosition.dests}
      turnColor={played ? played.turnColor : chessPosition.turnColor}
      movableColor={locked ? undefined : chessPosition.turnColor}
      lastMove={played?.lastMove}
      check={
        played
          ? played.isCheck
            ? played.turnColor
            : undefined
          : chessPosition.isCheck
            ? chessPosition.turnColor
            : undefined
      }
      viewOnly={Boolean(played)}
      themeId={currentTheme.id}
      onMove={handleMove}
    />
  );
}
