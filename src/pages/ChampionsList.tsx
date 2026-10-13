import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { History, ListOrdered, Trophy, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import SeoHead from '@/components/SeoHead';
import {
  ChampionChronologyRow,
  ChampionChronologyRowSkeleton,
  type ChampionListEntry,
} from '@/features/champions/components/ChampionChronologyRow';
import {
  CHAMPIONS_LIST_GC_TIME,
  CHAMPIONS_LIST_QUERY_KEY,
  CHAMPIONS_LIST_STALE_TIME,
  fetchChampionsList,
} from '@/features/champions/championsListData';

function ChampionsListSeo({ champions }: { champions?: ChampionListEntry[] }) {
  const itemList = useMemo(() => champions ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'World Chess Champions List',
    description: 'Complete list of World Chess Champions from 1886 to present, including reign years and nationalities.',
    numberOfItems: champions.length,
    itemListElement: champions.map((champion, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Person',
        name: champion.fullName,
        url: `https://www.chessplaybook.com/champions/${champion.name.toLowerCase()}/games`,
        jobTitle: 'World Chess Champion',
        description: champion.biography,
        nationality: champion.countryName,
      },
    })),
  } : null, [champions]);

  return (
    <SeoHead routeKey="champions/list">
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.chessplaybook.com/' },
            { '@type': 'ListItem', position: 2, name: 'Champions', item: 'https://www.chessplaybook.com/champions' },
            { '@type': 'ListItem', position: 3, name: 'Champions List', item: 'https://www.chessplaybook.com/champions/list' },
          ],
        })}
      </script>
      {itemList && <script type="application/ld+json">{JSON.stringify(itemList)}</script>}
    </SeoHead>
  );
}

const ChampionsList = () => {
  const query = useQuery({
    queryKey: CHAMPIONS_LIST_QUERY_KEY,
    queryFn: fetchChampionsList,
    staleTime: CHAMPIONS_LIST_STALE_TIME,
    gcTime: CHAMPIONS_LIST_GC_TIME,
  });
  const champions = query.data;
  const totalFailure = query.isError && champions === undefined;
  const resolved = champions !== undefined;

  return (
    <>
      <ChampionsListSeo champions={resolved ? champions : undefined} />
      <div className="flex flex-col bg-background">
        <main className="flex-grow px-2 pb-8 pt-2 sm:px-4">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-5xl">
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                World Chess Champions List
              </h1>

              <WorkspaceCard title="Championship chronology" icon={<History className="h-3.5 w-3.5 text-link" aria-hidden="true" />} className="mb-3" testId="champions-list-intro">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                    Follow the World Championship from Wilhelm Steinitz in 1886 to the present,
                    with every champion, reign and games collection in one reference.
                  </p>
                  <Button asChild variant="ghost" size="sm" className="min-h-10 shrink-0 self-start text-muted-foreground sm:self-auto">
                    <Link to="/champions"><UsersRound className="h-4 w-4" aria-hidden="true" />View Champions Gallery</Link>
                  </Button>
                </div>
              </WorkspaceCard>

              <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                <h2 id="champions-chronology-heading" className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />Complete chronology
                </h2>
                {resolved && !totalFailure && <span className="text-xs text-muted-foreground">{champions.length} champions</span>}
              </div>

              {query.isPending && (
                <div className="surface-card overflow-hidden rounded-lg" aria-busy="true" aria-labelledby="champions-chronology-heading">
                  <div aria-hidden="true">{Array.from({ length: 6 }).map((_, index) => <ChampionChronologyRowSkeleton key={index} />)}</div>
                  <span className="sr-only">Loading champions list</span>
                </div>
              )}

              {totalFailure && (
                <WorkspaceCard title="Champions list unavailable" className="text-sm text-muted-foreground">
                  <p>We couldn’t load the champions list right now. You can try again or return to the gallery.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" className="min-h-10" onClick={() => void query.refetch()}>Try again</Button>
                    <Button asChild variant="outline" size="sm" className="min-h-10 border-border bg-transparent"><Link to="/champions">View Champions Gallery</Link></Button>
                  </div>
                </WorkspaceCard>
              )}

              {resolved && champions.length === 0 && (
                <WorkspaceCard title="No champions available" className="text-sm text-muted-foreground">
                  <p>The complete chronology is currently empty.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3 min-h-10 border-border bg-transparent"><Link to="/champions">View Champions Gallery</Link></Button>
                </WorkspaceCard>
              )}

              {resolved && champions.length > 0 && (
                <div className="surface-card overflow-hidden rounded-lg">
                  <table className="w-full table-fixed sm:table-auto" aria-labelledby="champions-chronology-heading">
                    <thead className="sr-only sm:not-sr-only sm:table-header-group">
                      <tr className="border-b border-border/70">
                        <th scope="col" className="w-12 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Champion</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reign</th>
                        <th scope="col" className="w-36 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Games</th>
                      </tr>
                    </thead>
                    <tbody>{champions.map((champion, index) => <ChampionChronologyRow key={champion.name} champion={champion} championNumber={champions.length - index} />)}</tbody>
                  </table>
                  {query.isError && <p className="sr-only" role="status">The cached champions list is shown; its background refresh failed.</p>}
                </div>
              )}

              <WorkspaceCard title="Championship records" icon={<Trophy className="h-3.5 w-3.5 text-link" aria-hidden="true" />} className="mt-3">
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p><strong className="text-foreground">Longest reign:</strong> Emanuel Lasker, 27 years</p>
                  <p><strong className="text-foreground">Youngest champion:</strong> Gukesh, age 18</p>
                  <p><strong className="text-foreground">Most title matches:</strong> Karpov and Kasparov</p>
                  <p><strong className="text-foreground">Highest peak rating:</strong> Magnus Carlsen, 2882</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" size="sm" className="min-h-10 border-border bg-transparent"><Link to="/world-championship-cycle">Learn About the Championship Cycle</Link></Button>
                  <Button asChild variant="outline" size="sm" className="min-h-10 border-border bg-transparent"><Link to="/champions">Explore Champions’ Greatest Games</Link></Button>
                </div>
              </WorkspaceCard>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ChampionsList;
