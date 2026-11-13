import { useEffect, useState } from 'react';
import { ChampionsStrip } from './ChampionsStrip';
import { FeaturedChampion, type PlayerInfo } from './FeaturedChampion';
import { HOME_WRAP } from './HomeStage';
import { JourneyCard } from './JourneyCard';
import { LatestNews } from './LatestNews';

/**
 * Everything below the chooser (owner D1: the 08-02 "six cards and nothing else" rule is superseded; every link
 * here is measured with `home_section_click`). On the chooser's own 3-column grid, so these edges fall on the
 * cards above: the Journey card and the strip span two columns, the featured champion and the news one.
 */
export default function HomeSections() {
  const [players, setPlayers] = useState<Record<string, PlayerInfo> | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/assets/players/players_list.json').then((r) => r.json()).then((d) => { if (live) setPlayers(d); }).catch(() => {});
    return () => { live = false; };
  }, []);

  return (
    <div className={`${HOME_WRAP} pt-3 md:pt-4 pb-16 space-y-10 md:space-y-14`}>
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0 flex [&>*]:flex-1"><JourneyCard /></div>
        <FeaturedChampion players={players} />
      </div>
      <div className="grid gap-8 md:gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0"><ChampionsStrip /></div>
        {/* The card is absolutely placed from lg up, so the row's height is the champions column's alone: the card
            spans from the champions title's capitals (LatestNews) to the bottom of the portrait row (owner). */}
        <div className="relative min-w-0"><LatestNews /></div>
      </div>
    </div>
  );
}
