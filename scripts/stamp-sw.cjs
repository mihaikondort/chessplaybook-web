#!/usr/bin/env node
/**
 * Stamps dist/sw.js's CACHE_VERSION with the built app's main-bundle hash.
 *
 * Why this has to exist: CACHE_VERSION used to be a hand-maintained string that
 * nobody bumped (it sat at 'v2' from 2026-07-27 through several deploys). The
 * service worker is cache-first for hashed bundles and stores HTML on every
 * successful fetch, and `activate` only purges caches whose name differs from
 * the current one. With a constant name, nothing was ever purged.
 *
 * That combination pins a returning visitor to an old app version: deploy.sh
 * syncs /assets with --delete, so once a deploy lands the previous
 * index-<hash>.js is GONE from S3 and the only surviving copy is the one in the
 * visitor's service-worker cache. If their browser then serves stale HTML (its
 * own 5-minute HTTP cache, a restored tab, or the SW's offline fallback), that
 * HTML asks for the deleted bundle, cache-first answers from the old cache, and
 * the old site renders perfectly — indefinitely, with no error to notice.
 *
 * Using the entry bundle's content hash rather than a timestamp means a rebuild
 * that changes nothing keeps the same cache (no pointless purge), while any real
 * code change rotates it.
 *
 * Runs after `vite build`, as part of `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const SW = path.join(DIST, 'sw.js');
const PLACEHOLDER = '__BUILD_ID__';

function main() {
  if (!fs.existsSync(SW)) {
    console.error('stamp-sw: dist/sw.js not found — did vite build run?');
    process.exit(1);
  }

  const sw = fs.readFileSync(SW, 'utf8');
  if (!sw.includes(PLACEHOLDER)) {
    console.error(
      `stamp-sw: ${PLACEHOLDER} not found in dist/sw.js. public/sw.js must declare ` +
        "CACHE_VERSION as 'v<n>-__BUILD_ID__', or returning visitors keep a stale cache forever.",
    );
    process.exit(1);
  }

  // Derive the build id from the entry bundle's content hash. Read the entry
  // from dist/index.html rather than globbing dist/assets — "index-<hash>.js"
  // is not unique. Linux CI emits a second chunk that also matches (a module
  // named index), while the Windows build emits one, so globbing passed locally
  // and failed in CI. The script tag is the only authoritative statement of
  // which chunk is the entry.
  //
  // This runs before inline-critical-css.cjs and preload-route-chunks.cjs, so
  // index.html is still raw Vite output here.
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const entries = [...html.matchAll(/<script[^>]+src="\/assets\/(index-[A-Za-z0-9_-]{8,}\.js)"/g)].map(
    (m) => m[1],
  );
  const unique = [...new Set(entries)];

  if (unique.length !== 1) {
    console.error(
      `stamp-sw: expected exactly one entry script in dist/index.html, found ${unique.length}` +
        (unique.length ? `: ${unique.join(', ')}` : ' (no /assets/index-<hash>.js module script)'),
    );
    process.exit(1);
  }

  if (!fs.existsSync(path.join(DIST, 'assets', unique[0]))) {
    console.error(`stamp-sw: dist/index.html references ${unique[0]}, which does not exist in dist/assets.`);
    process.exit(1);
  }

  const buildId = unique[0].replace(/^index-/, '').replace(/\.js$/, '');
  fs.writeFileSync(SW, sw.split(PLACEHOLDER).join(buildId), 'utf8');

  const stamped = /const CACHE_VERSION = '([^']+)'/.exec(fs.readFileSync(SW, 'utf8'));
  console.log(`Service worker cache version stamped: ${stamped ? stamped[1] : '(unreadable)'}`);
}

main();
