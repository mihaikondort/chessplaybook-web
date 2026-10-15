/**
 * Live Game Viewer Page
 *
 * One game of a Lichess broadcast, followed as it is played (layout redesign E5,
 * 2026-10-10; it was the Lichess PGN viewer). The page polls the round's PGN every
 * 3 seconds until the game has a result, and renders `GameViewerWorkspace`, the same
 * board page as the champion viewers, with live clocks.
 *
 * A NEW MOVE MOVES THE BOARD ONLY IF THE READER WAS AT THE LATEST ONE (D31): the
 * workspace keeps the reader's move otherwise, and the list, the clocks and the board
 * all follow the same PGN. The Lichess viewer pulled the board to the newest position
 * and left its move list, clocks and controls on the PGN it was built with.
 */

import { useEffect, useState } from 'react';
import ReportProblemLink from '@/components/support/ReportProblemLink';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { lichessBroadcastService } from '@/services/LichessBroadcastService';
import type { LiveGame } from '@/types/LiveBroadcast';
import { GameViewerWorkspace } from '@/components/game-viewer/GameViewerWorkspace';

function resultFor(side: 'white' | 'black', result: string): string {
  if (result === '1-0') return side === 'white' ? 'Won' : 'Lost';
  if (result === '0-1') return side === 'black' ? 'Won' : 'Lost';
  if (result === '1/2-1/2') return 'Draw';
  return 'Playing';
}

export default function LiveGameViewer() {
  const { roundId, gameId } = useParams<{ roundId: string; gameId: string }>();
  const location = useLocation();
  const [game, setGame] = useState<LiveGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Where "Back to the round" goes: the round page that opened this one, else the hub. */
  const from = (location.state as { from?: string } | null)?.from;
  const back = from && from.startsWith('/') ? from : '/live-events';

  /*
    THE POLL. One effect per game: it fetches at once and every 3 seconds, and stops
    when the game has a result. `loading` is no longer a dependency, which tore the
    effect down and started it again after the first load.
  */
  useEffect(() => {
    if (!roundId || !gameId) {
      setError('Invalid game URL');
      setLoading(false);
      return;
    }
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchGame = async () => {
      if (stopped) return;
      try {
        const pgnText = await lichessBroadcastService.fetchRoundPGN(roundId);
        const found = lichessBroadcastService.parsePGNText(pgnText).find(g => g.id === gameId);
        if (stopped) return;
        if (found) {
          setGame(found);
          setError(null);
          if (!found.isOngoing) {
            stopped = true;
            if (intervalId) clearInterval(intervalId);
          }
        } else {
          setError('Game not found in current round');
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[LiveGameViewer] Error fetching game:', err);
        if (!stopped) setError('Failed to load live game. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
    intervalId = setInterval(fetchGame, 3000);
    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [roundId, gameId]);

  /* The page region is locked to the window on a Workspace route: the loading and
     error states sit in it, centred, rather than asking for a screen of their own. */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading live game...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-xl text-destructive">{error || 'Game not found'}</div>
          <Button asChild variant="outline">
            <Link to={back}>Back to the round</Link>
          </Button>
          <div>
            <ReportProblemLink surface="load_error" />
          </div>
        </div>
      </div>
    );
  }

  const live = game.isOngoing;
  return (
    <>
      <Helmet>
        <title>{`${game.white.name} vs ${game.black.name} - Live Chess Game`}</title>
        <meta name="description" content={`Watch ${game.white.name} vs ${game.black.name} live from ${game.event}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* The board page has no visible heading: nothing may sit above the board. */}
      <h1 className="sr-only">{`${game.white.name} vs ${game.black.name}`}</h1>
      <GameViewerWorkspace
        key={`${roundId}/${gameId}`}
        pgn={game.pgn}
        info={{
          headline: game.event,
          lines: [
            game.round && game.round !== '?' ? `Round ${game.round}` : '',
            [game.eco, game.opening !== 'Unknown Opening' ? game.opening : ''].filter(Boolean).join(' · '),
          ],
          status: live ? 'Live' : game.result,
          live,
        }}
        players={{
          white: { name: game.white.name, title: game.white.title, rating: game.white.rating || undefined, detail: resultFor('white', game.result) },
          black: { name: game.black.name, title: game.black.title, rating: game.black.rating || undefined, detail: resultFor('black', game.result) },
        }}
        goTo={[{ label: 'Back to the round', to: back, direction: 'back' }]}
        live={live}
        initialPly={live ? 'latest' : 'start'}
        analyticsSurface="live_game"
        boardLabel={`Chess board, ${game.white.name} against ${game.black.name}, ${live ? 'live' : 'finished'}`}
      />
    </>
  );
}
