/**
 * One game of a Lichess broadcast round, followed as it is played, on the
 * Workspace (`GameViewerWorkspace` with live clocks).
 *
 * Extracted from `LiveGameViewer` so the World Championship game pages use the
 * same poll and the same board page: it fetches the round's PGN at once and every
 * 3 seconds, and stops when the picked game has a result. A NEW MOVE MOVES THE
 * BOARD ONLY IF THE READER WAS AT THE LATEST ONE (D31).
 *
 * While the round holds no game `pick` accepts (before the first move is
 * broadcast) it renders `waiting` and keeps polling, so the board appears on its
 * own when the game starts.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ReportProblemLink from '@/components/support/ReportProblemLink';
import { Button } from '@/components/ui/button';
import { lichessBroadcastService } from '@/services/LichessBroadcastService';
import type { LiveGame } from '@/types/LiveBroadcast';
import { GameViewerWorkspace, sideResult, type ViewerGoTo, type ViewerPlayer } from '@/components/game-viewer/GameViewerWorkspace';

export interface LiveRoundGameProps {
  roundId: string;
  /** The game to show from the round's games. */
  pick: (games: LiveGame[]) => LiveGame | undefined;
  goTo: ViewerGoTo[];
  /** Shown as given while the round has no game `pick` accepts (a page centres its own card). */
  waiting: ReactNode;
  /** Where the error state's button leads. */
  back: { label: string; to: string };
  /** The game card's headline and lines; the event and opening by default. */
  info?: (game: LiveGame) => { headline: string; lines: string[] };
  /** Called with each fetch's game (the match page reads the result from it). */
  onGame?: (game: LiveGame) => void;
  /** Extra for a player card, by the player's PGN name: a portrait, a cleaner name. */
  player?: (name: string) => Partial<ViewerPlayer> | undefined;
  /** Shown during the first fetch; a line of text by default. */
  loadingView?: ReactNode;
}

function defaultInfo(game: LiveGame) {
  return {
    headline: game.event,
    lines: [
      game.round && game.round !== '?' ? `Round ${game.round}` : '',
      [game.eco, game.opening !== 'Unknown Opening' ? game.opening : ''].filter(Boolean).join(' · '),
    ],
  };
}

export function LiveRoundGame({ roundId, pick, goTo, waiting, back, info = defaultInfo, onGame, player, loadingView }: LiveRoundGameProps) {
  const [game, setGame] = useState<LiveGame | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*
    THE POLL. One effect per round: it fetches at once and every 3 seconds, and
    stops when the game has a result. `pick` is read through the latest render,
    not a dependency, so a new arrow function per render does not restart it.
  */
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onGameRef = useRef(onGame);
  onGameRef.current = onGame;

  useEffect(() => {
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchGame = async () => {
      if (stopped) return;
      try {
        const pgnText = await lichessBroadcastService.fetchRoundPGN(roundId);
        const found = pickRef.current(lichessBroadcastService.parsePGNText(pgnText));
        if (stopped) return;
        setError(null);
        if (found) {
          setGame(found);
          setMissing(false);
          onGameRef.current?.(found);
          if (!found.isOngoing) {
            stopped = true;
            if (intervalId) clearInterval(intervalId);
          }
        } else {
          setMissing(true);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[LiveRoundGame] Error fetching game:', err);
        if (!stopped) setError('Failed to load live game. Please try again.');
      } finally {
        if (!stopped) setLoading(false);
      }
    };

    fetchGame();
    intervalId = setInterval(fetchGame, 3000);
    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [roundId]);

  /* The page region is locked to the window on a Workspace route: the loading,
     waiting and error states sit in it, centred, rather than asking for a screen
     of their own. */
  if (loading && !game) {
    if (loadingView) return <>{loadingView}</>;
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading live game...</div>
      </div>
    );
  }

  if (!game && missing && !error) {
    return <>{waiting}</>;
  }

  if (!game) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="text-xl text-destructive">{error || 'Game not found'}</div>
          <Button asChild variant="outline">
            <Link to={back.to}>{back.label}</Link>
          </Button>
          <div>
            <ReportProblemLink surface="load_error" />
          </div>
        </div>
      </div>
    );
  }

  const live = game.isOngoing;
  const card = info(game);
  return (
    <>
      {/* The board page has no visible heading: nothing may sit above the board. */}
      <h1 className="sr-only">{`${game.white.name} vs ${game.black.name}`}</h1>
      <GameViewerWorkspace
        key={`${roundId}/${game.id}`}
        pgn={game.pgn}
        info={{ ...card, status: live ? 'Live' : game.result, live }}
        players={{
          white: { name: game.white.name, title: game.white.title, rating: game.white.rating || undefined, detail: live ? 'Playing' : sideResult('white', game.result), ...player?.(game.white.name) },
          black: { name: game.black.name, title: game.black.title, rating: game.black.rating || undefined, detail: live ? 'Playing' : sideResult('black', game.result), ...player?.(game.black.name) },
        }}
        goTo={goTo}
        live={live}
        initialPly={live ? 'latest' : 'start'}
        analyticsSurface="live_game"
        boardLabel={`Chess board, ${game.white.name} against ${game.black.name}, ${live ? 'live' : 'finished'}`}
      />
    </>
  );
}
