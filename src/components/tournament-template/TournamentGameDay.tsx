/**
 * Tournament Game Day Component
 *
 * Generic game day viewer with simple polling logic
 * Works for any tournament format (Swiss, Elimination, Round Robin)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GameDayHeader } from './GameDayHeader';
import { LiveGameCard } from '@/components/live-broadcast/LiveGameCard';
import { ArrowLeft, Loader2, AlertCircle, ChevronLeft, ChevronRight, Tv, X, Maximize2, Minimize2 } from 'lucide-react';
import type { TournamentConfig, GameDay } from '@/types/Tournament';
import { lichessBroadcastService } from '@/services/LichessBroadcastService';
import { lichessTournamentService } from '@/services/LichessTournamentService';
import type { LiveGame } from '@/types/LiveBroadcast';
import { useLocation, useNavigate } from 'react-router-dom';

interface TournamentGameDayProps {
  config: TournamentConfig;
  slug: string;
}

export function TournamentGameDay({ config, slug }: TournamentGameDayProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Find game day
  const gameDay = config.gameDays.find(gd => gd.slug === slug);

  const [games, setGames] = useState<LiveGame[]>([]);
  const [womenGames, setWomenGames] = useState<LiveGame[]>([]);
  const [streamMode, setStreamMode] = useState<'hidden' | 'compact' | 'expanded'>('expanded');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const GAMES_PER_PAGE = 12;

  // Handle game card click
  const handleGameClick = (game: LiveGame) => {
    if (gameDay?.lichessRoundId) {
      // The round page's own address, so the live viewer's Go to can lead back to it (E5).
      navigate(`/live-game/${gameDay.lichessRoundId}/${game.id}`, { state: { from: location.pathname } });
    }
  };

  const handleWomenGameClick = (game: LiveGame) => {
    if (gameDay?.womenLichessRoundId) {
      navigate(`/live-game/${gameDay.womenLichessRoundId}/${game.id}`, { state: { from: location.pathname } });
    }
  };

  // Simple polling effect - same for all formats!
  useEffect(() => {
    if (!gameDay) {
      setLoading(false);
      return;
    }

    // Check if this is a tiebreak game day with dynamic discovery
    const isTiebreakGameDay = (gameDay.gameNumber && gameDay.gameNumber >= 3) || gameDay.slug.toLowerCase().includes('tiebreak');
    const hasDynamicDiscovery = isTiebreakGameDay && config.lichessRoundMappings;

    // Only exit early if no lichessRoundId AND no dynamic discovery available
    if (!gameDay.lichessRoundId && !hasDynamicDiscovery) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let interval: NodeJS.Timeout | null = null;

    const fetchGames = async () => {
      if (cancelled) return;

      try {
        // For Game 2 or later, fetch all previous games in the same round for cumulative scoring
        let combinedPGN = '';
        let currentGameLeg = '1';
        let isTiebreak = false;

        if (gameDay.gameNumber && gameDay.gameNumber >= 2) {
          // Check if this is a tiebreak game day (gameNumber 3+, or slug contains 'tiebreak')
          isTiebreak = gameDay.gameNumber >= 3 || gameDay.slug.toLowerCase().includes('tiebreak');
          currentGameLeg = isTiebreak ? 'TB' : gameDay.gameNumber.toString();

          if (isTiebreak && config.lichessRoundMappings) {
            // DYNAMIC TIEBREAK DISCOVERY
            // Find the Lichess tournament ID for this round
            const mapping = config.lichessRoundMappings.find(
              m => m.roundNumber === gameDay.roundNumber
            );

            if (mapping) {
              if (import.meta.env.DEV) {
                console.log(`[TournamentGameDay] Discovering tiebreak rounds for Round ${gameDay.roundNumber} (Tournament: ${mapping.lichessTournamentId})`);
              }

              // Fetch all tiebreak rounds from Lichess API
              const tiebreakRounds = await lichessTournamentService.getTiebreakRounds(mapping.lichessTournamentId);

              if (import.meta.env.DEV) {
                console.log(`[TournamentGameDay] Found ${tiebreakRounds.length} tiebreak rounds`);
              }

              // First, fetch Game 1 and Game 2 for cumulative scoring
              const gamesInRound = config.gameDays.filter(
                gd => gd.roundNumber === gameDay.roundNumber && gd.lichessRoundId && gd.gameNumber && gd.gameNumber <= 2
              ).sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));

              for (const gd of gamesInRound) {
                try {
                  const pgn = await lichessBroadcastService.fetchRoundPGN(gd.lichessRoundId!);
                  combinedPGN += pgn + '\n\n';
                } catch (err) {
                  if (import.meta.env.DEV) {
                    console.warn(`[TournamentGameDay] Failed to fetch ${gd.slug}:`, err);
                  }
                }
              }

              // Then, fetch all discovered tiebreak rounds
              const MAX_TIEBREAK_ROUNDS = 15; // Hard stop limit
              let fetchedCount = 0;

              for (const tiebreakRound of tiebreakRounds) {
                if (fetchedCount >= MAX_TIEBREAK_ROUNDS) {
                  if (import.meta.env.DEV) {
                    console.warn(`[TournamentGameDay] Reached max tiebreak rounds limit (${MAX_TIEBREAK_ROUNDS})`);
                  }
                  break;
                }

                try {
                  const pgn = await lichessBroadcastService.fetchRoundPGN(tiebreakRound.id);

                  // Check if PGN has actual games (not empty)
                  if (pgn.trim().length > 0) {
                    combinedPGN += pgn + '\n\n';
                    fetchedCount++;

                    if (import.meta.env.DEV) {
                      console.log(`[TournamentGameDay] Fetched tiebreak round: ${tiebreakRound.name} (${tiebreakRound.id})`);
                    }
                  } else {
                    if (import.meta.env.DEV) {
                      console.log(`[TournamentGameDay] Tiebreak round ${tiebreakRound.name} has no games yet, stopping discovery`);
                    }
                    break; // Stop if we encounter an empty round
                  }
                } catch (err) {
                  if (import.meta.env.DEV) {
                    console.warn(`[TournamentGameDay] Failed to fetch tiebreak round ${tiebreakRound.name}:`, err);
                  }
                  // Stop fetching if we hit a 404 or error (round doesn't exist yet)
                  break;
                }
              }

              if (import.meta.env.DEV) {
                console.log(`[TournamentGameDay] Successfully fetched ${fetchedCount} tiebreak rounds`);
              }
            } else {
              // Fallback to static config if no mapping found
              if (import.meta.env.DEV) {
                console.warn(`[TournamentGameDay] No Lichess round mapping found for Round ${gameDay.roundNumber}, using static config`);
              }

              // Fetch all games in this round from static config
              const gamesInRound = config.gameDays.filter(
                gd => gd.roundNumber === gameDay.roundNumber && gd.lichessRoundId
              ).sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));

              for (const gd of gamesInRound) {
                try {
                  const pgn = await lichessBroadcastService.fetchRoundPGN(gd.lichessRoundId!);
                  combinedPGN += pgn + '\n\n';
                } catch (err) {
                  if (import.meta.env.DEV) {
                    console.warn(`[TournamentGameDay] Failed to fetch ${gd.slug}:`, err);
                  }
                }
              }
            }
          } else {
            // Non-tiebreak game day or no dynamic discovery configured
            // Fetch all games in this round (Game 1, Game 2, etc.)
            const gamesInRound = config.gameDays.filter(
              gd => gd.roundNumber === gameDay.roundNumber && gd.lichessRoundId
            ).sort((a, b) => (a.gameNumber || 0) - (b.gameNumber || 0));

            // Fetch PGN for each game and combine into one string
            for (const gd of gamesInRound) {
              try {
                const pgn = await lichessBroadcastService.fetchRoundPGN(gd.lichessRoundId!);
                combinedPGN += pgn + '\n\n';
              } catch (err) {
                // Skip failed fetches (e.g., future games that don't exist yet)
                if (import.meta.env.DEV) {
                  console.warn(`[TournamentGameDay] Failed to fetch ${gd.slug}:`, err);
                }
              }
            }
          }
        } else {
          // For Game 1, just fetch current round
          combinedPGN = await lichessBroadcastService.fetchRoundPGN(gameDay.lichessRoundId!);
          currentGameLeg = '1';
        }

        if (cancelled) return;

        // Parse all games together so calculateMatchScores can see all games
        const allGames = lichessBroadcastService.parsePGNText(combinedPGN);

        // Filter to only show current game day's games
        // For tiebreaks, we need to group ALL games (including Game 1 & 2) to find the latest per match
        // For round-robin, games have no leg (empty string) — show all
        let currentGames = isTiebreak
          ? allGames // Use ALL games for grouping, not just TB
          : currentGameLeg === '1'
            ? allGames.filter(g => g.leg === currentGameLeg || g.leg === '')
            : allGames.filter(g => g.leg === currentGameLeg);

        // For tiebreaks, group by match and show only the latest TIEBREAK game per match
        if (isTiebreak && currentGames.length > 0) {
          // Group ALL games by match (Game 1, Game 2, and all tiebreaks)
          const matchMap = new Map<string, typeof currentGames>();

          for (const game of currentGames) {
            // Create a unique match key from both players (sorted alphabetically to handle color switches)
            const players = [game.white.name, game.black.name].sort();
            const matchKey = `${players[0]} vs ${players[1]}`;

            if (!matchMap.has(matchKey)) {
              matchMap.set(matchKey, []);
            }
            matchMap.get(matchKey)!.push(game);
          }

          // For each match, get only the latest TIEBREAK game (filter out Game 1 & 2)
          const latestGamesPerMatch: typeof currentGames = [];

          for (const [matchKey, games] of matchMap) {
            // Filter to only tiebreak games (leg === 'TB')
            const tiebreakGames = games.filter(g => g.leg === 'TB');

            // If this match has tiebreak games, show the latest one
            if (tiebreakGames.length > 0) {
              // Sort tiebreak games with sophisticated logic:
              // 1. Prefer games with truly decisive results (1-0 or 0-1, NOT draws)
              // 2. Then by start time descending (latest first)
              const sortedTiebreaks = tiebreakGames.sort((a, b) => {
                // A game is decisive if it has a winner (1-0 or 0-1)
                // Draws (1/2-1/2) are NOT decisive in tiebreaks - they mean more tiebreaks follow
                const aIsDecisive = a.result === '1-0' || a.result === '0-1';
                const bIsDecisive = b.result === '1-0' || b.result === '0-1';

                // Priority 1: Decisive games first
                if (aIsDecisive && !bIsDecisive) return -1;
                if (!aIsDecisive && bIsDecisive) return 1;

                // Priority 2: Preserve original Lichess order
                return 0;
              });

              // Take the best tiebreak game (decisive if available, otherwise latest)
              latestGamesPerMatch.push(sortedTiebreaks[0]);

              if (import.meta.env.DEV) {
                const isDecisive = sortedTiebreaks[0].result === '1-0' || sortedTiebreaks[0].result === '0-1';
                console.log(`[TournamentGameDay] Match "${matchKey}": ${games.length} total games, ${tiebreakGames.length} tiebreaks, showing ${isDecisive ? 'DECISIVE' : 'latest'} TB (result: ${sortedTiebreaks[0].result})`);
              }
            } else {
              // No tiebreak games yet for this match - it's still in classical games
              if (import.meta.env.DEV) {
                console.log(`[TournamentGameDay] Match "${matchKey}": ${games.length} total games, 0 tiebreaks (match still in classical games)`);
              }
            }
          }

          // Now apply smart sorting to the latest games:
          // 1. Live games first
          // 2. Upcoming games (by start time descending)
          // 3. Finished games (by start time descending)
          currentGames = latestGamesPerMatch.sort((a, b) => {
            // Priority 1: Live games come first
            if (a.isOngoing && !b.isOngoing) return -1;
            if (!a.isOngoing && b.isOngoing) return 1;

            // Priority 2: If both live or both not live, sort by result status
            const aIsFinished = a.result !== '*';
            const bIsFinished = b.result !== '*';

            if (!aIsFinished && bIsFinished) return -1; // Upcoming/Live before Finished
            if (aIsFinished && !bIsFinished) return 1;

            // Priority 3: Preserve original Lichess order
            return 0;
          });

          if (import.meta.env.DEV) {
            console.log(`[TournamentGameDay] Showing ${currentGames.length} matches (latest game per match across all legs, sorted: live → upcoming → finished)`);
          }
        }

        // Fetch Women's section if configured
        let womenCurrentGames: LiveGame[] = [];
        if (gameDay.womenLichessRoundId) {
          try {
            const womenPGN = await lichessBroadcastService.fetchRoundPGN(gameDay.womenLichessRoundId);
            if (womenPGN && womenPGN.trim().length > 0) {
              womenCurrentGames = lichessBroadcastService.parsePGNText(womenPGN);
            }
          } catch {
            // Women's section fetch failed — continue with Open only
          }
        }

        setGames(currentGames);
        setWomenGames(womenCurrentGames);
        setLoading(false);
        setError(null);

        // Stop polling if all games finished (both Open and Women's)
        const hasOngoingGames = currentGames.some(g => g.isOngoing) || womenCurrentGames.some(g => g.isOngoing);
        if (!hasOngoingGames && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        if (cancelled) return;

        if (import.meta.env.DEV) {
          console.error('[TournamentGameDay] Error fetching games:', err);
        }
        setLoading(false);
      }
    };

    // Initial fetch
    fetchGames();

    // Poll every 3 seconds
    interval = setInterval(fetchGames, 3000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [gameDay]);

  // Pagination calculations
  const totalPages = Math.ceil(games.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const currentGames = games.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Game day not found
  if (!gameDay) {
    return (
      <div className="bg-background flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Game Day Not Found</h2>
            <p className="text-muted-foreground">The requested game day does not exist.</p>
            <Link to={`/${config.id}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tournament
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex flex-col">

      <div className="flex-grow container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Link
            to={`/${config.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {config.shortName}
          </Link>
        </div>

        {/* Game Day Header */}
        <GameDayHeader
          tournamentName={config.name}
          gameDay={gameDay}
          gamesCount={games.length + womenGames.length}
          currentPageStart={startIndex + 1}
          currentPageEnd={endIndex}
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-link" />
            <span className="ml-3 text-lg text-muted-foreground">Loading games...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="bg-card border-border p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later or try a different game day.
            </p>
          </Card>
        )}

        {/* Live Commentary Stream */}
        {gameDay?.youtubeVideoId && (
          <>
            {streamMode === 'hidden' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStreamMode('compact')}
                className="gap-2 mb-3 text-live border-live/30 hover:bg-live/10"
              >
                <Tv className="w-4 h-4" />
                Watch Live Commentary
              </Button>
            )}

            {streamMode !== 'hidden' && (
              <div className={`mb-3 rounded-lg border border-border bg-background ${streamMode === 'expanded' ? 'max-w-4xl mx-auto' : 'max-w-md'}`}>
                <div className="relative z-10 flex items-center justify-between px-3 py-2 bg-card border-b border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-live" />
                    FIDE Official Commentary
                  </span>
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://www.youtube.com/watch?v=${gameDay.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 text-[10px] text-live border border-live/30 hover:bg-live/10 rounded transition-colors"
                      title="Open on YouTube"
                    >
                      YouTube
                    </a>
                    {streamMode === 'compact' && (
                      <button
                        onClick={() => setStreamMode('expanded')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-control rounded transition-colors"
                        title="Expand"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    )}
                    {streamMode === 'expanded' && (
                      <button
                        onClick={() => setStreamMode('compact')}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-control rounded transition-colors"
                        title="Compact"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setStreamMode('hidden')}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-control rounded transition-colors"
                      title="Hide stream"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className={`overflow-hidden ${streamMode === 'compact' ? 'h-[200px]' : 'aspect-video'}`}>
                  <iframe
                    src={`https://www.youtube.com/embed/${gameDay.youtubeVideoId}?autoplay=1`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Games Grid */}
        {!loading && !error && games.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
              {currentGames.map(game => (
                <LiveGameCard
                  key={game.id}
                  game={game}
                  onGameClick={handleGameClick}
                  tournamentRound={gameDay?.roundNumber}
                />
              ))}
            </div>

            {/* Bottom Pagination Controls (duplicate for convenience) */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1 h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>

                <span className="text-sm text-muted-foreground font-mono">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1 h-8"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Women's Section */}
        {!loading && !error && womenGames.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
            {womenGames.map(game => (
              <LiveGameCard
                key={`women-${game.id}`}
                game={game}
                onGameClick={handleWomenGameClick}
                tournamentRound={gameDay?.roundNumber}
              />
            ))}
          </div>
        )}

        {/* No Games */}
        {!loading && !error && games.length === 0 && womenGames.length === 0 && (
          <Card className="bg-card border-border p-8 text-center">
            <p className="text-lg text-muted-foreground">No games available yet.</p>
          </Card>
        )}
      </div>

    </div>
  );
}
