/**
 * Game List Page
 *
 * Displays a list of all games for a specific chess champion.
 * Shows game metadata (players, result, date, event) in a table format.
 * Users can click on any game to view it in the game viewer.
 */

import { useEffect, useState, useMemo } from 'react';
import ReportProblemLink from '@/components/support/ReportProblemLink';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { backendAPIClient } from '@/services/BackendAPIClient';
import { GameFilterService, gameDateYear } from '@/services/GameFilterService';
import type { GameMetadata } from '@/types/chess';
import { FilterState, SortState, DEFAULT_FILTER_STATE, DEFAULT_SORT_STATE } from '@/types/filter';
import { useFilterUrlState } from '@/hooks/useFilterUrlState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompactFilterControls, ActiveFiltersBar, GamePagination } from '@/components/game-list';
import { ChampionIntro, ChampionDetails, ChampionPortrait, getChampionContent } from '@/components/champion/ChampionProfile';
import { championRouteMeta } from '@/config/championRouteMeta';

const GameList = () => {
  const { name } = useParams<{ name: string }>();
  // Capture ECO family params on mount before useFilterUrlState rewrites the URL
  const [ecoRange] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      from: params.get('ecoFrom'),
      to: params.get('ecoTo'),
      label: params.get('ecoLabel'),
    };
  });
  const ecoFrom = ecoRange.from;
  const ecoTo = ecoRange.to;
  const ecoLabel = ecoRange.label;
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [championFullName, setChampionFullName] = useState<string>('');
  const [biography, setBiography] = useState<string>('');
  const [championshipYears, setChampionshipYears] = useState<string>('');
  /** Database ids in list order; a game's URL is its index in this list. */
  const [gameIds, setGameIds] = useState<number[]>([]);
  const championContent = getChampionContent(name);

  // Filter and sort state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT_STATE);
  const { parseUrlToState, updateUrl } = useFilterUrlState();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const GAMES_PER_PAGE = 50;

  // Load filters from URL on mount
  useEffect(() => {
    const urlState = parseUrlToState();
    setFilters(urlState.filters);
    setSort(urlState.sort);
  }, []); // Only on mount

  // Update URL when filters or sort change (replace history to avoid polluting back button)
  useEffect(() => {
    updateUrl(filters, sort, true); // replace: true to avoid adding history entries
  }, [filters, sort, updateUrl]);

  useEffect(() => {
    if (name) {
      loadGames(name);
    }
  }, [name]);

  const loadGames = async (playerName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load games from backend API
      const response = await backendAPIClient.getPlayerGames(playerName, {
        limit: 10000, // Load all games (no pagination at fetch level)
        fields: 'summary', // headers only: the table never shows the moves
      });

      // Extract metadata from each game
      const gameHeaders: GameMetadata[] = response.games.map(game => game.metadata);

      setGames(gameHeaders);
      setGameIds(response.games.map(game => game.id ?? -1));

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
      console.error('Error loading games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  // Pre-filter by ECO family range if provided via query params (?ecoFrom=E00&ecoTo=E09)
  // Also exclude non-classical games (blitz, rapid, bullet, etc.)
  const ecoFilteredGames = useMemo(() => {
    if (!ecoFrom || !ecoTo) return games;
    const NON_CLASSICAL = [
      'blitz', 'rapid', 'speed', 'bullet', 'arena', 'blindfold', 'armageddon',
      'simul', 'titled tue', 'titled tuesday', 'lichess', 'chess.com',
      'pro league', 'meltwater tour', 'legends of chess', 'clutch chess',
      'carlsen inv', 'chess24 banter', 'ftx crypto cup', 'airthings masters',
      'chessable masters', 'oslo esports cup', 'amber blindfold', 'lindores abbey',
      'ai cup', 'cct final', 'julius baer', 'charity cup', 'nic classic',
      'goldmoney asian', 'carlsen-ding showdown', 'play live challenge',
      'global chess league', 'crunchlab masters', 'norway armageddon',
      'world corporate', 'carlsen vienna', 'board simul',
      'clash of claims',
    ];
    return games.filter(g => {
      if (!g.eco) return false;
      const eco = g.eco.toUpperCase();
      if (eco < ecoFrom.toUpperCase() || eco > ecoTo.toUpperCase()) return false;
      const event = (g.event || '').toLowerCase();
      return !NON_CLASSICAL.some(k => event.includes(k));
    });
  }, [games, ecoFrom, ecoTo]);

  // Apply filters and sorting with memoization
  const filteredAndSortedGames = useMemo(() => {
    if (!name) return [];

    // Apply filters
    let result = GameFilterService.filterGames(ecoFilteredGames, filters, name);

    // Apply search
    result = GameFilterService.searchGames(result, filters.searchText);

    // Apply sorting
    result = GameFilterService.sortGames(result, sort);

    return result;
  }, [ecoFilteredGames, filters, sort, name]);

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedGames.length / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const paginatedGames = filteredAndSortedGames.slice(startIndex, endIndex);

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => ({
    opponents: GameFilterService.getUniqueOpponents(games, name || ''),
    openings: GameFilterService.getUniqueOpenings(games),
    eventTypes: GameFilterService.getUniqueEventTypes(games),
    dateRange: GameFilterService.getDateRange(games),
  }), [games, name]);

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handler to remove a specific filter
  const handleRemoveFilter = (key: keyof FilterState) => {
    setFilters({
      ...filters,
      [key]: DEFAULT_FILTER_STATE[key],
    });
  };

  // Handler to clear all filters
  const handleClearAllFilters = () => {
    setFilters(DEFAULT_FILTER_STATE);
    setSort(DEFAULT_SORT_STATE);
  };

  // A champion with written content renders at once; only the table waits for the games.
  if (loading && !championContent) {
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
          <div className="mt-4">
            <ReportProblemLink surface="load_error" />
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = championFullName || championContent?.name || name || 'Chess Champion';
  const gameCount = games.length;
  const filteredGameCount = filteredAndSortedGames.length;
  // Same text as the prerendered HTML (config/champion-route-meta.json).
  const meta = championRouteMeta('games', pageTitle, name || '');

  return (
    <>
      {!loading && (
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="keywords" content={meta.keywords} />
        <link rel="canonical" href={`https://www.chessplaybook.com/champions/${name}/games`} />

        {/* Open Graph */}
        <meta property="og:title" content={meta.ogTitle} />
        <meta property="og:description" content={meta.ogDescription} />
        <meta property="og:url" content={`https://www.chessplaybook.com/champions/${name}/games`} />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.ogTitle} />
        <meta name="twitter:description" content={meta.ogDescription} />

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
                "item": `https://www.chessplaybook.com/champions/${name}/games`
              }
            ]
          })}
        </script>
      </Helmet>
      )}

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className={championContent ? 'mb-6' : 'mb-8 px-6'}>
            <div className="flex items-center gap-4 sm:gap-6 mb-3">
            {championContent && <ChampionPortrait slug={name} name={pageTitle} />}
            <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-bold text-link mb-2">
              {pageTitle}
            </h1>
            {(championshipYears || championContent) && (
              <div>
                <span className="inline-block bg-primary/20 text-link px-4 py-1.5 rounded-full border border-primary/30 text-lg font-semibold">
                  ♔ {championshipYears || championContent?.reign}
                </span>
              </div>
            )}
            </div>
            </div>
            {biography && !championContent && (
              <p className="text-lg text-muted-foreground max-w-4xl mb-4">
                {biography}
              </p>
            )}
            {!championContent && (
              <p className="text-lg text-muted-foreground">
                {games.length} games available
              </p>
            )}
          </div>
          <ChampionIntro slug={name} />

        {/* Games Table */}
        <Card className="bg-card border-border">
          <CardHeader className="space-y-4">
            {ecoLabel && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Filtered by opening family: <span className="font-medium text-link">{ecoLabel}</span>
                  <span className="text-muted-foreground ml-1">({ecoFrom}-{ecoTo})</span>
                </div>
                <Link to={`/champions/${name}/games`}>
                  <Button variant="outline" size="sm">
                    All Games
                  </Button>
                </Link>
              </div>
            )}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-link text-2xl font-normal">
                {ecoLabel ? `${ecoLabel} Games` : 'Games Collection'}
              </CardTitle>
              <CompactFilterControls
                filters={filters}
                sort={sort}
                onFiltersChange={setFilters}
                onSortChange={setSort}
                opponents={filterOptions.opponents}
                openings={filterOptions.openings}
                eventTypes={filterOptions.eventTypes}
                dateRange={filterOptions.dateRange}
                isMobile={isMobile}
                activeFilterCount={GameFilterService.countActiveFilters(filters)}
              />
            </div>
            {/* Active Filters Bar */}
            <ActiveFiltersBar
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              totalGames={gameCount}
              filteredGames={filteredGameCount}
            />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground text-lg">Loading games...</div>
            ) : filteredAndSortedGames.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">
                  No games match your current filters.
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearAllFilters}
                >
                  Clear Filters
                </Button>
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
                    const originalIndex = games.findIndex(g =>
                      g.white === game.white &&
                      g.black === game.black &&
                      g.date === game.date &&
                      g.event === game.event
                    );

                    // Helper function to format name with proper spacing after comma
                    const formatName = (name: string): string => {
                      return name.replace(/,(?!\s)/g, ', ');
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

                    // Extract year from date (e.g., "2023.11.28" -> "2023")
                    const year = gameDateYear(game.date) ?? 'N/A';

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
                            to={`/champions/${name}/games/${originalIndex}`}
                            className="text-foreground hover:text-link transition-colors block truncate"
                            title={formatName(game.white)}
                          >
                            <span className="sm:hidden">{abbreviateName(game.white)}</span>
                            <span className="hidden sm:inline">{formatName(game.white)}</span>
                          </Link>
                        </td>
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">
                          <Link
                            to={`/champions/${name}/games/${originalIndex}`}
                            className="text-foreground hover:text-link transition-colors block truncate"
                            title={formatName(game.black)}
                          >
                            <span className="sm:hidden">{abbreviateName(game.black)}</span>
                            <span className="hidden sm:inline">{formatName(game.black)}</span>
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
                        <td className="py-2 px-1 sm:py-3 sm:px-3 text-muted-foreground text-xs sm:text-base group-hover:shadow-[inset_0_2px_0_0_hsl(var(--primary)_/_0.7),inset_0_-2px_0_0_hsl(var(--primary)_/_0.7)] transition-all">{year}</td>
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
            {filteredAndSortedGames.length > GAMES_PER_PAGE && (
              <div className="mt-6">
                <GamePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
        <ChampionDetails
          slug={name}
          gameHref={id => {
            const index = gameIds.indexOf(id);
            return index >= 0 ? `/champions/${name}/games/${index}` : null;
          }}
        />
        </div>
      </div>
      </div>
    </>
  );
};

export default GameList;
