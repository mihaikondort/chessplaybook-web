/**
 * Post-build script: modulepreload a route's chunk on the route it serves.
 *
 * Lazy routes cost a serialised round trip that eagerly-bundled pages do not
 * pay. The route chunk cannot start downloading until index.js has run and
 * React has begun rendering, so on a throttled connection it lands ~300ms after
 * index.js and everything the page renders waits behind it. Measured on
 * /champion-challenge: index.js at ~1750ms, route chunk at ~2090ms, first
 * content at ~2500ms — against ~1865ms for /champions, which is bundled into
 * index.js and so starts its own data fetch immediately.
 *
 * A `modulepreload` emitted during HTML parse removes that dependency without
 * moving the route into the main bundle, which would make every other page pay
 * for it. The chunk name is content-hashed, so it can only be resolved after
 * the build — hence a post-build step rather than a literal in index.html.
 *
 * Scoped by pathname, so no page preloads a chunk it will not use.
 */
const fs = require('fs');
const path = require('path');

/** route pathname prefix -> the chunk basename Vite emits for it */
const ROUTES = [
  // The picker only: since #68 a session is `/champion-challenge/<champion>`,
  // its own route with its own chunk, and must not fetch the picker's.
  { pattern: '^/champion-challenge/?$', chunk: 'ChampionChallenge' },
  // News articles pay the same serialised round trip and nobody had noticed:
  // the chunk cannot start downloading until index.js has run. These are
  // text-and-photo pages where that delay is the whole of the wait, so the
  // preload is worth more here than almost anywhere else. Scoped per pathname,
  // so no page fetches a chunk it will not render.
  { pattern: '^/news/world-championship-2026-geneva$', chunk: 'WorldChampionship2026Announced' },
  { pattern: '^/news/sindarov-gukesh-head-to-head$', chunk: 'SindarovGukeshHeadToHead' },
  { pattern: '^/news/vaishali-ju-wenjun-title-match$', chunk: 'VaishaliJuWenjunTitleMatch' },
  { pattern: '^/news/candidates-2026-conclusion$', chunk: 'CandidatesConclusion2026' },
  // Money pages (audit P2 #13): /explain is the paid landing page, /analysis
  // the biggest free tool. Both are lazy routes and paid the serialised
  // round trip on every ad click.
  { pattern: '^/explain$', chunk: 'Explain' },
  { pattern: '^/analysis(/|$)', chunk: 'Analysis' },
];

function run() {
  const dist = path.resolve(__dirname, '../dist');
  const htmlPath = path.join(dist, 'index.html');
  const assets = fs.readdirSync(path.join(dist, 'assets'));

  const entries = [];
  for (const { pattern, chunk } of ROUTES) {
    // `Name-<hash>.js` — anchored so `ChampionChallenge` cannot match
    // `ChampionChallengeSomethingElse`.
    const match = assets.find((f) => new RegExp(`^${chunk}-[A-Za-z0-9_-]+\\.js$`).test(f));
    if (!match) {
      console.warn(`  ! no built chunk for ${chunk} — skipping preload`);
      continue;
    }
    entries.push({ pattern, href: `/assets/${match}` });
  }

  if (entries.length === 0) {
    console.log('Route chunk preload: nothing to inject.');
    return;
  }

  const script =
    `<script>(function(){var r=${JSON.stringify(entries)};` +
    `for(var i=0;i<r.length;i++){if(new RegExp(r[i].pattern).test(location.pathname)){` +
    `document.head.insertAdjacentHTML('beforeend','<link rel="modulepreload" href="'+r[i].href+'">')}}})()</script>`;

  const html = fs.readFileSync(htmlPath, 'utf-8');
  if (html.includes('rel="modulepreload" href=\'')) {
    console.log('Route chunk preload: already present.');
    return;
  }
  fs.writeFileSync(htmlPath, html.replace('</head>', `    ${script}\n  </head>`));
  console.log(`Route chunk preload injected for ${entries.length} route(s):`);
  for (const e of entries) console.log(`  ${e.pattern} -> ${e.href}`);
}

run();
