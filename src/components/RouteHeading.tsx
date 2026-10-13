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

type RouteMetaEntry = { heading?: string; body?: string };

interface RouteHeadingProps {
  /** Route key, matching a top-level key in route-meta.json (no leading slash). */
  routeKey: keyof typeof routeMeta;
  /** Hide the intro line, keeping only the <h1>. For dense app surfaces. */
  hideBody?: boolean;
  className?: string;
}

export function RouteHeading({ routeKey, hideBody, className = '' }: RouteHeadingProps) {
  const meta = routeMeta[routeKey] as RouteMetaEntry;

  if (!meta?.heading) {
    throw new Error(
      `RouteHeading: route-meta.json entry "${routeKey}" has no "heading". ` +
        `It is the source of truth for the prerendered <h1> too, so add it ` +
        `there rather than hard-coding a heading in the page.`,
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
