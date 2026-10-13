/**
 * Per-route static HTML for the champion pages.
 *
 * WHY THIS EXISTS
 *
 * The site is a client-rendered SPA behind CloudFront: every unknown path 404s at
 * S3 and CloudFront rewrites it to /index.html. So all 36 champion pages served
 * BYTE-IDENTICAL raw HTML — the generic homepage title, the homepage description,
 * and no canonical. Champion-specific meta only appeared after JS ran AND an
 * api.chessplaybook.com call resolved. Google renders JS, but in a deferred second
 * pass, and 36 URLs that are indistinguishable on first fetch is exactly what
 * produces "Crawled - currently not indexed". Requesting indexing does not help,
 * because it does not change what the crawler receives.
 *
 * HOW IT WORKS — no CloudFront change required
 *
 * CloudFront's viewer-request function does no path rewriting, and the SPA fallback
 * is a 403/404 custom error response. So an S3 object at the EXACT key
 * `champions/gukesh/games` (no extension) is found and served directly, and every
 * other route keeps falling through to /index.html as before. That is why output
 * files here are extensionless: the key must match the URL path character for
 * character.
 *
 * Because the keys have no extension, `aws s3 sync` would guess
 * application/octet-stream and browsers would download the page instead of
 * rendering it. deploy/deploy.sh therefore uploads these with an explicit
 * --content-type; see step 2f there. Do not fold them back into the bulk sync.
 *
 * WHAT IT EMITS
 *
 * dist/index.html with title/description/canonical/og/twitter replaced per route,
 * plus a short <noscript> block so the page carries unique body text even on the
 * first, non-rendered fetch. The tags carry data-rh="true" so react-helmet-async
 * REPLACES them on mount rather than appending a second copy — the same contract
 * index.html follows, for the same reason (see SEO_DUPLICATE_META_FIX).
 *
 * Static copy deliberately carries NO game counts. The React pages put the live
 * count in their titles, but the count comes from the API and is unknowable at
 * build time; baking a stale number into the crawlable HTML is worse than omitting
 * it. Helmet supplies the real thing once JS runs.
 *
 * Usage: node scripts/generate-route-html.cjs   (runs after generate-sitemap)
 */

const fs = require('fs');
const path = require('path');

/*
  THE SITE THIS BUILD IS FOR (#34).

  Hardcoded to production until 2026-08-23, so a staging build emitted PRODUCTION
  canonicals - an SEO hazard on top of a configuration one, and the kind that is
  invisible until Google has already read it. Defaults to production, so a build
  with `SITE_URL` unset is byte-identical to before.
*/
const PRODUCTION_DOMAIN = 'https://www.chessplaybook.com';
const DOMAIN = (process.env.SITE_URL || PRODUCTION_DOMAIN).replace(/\/$/, '');
const IS_PRODUCTION_SITE = DOMAIN === PRODUCTION_DOMAIN;
const DIST_DIR = path.join(__dirname, '../dist');
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const PLAYERS_JSON_PATH = path.join(__dirname, '../public/assets/players/players_list.json');

/** Escape a string for use inside a double-quoted HTML attribute. */
function attr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape a string for use as HTML text content. */
function text(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Replace the value of a <meta> tag identified by attribute name/value, or insert
 * it before </head> if the template does not already carry it.
 *
 * Throws rather than silently no-oping: a missed replacement would ship the
 * homepage copy again, which is the exact bug this script exists to fix, and it
 * would do so invisibly.
 */
function setMeta(html, attrName, attrValue, content) {
  // The closing delimiter must be the SAME quote character the tag opened with.
  // A naive [^"']* terminates early on an apostrophe inside the value — the
  // homepage description contains "the champion's playbook", which silently left
  // the tail of the old copy appended to the new. Hence one pattern per quote
  // style, each matching only its own delimiter.
  const patterns = [
    new RegExp(
      `(<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*\\bcontent=")[^"]*(")`,
      'i'
    ),
    new RegExp(
      `(<meta\\b[^>]*\\b${attrName}=["']${attrValue}["'][^>]*\\bcontent=')[^']*(')`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    if (pattern.test(html)) {
      return html.replace(pattern, `$1${attr(content)}$2`);
    }
  }
  const tag = `    <meta data-rh="true" ${attrName}="${attrValue}" content="${attr(content)}" />\n`;
  return html.replace('</head>', `${tag}  </head>`);
}

function setTitle(html, title) {
  if (!/<title>[\s\S]*?<\/title>/i.test(html)) {
    throw new Error('index.html has no <title> to replace');
  }
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${text(title)}</title>`);
}

/**
 * Replace the `description` inside the static WebSite JSON-LD block, so the
 * homepage's structured data cannot disagree with its <meta description>.
 * Scoped to that block by anchoring on `"@type": "WebSite"` — a bare
 * `"description":` replace would also hit any other schema on the page.
 */
function setJsonLdDescription(html, description) {
  return html.replace(
    /("@type":\s*"WebSite"[\s\S]*?"description":\s*)"(?:[^"\\]|\\.)*"/,
    (_m, prefix) => `${prefix}${JSON.stringify(description)}`,
  );
}

/**
 * Remove the homepage's `WebSite` JSON-LD from a non-home route.
 *
 * Every route file is a copy of `dist/index.html`, so until 2026-08-07 all 60 of
 * them shipped the homepage's structured data — name, url, the homepage
 * description. After the 08-06 meta rewrite that
 * became visibly self-contradictory: `/puzzles` served a correct
 * `<meta description>` describing the training system and, three tags later, a
 * schema description describing the homepage. Two answers to one question, on one
 * page.
 *
 * REMOVED rather than replaced with a per-page `WebApplication`. `WebSite` is a
 * claim about the SITE, so exactly one page should make it, and the homepage
 * already does — writing a second, page-specific block would be a second copy of
 * the same sentence, which is the failure mode this generator exists to end.
 * Articles are the exception and keep their own schema, built below from the same
 * fields the meta tags come from.
 *
 * Throws when the block is absent: a silent no-op here would ship the homepage
 * schema on every route again, invisibly, which is the bug itself.
 *
 * LIMIT, worth knowing before changing the schema layout. This removes a WHOLE
 * `<script>` element, matched by the `@type` inside it. That is right while each
 * block is one entity, which is today's shape. If the page's structured data is
 * ever consolidated into a single `@graph` script holding `WebSite` alongside
 * page or article nodes, this would take all of them out — and the build would
 * still pass, because the guard only asserts `WebSite` is absent. Splitting the
 * graph, or filtering nodes rather than elements, has to happen in the same
 * change.
 */
const WEBSITE_JSONLD = new RegExp(
  '\\s*<script\\b[^>]*type=["\']application/ld\\+json["\'][^>]*>' +
    '(?:(?!</script>)[\\s\\S])*?"@type"\\s*:\\s*"WebSite"' +
    '(?:(?!</script>)[\\s\\S])*?</script>',
  'i',
);

function stripWebsiteJsonLd(html, routeKey) {
  if (!WEBSITE_JSONLD.test(html)) {
    throw new Error(
      `index.html has no WebSite JSON-LD block to strip for /${routeKey}. ` +
        'If it was moved or renamed, update stripWebsiteJsonLd — do not delete ' +
        'this check, or every route silently ships the homepage schema again.',
    );
  }
  return html.replace(WEBSITE_JSONLD, '');
}

/**
 * `noindex, follow` for the per-user pages, IN THE SERVED HTML.
 *
 * These are one person's training plan and one person's record. Nobody searches
 * for them, a crawler sees an empty loading state, and they are reachable from
 * `/puzzles` — so left alone they are thin pages with no demand behind them.
 * `follow`, so the links back into the site still count.
 *
 * WHY HERE AND NOT IN `SeoHead`. The 2026-07-28 incident was not caused by
 * `noindex`; it was caused by an INVISIBLE one. Three live pages carried a
 * client-injected robots tag for four months: the prerendered HTML was clean, so
 * `curl` returned a healthy 200 and two audits missed it — only a JS-rendering
 * crawler ever saw the block. Emitted here it is in the file that is served,
 * visible to `curl`, to a human, and to `check-indexability`.
 *
 * NO `data-rh`, and that attribute is the whole trap. Every other tag this
 * generator writes carries it so react-helmet-async takes ownership and replaces
 * it on mount. `SeoHead` renders no robots tag — so a `data-rh` robots tag would
 * be adopted by Helmet and then REMOVED the moment the app hydrates, leaving
 * exactly the invisible-difference-between-served-and-rendered state that caused
 * the original bug, pointing the other way.
 */
const NOINDEX_ROUTES = new Set(['puzzles/plan', 'puzzles/progress']);

/*
  A NON-PRODUCTION SITE IS noindex IN FULL (#34).

  The two routes above are noindex because of what they contain. This is a
  different reason: a staging copy of the whole site, reachable and crawlable,
  competes with production for its own content - and by the time that shows up in
  Search Console the damage is already indexed. So when `SITE_URL` names anything
  other than production, EVERY prerendered route gets the tag.

  Written into the prerendered HTML for exactly the reason the per-user pages are:
  a robots rule that exists only in a config, or only in the rendered DOM, is the
  2026-07-28 failure with the sign flipped. `check-indexability.cjs` REQUIRES this
  on a non-production build rather than merely tolerating it.
*/
function routeIsNoindex(routeKey) {
  return !IS_PRODUCTION_SITE || NOINDEX_ROUTES.has(routeKey);
}

function setRobotsNoindex(html) {
  const pattern = /<meta[^>]*name=["']robots["'][^>]*>/i;
  const tag = '<meta name="robots" content="noindex, follow" />';
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}
  </head>`);
}

function setCanonical(html, href) {
  const pattern = /<link\b[^>]*\brel=["']canonical["'][^>]*>/i;
  const tag = `<link data-rh="true" rel="canonical" href="${attr(href)}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

/**
 * Inject crawlable body text into the #root element.
 *
 * It goes in a <noscript> so it never renders for real users and cannot affect
 * LCP or CLS — the project tracks a PSI-98 mobile score and a visible fallback
 * block would put that at risk. The text says the same thing the rendered page
 * says; it exists so the first fetch is not indistinguishable from every other
 * champion page.
 */
function injectNoscript(html, block) {
  const rootPattern = /(<div\b[^>]*\bid=["']root["'][^>]*>)/i;
  if (!rootPattern.test(html)) {
    throw new Error('index.html has no #root element to inject into');
  }
  return html.replace(rootPattern, `$1<noscript>${block}</noscript>`);
}

/**
 * News routes, added after the article launch showed the SPA-fallback cost twice:
 * `x-cache: Error from cloudfront` on every article fetch (the 403→index.html
 * error path, slower and poorly cached at the edge), and generic homepage meta on
 * the first crawl — the same "Crawled - currently not indexed" trap the champion
 * pages were in.
 *
 * These strings are COPIES of each page's Helmet block, not imports — this script
 * runs in plain Node against .cjs, before anything TSX exists. If an article's
 * Helmet title or description changes, change it here too. The static and
 * rendered values must match across Google's two passes, which is the whole
 * contract (see the champion routes above).
 *
 * og:image is set per-article here, unlike the champion routes, because articles
 * are what get shared: a link preview is generated from the first fetch, where
 * only this static HTML exists.
 */
/**
 * Static + article routes come from `src/config/route-meta.json`, which is
 * ALSO what `<SeoHead>` renders at runtime. One file, both passes.
 *
 * This used to be two hand-maintained arrays of copies, with a comment telling
 * whoever edited a page's Helmet block to remember to edit here too. By
 * 2026-07-28 eight routes had drifted apart, and `/live-events` had never been
 * added at all — so a sitemapped, nav-linked page served the homepage's title
 * and canonical on every non-rendering fetch.
 *
 * og:image is per-article: a link preview is generated from the first fetch,
 * where only this static HTML exists.
 */
function buildMetaRoutes() {
  const meta = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/config/route-meta.json'), 'utf-8')
  );
  return Object.entries(meta).map(([key, value]) => ({ key, ...value }));
}

function buildRoutes(playersData) {
  const routes = [];

  Object.keys(playersData).forEach(playerName => {
    const slug = playerName.toLowerCase();
    const data = playersData[playerName];
    // fullName is what the React pages use as pageTitle once the API resolves, so
    // matching it keeps the static and rendered titles consistent across Google's
    // two passes.
    const name = data.fullName || playerName;
    const years = (data.championshipYears || '').trim();
    const bio = (data.biography || '').trim();
    const reign = years ? ` ${years}.` : '';

    routes.push({
      key: `champions/${slug}/games`,
      title: `${name} Chess Games | Chess Playbook`,
      description:
        `Browse and replay the chess games of ${name}, World Chess Champion. ` +
        `Filter by opening, opponent and result, and study every move on an interactive board.`,
      ogTitle: `${name} Chess Games`,
      ogDescription: `Browse and replay the chess games of ${name}, World Chess Champion.`,
      keywords: `${name}, ${slug}, chess games, world chess champion, chess strategy, grandmaster games`,
      heading: `${name} - Chess Games`,
      body:
        `Replay the games of ${name}, World Chess Champion.${reign}` +
        (bio ? ` ${bio}` : ''),
    });

    routes.push({
      key: `champions/${slug}/best-games`,
      title: `${name} Best Chess Games | Chess Playbook`,
      description:
        `The highest-quality games of ${name}, World Chess Champion, ranked by ` +
        `engine-measured accuracy. Replay each one move by move with analysis.`,
      ogTitle: `${name} Best Chess Games`,
      ogDescription:
        `The highest-quality games of ${name}, World Chess Champion, ranked by engine-measured accuracy.`,
      keywords: `${name}, ${slug}, best chess games, world chess champion, chess accuracy, grandmaster games`,
      heading: `${name} - Best Games`,
      body:
        `The highest-quality games of ${name}, World Chess Champion, ranked by ` +
        `engine-measured accuracy.${reign}` + (bio ? ` ${bio}` : ''),
    });
  });

  return routes;
}

function generate() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Error: ${INDEX_PATH} not found. Run the build first.`);
    process.exit(1);
  }
  if (!fs.existsSync(PLAYERS_JSON_PATH)) {
    console.error('Error: players_list.json not found');
    process.exit(1);
  }

  const template = fs.readFileSync(INDEX_PATH, 'utf-8');
  const ROUTES_DIR = path.join(DIST_DIR, '_routes');
  fs.rmSync(ROUTES_DIR, { recursive: true, force: true });
  fs.mkdirSync(ROUTES_DIR, { recursive: true });
  const manifest = [];
  const playersData = JSON.parse(fs.readFileSync(PLAYERS_JSON_PATH, 'utf-8'));
  const allMeta = buildMetaRoutes();

  /**
   * The '' key is the homepage. It is not a _routes object — S3 serves
   * dist/index.html at '/' directly — so it patches that file in place
   * instead, from the same source as every other route.
   *
   * This matters more than a normal route: index.html is ALSO the SPA shell
   * served for any path without its own object, so its <head> is what a
   * crawler sees on every soft 404. It carried the long-superseded
   * "Chess Playbook - Master Your Game" / "Elevate your chess strategy…"
   * copy while the rendered homepage said something completely different.
   */
  const homeMeta = allMeta.find(r => r.key === '');
  const routes = buildRoutes(playersData).concat(allMeta.filter(r => r.key !== ''));

  routes.forEach(route => {
    const url = `${DOMAIN}/${route.key}`;
    let html = template;

    // The site-level schema belongs to the homepage alone; see above.
    html = stripWebsiteJsonLd(html, route.key);

    html = setTitle(html, route.title);
    html = setMeta(html, 'name', 'description', route.description);
    html = setMeta(html, 'name', 'keywords', route.keywords);
    html = setCanonical(html, url);
    if (routeIsNoindex(route.key)) html = setRobotsNoindex(html);

    html = setMeta(html, 'property', 'og:title', route.ogTitle);
    html = setMeta(html, 'property', 'og:description', route.ogDescription);
    html = setMeta(html, 'property', 'og:url', url);

    html = setMeta(html, 'name', 'twitter:title', route.ogTitle);
    html = setMeta(html, 'name', 'twitter:description', route.ogDescription);

    // Articles override the homepage og:image; champion routes keep it.
    if (route.ogImage) {
      html = setMeta(html, 'property', 'og:image', route.ogImage);
      html = setMeta(html, 'name', 'twitter:image', route.ogImage);
    }

    // Article schema, built from the same fields <SeoHead> derives it from.
    // Without this the prerendered article carries index.html's `WebSite`
    // schema, so Google's first pass and every social scraper see no article,
    // no publish date and no author.
    if (route.articleType) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': route.articleType,
        headline: route.ogTitle || route.title,
        description: route.description,
        image: route.ogImage,
        datePublished: route.datePublished,
        dateModified: route.dateModified || route.datePublished,
        author: { '@type': 'Organization', name: 'Chess Playbook', url: DOMAIN },
        publisher: { '@type': 'Organization', name: 'Chess Playbook', url: DOMAIN },
        mainEntityOfPage: url,
      };
      html = html.replace(
        '</head>',
        `<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`
      );
    }

    html = injectNoscript(
      html,
      `<h1>${text(route.heading)}</h1><p>${text(route.body)}</p>`
    );

    // All route HTML goes under dist/_routes/ with '/' flattened to '__',
    // because S3's flat keyspace allows `news` and `news/x` to coexist while a
    // filesystem cannot hold a file and a directory of the same name. The
    // manifest maps each flat file back to its real S3 key; deploy.sh step 2f
    // uploads from it and the bulk sync excludes _routes/ wholesale.
    const outPath = path.join(ROUTES_DIR, route.key.replace(/\//g, '__'));
    fs.writeFileSync(outPath, html, 'utf-8');
    manifest.push(`${route.key.replace(/\//g, '__')}\t${route.key}`);
  });

  fs.writeFileSync(path.join(ROUTES_DIR, 'manifest.tsv'), manifest.join('\n') + '\n', 'utf-8');

  // Homepage: patch dist/index.html in place from the same source.
  if (homeMeta) {
    let home = template;
    home = setTitle(home, homeMeta.title);
    home = setMeta(home, 'name', 'description', homeMeta.description);
    home = setMeta(home, 'name', 'keywords', homeMeta.keywords);
    home = setCanonical(home, `${DOMAIN}/`);
    home = setMeta(home, 'property', 'og:title', homeMeta.ogTitle);
    home = setMeta(home, 'property', 'og:description', homeMeta.ogDescription);
    home = setMeta(home, 'property', 'og:url', `${DOMAIN}/`);
    home = setMeta(home, 'name', 'twitter:title', homeMeta.ogTitle);
    home = setMeta(home, 'name', 'twitter:description', homeMeta.ogDescription);
    // The WebSite JSON-LD description too, derived rather than hand-kept.
    // It was a third copy of the homepage description and went stale for
    // months (it still said "replay legendary games" long after the page had
    // moved on), because nothing tied it to route-meta.json.
    home = setJsonLdDescription(home, homeMeta.description);
    fs.writeFileSync(INDEX_PATH, home, 'utf-8');
    console.log('  Homepage meta applied to dist/index.html');
  }

  console.log(`Route HTML generated: ${routes.length} pages`);
  console.log(`  Output: ${ROUTES_DIR} (flat files + manifest.tsv)`);
}

try {
  generate();
} catch (error) {
  console.error('Error generating route HTML:', error);
  process.exit(1);
}
