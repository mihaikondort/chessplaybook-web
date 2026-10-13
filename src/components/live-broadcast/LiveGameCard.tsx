import { useMemo } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { Card, CardContent } from '@/components/ui/card';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { parseGame } from '@/lib/game/gameModel';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { useLiveClockCountdown } from '@/hooks/useLiveClockCountdown';
import type { LiveGame } from '@/types/LiveBroadcast';

interface LiveGameCardProps {
  game: LiveGame;
  onGameClick?: (game: LiveGame) => void;
  size?: 'small' | 'medium';
  roundLeg?: string; // "1", "2", or "TB"
  tournamentRound?: number; // Tournament round number (1, 2, 3, etc.)
}

/**
 * Format round display from tournament round + game leg
 *
 * IMPORTANT: For World Cup, Lichess uses the Round tag to indicate Game Number, not Tournament Round!
 * - Game 1: [Round "1.1"] means Game 1, leg 1
 * - Game 2: [Round "2.1"] means Game 2, leg 1 (colors reversed)
 *
 * We use the tournamentRound from the gameDay config and leg from BroadcastURL:
 * - tournamentRound=1, roundLeg="1" -> "R1.1" (Round 1, Game 1)
 * - tournamentRound=2, roundLeg="2" -> "R2.2" (Round 2, Game 2)
 * - tournamentRound=1, roundLeg="TB" -> "R1.TB" (Round 1, Tiebreaks)
 */
function formatRoundDisplay(tournamentRound: number, roundLeg?: string): string {
  // If we have leg information, show full display
  if (roundLeg) {
    return `R${tournamentRound}.${roundLeg}`;
  }

  // Fallback: just show round number
  return `R${tournamentRound}`;
}

export function LiveGameCard({ game, size = 'small', roundLeg, tournamentRound = 1, onGameClick }: LiveGameCardProps) {
  const { white, black, opening, isOngoing, moveCount, round } = game;
  const { currentTheme } = useBoardTheme();
  /* The latest position, from the PGN the page polls (E8). The board is view-only and
     only ever shows the newest move; reading a game move by move is the live viewer's. */
  const latest = useMemo(() => {
    const parsed = parseGame(game.pgn);
    if (!parsed.ok) return null;
    const plies = parsed.game.plies;
    return { fen: plies.length ? plies[plies.length - 1].fen : parsed.game.startFen, ply: plies[plies.length - 1] };
  }, [game.pgn]);
  const { whiteClock, blackClock, whiteIsActive, blackIsActive } = useLiveClockCountdown(game);

  // Use leg from game object if available, otherwise use roundLeg prop
  const leg = game.leg || roundLeg;
  const roundDisplay = formatRoundDisplay(tournamentRound, leg);

  // Only show match score for Game 2 and beyond (not Game 1)
  // Display from current game's white player perspective
  const shouldShowMatchScore = leg && leg !== '1';
  const matchScoreDisplay = shouldShowMatchScore && white.matchScore !== undefined && black.matchScore !== undefined
    ? `${white.matchScore}-${black.matchScore}`
    : null;

  const handleClick = () => {
    if (onGameClick) {
      onGameClick(game);
    }
  };

  return (
    <Card
      className={`border-border transition-all duration-200 ${onGameClick ? 'cursor-pointer hover:border-primary hover:shadow-lg hover:shadow-primary/20' : ''}`}
      onClick={handleClick}
    >
      <CardContent className="p-1.5 space-y-1">
        {/* Game status indicator */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {isOngoing ? (
            <>
              <div className="w-2 h-2 bg-live rounded-full animate-pulse" />
              <span className="text-live font-semibold">LIVE</span>
              <span className="text-muted-foreground">{roundDisplay}</span>
              <span className="text-muted-foreground">• Move {Math.ceil(moveCount / 2)}</span>
              {matchScoreDisplay && (
                <span className="text-link font-semibold">
                  • Match: {matchScoreDisplay}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-muted-foreground">{roundDisplay}</span>
              <span className="text-muted-foreground">• Result: {game.result}</span>
              {matchScoreDisplay && (
                <span className="text-link font-semibold">
                  • Match: {matchScoreDisplay}
                </span>
              )}
            </>
          )}
        </div>

        {/* Black player (top of board) */}
        <div className="leading-none">
          <div className="flex items-center justify-between gap-2 text-sm leading-none pb-0.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 leading-none">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 border border-border-strong"
                style={{ backgroundColor: currentTheme.colors.darkSquare }}
              />
              <span className="font-medium text-foreground truncate leading-tight">{black.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 leading-none">
              {blackClock && (
                <span className={`text-[10px] font-mono ${blackIsActive ? 'text-foreground' : 'text-muted-foreground'} leading-none`}>
                  {blackClock}
                </span>
              )}
              {black.title && (
                <span className="text-link font-bold leading-none">{black.title}</span>
              )}
              <span className="leading-none">{black.rating}</span>
            </div>
          </div>
        </div>

        {/* The board, as wide as the card: the grid cell sizes it (E8; a fixed 254px before). */}
        {latest && (
          <div className="document-board">
            <ChessBoard
              fen={latest.fen}
              viewOnly
              lastMove={latest.ply ? (latest.ply.lastMove as Key[]) : undefined}
              check={latest.ply?.check ? (latest.ply.color === 'white' ? 'black' : 'white') : undefined}
              turnColor={latest.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
              themeId={currentTheme.id}
            />
          </div>
        )}

        {/* White player (bottom of board) */}
        <div className="leading-none">
          <div className="flex items-center justify-between gap-2 text-sm leading-none">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 leading-none">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 border border-border-strong"
                style={{ backgroundColor: currentTheme.colors.lightSquare }}
              />
              <span className="font-medium text-foreground truncate leading-tight">{white.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 leading-none">
              {whiteClock && (
                <span className={`text-[10px] font-mono ${whiteIsActive ? 'text-foreground' : 'text-muted-foreground'} leading-none`}>
                  {whiteClock}
                </span>
              )}
              {white.title && (
                <span className="text-link font-bold leading-none">{white.title}</span>
              )}
              <span className="leading-none">{white.rating}</span>
            </div>
          </div>
        </div>

        {/* Opening */}
        <div className="pt-0.5 border-t border-border">
          <div className="text-xs text-muted-foreground truncate leading-tight" title={opening}>
            {opening}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
