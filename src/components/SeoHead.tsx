import { Helmet } from 'react-helmet-async';

import routeMeta from '@/config/route-meta.json';

/**
 * Single-source-of-truth <head> for a static route.
 *
 * Why this exists
 * ---------------
 * Page metadata used to live in two places: each page's hand-written Helmet
 * block, and a hand-written COPY of the same strings in
 * `scripts/generate-route-html.cjs`, which bakes the prerendered HTML that
 * S3 serves. That script said so explicitly: "If an article's Helmet title or
 * description changes, change it here too."
 *
 * Nobody does, reliably. By 2026-07-28 eight routes had drifted — `/puzzles`
 * served the search term "Chess Puzzles & Training" on Google's first,
 * non-rendering pass and then overwrote it with "Puzzle Trainer" on the
 * second. Same failure shape as the four-month `noindex` on three live
 * features: two sources of truth, manual sync, no check.
 *
 * Both sides now read `src/config/route-meta.json`. The build additionally
 * fails if a sitemapped URL has no prerendered HTML, so the two cannot drift
 * apart again — see `scripts/check-indexability.cjs`.
 *
 * Dynamic routes (champion pages, whose title carries a game count from the
 * API) keep their own Helmet blocks: their values are not knowable at build
 * time, so there is no second copy to drift from.
 */

export type RouteMetaKey = keyof typeof routeMeta;

const DOMAIN = 'https://www.chessplaybook.com';
const DEFAULT_OG_IMAGE = `${DOMAIN}/assets/facebook_cover.jpg`;

interface SeoHeadProps {
  /** Route key, matching a top-level key in route-meta.json (no leading slash). */
  routeKey: RouteMetaKey;
  /**
   * Extra tags — JSON-LD, article schema, anything page-specific. Rendered
   * inside the same Helmet so it participates in the same replacement pass.
   */
  children?: React.ReactNode;
}

export function SeoHead({ routeKey, children }: SeoHeadProps) {
  const meta = routeMeta[routeKey] as {
    title: string;
    description: string;
    ogTitle?: string;
    ogDescription?: string;
    keywords?: string;
    ogImage?: string;
    articleType?: string;
    datePublished?: string;
    dateModified?: string;
  };

  if (!meta) {
    throw new Error(
      `SeoHead: no entry for "${routeKey}" in route-meta.json. ` +
        `Add it there — it is the source of truth for both the rendered head ` +
        `and the prerendered HTML.`,
    );
  }

  // '' is the homepage, whose canonical keeps its trailing slash.
  const canonical = routeKey === '' ? `${DOMAIN}/` : `${DOMAIN}/${routeKey}`;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      {meta.keywords && <meta name="keywords" content={meta.keywords} />}
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={meta.ogTitle || meta.title} />
      <meta property="og:description" content={meta.ogDescription || meta.description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Chess Playbook" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.ogTitle || meta.title} />
      <meta name="twitter:description" content={meta.ogDescription || meta.description} />
      <meta name="twitter:image" content={ogImage} />

      {/*
        Article schema is DERIVED from the fields above rather than written out
        again, so headline/description/image cannot disagree with the meta tags
        describing the same page. `scripts/generate-route-html.cjs` builds the
        identical object for the prerendered HTML — before this, the static
        article carried the homepage's `WebSite` schema, so the first fetch and
        every social scraper saw no article, no date and no author at all.
      */}
      {meta.articleType && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': meta.articleType,
            headline: meta.ogTitle || meta.title,
            description: meta.description,
            image: ogImage,
            datePublished: meta.datePublished,
            dateModified: meta.dateModified || meta.datePublished,
            author: { '@type': 'Organization', name: 'Chess Playbook', url: DOMAIN },
            publisher: { '@type': 'Organization', name: 'Chess Playbook', url: DOMAIN },
            mainEntityOfPage: canonical,
          })}
        </script>
      )}

      {children}
    </Helmet>
  );
}

export default SeoHead;
