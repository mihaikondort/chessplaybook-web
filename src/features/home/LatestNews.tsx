import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { newsArticles } from '@/config/newsArticles';
import { logHomeSection } from './homeEvents';

/**
 * The three newest articles, with warm-toned thumbnails; every link measured (section `news`).
 *
 * From lg up the card fills its grid cell absolutely, from 10px down (where the 32px champions title's capitals
 * start: half-leading plus Playfair's ascent above cap height, measured) to the portrait row's bottom, so it never
 * sets the row's height (owner, 2026-11-13). The list wraps into a hidden second column: an article that does not
 * fit whole is left out (three from ~1440 wide, two below; measured) rather than clipped or overflowing.
 */
export function LatestNews() {
  const listRef = useRef<HTMLUListElement>(null);
  // An article wrapped into the hidden column is taken out of the tab order and the accessibility tree.
  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul || typeof ResizeObserver === 'undefined') return;
    const mark = () => {
      for (const li of Array.from(ul.children) as HTMLElement[]) {
        const out = ul.clientWidth > 0 && li.offsetLeft >= ul.clientWidth;
        li.toggleAttribute('inert', out);
        li.toggleAttribute('aria-hidden', out);
        li.style.visibility = out ? 'hidden' : '';
      }
    };
    mark();
    const ro = new ResizeObserver(mark);
    ro.observe(ul);
    return () => ro.disconnect();
  }, []);
  return (
    <section className="v2-card-editorial h-full lg:absolute lg:inset-x-0 lg:top-[10px] lg:bottom-0 lg:h-auto px-5 pt-4 pb-2 flex flex-col">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-playfair font-semibold text-[22px]">Latest news</h2>
        <Link to="/news" onClick={() => logHomeSection('news', '/news', -1)} className="text-[13px] text-link hover:underline inline-flex items-center gap-1">
          All news <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
      <ul ref={listRef} className="divide-y divide-border flex-1 min-h-0 flex flex-col flex-wrap overflow-hidden justify-around">
        {newsArticles.slice(0, 3).map((a, i) => (
          <li key={a.href} className="w-full">
            <Link to={a.href} onClick={() => logHomeSection('news', a.href, i)} className="group flex items-center gap-3 py-1.5">
              <img src={a.image} alt="" loading="lazy" className="v2-warm-thumb w-[56px] h-[36px] rounded-md object-cover shrink-0 ring-1 ring-border" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-link">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.date}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
