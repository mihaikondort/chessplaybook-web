/**
 * Game Viewer Page
 *
 * A champion's game, from the regular list or the best games. Loads the game, owns the
 * page's SEO and its engagement events, and renders `ChampionGameWorkspace`, the board
 * page (layout redesign E4b-1, 2026-10-10; it was the Lichess PGN viewer).
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { backendAPIClient } from '@/services/BackendAPIClient';
import type { PgnGame } from '@/types/chess';
import { Button } from '@/components/ui/button';
import { GameViewerWorkspace, sideResult } from '@/components/game-viewer/GameViewerWorkspace';
import { logGA4Event } from '@/services/analytics';

/** "1954.11.23" stays; "1954.??.??" reads "1954". */
function readableDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parts = date.split('.').filter(p => p && !p.includes('?'));
  return parts.length ? parts.join('.') : undefined;
}

function eloOf(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const GameViewer = () => {
  const { name, gameIndex } = useParams<{ name: string; gameIndex: string }>();
  const location = useLocation();
  const [game, setGame] = useState<PgnGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // How many games the list holds, from the API; the Go to card stops Next at the last.
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [championFullName, setChampionFullName] = useState<string>('');
  // M1 Phase 1.2 — engagement signal. Count unique positions visited per
  // game session; fire once at the 5-move threshold. Refs (not state) so
  // counter updates don't re-render.
  const visitedFensRef = useRef<Set<string>>(new Set());
  const fired5plusRef = useRef(false);

  // Detect if we're viewing a best game based on the URL
  const isBestGame = location.pathname.includes('/best-games/');
  // The list this index belongs to. Index i is a different game in each list, so every
  // URL this page builds (canonical, breadcrumbs, previous/next) must use the same one
  // (D33, 2026-10-10: a best game linked and canonicalised to the regular list).
  const listSegment = isBestGame ? 'best-games' : 'games';

  useEffect(() => {
    if (name && gameIndex !== undefined) {
      // Reset engagement trackers for the new game session.
      visitedFensRef.current = new Set();
      fired5plusRef.current = false;
      loadGame(name, parseInt(gameIndex, 10), isBestGame);
    }
  }, [name, gameIndex, isBestGame]);

  const handlePositionChange = (fen: string) => {
    if (!fen || fired5plusRef.current) return;
    visitedFensRef.current.add(fen);
    if (visitedFensRef.current.size >= 5 && name && gameIndex !== undefined) {
      fired5plusRef.current = true;
      logGA4Event({
        name: 'move_played_5plus',
        params: { champion: name, game_index: parseInt(gameIndex, 10) },
      });
    }
  };

  const loadGame = async (playerName: string, index: number, fromBestGames: boolean) => {
    try {
      setLoading(true);
      setError(null);

      let gameData: PgnGame;

      if (fromBestGames) {
        // Load from best games API
        const response = await backendAPIClient.getPlayerBestGames(playerName, {
          limit: 100,
        });

        if (index < 0 || index >= response.games.length) {
          throw new Error('Game not found');
        }
        setTotal(response.games.length);

        // Convert BestGame to PgnGame format
        const bestGame = response.games[index];
        gameData = {
          pgn: bestGame.pgn,
          metadata: {
            playerName,
            event: bestGame.event || '',
            site: bestGame.site || '',
            date: bestGame.date || '',
            round: bestGame.round || '',
            white: bestGame.whitePlayer,
            black: bestGame.blackPlayer,
            result: bestGame.result || '',
            whiteElo: bestGame.whiteElo?.toString() || '',
            blackElo: bestGame.blackElo?.toString() || '',
            eco: bestGame.ecoCode || '',
            opening: bestGame.openingName || '',
          },
        };
      } else {
        // Ask for the one game. Fetching the whole list to pick one by index cost
        // 2.1 MB gzipped for Carlsen on every game page (D34, 2026-10-10); the
        // endpoint slices the same ordered list, so offset i is game i.
        if (index < 0) {
          throw new Error('Game not found');
        }
        const response = await backendAPIClient.getPlayerGames(playerName, {
          limit: 1,
          offset: index,
        });

        if (response.games.length === 0) {
          throw new Error('Game not found');
        }
        setTotal(response.total);

        gameData = response.games[0];
      }

      setGame(gameData);
      logGA4Event({
        name: 'champion_game_opened',
        params: {
          champion: playerName,
          game_index: index,
          from_best_games: fromBestGames,
        },
      });

      // Get champion's full name
      const playerInfo = await backendAPIClient.getPlayer(playerName);
      if (playerInfo) {
        setChampionFullName(playerInfo.fullName);
      } else {
        setChampionFullName(playerName);
      }
    } catch (err) {
      console.error('Error loading game:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  };

  /* The page region is locked to the window on a Workspace route: the loading and
     error states sit in it, centred, rather than asking for a screen of their own. */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading game...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-xl text-destructive">
            Error: {error || 'Game not found'}
          </div>
          <Link to={`/champions/${name}/games`}>
            <Button>Back to Game List</Button>
          </Link>
        </div>
      </div>
    );
  }

  const meta = game.metadata;
  const index = gameIndex !== undefined ? parseInt(gameIndex, 10) : 0;
  const listBase = `/champions/${name}/${listSegment}`;
  const gameTitle = `${game.metadata.white} vs ${game.metadata.black}`;
  const gameDescription = `Analyze this classic chess game: ${game.metadata.white} vs ${game.metadata.black} from ${game.metadata.event} (${game.metadata.date}). Result: ${game.metadata.result}. Study the moves, strategies, and tactics.`;
  const fullTitle = `${gameTitle} - ${game.metadata.event} (${game.metadata.date}) | Chess Playbook`;

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={gameDescription} />
        <meta name="keywords" content={`${game.metadata.white}, ${game.metadata.black}, chess game, ${game.metadata.event}, chess analysis, ${name}`} />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`https://www.chessplaybook.com/champions/${name}/${listSegment}/${gameIndex}`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${gameTitle} - ${game.metadata.event}`} />
        <meta property="og:description" content={gameDescription} />
        <meta property="og:url" content={`https://www.chessplaybook.com/champions/${name}/${listSegment}/${gameIndex}`} />
        <meta property="og:type" content="article" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={gameTitle} />
        <meta name="twitter:description" content={gameDescription} />

        {/* Schema.org structured data for chess game */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Game",
            "name": gameTitle,
            "description": gameDescription,
            "gameType": "Chess",
            ...(game.metadata.date && (() => {
              // Handle full dates like "1954.11.23" -> "1954-11-23"
              if (game.metadata.date.match(/^\d{4}\.\d{2}\.\d{2}$/)) {
                return { datePublished: game.metadata.date.replace(/\./g, '-') };
              }
              // Handle partial dates like "1954.??.??" -> just year "1954"
              const yearMatch = game.metadata.date.match(/^(\d{4})/);
              if (yearMatch) {
                return { datePublished: yearMatch[1] };
              }
              return {};
            })()),
            "competitor": [
              {
                "@type": "Person",
                "name": game.metadata.white
              },
              {
                "@type": "Person",
                "name": game.metadata.black
              }
            ],
            "result": game.metadata.result,
            "about": {
              "@type": "ChessOpening",
              "name": game.metadata.opening || "Chess Game",
              "identifier": game.metadata.eco || ""
            }
          })}
        </script>

        {/* BreadcrumbList Schema.org */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.chessplaybook.com/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Champions",
                "item": "https://www.chessplaybook.com/champions"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": championFullName || name,
                "item": `https://www.chessplaybook.com/champions/${name}/${listSegment}`
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": gameTitle,
                "item": `https://www.chessplaybook.com/champions/${name}/${listSegment}/${gameIndex}`
              }
            ]
          })}
        </script>
      </Helmet>

      {/* The board page has no visible heading: nothing may sit above the board. */}
      <h1 className="sr-only">{gameTitle}</h1>
      <GameViewerWorkspace
        key={`${listSegment}/${gameIndex}`}
        pgn={game.pgn}
        info={{
          headline: meta.event || 'Game',
          lines: [
            [readableDate(meta.date), meta.round && `Round ${meta.round}`].filter(Boolean).join(' · '),
            [meta.eco, meta.opening].filter(Boolean).join(' · '),
          ],
          status: meta.result || '*',
        }}
        players={{
          white: { name: meta.white, rating: eloOf(meta.whiteElo), detail: sideResult('white', meta.result) },
          black: { name: meta.black, rating: eloOf(meta.blackElo), detail: sideResult('black', meta.result) },
        }}
        goTo={[
          ...(index > 0 ? [{ label: 'Previous game', to: `${listBase}/${index - 1}`, direction: 'back' as const }] : []),
          ...(total === undefined || index + 1 < total ? [{ label: 'Next game', to: `${listBase}/${index + 1}`, direction: 'forward' as const }] : []),
          { label: listSegment === 'best-games' ? 'All best games' : 'All games', to: listBase, direction: 'forward' as const },
        ]}
        initialPly="start"
        review={{
          gameResult: meta.result === '1-0' ? 'white' : meta.result === '0-1' ? 'black' : 'draw',
          metadata: {
            playerName: '', white: meta.white || '', black: meta.black || '', result: meta.result || '',
            event: meta.event || '', site: '', date: meta.date || '', eco: meta.eco, opening: meta.opening,
          },
        }}
        analyticsSurface="champion_game"
        boardLabel={`Chess board, ${meta.white} against ${meta.black}`}
        onPositionChange={handlePositionChange}
      />
    </>
  );
};

export default GameViewer;
