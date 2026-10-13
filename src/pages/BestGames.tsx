/**
 * Best Games Page
 *
 * Displays the top 100 highest-quality games for a specific chess champion.
 * This is a copy of GameList.tsx adapted for best games data.
 * Users can click on any game to view it in the existing GameViewer.
 */

import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { backendAPIClient } from '@/services/BackendAPIClient';
import type { BestGame } from '@/types/bestGames';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

const BestGames = () => {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const ecoFilter = searchParams.get('eco');
  const [games, setGames] = useState<BestGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [championFullName, setChampionFullName] = useState<string>('');
  const [biography, setBiography] = useState<string>('');
  const [championshipYears, setChampionshipYears] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const GAMES_PER_PAGE = 50;

  useEffect(() => {
    if (name) {
      loadBestGames(name);
    }
  }, [name]);

  const loadBestGames = async (playerName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load best games from backend API
      const response = await backendAPIClient.getPlayerBestGames(playerName, {
        limit: 100,
      });

      setGames(response.games);

      // Get champion's full name, biography, and championship years
      const playerInfo = await backendAPIClient.getPlayer(playerName);
      if (playerInfo) {
        setChampionFullName(playerInfo.fullName);
        setBiography(playerInfo.biography);
        setChampionshipYears(playerInfo.championshipYears);
      } else {
        setChampionFullName(playerName);
      }
    } catch (err) {
      console.error('Error loading best games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load best games');
    } finally {
      setLoading(false);
    }
  };

  // Filter by ECO code if provided in URL query params (?eco=D35)
  const filteredGames = useMemo(() => {
    if (!ecoFilter) return games;
    return games.filter(g => g.ecoCode?.toUpperCase() === ecoFilter.toUpperCase());
  }, [games, ecoFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const paginatedGames = useMemo(() => filteredGames.slice(startIndex, endIndex), [filteredGames, startIndex, endIndex]);


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive text-xl mb-4">Error: {error}</div>
          <Link to="/champions">
            <Button>Back to Champions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = championFullName || name || 'Chess Champion';
  const gameCount = filteredGames.length;
  const fullTitle = ecoFilter
    ? `${pageTitle} — ${ecoFilter} Games | Chess Playbook`
    : `${pageTitle} Best ${games.length} Games | Chess Playbook`;

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta
          name="description"
          content={`Study the top ${gameCount} highest-quality chess games by ${pageTitle}, World Chess Champion. These games feature exceptional accuracy from both players.`}
        />
        <meta name="keywords" content={`${pageTitle}, ${name}, best chess games, world chess champion, chess accuracy, grandmaster games`} />
        <link rel="canonical" href={`https://www.chessplaybook.com/champions/${name}/best-games`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${pageTitle} Best ${gameCount} Games`} />
        <meta property="og:description" content={`Study the top ${gameCount} highest-quality games by ${pageTitle}, World Chess Champion.`} />
        <meta property="og:url" content={`https://www.chessplaybook.com/champions/${name}/best-games`} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${pageTitle} Best ${gameCount} Games`} />
        <meta name="twitter:description" content={`Top ${gameCount} highest-quality games by ${pageTitle}`} />

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
                "name": pageTitle,
                "item": `https://www.chessplaybook.com/champions/${name}/best-games`
              }
            ]
          })}
        </script>
      </Helmet>

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 px-6">
            <h1 className="text-4xl md:text-5xl font-bold text-link mb-2">
              {championFullName}
            </h1>
            {championshipYears && (
              <div className="mb-3">
                <span className="inline-block bg-primary/20 text-link px-4 py-1.5 rounded-full border border-primary/30 text-lg font-semibold">
                  {championshipYears}
                </span>
              </div>
            )}
            {biography && (
              <p className="text-lg text-muted-foreground max-w-4xl mb-4">
                {biography}
              </p>
            )}
            <p className="text-lg text-muted-foreground">
              {games.length} best games available
            </p>
          </div>

        {/* Games Table */}
        <Card className="bg-card border-border">
          <CardHeader className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-link text-2xl font-normal flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                {ecoFilter
                  ? `${gameCount} Best Games in ${ecoFilter}`
                  : `Best ${gameCount} Games`}
              </CardTitle>
              {!ecoFilter && (
                <Link to={`/champions/${name}/games`}>
                  <Button variant="outline" size="sm">
                    View All Games
                  </Button>
                </Link>
              )}
            </div>
            {ecoFilter && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Filtered by opening code: <span className="font-medium text-link">{ecoFilter}</span>
                </div>
                <Link to={`/champions/${name}/best-games`}>
                  <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Trophy className="w-4 h-4 mr-1" />
                    Best {games.length} Games
                  </Button>
                </Link>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {games.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-16 h-16 text-link mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg mb-4">
                  Best games coming soon for {championFullName || name}.
                </p>
                <Link to={`/champions/${name}/games`}>
                  <Button variant="outline">
                    View All Games
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[500px]">
                  <thead>
                    <tr className="border-b-2 border-primary/50">
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base w-10">#</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base w-28 sm:w-48">White</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base w-28 sm:w-48">Black</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base w-12 sm:w-20">
                        <span className="sm:hidden">Res.</span>
                        <span className="hidden sm:inline">Result</span>
                      </th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base w-14">Year</th>
                      <th className="text-left py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground font-semibold text-xs sm:text-base">Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGames.map((game, displayIndex) => {
                    // Find the original index in the full games array for the link
                    const originalIndex = games.findIndex(g => g.id === game.id);

                    // Helper function to format name with proper spacing after comma
                    const formatName = (playerName: string): string => {
                      return playerName.replace(/,(?!\s)/g, ', ');
                    };

                    // Helper function to abbreviate player names for mobile
                    const abbreviateName = (fullName: string): string => {
                      const parts = fullName.split(',').map(p => p.trim());
                      if (parts.length === 2) {
                        // Format: "LastName, FirstName" -> "LastName, F."
                        const firstName = parts[1];
                        return `${parts[0]}, ${firstName.charAt(0)}.`;
                      } else {
                        // Format: "FirstName LastName" -> "LastName, F."
                        const nameParts = fullName.split(' ').map(p => p.trim());
                        if (nameParts.length >= 2) {
                          const lastName = nameParts[nameParts.length - 1];
                          const firstName = nameParts[0];
                          return `${lastName}, ${firstName.charAt(0)}.`;
                        }
                      }
                      return fullName; // Return as-is if format doesn't match
                    };

                    // Extract year from date
                    const getYear = (dateStr?: string): string => {
                      if (!dateStr) return 'N/A';
                      const date = new Date(dateStr);
                      return isNaN(date.getTime()) ? 'N/A' : date.getFullYear().toString();
                    };

                    // Compact result for mobile (e.g., "1-0" -> "1-0", "1/2-1/2" -> "½")
                    const compactResult = game.result === '1/2-1/2' ? '½' : game.result;

                    return (
                      <tr
                        key={`${originalIndex}-${displayIndex}`}
                        className="border-b border-border/50 hover:bg-muted/50 transition-all relative group"
                      >
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground text-xs sm:text-base group-hover:shadow-[inset_2px_0_0_0_hsl(var(--primary)_/_0.7),inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] group-hover:rounded-l-lg transition-all">{startIndex + displayIndex + 1}</td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">
                          <Link
                            to={`/champions/${name}/best-games/${originalIndex}`}
                            className="text-foreground hover:text-link transition-colors block truncate"
                            title={formatName(game.whitePlayer)}
                          >
                            <span className="sm:hidden">{abbreviateName(game.whitePlayer)}</span>
                            <span className="hidden sm:inline">{formatName(game.whitePlayer)}</span>
                          </Link>
                        </td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">
                          <Link
                            to={`/champions/${name}/best-games/${originalIndex}`}
                            className="text-foreground hover:text-link transition-colors block truncate"
                            title={formatName(game.blackPlayer)}
                          >
                            <span className="sm:hidden">{abbreviateName(game.blackPlayer)}</span>
                            <span className="hidden sm:inline">{formatName(game.blackPlayer)}</span>
                          </Link>
                        </td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">
                          <span
                            className={`
                              ${game.result === '1-0' ? 'text-win' : ''}
                              ${game.result === '0-1' ? 'text-loss' : ''}
                              ${game.result === '1/2-1/2' ? 'text-muted-foreground' : ''}
                            `}
                          >
                            <span className="sm:hidden">{compactResult}</span>
                            <span className="hidden sm:inline">{game.result}</span>
                          </span>
                        </td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">{getYear(game.date)}</td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground truncate text-xs sm:text-base group-hover:shadow-[inset_-2px_0_0_0_hsl(var(--primary)_/_0.7),inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] group-hover:rounded-r-lg transition-all">
                          {game.event || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}

            {/* Pagination */}
            {games.length > GAMES_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
      </div>
    </>
  );
};

export default BestGames;
