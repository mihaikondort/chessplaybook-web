/**
 * Service Worker — caches immutable assets, and NOTHING else.
 *
 * Strategy:
 *   - Hashed bundles (/assets/name-<hash>.js|css), fonts, Stockfish: cache-first.
 *     Filenames change on every build, so stale content is impossible.
 *   - Everything else — HTML navigations, API calls, JSON, images: NOT
 *     INTERCEPTED. No `respondWith`, so the browser handles them natively.
 *
 * Why HTML is no longer intercepted. It used to be network-first with a cache
 * fallback, which bought nothing (every navigation hit the network anyway) and
 * cost a whole class of failures: when `fetch` REJECTED — a dropped, aborted or
 * speculatively-prerendered-then-cancelled request — the worker had to return
 * *something* from `respondWith`, and that something was a synthetic 503. Users
 * saw "play-online:1 Failed to load resource: 503" while the origin was serving
 * that URL perfectly, with the response body being this file's own error string
 * (reported repeatedly on 2026-07-30). A worker that turns a cancelled request
 * into a site error is worse than no worker on that path.
 *
 * The offline SPA shell goes with it. That is an acceptable loss: the app needs
 * the network for the API, the engine and every board, so an offline shell was
 * near-useless — and it was empty immediately after every deploy anyway, since
 * `activate` purges the previous version's cache.
 *
 * Cache is versioned by CACHE_VERSION, stamped at build time by
 * scripts/stamp-sw.cjs with the entry bundle's content hash.
 */

// Stamped at build time by scripts/stamp-sw.cjs with the main bundle's content
// hash, so every deploy that changes app code gets a fresh cache and `activate`
// purges the previous one. It used to be a hand-maintained constant, which meant
// a returning visitor's cache was never purged: deploy.sh syncs /assets with
// --delete, so an old hashed bundle no longer exists on S3 and the ONLY copy is
// the one in this cache — cache-first then served a fully working *old* version
// of the site indefinitely. The placeholder is left intact in dev (the SW only
// registers in PROD), and an unstamped build still works, just without purging.
const CACHE_VERSION = 'v3-__BUILD_ID__';
const CACHE_NAME = `chessplaybook-${CACHE_VERSION}`;

// Assets that should be cache-first (immutable, hashed filenames)
function isCacheFirstAsset(url) {
  const path = new URL(url).pathname;
  // Only genuinely immutable paths are cache-first. /assets/ as a whole is NOT:
  // it mixes Vite's hashed bundles (immutable) with unhashed content — PGNs,
  // player data, news images — which cache-first served stale until someone
  // bumped CACHE_VERSION (audit P2 #16). Hashed bundles match name-<hash>.ext.
  //
  // /fonts/fonts.css is EXCLUDED: it is the one stable-named file under /fonts/
  // (the woff2 files it references carry Google's own content hashes), so
  // cache-first plus an immutable header would pin an edited stylesheet for a
  // year. Same class as the immutable-PGN bug.
  //
  // /stockfish/ stays cache-first because the engine is multi-megabyte and this
  // is a mostly-mobile audience. CONTRACT: the filename encodes the engine build
  // (`stockfish-18-lite-single.*`), so ANY change to the engine MUST ship under a
  // new filename. Re-emitting different bytes under the same name would pin
  // clients to the old engine with no recovery path.
  if (path === '/fonts/fonts.css') return false;
  return (
    /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(path) ||
    path.startsWith('/fonts/') ||
    path.startsWith('/stockfish/')
  );
}

/**
 * Is this response the SPA HTML fallback rather than the asset we asked for?
 *
 * A missing /assets/*.js does NOT 404: CloudFront's SPA custom error response
 * returns index.html at status **200**, so `response.ok` is true and the old code
 * happily cached HTML under the chunk's URL. Cache-first then served that HTML
 * forever — which is why the reported failure survived repeated reloads, not just
 * until the next deploy. Flagged by an independent review on 2026-07-30.
 */
function isHtmlFallback(response) {
  return /text\/html/i.test(response.headers.get('Content-Type') || '');
}

// Never cache API calls
function isApiCall(url) {
  return url.includes('api.chessplaybook.com') || url.includes('googleapis.com') || url.includes('google-analytics.com') || url.includes('doubleclick.net') || url.includes('googletagmanager.com') || url.includes('googleadservices.com');
}

// Install: pre-cache nothing (let assets cache on first visit)
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Never cache API/analytics calls
  if (isApiCall(request.url)) return;

  // Cache-first for hashed/versioned static assets
  if (isCacheFirstAsset(request.url)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        // Evict a poisoned entry rather than serving it. Without this, one bad
        // response is permanent for that URL.
        if (cached) {
          if (!isHtmlFallback(cached)) return cached;
          const cache = await caches.open(CACHE_NAME);
          await cache.delete(request);
        }
        const response = await fetch(request);
        // Cache only a genuine asset. An HTML fallback is returned to the page
        // unchanged — the browser's own MIME check then reports a real error,
        // which the app's ErrorBoundary handles — but it is never stored.
        if (response.ok && !isHtmlFallback(response)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
    );
    return;
  }

  // Everything else: no respondWith at all. The browser fetches it natively, so
  // a failure surfaces as the real network error instead of a 503 we invented.

});
