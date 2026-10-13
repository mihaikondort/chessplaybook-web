import { useEffect, useState } from 'react';
import { chessDataService } from '@/services/ChessDataService';
import type { Player, PlayersMap } from '@/types/chess';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { Button } from '@/components/ui/button';
import { Swords } from 'lucide-react';
import {
  fetchChampions,
  type ChampionSummary, type SessionLength,
} from '../services/ChampionChallengeApi';

interface ChampionPickerProps {
  onSelect: (champion: string, length: SessionLength, player?: Player) => void;
  /**
   * Session length, owned by the page.
   *
   * It used to be this component's own state, rendered as a row above the card
   * grid — which put the row inside the LEFT COLUMN of the page's two-column
   * grid, so the cards began 52px below `How it works` in the right column
   * (owner, 2026-08-07: *"How it works card need to be aligned with the
   * cards"*; measured at 1280, 1440 and 1920, constant).
   *
   * Lifting it lets the page render that row full width, above both columns,
   * so the grid's first row is a card on each side and they align by
   * construction. The alternative was a 52px offset on the right column, which
   * is a number that stops being true the moment the row changes.
   */
  length: SessionLength;
}

/**
 * Placeholder cards for the window before either source has answered, matching
 * what /champions does. A pulsing grid of the right shape reads as "arriving"
 * where a line of text reads as "stalled", and it reserves the layout so
 * nothing jumps when the real cards land.
 */
function ChampionPickerSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading champions">
      {Array.from({ length: 18 }).map((_, i) => (
        <WorkspaceCard key={i} className="h-32 overflow-hidden animate-pulse motion-reduce:animate-none">
          <div className="-m-2.5 flex h-32">
            <div className="w-28 shrink-0 bg-muted" />
            <div className="flex min-w-0 flex-1 flex-col p-3">
              <div className="h-5 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="h-9 w-28 rounded-md bg-muted" />
              </div>
            </div>
          </div>
        </WorkspaceCard>
      ))}
    </div>
  );
}

/**
 * Lists the champions the server has positions for, with their photo and reign
 * from `players_list.json`. The champion list is an API call — the corpus is
 * never bundled — while the photos stay a static asset.
 */
export function ChampionPicker({ onSelect, length }: ChampionPickerProps) {
  const [champions, setChampions] = useState<ChampionSummary[] | null>(null);
  const [players, setPlayers] = useState<PlayersMap | null>(null);
  const [rosterSettled, setRosterSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchChampions()
      .then((data) => {
        if (!cancelled) setChampions(data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the challenge list. Please try again.');
      });

    chessDataService
      .loadPlayers()
      .then((map) => {
        if (!cancelled) setPlayers(map);
      })
      .catch(() => {
        // Roster unreachable — fall back to whatever the API returns, in its
        // own order. Names and photos are the loss, not the feature.
      })
      .finally(() => {
        if (!cancelled) setRosterSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WorkspaceCard title="Champion challenges">
        <p className="text-sm text-destructive" role="alert">{error}</p>
      </WorkspaceCard>
    );
  }

  /*
   * Paint from the roster, upgrade from the API — the pattern /champions uses.
   *
   * The roster is a static asset on CloudFront (42–90ms warm); the champion
   * list is an EC2 API call with no CDN in front of it, so it costs ~400ms
   * every time and considerably more from India. Waiting for the API before
   * rendering anything is what made this page feel slow next to /champions,
   * which paints from the CDN copy and upgrades in the background.
   *
   * So the grid renders as soon as the roster lands. Position counts are the
   * only thing that genuinely needs the server, and they fill in when it
   * answers. Ordering is right from the first paint because the roster is
   * itself the order authority — which is also why this no longer needs to
   * wait to avoid a reshuffle.
   */
  const ordered: Array<{ champion: string; positionCount: number | null }> = champions
    ? chessDataService
        .orderByReign(champions, (c) => c.champion, players)
        .map((c) => ({ champion: c.champion, positionCount: c.positionCount }))
    : Object.keys(players ?? {}).map((champion) => ({ champion, positionCount: null }));

  if (!rosterSettled && !champions) {
    return <ChampionPickerSkeleton />;
  }

  // Only meaningful once the server has actually answered — an empty roster
  // before then is just "still loading".
  if (ordered.length === 0) {
    return champions ? (
      <WorkspaceCard title="Champion challenges">
        <p className="text-sm text-muted-foreground">
          No champion challenges are available yet. Check back soon.
        </p>
      </WorkspaceCard>
    ) : (
      <ChampionPickerSkeleton />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ordered.map(({ champion, positionCount }) => {
          const info = players?.[champion];
          return (
            <WorkspaceCard
              key={champion}
              className="group h-32 overflow-hidden transition-colors hover:bg-accent/20 focus-within:ring-2 focus-within:ring-ring"
            >
              <div className="-m-2.5 flex h-32">
                {info && (
                  /* The portraits are round, uniform studio discs since #68,
                     so the panel shows the whole disc instead of cropping a
                     photo to the box. */
                  <span className="flex w-28 shrink-0 items-center justify-center border-r border-border">
                    <img
                      src={`/${info.imagePath}`}
                      alt={info.fullName}
                      className="h-24 w-24 rounded-full transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      width={96}
                      height={96}
                      loading="lazy"
                    />
                  </span>
                )}
                {!info && (
                  <div className="flex w-28 shrink-0 items-center justify-center border-r border-border bg-muted text-2xl font-semibold text-muted-foreground" aria-hidden>
                    {champion.charAt(0)}
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <h2 className="truncate text-base font-semibold text-foreground">
                    {info?.fullName ?? champion}
                  </h2>
                  {info && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {info.championshipYears.replace('World Champion ', '')}
                    </p>
                  )}
                  {/* Reserve the line's height before the count arrives so
                      the card does not grow and shift the grid underneath. */}
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-background/40 px-2 text-xs text-muted-foreground">
                      {positionCount === null ? 'Loading…' : `${positionCount} positions`}
                    </span>
                    <Button
                      size="sm"
                      className="shrink-0 px-3"
                      aria-label={`Take the ${info?.fullName ?? champion} challenge`}
                      onClick={() => onSelect(champion, length, info)}
                    >
                      Challenge
                      <Swords className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>
              </div>
            </WorkspaceCard>
          );
        })}
      </div>
    </div>
  );
}
