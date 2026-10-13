import { useState } from 'react';
import { Link } from 'react-router-dom';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ChampionListEntry {
  name: string;
  fullName: string;
  championshipYears: string;
  biography: string;
  countryName: string;
  countryCode?: string;
}

const reign = (years: string) => years.replace('World Champion ', '');

export function ChampionChronologyRow({ champion, championNumber }: { champion: ChampionListEntry; championNumber: number }) {
  const [flagFailed, setFlagFailed] = useState(false);
  const gamesPath = `/champions/${champion.name.toLowerCase()}/games`;

  return (
    <tr className="grid grid-cols-[2rem_minmax(0,1fr)_auto] grid-rows-[auto_auto_auto] items-center gap-x-2 border-b border-border/60 px-2 py-3 last:border-b-0 hover:bg-accent/30 focus-within:bg-accent/30 sm:table-row sm:px-0 sm:py-0">
      <td className="row-span-3 self-start pt-0.5 font-mono text-xs font-medium text-link sm:w-12 sm:px-3 sm:py-4 sm:align-top">{championNumber}</td>
      <td className="col-start-2 row-start-1 min-w-0 sm:px-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 text-sm font-semibold leading-5 text-foreground sm:text-base">{champion.fullName}</span>
          {!flagFailed && champion.countryCode && (
            <img
              src={`https://flagcdn.com/w40/${champion.countryCode}.png`}
              alt=""
              aria-hidden="true"
              className="h-4 w-6 shrink-0 rounded-sm border border-foreground/15 object-cover shadow-sm"
              onError={() => setFlagFailed(true)}
            />
          )}
        </div>
      </td>
      <td className="col-start-2 row-start-2 text-xs leading-4 text-muted-foreground sm:px-3 sm:py-4 sm:text-sm">{champion.countryName}</td>
      <td className="col-start-2 row-start-3 mt-0.5 font-mono text-xs leading-4 text-link sm:mt-0 sm:px-3 sm:py-4 sm:text-sm sm:text-muted-foreground">{reign(champion.championshipYears)}</td>
      <td className="col-start-3 row-span-3 row-start-1 pl-1 text-right sm:w-36 sm:px-3 sm:py-4">
        <Button asChild variant="outline" size="sm" className="min-h-10 border-border bg-transparent hover:bg-accent/40">
          <Link to={gamesPath} aria-label={`View games by ${champion.fullName}`}>
            <List className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">View Games</span><span className="sm:hidden">Games</span>
          </Link>
        </Button>
      </td>
    </tr>
  );
}

export function ChampionChronologyRowSkeleton() {
  return (
    <div className="grid min-h-[5.5rem] grid-cols-[2rem_minmax(0,1fr)_5rem] grid-rows-3 items-center gap-x-2 border-b border-border/60 px-2 py-3 last:border-b-0 sm:grid-cols-[3rem_minmax(10rem,1.5fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_8rem] sm:grid-rows-1 sm:gap-x-0 sm:px-0 sm:py-4">
      <span className="h-4 w-5 animate-pulse rounded bg-muted motion-reduce:animate-none sm:mx-3" />
      <span className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none sm:mx-3" />
      <span className="col-start-2 row-start-2 h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none sm:col-start-3 sm:row-start-1 sm:mx-3" />
      <span className="col-start-2 row-start-3 h-3 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none sm:col-start-4 sm:row-start-1 sm:mx-3" />
      <span className="col-start-3 row-span-3 row-start-1 h-10 w-full animate-pulse rounded bg-muted motion-reduce:animate-none sm:col-start-5 sm:row-span-1 sm:mx-3 sm:w-auto" />
    </div>
  );
}
