import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, List, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Champion } from '@/pages/Champions';

const countryCodes: Record<string, string> = {
  gukesh: 'in', ding: 'cn', carlsen: 'no', anand: 'in', kramnik: 'ru',
  kasparov: 'ru', karpov: 'ru', fischer: 'us', spassky: 'ru', petrosian: 'am',
  tal: 'lv', smyslov: 'ru', botvinnik: 'ru', euwe: 'nl', alekhine: 'ru',
  capablanca: 'cu', lasker: 'de', steinitz: 'at',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export function ChampionGalleryCard({ champion }: { champion: Champion }) {
  const [portraitFailed, setPortraitFailed] = useState(false);
  const [flagFailed, setFlagFailed] = useState(false);
  const slug = champion.name.toLowerCase();
  const gamesPath = `/champions/${slug}/games`;
  const countryCode = countryCodes[slug] ?? 'un';
  const reign = champion.championshipYears.replace('World Champion ', '');
  const resolvedPortraitSrc = `/${champion.imagePath}`;

  return (
    <article className="surface-card group grid h-full min-h-[13rem] grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-lg sm:flex sm:min-h-0 sm:flex-col">
      <Link
        to={gamesPath}
        aria-label={`View all games by ${champion.fullName}`}
        className="relative min-h-full w-32 shrink-0 overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:aspect-[4/3] sm:min-h-0 sm:w-full"
      >
        {portraitFailed ? (
          <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground" aria-hidden="true">
            {initials(champion.fullName)}
          </span>
        ) : (
          /* A round studio disc since #68: shown whole and centred, so the
             blurred copy that used to fill the bars beside a tall photo went. */
          <span className="absolute inset-0 flex items-center justify-center">
            <img
              src={resolvedPortraitSrc}
              alt=""
              className="aspect-square h-[86%] max-w-[86%] rounded-full object-contain transition-transform duration-200 motion-reduce:transition-none sm:group-hover:scale-[1.03]"
              width={512}
              height={512}
              loading="lazy"
              onError={() => setPortraitFailed(true)}
            />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold leading-tight text-foreground sm:text-lg">
          <span className="min-w-0">{champion.fullName}</span>
          {!flagFailed && (
            <img
              src={`https://flagcdn.com/w40/${countryCode}.png`}
              alt=""
              aria-hidden="true"
              className="h-4 w-6 shrink-0 rounded-sm border border-foreground/15 object-cover shadow-sm"
              onError={() => setFlagFailed(true)}
            />
          )}
        </h2>
        <div className="mt-1 flex items-start gap-1.5 text-xs text-link">
          <History className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-medium leading-4">{reign}</span>
        </div>
        <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-5 text-muted-foreground">
          {champion.biography}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Button asChild size="sm" className="min-h-10 w-full">
            <Link to={`/champions/${slug}/best-games`} aria-label={`View the Best 100 games by ${champion.fullName}`}>
              <Trophy className="h-4 w-4" aria-hidden="true" />
              Best 100
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="min-h-10 w-full border-border bg-transparent hover:bg-accent/40">
            <Link to={gamesPath} aria-label={`View all games by ${champion.fullName}`}>
              <List className="h-4 w-4" aria-hidden="true" />
              All Games
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ChampionGalleryCardSkeleton() {
  return (
    <div className="surface-card grid min-h-[13rem] grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-lg sm:flex sm:min-h-0 sm:flex-col" aria-hidden="true">
      <div className="w-32 shrink-0 animate-pulse bg-muted motion-reduce:animate-none sm:aspect-[4/3] sm:w-full" />
      <div className="flex flex-1 flex-col p-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <div className="h-10 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-10 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
