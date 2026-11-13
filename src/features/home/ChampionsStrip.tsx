import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { portraitColorSrc, portraitSrc } from './homeAssets';
import { logHomeSection } from './homeEvents';
import { NO_IMAGE, usePauseHandlers, useTicker } from './homeMotion';
import { SectionHeader } from './SectionHeader';

const START = ['Capablanca', 'Alekhine', 'Botvinnik', 'Fischer', 'Kasparov', 'Carlsen', 'Gukesh'];
const ALL_CHAMPIONS = ['Steinitz', 'Lasker', 'Capablanca', 'Alekhine', 'Euwe', 'Botvinnik', 'Smyslov', 'Tal', 'Petrosian', 'Spassky', 'Fischer', 'Karpov', 'Kasparov', 'Kramnik', 'Anand', 'Carlsen', 'Ding', 'Gukesh'];

/**
 * The champions strip: 3, 4 or 7 studio portraits by width, one random card changing every 3.2 s on desktop so
 * all 18 appear over time (owner, 2026-11-13); still on touch screens and under reduced motion (homeMotion.ts).
 */
export function ChampionsStrip() {
  const [slots, setSlots] = useState<string[]>(START);
  const [previous, setPrevious] = useState<(string | null)[]>(() => START.map(() => null));
  // How many cards are on screen is CSS's answer (3, 4 or 7 by breakpoint): read from the cards, never the window.
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const { paused, handlers } = usePauseHandlers();
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useTicker(() => {
    const cur = slotsRef.current;
    const visible = cardRefs.current.filter((el) => el && el.offsetParent !== null).length || 3;
    const shown = new Set(cur.slice(0, visible));
    const pool = ALL_CHAMPIONS.filter((c) => !shown.has(c));
    if (!pool.length) return;
    const slot = Math.floor(Math.random() * visible);
    const incoming = pool[Math.floor(Math.random() * pool.length)];
    setPrevious((p) => p.map((v, i) => (i === slot ? cur[slot] : v)));
    setSlots(cur.map((v, i) => (i === slot ? incoming : v)));
  }, 3200, paused);

  return (
    <section {...handlers}>
      <SectionHeader title="Learn from the champions" sub="Replay the games of all 18 World Champions." link="/champions" linkLabel="All champions" section="strip" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5 md:gap-3">
        {slots.map((k, i) => {
          const to = `/champions/${k.toLowerCase()}/games`;
          return (
            <Link
              key={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              to={to}
              onClick={() => logHomeSection('strip', to, i)}
              className={`v2-portrait group relative block overflow-hidden rounded-[10px] aspect-[4/5] ring-1 ring-border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i >= 4 ? 'hidden md:block' : i >= 3 ? 'hidden sm:block' : ''}`}
            >
              {/* The outgoing portrait stays underneath while the new one fades in over it. */}
              {previous[i] && previous[i] !== k && (
                <img src={portraitSrc(previous[i]!)} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <img key={k} src={portraitSrc(k)} alt="" loading="lazy" className="v2-fade-in relative w-full h-full object-cover" />
              {/* The photo as taken, on hover; never downloaded on a touch screen (homeMotion.ts NO_IMAGE). */}
              <picture key={`c-${k}`}>
                <source media="(hover: none)" srcSet={NO_IMAGE} />
                <img src={portraitColorSrc(k)} alt="" loading="lazy" className="v2-color-reveal absolute inset-0 w-full h-full object-cover" />
              </picture>
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent" aria-hidden />
              <span key={`n-${k}`} className="v2-fade-in absolute bottom-2 left-2.5 right-2 font-playfair font-semibold text-[15px] md:text-[16px] leading-tight">{k}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
