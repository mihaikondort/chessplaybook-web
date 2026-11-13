import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { portraitColorSrc, portraitSrc } from './homeAssets';
import { logHomeSection } from './homeEvents';
import { NO_IMAGE, usePauseHandlers, useTicker } from './homeMotion';

export interface PlayerInfo { fullName: string; championshipYears: string }

/* Three featured champions taking turns every 7 s on desktop; one on touch screens (D4, homeMotion.ts). */
export const FEATURED = ['Fischer', 'Kasparov', 'Carlsen'];

export function FeaturedChampion({ players }: { players: Record<string, PlayerInfo> | null }) {
  const [index, setIndex] = useState(0);
  const { paused, handlers } = usePauseHandlers();
  useTicker(() => setIndex((i) => (i + 1) % FEATURED.length), 7000, paused);
  const key = FEATURED[index];
  const info = players?.[key];
  const to = `/champions/${key.toLowerCase()}/games`;

  return (
    <div className="relative h-full min-h-[200px]" {...handlers}>
      <Link to={to} onClick={() => logHomeSection('featured', to, index)} className="group v2-card-editorial relative overflow-hidden h-full min-h-[200px] flex">
        {/* All three stay mounted and cross-fade, so a change never flashes the card empty; only the first is
            fetched at once, the other two when the browser gets to them (S6). */}
        {FEATURED.map((k, i) => (
          <img
            key={k}
            src={portraitSrc(k)}
            alt=""
            loading={i === 0 ? undefined : 'lazy'}
            className={`v2-photo-fade-right absolute inset-y-0 left-0 h-full w-[50%] object-cover object-[50%_20%] transition-[opacity,transform] duration-700 group-hover:scale-[1.03] ${i === index ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        {/* The photo as taken, on hover (the co-founder's idea). Never downloaded on a touch screen, which cannot hover. */}
        <picture key={`c-${key}`}>
          <source media="(hover: none)" srcSet={NO_IMAGE} />
          <img
            src={portraitColorSrc(key)}
            alt=""
            loading="lazy"
            className="v2-color-reveal v2-photo-fade-right absolute inset-y-0 left-0 h-full w-[50%] object-cover object-[50%_20%] group-hover:scale-[1.03]"
          />
        </picture>
        <div key={key} className="v2-fade-in-late relative ml-auto w-[55%] p-5 flex flex-col justify-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-link"><Crown className="w-3.5 h-3.5" aria-hidden />Featured champion</span>
          <h3 className="font-playfair font-semibold text-[26px] leading-tight mt-2">{info?.fullName ?? key}</h3>
          <p className="text-sm text-muted-foreground mt-1">{info?.championshipYears ?? ''}</p>
          <span className="mt-4 text-[13px] text-link inline-flex items-center gap-1 group-hover:underline">Explore his games <ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
        </div>
        <div className="v2-ring-warm absolute inset-0 pointer-events-none" aria-hidden />
      </Link>
      {/* Pick one directly; also the visible sign that the card changes. Each dot has a 24x24 target (#78);
          hidden on touch screens, where the card does not rotate (homepage CSS). */}
      <div className="v2-rotation-dots absolute bottom-1.5 right-2 flex" role="group" aria-label="Featured champion">
        {FEATURED.map((k, i) => (
          <button
            key={k}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={k}
            aria-pressed={i === index}
            className="group/dot grid place-items-center w-6 h-6 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong group-hover/dot:bg-muted-foreground'}`} aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
