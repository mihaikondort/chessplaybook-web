#!/usr/bin/env node
/**
 * Indexability guard — fails the build when the sitemap and the pages
 * themselves disagree about whether a URL should be indexed.
 *
 * Why this exists
 * ---------------
 * On 2026-07-28 Search Console refused an indexing request for /puzzles:
 * "Excluded by 'noindex' tag". /puzzles, /play and /play-online had each
 * been carrying <meta name="robots" content="noindex, follow"> since
 * 2026-03-27 (e6c7bb1, 00d7e35) — added days *after* those features
 * shipped and worked, not left over from any stub. A thin new feature is
 * a defensible thing to suppress; the defect is that the suppression was
 * given no expiry and no owner, so nobody revisited it when the features
 * filled out. Meanwhile the sitemap listed all three. The two sources of
 * truth had been contradicting each other, in production, for four months.
 *
 * Nothing in the existing checks could have caught it. The tag is injected
 * client-side by react-helmet-async, so the prerendered HTML in
 * dist/_routes carries no robots tag at all and every HTTP-level probe —
 * status, headers, redirects — comes back clean. Only a JS-rendering
 * crawler ever sees the block, which is why Google found it and two site
 * audits did not.
 *
 * So this reads the tag from source rather than over the wire. That is a
 * deliberate trade: it cannot catch a robots tag assembled at runtime from
 * a variable (see the `dynamic` bucket below, which it reports rather than
 * silently passing), but it needs no browser, no server and no network,
 * and it runs in milliseconds as part of `npm run build`.
 *
 * Checks
 * ------
 *   ERROR  a sitemapped URL whose component renders `noindex`
 *          -> the contradiction above; the build fails
 *   ERROR  a sitemapped URL matching no route at all
 *          -> it will render NotFound; this is the class of bug that put
 *             36 capitalised /champions/<Name>/games URLs in the sitemap
 *   WARN   an indexable static route absent from the sitemap
 *          -> usually deliberate, so it never fails the build, but a page
 *             nobody links and nobody sitemaps is invisible
 *   WARN   a sitemapped static URL that no source file links to
 *          -> an orphan. A sitemap entry asks Google to crawl a page; zero
 *             internal links tell it the site does not consider that page
 *             worth reaching. This was invisible until 2026-07-28, because
 *             /play and /leaderboard were the orphans and /play was also
 *             noindex, so the noindex masked the orphaning. Limit: a link
 *             from a noindex page still counts, so this catches only the
 *             zero case, not weak reachability.
 *   WARN   a robots tag this script cannot statically resolve
 *
 * Usage: node scripts/check-indexability.cjs [--strict]
 *   --strict  treat warnings as errors
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES_FILE = path.join(ROOT, 'src/app/routes.tsx');
const SITEMAP_FILE = path.join(ROOT, 'dist/sitemap.xml');
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

/**
 * Route wrappers, not pages. `<ProtectedRoute><ProfilePage /></ProtectedRoute>`
 * must resolve to ProfilePage, so these names are skipped when picking the
 * component out of an element expression.
 */
const WRAPPERS = new Set(['ChampionSlugGuard', 'ProtectedRoute', 'Suspense', 'Navigate']);

const errors = [];
const warnings = [];

/** Resolve a "@/..." import specifier to a file on disk. */
function resolveImport(spec) {
  if (!spec.startsWith('@/')) return null;
  const base = path.join(ROOT, 'src', spec.slice(2));
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  return null;
}

/**
 * Map component name -> source file, covering both forms used in routes.tsx:
 *   import Index from "@/pages/Index";
 *   const News = lazy(() => lazyRetry(() => import("@/pages/News")));
 */
function buildComponentMap(src) {
  const map = new Map();

  const staticImport = /^import\s+([A-Z]\w*)\s+from\s+["']([^"']+)["']/gm;
  const lazyImport = /(?:const|let)\s+([A-Z]\w*)\s*=[\s\S]{0,120}?import\(\s*["']([^"']+)["']\s*\)/g;

  for (const re of [staticImport, lazyImport]) {
    let m;
    while ((m = re.exec(src)) !== null) {
      const file = resolveImport(m[2]);
      if (file) map.set(m[1], file);
    }
  }
  return map;
}

/** Extract `<Route path="..." element={...} />` pairs. */
function parseRoutes(src) {
  const routes = [];
  const re = /<Route\s+path=["']([^"']+)["']\s+element=\{([\s\S]*?)\}\s*\/>/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, routePath, element] = m;
    const names = [...element.matchAll(/<([A-Z]\w*)/g)].map((x) => x[1]);
    const component = names.find((n) => !WRAPPERS.has(n)) || names[0];
    if (component) routes.push({ path: routePath, component });
  }
  return routes;
}

/**
 * Read a component's robots directive.
 * Returns 'noindex' | 'index' | 'none' | 'dynamic'.
 */
function readRobots(file) {
  const src = fs.readFileSync(file, 'utf-8');
  const tag = src.match(/<meta\s+name=["']robots["']\s+content=(\{[^}]*\}|["'][^"']*["'])/);
  if (!tag) return 'none';
  const value = tag[1];
  if (value.startsWith('{')) return 'dynamic';
  return /noindex/i.test(value) ? 'noindex' : 'index';
}

/** Turn a react-router path into a matcher for concrete sitemap URLs. */
function toMatcher(routePath) {
  if (!routePath.includes(':') && !routePath.includes('*')) {
    return (p) => p === routePath;
  }
  const rx = new RegExp(
    '^' +
      routePath
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/:\w+/g, '[^/]+')
        .replace(/\*/g, '.*') +
      '$',
  );
  return (p) => rx.test(p);
}

/**
 * Every internal path reachable by following an anchor, under src/ minus
 * routes.tsx (declaring a route is not linking to it).
 *
 * Only link-bearing positions count: a JSX `to=`/`href=` attribute, or a
 * `to:`/`href:` property in the data arrays that Footer, Navigation, News,
 * NewsTeaser and Features all feed into <Link>. A bare string literal does
 * NOT count, and that distinction is the whole point: `/play`'s only
 * non-route mention was `onClick={() => navigate('/play')}` in PlayOnline,
 * which no crawler can follow. A looser scan sees a link there and reports
 * the page as reachable when Google cannot reach it at all.
 */
function collectInternalLinks() {
  const found = new Set();
  const LINK_ATTR = /\b(?:to|href)\s*[=:]\s*["'`](\/[a-z0-9][a-z0-9/-]*)["'`]/gi;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name) && full !== ROUTES_FILE) {
        const src = fs.readFileSync(full, 'utf-8');
        for (const m of src.matchAll(LINK_ATTR)) found.add(m[1]);
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  return found;
}

function main() {
  const strict = process.argv.includes('--strict');

  if (!fs.existsSync(SITEMAP_FILE)) {
    console.error(`Indexability check: sitemap not found at ${SITEMAP_FILE}`);
    console.error('Run `node scripts/generate-sitemap.cjs` first (npm run build does).');
    process.exit(1);
  }

  const routesSrc = fs.readFileSync(ROUTES_FILE, 'utf-8');
  const components = buildComponentMap(routesSrc);
  const routes = parseRoutes(routesSrc);

  if (routes.length === 0) {
    console.error('Indexability check: parsed 0 routes from routes.tsx — the parser is stale.');
    process.exit(1);
  }

  // robots directive per route
  for (const route of routes) {
    const file = components.get(route.component);
    if (!file) {
      // Components declared inside routes.tsx itself (redirect shims such as
      // LiveEventsRedirect) have no page of their own and no robots tag.
      const localDecl = new RegExp(`function\\s+${route.component}\\s*\\(`).test(routesSrc);
      if (!localDecl) {
        warnings.push(`Could not resolve component <${route.component}> for ${route.path}`);
      }
      route.robots = 'unknown';
      continue;
    }
    route.file = file;
    route.robots = readRobots(file);
    if (route.robots === 'dynamic') {
      warnings.push(
        `${route.path} builds its robots tag from an expression ` +
          `(${path.relative(ROOT, file)}) — verify it by hand.`,
      );
    }
  }

  const sitemapPaths = [...fs.readFileSync(SITEMAP_FILE, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(DOMAIN, ''))
    .map((p) => (p === '' ? '/' : p));

  /**
   * Every sitemapped URL must have its own prerendered HTML object.
   *
   * Without one, S3 falls back to dist/index.html and the URL serves the
   * homepage's title, description and canonical on any non-rendering fetch —
   * i.e. Google's first pass sees an exact duplicate of the homepage. That is
   * what /live-events did: sitemapped since launch, linked from the main nav,
   * and never added to the generator, so it advertised itself as the homepage
   * to every crawler that did not run JS.
   *
   * The manifest is the right source to check because deploy.sh uploads from
   * it — an entry missing here is an object missing in S3.
   */
  const manifestPath = path.join(ROOT, 'dist/_routes/manifest.tsv');
  if (fs.existsSync(manifestPath)) {
    const prerendered = new Set(
      fs
        .readFileSync(manifestPath, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((line) => '/' + line.split('\t')[1]),
    );
    for (const url of sitemapPaths) {
      if (url === '/') continue; // served by dist/index.html itself
      if (!prerendered.has(url)) {
        errors.push(
          `${url} is in the sitemap but has no prerendered HTML in ` +
            `dist/_routes/manifest.tsv, so it serves the homepage's meta and ` +
            `canonical to any crawler that does not run JS. Add it to ` +
            `src/config/route-meta.json.`,
        );
      }
    }
  } else {
    warnings.push('dist/_routes/manifest.tsv not found — prerender coverage unchecked.');
  }

  // ERROR: sitemapped but noindex, or sitemapped but unroutable
  const matched = new Set();
  for (const url of sitemapPaths) {
    const route = routes.find((r) => toMatcher(r.path)(url));
    if (!route) {
      errors.push(`${url} is in the sitemap but matches no route — it renders NotFound.`);
      continue;
    }
    matched.add(route.path);
    if (route.robots === 'noindex') {
      errors.push(
        `${url} is in the sitemap but ${path.relative(ROOT, route.file)} renders noindex. ` +
          `Remove the sitemap entry or the robots tag — they cannot both be right.`,
      );
    }
  }

  /**
   * WARN: sitemapped, routable, indexable — and nothing links to it.
   *
   * Only static (parameterless) sitemap URLs are checked. Champion pages are
   * built from template literals (`/champions/${slug}/games`), so a literal
   * scan cannot see them and would report all 36 as orphans.
   *
   * routes.tsx is excluded from the link scan: declaring a route is not
   * linking to it, and it names every path by construction.
   */
  const staticRoutePaths = new Set(
    routes.filter((r) => !r.path.includes(':') && !r.path.includes('*')).map((r) => r.path),
  );
  const linked = collectInternalLinks();
  for (const url of sitemapPaths) {
    if (url === '/') continue;
    if (!staticRoutePaths.has(url)) continue;
    if (linked.has(url)) continue;
    warnings.push(
      `${url} is in the sitemap but no source file links to it — it is an ` +
        `orphan. Add an internal link (nav, footer, or a relevant page) or ` +
        `drop the sitemap entry.`,
    );
  }

/**
 * Routes that are deliberately not in the sitemap, with the reason.
 *
 * A standing warning nobody acts on is worse than no warning: it trains the
 * next person to scroll past the output, which is exactly how a real one gets
 * missed. So an intentional omission is recorded here rather than tolerated on
 * every build.
 *
 * CORRECTED 2026-08-06. These WERE described here as "NOT noindex", on the
 * reasoning that `SeoHead` can never emit that tag and the four-month
 * invisibility is what that rule exists to prevent. Half of that is still true
 * and the conclusion was wrong.
 *
 * What made 2026-07-28 a disaster was not `noindex`. It was an INVISIBLE one:
 * three live pages carried a client-injected robots tag for four months, the
 * prerendered HTML was clean, `curl` returned a healthy 200, and two audits
 * missed it — only a JS-rendering crawler ever saw the block.
 *
 * So these two now carry `noindex, follow` written into the PRERENDERED HTML by
 * `generate-route-html.cjs`, where curl, a human and this script can all see it,
 * and where `assertNoindexEmitted` below fails the build if it goes missing.
 * They are one person's data: nobody searches for them and a crawler sees an
 * empty loading state.
 */
const DELIBERATELY_UNSITEMAPPED = new Map([
  ['/puzzles/progress',
    "one person's own training record; it renders empty to a crawler and its " +
    'content belongs to whoever is signed in or holding an anonymous id'],
  ['/puzzles/plan',
    "one person's own training plan; same reason as the record above — it " +
    'renders empty to a crawler, and it is reached from the trainer rather ' +
    'than from search'],
]);

  /*
    THE PER-USER PAGES MUST ACTUALLY CARRY THE TAG.

    Asserted against the built file rather than the source, because the failure
    mode being guarded is precisely a difference between what the generator
    intends and what gets SERVED. A `noindex` that exists only in a config is the
    same class of bug as one that exists only in the rendered DOM.

    It also checks the tag has no `data-rh` attribute: with it, react-helmet-async
    adopts the tag on mount and — since `SeoHead` renders no robots tag — removes
    it, which would restore the served-vs-rendered divergence pointing the other
    way.
  */
  /*
    ON A NON-PRODUCTION BUILD, EVERY ROUTE MUST BE noindex (#34).

    The loop below asks whether the two per-user pages carry the tag. This asks
    the opposite question of everything else: a staging site that is crawlable
    competes with production for its own content, and by the time that appears in
    Search Console it is already indexed.

    The check is INVERTED rather than relaxed. On production nothing changes; off
    it, a missing tag is an error rather than the normal case. Asserted against
    the BUILT files for the same reason the per-user check is - the failure mode
    is a difference between what the generator intends and what gets served.
  */
  if (!IS_PRODUCTION_SITE) {
    const routesDir = path.join(ROOT, 'dist', '_routes');
    if (fs.existsSync(routesDir)) {
      let checked = 0;
      for (const key of fs.readdirSync(routesDir)) {
        const built = path.join(routesDir, key);
        if (!fs.statSync(built).isFile()) continue;
        /* `manifest.tsv` lives in this directory and is not a route. Same rule
           the CloudFront function uses: a name with a dot in it is an artefact,
           never a page. Found by running this against a staging build, which
           reported the manifest as an unindexed page. */
        if (key.includes('.')) continue;
        checked += 1;
        const html = fs.readFileSync(built, 'utf-8');
        const tag = html.match(/<meta[^>]*name=["']robots["'][^>]*>/i);
        if (!tag || !/noindex/i.test(tag[0])) {
          errors.push(
            `SITE_URL is ${DOMAIN}, not production, so /${key.replace(/__/g, '/')} must be ` +
            'noindex in its prerendered HTML — a crawlable staging copy competes with ' +
            'production. See NOINDEX_ROUTES in generate-route-html.cjs.',
          );
        }
      }
      if (checked === 0) {
        errors.push(
          `SITE_URL is ${DOMAIN}, not production, but dist/_routes is empty — nothing ` +
          'was checked for noindex. Build before running this.',
        );
      }
    }
  }

  for (const [routePath] of DELIBERATELY_UNSITEMAPPED) {
    const key = routePath.replace(/^\//, '').replace(/\//g, '__');
    const built = path.join(__dirname, '..', 'dist', '_routes', key);
    if (!fs.existsSync(built)) continue;   // no build yet; the sitemap checks cover that
    const html = fs.readFileSync(built, 'utf-8');
    const tag = html.match(/<meta[^>]*name=["']robots["'][^>]*>/i);
    if (!tag) {
      errors.push(
        `${routePath} is a per-user page and its prerendered HTML carries NO robots ` +
        'tag. It should be `noindex, follow` — see generate-route-html.cjs.',
      );
    } else if (!/noindex/i.test(tag[0])) {
      errors.push(`${routePath} has a robots tag that is not noindex: ${tag[0]}`);
    } else if (/data-rh/i.test(tag[0])) {
      errors.push(
        `${routePath} emits its robots tag with data-rh, so react-helmet-async ` +
        'will remove it on hydration. Emit it without that attribute.',
      );
    }
  }

  /*
    ONLY THE HOMEPAGE MAY CLAIM `WebSite`.

    Every route file is a copy of dist/index.html, so the homepage's site-level
    schema — its name, url and description — used to ride
    along on all 60 of them. After the 2026-08-06 meta rewrite that turned into a
    page contradicting itself: /puzzles served a correct <meta description> for the
    training system and a schema description for the homepage.

    Checked against the BUILT files for the same reason the robots check is: the
    failure mode is a difference between what the generator intends and what S3
    serves. Both directions are asserted — a route that still carries the block,
    and a homepage that has lost it (a strip regex widened by one character would
    do exactly that, and would look like a clean build).
  */
  const WEBSITE_SCHEMA = /"@type"\s*:\s*"WebSite"/;
  if (fs.existsSync(manifestPath)) {
    for (const line of fs.readFileSync(manifestPath, 'utf-8').split('\n').filter(Boolean)) {
      const [flat, routeKey] = line.split('\t');
      const built = path.join(ROOT, 'dist/_routes', flat);
      if (!fs.existsSync(built)) continue;
      if (WEBSITE_SCHEMA.test(fs.readFileSync(built, 'utf-8'))) {
        errors.push(
          `/${routeKey} carries the homepage's WebSite JSON-LD. That schema is a ` +
            'claim about the site, so only / may make it, and its description ' +
            "will disagree with this page's own. See stripWebsiteJsonLd in " +
            'generate-route-html.cjs.',
        );
      }
    }
  }
  const builtIndex = path.join(ROOT, 'dist/index.html');
  if (fs.existsSync(builtIndex) && !WEBSITE_SCHEMA.test(fs.readFileSync(builtIndex, 'utf-8'))) {
    errors.push(
      'dist/index.html has no WebSite JSON-LD. Google supports it for the site ' +
        'name shown above search results, and its own guideline is that the ' +
        'markup must be on the home page — so the homepage is the one page that ' +
        'has to carry it. (The sitelinks SearchAction that used to sit in this ' +
        'block was removed on 2026-08-07 — Google retired that feature in ' +
        'October 2024, so it had rendered nothing since.)',
    );
  }

  // WARN: indexable static route nobody sitemapped
  for (const route of routes) {
    if (route.path.includes(':') || route.path.includes('*')) continue;
    if (matched.has(route.path)) continue;
    if (route.robots === 'noindex' || route.robots === 'unknown') continue;
    if (route.path.startsWith('/dev/')) continue;
    if (DELIBERATELY_UNSITEMAPPED.has(route.path)) continue;
    warnings.push(`${route.path} is indexable but absent from the sitemap.`);
  }

  // report
  const checked = routes.length;
  for (const w of warnings) console.warn(`  WARN   ${w}`);
  for (const e of errors) console.error(`  ERROR  ${e}`);

  if (errors.length || (strict && warnings.length)) {
    console.error(
      `\nIndexability check FAILED: ${errors.length} error(s), ${warnings.length} warning(s).`,
    );
    process.exit(1);
  }

  console.log(
    `Indexability check passed: ${checked} routes, ${sitemapPaths.length} sitemap URLs, ` +
      `${warnings.length} warning(s).`,
  );
}

main();
