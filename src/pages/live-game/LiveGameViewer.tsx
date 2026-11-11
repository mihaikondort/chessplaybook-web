/**
 * Live Game Viewer Page
 *
 * One game of a Lichess broadcast, followed as it is played (layout redesign E5,
 * 2026-10-10; it was the Lichess PGN viewer). The poll and the board page are
 * `LiveRoundGame` since 2026-11-11, shared with the World Championship game
 * pages: it polls the round's PGN every 3 seconds until the game has a result,
 * and renders `GameViewerWorkspace`, the same board page as the champion viewers,
 * with live clocks.
 *
 * A NEW MOVE MOVES THE BOARD ONLY IF THE READER WAS AT THE LATEST ONE (D31): the
 * workspace keeps the reader's move otherwise, and the list, the clocks and the board
 * all follow the same PGN. The Lichess viewer pulled the board to the newest position
 * and left its move list, clocks and controls on the PGN it was built with.
 */

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import type { LiveGame } from '@/types/LiveBroadcast';
import { LiveRoundGame } from '@/components/live-broadcast/LiveRoundGame';

export default function LiveGameViewer() {
  const { roundId, gameId } = useParams<{ roundId: string; gameId: string }>();
  const location = useLocation();
  const [game, setGame] = useState<LiveGame | null>(null);

  /* Where "Back to the round" goes: the round page that opened this one, else the hub. */
  const from = (location.state as { from?: string } | null)?.from;
  const back = from && from.startsWith('/') ? from : '/live-events';

  if (!roundId || !gameId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl text-destructive">Invalid game URL</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        {game && <title>{`${game.white.name} vs ${game.black.name} - Live Chess Game`}</title>}
        {game && <meta name="description" content={`Watch ${game.white.name} vs ${game.black.name} live from ${game.event}`} />}
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <LiveRoundGame
        key={`${roundId}/${gameId}`}
        roundId={roundId}
        pick={games => games.find(g => g.id === gameId)}
        goTo={[{ label: 'Back to the round', to: back, direction: 'back' }]}
        waiting={
          <div className="flex h-full items-center justify-center p-4">
            <div className="space-y-4 text-center">
              <div className="text-xl text-destructive">Game not found in current round</div>
              <Button asChild variant="outline">
                <Link to={back}>Back to the round</Link>
              </Button>
            </div>
          </div>
        }
        back={{ label: 'Back to the round', to: back }}
        onGame={setGame}
      />
    </>
  );
}
