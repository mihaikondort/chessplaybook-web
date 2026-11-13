import routeMeta from '@/config/route-meta.json';

/**
 * Visible <h1> + one-line intro for a static route, read from the same
 * `route-meta.json` entry that `SeoHead` and the prerender use.
 *
 * Why this exists
 * ---------------
 * `route-meta.json` has carried `heading` and `body` for every static route
 * since the 2026-07-28 indexability fix, and
 * `scripts/generate-route-html.cjs` bakes them into the prerendered HTML.
 * But it bakes them inside a <noscript> block — correctly, so they cannot
 * affect LCP or CLS against the tracked PSI-98 mobile score.
 *
 * That is only sound if the rendered page says the same thing, which is what
 * the generator's comment claims. On `/play-online` and `/puzzles` it did not:
 * neither component had an <h1> or <h2> at all (audit, 2026-07-31). The result
 * was a heading that existed in config, was served to Google's non-rendering
 * first pass, and reached nobody else — not the JS-rendering pass that actually
 * decides indexing, and not the user.
 *
 * So this renders the declared value rather than introducing a third copy of
 * the string. If the heading is wrong, `route-meta.json` is the one place to
 * fix it, and the prerender, the <head> and the page cannot disagree.
 *
 * Kept deliberately compact: on the two pages this was added for, the primary
 * CTA sits ~500-570px down a 844px mobile viewport, and pushing it below the
 * fold to add orientation copy would trade one landing-page defect for another.
 */

type RouteMetaEntry = { heading?: string; body?: string; headingAccentWords?: number };

interface RouteHeadingProps {
  /** Route key, matching a top-level key in route-meta.json (no leading slash). */
  routeKey: keyof typeof routeMeta;
  /** Hide the intro line, keeping only the <h1>. For dense app surfaces. */
  hideBody?: boolean;
  className?: string;
  /**
   * `hero`: the design v2 homepage's headline (visual redesign plan C2): a large serif `<h1>` over a
   * photo, its last `headingAccentWords` words in the gold gradient. The words come from the SAME
   * `heading` string, split here, so the accent cannot drift from the source text (Fable S9); the
   * prerender reads only `heading`, so the served HTML is unchanged.
   */
  variant?: 'default' | 'hero';
}

export function RouteHeading({ routeKey, hideBody, className = '', variant = 'default' }: RouteHeadingProps) {
  const meta = routeMeta[routeKey] as RouteMetaEntry;

  if (!meta?.heading) {
    throw new Error(
      `RouteHeading: route-meta.json entry "${routeKey}" has no "heading". ` +
        `It is the source of truth for the prerendered <h1> too, so add it ` +
        `there rather than hard-coding a heading in the page.`,
    );
  }

  if (variant === 'hero') {
    const words = meta.heading.split(' ');
    const n = Math.min(Math.max(meta.headingAccentWords ?? 0, 0), words.length);
    const plain = words.slice(0, words.length - n).join(' ');
    const accent = words.slice(words.length - n).join(' ');
    // On a phone the accent's last word takes a line of its own (owner: "Chess" below "Understand", in the sky,
    // so the king and the castle show whole); one line from md.
    // On a phone a closing "and" of the plain part reads as a comma (owner: "Play, Solve, Understand Chess"); the
    // comma is CSS content, so the heading's text stays the route-meta wording for search.
    const plainAnd = plain.endsWith(' and');
    const plainLead = plainAnd ? plain.slice(0, -4) : plain;
    const accentWords = accent.split(' ');
    const accentLast = accentWords.pop() ?? '';
    const accentLead = accentWords.join(' ');
    return (
      <header className={className}>
        <h1 className="[text-shadow:0_2px_24px_hsl(var(--background))] font-playfair font-semibold leading-[1.02] tracking-[-0.015em] text-[30px] md:text-[clamp(48px,5.4vw,104px)] max-w-[16ch]">
          {plainLead}{plainAnd && <><span className="v2-phone-comma" aria-hidden /><span className="hidden md:inline"> and</span></>}{plain && accent ? ' ' : ''}{accent && <span className="v2-gold-text [text-shadow:none]">{accentLead}{accentLead ? <><br className="md:hidden" /><span className="hidden md:inline"> </span></> : null}{accentLast}</span>}
        </h1>
        {!hideBody && meta.body && (
          <p className="hidden md:block [text-shadow:0_1px_12px_hsl(var(--background))] mt-2 md:mt-5 max-w-[36rem] text-sm md:text-[19px] text-foreground/90 leading-snug">
            {meta.body}
          </p>
        )}
      </header>
    );
  }

  return (
    <header className={`mb-2 md:mb-4 ${className}`}>
      <h1 className="text-xl md:text-3xl font-serif font-bold leading-tight">
        {meta.heading}
      </h1>
      {!hideBody && meta.body && (
        <p className="mt-0.5 text-xs md:text-sm text-muted-foreground leading-snug">
          {meta.body}
        </p>
      )}
    </header>
  );
}

export default RouteHeading;
