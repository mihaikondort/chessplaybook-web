#!/usr/bin/env node
/**
 * Guard for the unknown-URL 404 added to the viewer-request function on
 * 2026-08-08.
 *
 * The failure this exists to catch is NOT the one being fixed. It is the
 * opposite: the function now decides, before CloudFront ever reaches S3,
 * whether a path is a page at all — so a route missing from its generated
 * table returns a hard 404 to real users. That is strictly worse than the
 * soft-404 it replaces, and it would be invisible on a deploy because nothing
 * else in the build touches this file.
 *
 * So every case here is derived rather than typed: every route in
 * src/app/routes.tsx (with parameters filled), and every prerendered key in
 * the build manifest. A route added tomorrow is covered tomorrow.
 *
 * Usage:
 *   node scripts/verify-cloudfront-404.mjs
 *   node scripts/verify-cloudfront-404.mjs --counterfactual
 *
 * `--counterfactual` empties the route table and asserts the suite then FAILS.
 * A guard that passes in both directions proves nothing, which this project
 * has now written down three times.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTION_FILE = path.join(ROOT, 'deploy/cloudfront-canonical-function.js');
const MANIFEST = path.join(ROOT, 'dist/_routes/manifest.tsv');

const counterfactual = process.argv.includes('--counterfactual');

let source = fs.readFileSync(FUNCTION_FILE, 'utf-8');
if (counterfactual) {
  source = source.replace(/var ROUTES = '[^']*'/, "var ROUTES = ''");
}
const handler = new Function(`${source}\nreturn handler;`)();

/** Build the event shape CloudFront passes a viewer-request function. */
function call(uri, { host = 'www.chessplaybook.com', proto = 'https', querystring = {} } = {}) {
  const out = handler({
    request: {
      uri,
      querystring,
      headers: {
        host: { value: host },
        'cloudfront-forwarded-proto': { value: proto },
      },
    },
  });
  if (out && typeof out.statusCode === 'number') {
    return { kind: out.statusCode === 404 ? '404' : String(out.statusCode), response: out };
  }
  return { kind: 'pass', request: out };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

/* ---------------------------------------------------------------- routes */

/*
 * The generator's parser, imported rather than reimplemented.
 *
 * Codex raised the shared-oracle risk — a guard that parses with the same code
 * as the thing it guards cannot catch a parse bug. The answer is not a second
 * hand-written parser, which would drift and give false confidence; it is to
 * check the shipped table against sources that have nothing to do with
 * routes.tsx. Those are the SITEMAP and prerender MANIFEST cross-checks below,
 * plus the generator's own refusal to emit when a `<Route>` has no readable
 * path.
 */
const { collectRoutePaths } = createRequire(import.meta.url)(
  './generate-cloudfront-function.cjs',
);
const routePaths = collectRoutePaths();

/**
 * Parameter values chosen to be realistic rather than convenient: a champion
 * slug, a game index, a username. A value containing a dot would be treated as
 * a file by design, so none is used here.
 */
const SAMPLE = {
  ':name': 'gukesh',
  ':gameIndex': '12',
  ':slug': 'round-5',
  ':roundId': '9',
  ':gameId': '3',
  ':username': 'someplayer',
};

for (const routePath of routePaths) {
  const concrete = routePath.replace(/:[A-Za-z0-9_]+/g, (p) => SAMPLE[p] ?? 'sample');
  const { kind } = call(concrete);
  check(`route ${routePath} -> ${concrete}`, kind === 'pass', `got ${kind}, expected pass-through`);
}

/* ------------------------------------------------------------- manifest */

if (fs.existsSync(MANIFEST)) {
  const keys = fs
    .readFileSync(MANIFEST, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => '/' + line.split('\t')[1]);
  for (const key of keys) {
    const { kind } = call(key);
    check(`prerendered ${key}`, kind === 'pass', `got ${kind}, expected pass-through`);
  }
} else {
  check('manifest present', false, `${path.relative(ROOT, MANIFEST)} missing — run npm run build`);
}

/* ---------------------------------------------------------------- assets */

const ASSETS = [
  '/assets/index-CJ7abc12.js',
  '/assets/index-CJ7abc12.css',
  '/assets/pgn/Kasparov.pgn',
  '/assets/players/players_list.json',
  '/stockfish/stockfish-17.1-lite-single.wasm',
  '/fonts/fonts.css',
  '/robots.txt',
  '/sitemap.xml',
  '/sw.js',
  '/favicon.ico',
  '/chess-queen-icon.png',
  '/placeholder.svg',
];
for (const asset of ASSETS) {
  const { kind } = call(asset);
  check(`asset ${asset}`, kind === 'pass', `got ${kind}, expected pass-through`);
}

/* ------------------------------------------ sitemap, an independent oracle */

/*
 * Every sitemapped URL must be a route this function recognises.
 *
 * This is the only check here that does NOT derive from routes.tsx, so it is
 * the only one that survives the parser above being wrong. The sitemap comes
 * from generate-sitemap.cjs via route-meta.json — a different generator, a
 * different source — and a URL Google is being asked to crawl that the edge
 * answers with 404 is the worst outcome this whole change could produce.
 */
const SITEMAP = path.join(ROOT, 'dist/sitemap.xml');
if (fs.existsSync(SITEMAP)) {
  /*
    The sitemap's origin is whatever `SITE_URL` the build used (#34), so the
    prefix to strip cannot be hardcoded. It was, and a staging build fed this
    checker full URLs as if they were paths: 63 of them 404'd and it reported
    159/222 against a build with nothing wrong.

    The FUNCTION is still exercised against the production host below - it is
    the production CloudFront function, and testing it against a staging host
    would prove nothing about what is deployed.
  */
  const origin = (process.env.SITE_URL || 'https://www.chessplaybook.com').replace(/\/$/, '');
  const urls = [...fs.readFileSync(SITEMAP, 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(origin, ''))
    .map((p) => (p === '' ? '/' : p));
  for (const url of urls) {
    const { kind } = call(url);
    check(`sitemapped ${url}`, kind === 'pass', `got ${kind}, expected pass-through`);
  }
} else {
  check('sitemap present', false, 'dist/sitemap.xml missing — run npm run build');
}

/* ------------------------------------------------------------- mixed case */

/*
 * REACT ROUTER MATCHES CASE-INSENSITIVELY BY DEFAULT, so /Puzzles rendered the
 * puzzles page before this function existed. The first version compared
 * literal segments exactly and turned every mixed-case real URL into a hard
 * 404 — found by a Codex review, confirmed on production (/Puzzles, /Explain,
 * /News and /Play-Online were all 404). They must redirect, not 404, and not
 * merely pass through: serving them at 200 is the homepage-meta soft duplicate
 * the /champions rule was added to kill in 2026-07-27.
 */
const MIXED_CASE = [
  ['/Puzzles', '/puzzles'],
  ['/Explain', '/explain'],
  ['/News', '/news'],
  ['/Play-Online', '/play-online'],
  ['/PUZZLES/PLAN', '/puzzles/plan'],
  ['/Champions/List', '/champions/list'],
  ['/News/Candidates-2026', '/news/candidates-2026'],
];
for (const [from, to] of MIXED_CASE) {
  const { response } = call(from);
  check(
    `mixed case ${from} -> 301 ${to}`,
    response?.statusCode === 301 &&
      response.headers.location.value === `https://www.chessplaybook.com${to}`,
    `got ${response?.statusCode} ${response?.headers?.location?.value ?? ''}`,
  );
}

/*
 * A PARAMETER IS DATA, NOT PATH VOCABULARY. Lowercasing a username would break
 * the lookup, so only literal segments are canonicalised.
 */
{
  const { kind, request } = call('/player/SomeUser');
  check('parameter case is preserved', kind === 'pass', `got ${kind}`);
  const mixed = call('/Player/SomeUser');
  check(
    'literal lowercased, parameter untouched',
    mixed.response?.headers?.location?.value ===
      'https://www.chessplaybook.com/player/SomeUser',
    mixed.response?.headers?.location?.value ?? `got ${mixed.kind}`,
  );
}

/* --------------------------------------------------------------- unknown */

const UNKNOWN = [
  '/this-page-does-not-exist-abc123',
  '/foo/bar',
  '/champions/gukesh/nope',
  '/champions/gukesh/games/12/extra',
  '/news/no-such-article',
  '/puzzles/nope',
  '/wp-admin',
  '/.env',
  '/dev/explainer-card',
  '/dev/session-states',
  // Document extensions are not assets. Exempting anything with a dot handed
  // these the SPA shell at 200 — the defect this function exists to remove,
  // on the URLs a migrating site is most likely to be linked at.
  '/old-page.html',
  '/news/nope.html',
  '/index.php',
  '/admin.aspx',
];
for (const url of UNKNOWN) {
  const { kind } = call(url);
  check(`unknown ${url}`, kind === '404', `got ${kind}, expected 404`);
}

/* -------------------------------------------------- the 404 response body */

{
  const { response } = call('/definitely-not-a-page');
  const html = response?.body?.data ?? '';
  check('404 status', response?.statusCode === 404, `got ${response?.statusCode}`);
  check('404 is html', response?.headers?.['content-type']?.value?.includes('text/html'), '');
  check('404 carries noindex meta', /name="robots"[^>]*noindex/i.test(html), '');
  check('404 carries x-robots-tag', /noindex/i.test(response?.headers?.['x-robots-tag']?.value ?? ''), '');
  // The viewer-RESPONSE CSP function never runs on a generated response, so
  // this page has to carry its own or it ships with none at all.
  const csp = response?.headers?.['content-security-policy']?.value ?? '';
  check('404 carries its own CSP', csp.includes("default-src 'none'"), csp || '(absent)');
  check('404 CSP forbids scripts', !/script-src/.test(csp), csp);
  check('404 has its own title', /<title>Page not found/i.test(html), '');
  check(
    '404 does NOT claim a canonical',
    !/rel=["']canonical["']/i.test(html),
    'a canonical on a 404 is the defect being removed',
  );
  check(
    '404 does not carry the homepage title',
    !/Play, Solve and Understand Chess/i.test(html),
    '',
  );
}

/* ------------------------------------------------- canonicalisation still works */

{
  const indexHtml = call('/index.html');
  check(
    '/index.html still 301s to /',
    indexHtml.response?.statusCode === 301 &&
      indexHtml.response.headers.location.value === 'https://www.chessplaybook.com/',
    JSON.stringify(indexHtml.response?.headers?.location),
  );

  const upper = call('/champions/Gukesh/games');
  check(
    'capitalised champion path still 301s, not 404s',
    upper.response?.statusCode === 301 &&
      upper.response.headers.location.value ===
        'https://www.chessplaybook.com/champions/gukesh/games',
    JSON.stringify(upper.response?.headers?.location),
  );

  const apex = call('/explain', { host: 'chessplaybook.com' });
  check(
    'apex still 301s to www',
    apex.response?.statusCode === 301 &&
      apex.response.headers.location.value === 'https://www.chessplaybook.com/explain',
    JSON.stringify(apex.response?.headers?.location),
  );

  const trailing = call('/explain/');
  check(
    'trailing slash still 301s',
    trailing.response?.statusCode === 301 &&
      trailing.response.headers.location.value === 'https://www.chessplaybook.com/explain',
    JSON.stringify(trailing.response?.headers?.location),
  );

  const qs = call('/puzzles', { querystring: { theme: { value: 'fork' } } , host: 'chessplaybook.com' });
  check(
    'query string survives the redirect',
    qs.response?.headers?.location?.value === 'https://www.chessplaybook.com/puzzles?theme=fork',
    JSON.stringify(qs.response?.headers?.location),
  );

  // A junk URL should cost ONE round trip, not a 301 into a 404.
  const junkTrailing = call('/no-such-page/', { host: 'chessplaybook.com', proto: 'http' });
  check(
    'junk URL 404s directly instead of redirecting first',
    junkTrailing.response?.statusCode === 404,
    `got ${junkTrailing.response?.statusCode}`,
  );
}

/* ---------------------------------------------------------------- report */

const passed = results.filter((r) => r.ok).length;
for (const r of results) {
  if (!r.ok) console.error(`  FAIL  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}
const line = `verify-cloudfront-404: ${passed}/${results.length}`;

if (counterfactual) {
  if (passed === results.length) {
    console.error(
      `${line}\nCOUNTERFACTUAL FAILED: the suite passes with an EMPTY route table, ` +
        'so it does not actually test route recognition.',
    );
    process.exit(1);
  }
  console.log(
    `${line} — counterfactual OK: emptying the route table breaks ` +
      `${results.length - passed} check(s), as it must.`,
  );
  process.exit(0);
}

console.log(line);
if (passed !== results.length) process.exit(1);
