/**
 * Chess logic utilities using chessops.
 * Bridges chessops with our ChessBoard component.
 */

import { Chess } from 'chessops/chess';
import { parseFen } from 'chessops/fen';
import { makeFen } from 'chessops/fen';
import { chessgroundDests } from 'chessops/compat';
import { parseUci, makeUci } from 'chessops/util';
import { makeSan } from 'chessops/san';
import type { Dests, Color, Key } from '@lichess-org/chessground/types';

export interface ChessPosition {
  chess: Chess;
  fen: string;
  turnColor: Color;
  dests: Dests;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  isInsufficientMaterial: boolean;
}

/**
 * Create a chess position from a FEN string.
 * Returns the position with legal moves for chessground.
 */
export function positionFromFen(fen: string): ChessPosition | null {
  const setup = parseFen(fen);
  if (setup.isErr) return null;

  const chess = Chess.fromSetup(setup.unwrap());
  if (chess.isErr) return null;

  const pos = chess.unwrap();
  const dests = chessgroundDests(pos);
  const turnColor: Color = pos.turn === 'white' ? 'white' : 'black';

  return {
    chess: pos,
    fen,
    turnColor,
    dests,
    isCheck: pos.isCheck(),
    isCheckmate: pos.isCheckmate(),
    isStalemate: pos.isStalemate(),
    isGameOver: pos.isEnd(),
    isInsufficientMaterial: pos.isInsufficientMaterial(),
  };
}

/**
 * Apply a move (in UCI format like "e2e4") to a position.
 * Returns the new position or null if the move is illegal.
 */
export function applyMove(position: ChessPosition, uciMove: string): ChessPosition | null {
  const move = parseUci(uciMove);
  if (!move) return null;

  const newPos = position.chess.clone();
  newPos.play(move);

  const newFen = makeFen(newPos.toSetup());
  const dests = chessgroundDests(newPos);
  const turnColor: Color = newPos.turn === 'white' ? 'white' : 'black';

  return {
    chess: newPos,
    fen: newFen,
    turnColor,
    dests,
    isCheck: newPos.isCheck(),
    isCheckmate: newPos.isCheckmate(),
    isStalemate: newPos.isStalemate(),
    isGameOver: newPos.isEnd(),
    isInsufficientMaterial: newPos.isInsufficientMaterial(),
  };
}

/**
 * Convert chessground move (orig, dest) to UCI string.
 * Handles promotion by defaulting to queen.
 */
export function toUci(orig: Key, dest: Key, promotion?: string): string {
  return `${orig}${dest}${promotion || ''}`;
}

/**
 * Convert a UCI move to SAN notation in a given position.
 */
export function uciToSan(position: ChessPosition, uciMove: string): string | null {
  const move = parseUci(uciMove);
  if (!move) return null;
  try {
    return makeSan(position.chess, move);
  } catch {
    return null;
  }
}

/**
 * Get the initial position.
 */
export function initialPosition(): ChessPosition {
  return positionFromFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')!;
}

/**
 * Check if a move is a pawn promotion.
 * Returns true if the move needs a promotion piece selection.
 */
export function isPromotion(position: ChessPosition, orig: Key, dest: Key): boolean {
  const piece = position.chess.board.get(parseSquare(orig));
  if (!piece || piece.role !== 'pawn') return false;
  const destRank = dest[1];
  return (piece.color === 'white' && destRank === '8') ||
         (piece.color === 'black' && destRank === '1');
}

function parseSquare(key: Key): number {
  const file = key.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = key.charCodeAt(1) - '1'.charCodeAt(0);
  return rank * 8 + file;
}
