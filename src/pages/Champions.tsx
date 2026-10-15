import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, History, UsersRound } from 'lucide-react';
import SeoHead from '@/components/SeoHead';
import ReportProblemLink from '@/components/support/ReportProblemLink';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { backendAPIClient } from '@/services/BackendAPIClient';
import type { Player, PlayersMap } from '@/types/chess';
import {
  ChampionGalleryCard,
  ChampionGalleryCardSkeleton,
} from '@/features/champions/components/ChampionGalleryCard';

export interface Champion {
  name: string;
  fullName: string;
  imagePath: string;
  championshipYears: string;
  biography: string;
}

const parseChampions = (data: PlayersMap): Champion[] =>
  Object.entries(data).map(([name, info]: [string, Player]) => ({
    name,
    fullName: info.fullName,
    imagePath: info.imagePath,
    championshipYears: info.championshipYears,
    biography: info.biography,
  }));

const galleryGridClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4';

const Champions = () => {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChampions = async () => {
      try {
        setLoading(true);
        setError(null);
        const staticPromise = fetch('/assets/players/players_list.json')
          .then(response => response.json())
          .then(data => ({ source: 'static' as const, champions: parseChampions(data) }));
        const apiPromise = backendAPIClient.getPlayers()
          .then(data => ({ source: 'api' as const, champions: parseChampions(data) }));
        const result = await Promise.any([staticPromise, apiPromise]);
        setChampions(result.champions);
        if (result.source === 'static') {
          apiPromise.then(apiResult => setChampions(apiResult.champions)).catch(() => undefined);
        }
      } catch (caught) {
        console.error('Error loading champions:', caught);
        setError(caught instanceof Error ? caught.message : 'Failed to load champions');
      } finally {
        setLoading(false);
      }
    };
    void loadChampions();
  }, []);

  return (
    <>
      <SeoHead routeKey="champions">
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.chessplaybook.com/' },
              { '@type': 'ListItem', position: 2, name: 'Champions', item: 'https://www.chessplaybook.com/champions' },
            ],
          })}
        </script>
      </SeoHead>

      <div className="flex flex-col bg-background">
        <main className="flex-grow px-2 pb-8 pt-2 sm:px-4">
          <div className="mx-auto max-w-7xl">
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              World Chess Champions
            </h1>

            <WorkspaceCard
              title="Explore champions"
              icon={<Crown className="h-3.5 w-3.5 text-link" aria-hidden="true" />}
              className="mb-3"
              testId="champions-intro"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                  Explore the games of the greatest chess players in history, from Steinitz to Gukesh.
                  Click on any champion to view their legendary games.
                </p>
                <Link
                  to="/champions/list"
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 self-start rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
                >
                  <History className="h-4 w-4" aria-hidden="true" />
                  Complete Champions List
                </Link>
              </div>
            </WorkspaceCard>

            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <h2 className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                Champion gallery
              </h2>
              {!loading && !error && (
                <span className="text-xs text-muted-foreground">{champions.length} champions</span>
              )}
            </div>

            {loading && (
              <div className={galleryGridClass} aria-label="Loading champions">
                {Array.from({ length: 18 }).map((_, index) => <ChampionGalleryCardSkeleton key={index} />)}
              </div>
            )}
            {!loading && error && (
              <WorkspaceCard title="Champions unavailable" className="text-sm text-muted-foreground">
                We couldn’t load the champions right now. Please try again later.
                <div className="mt-2"><ReportProblemLink surface="load_error" /></div>
              </WorkspaceCard>
            )}
            {!loading && !error && champions.length === 0 && (
              <WorkspaceCard title="No champions available" className="text-sm text-muted-foreground">
                The champion gallery is currently empty.
              </WorkspaceCard>
            )}
            {!loading && !error && champions.length > 0 && (
              <div className={galleryGridClass}>
                {champions.map(champion => (
                  <ChampionGalleryCard
                    key={champion.name}
                    champion={champion}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Champions;
