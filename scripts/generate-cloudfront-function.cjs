#!/usr/bin/env node
/**
 * Keeps the CloudFront viewer-request function's route table derived from
 * src/app/routes.tsx instead of hand-copied into it.
 *
 * Why this exists
 * ---------------
 * On 2026-08-07 a third-party SEO audit found that an unknown URL answered
 * `200 OK` carrying the homepage's title and canonical: the SPA fallback
 * (CloudFront 403/404 -> /index.html at status 200) serves the shell for
 * anything S3 does not have, and React only injects `noindex` afterwards,
 * client-side. So a nonexistent page looked indexable to every crawler that
 * does not run JS — the same served-versus-rendered divergence as the
 * 2026-07-28 four-month invisibility, pointing the other way.
 *
 * The correction has to live in what CloudFront SERVES, and the only thing
 * that can tell "unknown URL" from "real route with no prerendered file"
 * (/player/:username, /champions/:name/games/:gameIndex, /candidates-2026/:slug
 * and friends all rely on that fallback) is the viewer-request function.
 *
 * That means the function needs a list of the site's routes — which is a
 * second copy of routes.tsx, and this codebase has been burned repeatedly by
 * exactly that (sitemap vs robots tag, sitemap vs route manifest, Helmet vs
 * static HTML — all one bug: two sources of truth kept in sync by hand). A
 * stale copy here is worse than the bug being fixed: a real page would start
 * returning 404. So the list is GENERATED, and `--check` fails the build when
 * the checked-in function has drifted.
 *
 * Usage:
 *   node scripts/generate-cloudfront-function.cjs           # rewrite the block
 *   node scripts/generate-cloudfront-function.cjs --check    # fail if stale
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROUTES_FILE = path.join(ROOT, 'src/app/routes.tsx');
const FUNCTION_FILE = path.join(ROOT, 'deploy/cloudfront-canonical-function.js');

const BEGIN = '// --- BEGIN GENERATED ROUTE TABLE (scripts/generate-cloudfront-function.cjs) ---';
const END = '// --- END GENERATED ROUTE TABLE ---';

/**
 * CloudFront Functions cap the source at 10 KB, so the table is one
 * space-separated string rather than an array literal, and a parameter
 * segment is a bare ':' — the function never reads a parameter's NAME, only
 * that the segment is a wildcard.
 */
/**
 * The props text of every `<Route ...>` tag, found by scanning to the tag's
 * closing `>` at BRACE DEPTH ZERO.
 *
 * Two regexes were tried and both were wrong, which is why this is a scanner:
 *
 *   /<Route\s+path=/       required `path` to be the first prop on the same
 *                          line. A Codex review named the refactor that breaks
 *                          it — `<Route element={...} path="/x" />`.
 *   /<Route\b([^>]*?)>/    stops at the FIRST `>`, which for that same example
 *                          is the one inside `element={<PuzzlesRoute />}`, so
 *                          it captured `element={<PuzzlesRoute` and lost the
 *                          path. Verified by running it.
 *
 * Depth counting handles nested JSX, and prop order and line wrapping stop
 * mattering. A route this cannot read is a route that would 404 in production,
 * so `collectRoutePaths` refuses to generate rather than dropping it.
 */
function routeTagProps(src) {
  const out = [];
  const re = /<Route\b/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const from = m.index + m[0].length;
    let depth = 0;
    let i = from;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth === 0) break;
    }
    out.push(src.slice(from, i));
  }
  return out;
}

function collectRoutePaths() {
  const src = fs.readFileSync(ROUTES_FILE, 'utf-8');

  const paths = [];
  const pathless = [];

  /*
   * LAYOUT ROUTES ARE THE ONLY LEGITIMATE PATHLESS ROUTES (#55, #72).
   *
   * `<Route element={<SiteShell />}>` wraps every page so the site chrome is
   * mounted once, and inside it the page-kind layouts (`<DocumentLayout />`,
   * `<FocusedLayout />`, `<WorkspaceKindLayout />` and the transitional
   * `<AppLayout />`, layout redesign A6) declare each page's kind. None of them
   * matches a URL of its own, so they contribute nothing to the CloudFront table
   * and are not unreadable paths.
   *
   * Matched on the components BY NAME rather than on "has no path", because the
   * exemption must stay as narrow as its reason: any OTHER pathless route is
   * still a route that would 404, and still throws below. Adding a layout route
   * is therefore a deliberate edit here, which is the point - #72 hit this guard
   * on its first build, exactly as #55's own comment anticipated.
   */
  const LAYOUT_ROUTE =
    /element\s*=\s*\{\s*<(?:SiteShell|DocumentLayout|FocusedLayout|WorkspaceKindLayout|AppLayout)\s*\/>\s*\}/;

  for (const props of routeTagProps(src)) {
    const m = props.match(/\bpath\s*=\s*["']([^"']+)["']/);
    if (m) paths.push(m[1]);
    else if (LAYOUT_ROUTE.test(props)) continue;
    else pathless.push(props.replace(/\s+/g, ' ').trim().slice(0, 60));
  }

  /*
   * EVERY <Route> MUST BE ACCOUNTED FOR.
   *
   * This is the invariant that makes a parser miss loud instead of silent. A
   * route whose path this cannot read is a route that will 404, so refusing to
   * generate is the only safe response — an index route (legitimately
   * pathless) would need an explicit exemption here, which is the point.
   */
  if (pathless.length) {
    throw new Error(
      `${pathless.length} <Route> tag(s) in routes.tsx have no readable path=. ` +
        'Every route must be in the CloudFront table or it will 404 in ' +
        `production:\n  ${pathless.join('\n  ')}`,
    );
  }

  if (paths.length === 0) {
    throw new Error('Parsed 0 routes from routes.tsx — the parser is stale.');
  }

  return paths.filter((p) => {
    // The catch-all IS the thing being replaced; matching it would make every
    // URL known and the function a no-op.
    if (p === '*') return false;
    // The dev galleries are tree-shaken out of a production build
    // (import.meta.env.DEV), so in production they are genuinely not routes.
    if (p.startsWith('/dev/')) return false;
    return true;
  });
}

let patternCount = 0;

function buildTable(routePaths) {
  const encoded = routePaths
    .map((p) => p.replace(/^\//, '').replace(/:[A-Za-z0-9_]+/g, ':'))
    // '/' encodes to the empty string, which split(' ') cannot carry. The
    // function special-cases the root before consulting the table.
    .filter((p) => p !== '')
    .sort();

  const unique = [...new Set(encoded)];
  patternCount = unique.length;
  return `${BEGIN}\nvar ROUTES = '${unique.join(' ')}'.split(' ');\n${END}`;
}

function main() {
  const check = process.argv.includes('--check');
  const table = buildTable(collectRoutePaths());
  const current = fs.readFileSync(FUNCTION_FILE, 'utf-8');

  const beginAt = current.indexOf(BEGIN);
  const endAt = current.indexOf(END);
  if (beginAt === -1 || endAt === -1) {
    console.error(
      `${path.relative(ROOT, FUNCTION_FILE)} has no generated route-table block.\n` +
        `Expected the markers:\n${BEGIN}\n${END}`,
    );
    process.exit(1);
  }

  const next = current.slice(0, beginAt) + table + current.slice(endAt + END.length);

  /*
   * The 10 KB ceiling is checked on EVERY run, before anything else.
   *
   * It used to be checked only on the write path, so a version that had grown
   * past the limit through an ordinary comment edit sailed through `--check`
   * and through a clean build, and the first thing to notice was
   * `aws cloudfront update-function` answering FunctionSizeLimitExceeded. The
   * build is the right place to learn that, not the deploy.
   */
  const size = Buffer.byteLength(next, 'utf-8');
  if (size > 10240) {
    console.error(
      `${path.relative(ROOT, FUNCTION_FILE)} is ${size} bytes — over the 10240-byte ` +
        'CloudFront Functions limit, so it cannot be published.\n' +
        'Comments count toward it. Shorten prose, not the route table.',
    );
    process.exit(1);
  }

  const staging = stagingFunctions(next);
  const staleStaging = staging.filter((f) => !fs.existsSync(f.file) || fs.readFileSync(f.file, 'utf-8') !== f.text);

  if (next === current && staleStaging.length === 0) {
    if (!check) console.log(`CloudFront route table already up to date (${size} bytes).`);
    return;
  }

  if (check) {
    if (next !== current) {
      console.error(
        'CloudFront function route table is STALE — it no longer matches ' +
          'src/app/routes.tsx.\n' +
          'A route missing from that table returns a hard 404 in production.',
      );
    }
    for (const f of staleStaging) {
      console.error(`${path.relative(ROOT, f.file)} is STALE — it no longer matches production's function.`);
    }
    console.error('Run: node scripts/generate-cloudfront-function.cjs');
    process.exit(1);
  }

  if (next !== current) {
    fs.writeFileSync(FUNCTION_FILE, next);
    console.log(
      `CloudFront route table regenerated: ${patternCount} patterns ` +
        '(plus the root, special-cased in the function), ' +
        `function is ${size} bytes (limit 10240).`,
    );
  }
  for (const f of staleStaging) {
    fs.writeFileSync(f.file, f.text);
    console.log(`${path.relative(ROOT, f.file)} regenerated (${Buffer.byteLength(f.text, 'utf-8')} bytes).`);
  }
}

/*
 * STAGING'S TWO FUNCTIONS ARE DERIVED FROM PRODUCTION'S, never hand-copied
 * (staging plan C2). A hand copy is the two-sources-of-truth defect this file
 * exists to prevent: a route added to production's table and not to staging's
 * would hard-404 there, and a staging canonical function that still named
 * www.chessplaybook.com would 301 every staging page to production.
 *
 * Each substitution must happen at least once and no production host may
 * survive it, so a change to production's source that moves a host fails the
 * build here instead of shipping a staging function that points at production.
 * Block comments are stripped: production's copy is near the 10 KB limit and
 * the longer staging host would push it over.
 */
const STAGING_DIR = path.join(ROOT, 'deploy/staging');
const CSP_FILE = path.join(ROOT, 'deploy/cloudfront-csp-function.js');
const STAGING_HEADER = '// GENERATED from production by scripts/generate-cloudfront-function.cjs. Do not edit.\n';

function substitute(text, pairs, label) {
  let out = text;
  for (const [from, to] of pairs) {
    if (!out.includes(from)) throw new Error(`${label}: production's source no longer contains "${from}".`);
    out = out.split(from).join(to);
  }
  return out;
}

function stagingFunctions(canonical) {
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';

  const stagingCanonical = STAGING_HEADER + substitute(
    stripComments(canonical),
    [['www.chessplaybook.com', 'staging.chessplaybook.com']],
    'staging canonical function',
  );
  const stagingCsp = STAGING_HEADER + substitute(
    stripComments(fs.readFileSync(CSP_FILE, 'utf-8')),
    [
      ['https://api.chessplaybook.com', 'https://api.staging.chessplaybook.com'],
      ['wss://api.chessplaybook.com', 'wss://api.staging.chessplaybook.com'],
      ['https://chessplaybook-auth.auth.', 'https://chessplaybook-auth-staging.auth.'],
    ],
    'staging CSP function',
  );

  const PRODUCTION_HOSTS = ['www.chessplaybook.com', '//api.chessplaybook.com', 'chessplaybook-auth.auth.'];
  const files = [
    { file: path.join(STAGING_DIR, 'cloudfront-canonical-function.js'), text: stagingCanonical },
    { file: path.join(STAGING_DIR, 'cloudfront-csp-function.js'), text: stagingCsp },
  ];
  for (const f of files) {
    const left = PRODUCTION_HOSTS.filter((h) => f.text.includes(h));
    if (left.length) throw new Error(`${path.relative(ROOT, f.file)} still names production: ${left.join(', ')}`);
    const bytes = Buffer.byteLength(f.text, 'utf-8');
    if (bytes > 10240) throw new Error(`${path.relative(ROOT, f.file)} is ${bytes} bytes, over the 10240-byte limit.`);
  }
  return files;
}

/*
 * `verify-cloudfront-404.mjs` imports the parser rather than keeping its own.
 *
 * That is deliberate, and it is NOT the shared-oracle problem Codex raised:
 * two hand-written parsers of the same file drift, and the second one being
 * subtly different is how a guard passes while the real thing is wrong. The
 * verifier's independence comes instead from cross-checking the shipped route
 * table against the SITEMAP and the prerender MANIFEST — both produced by
 * different generators from different sources — plus the pathless-Route throw
 * above, which turns an unreadable route into a build failure rather than a
 * silent omission.
 */
module.exports = { collectRoutePaths, routeTagProps };

if (require.main === module) main();
