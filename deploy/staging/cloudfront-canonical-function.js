// GENERATED from production by scripts/generate-cloudfront-function.cjs. Do not edit.
// --- BEGIN GENERATED ROUTE TABLE (scripts/generate-cloudfront-function.cjs) ---
var ROUTES = 'analysis auth/callback candidates-2026 candidates-2026/: champion-challenge champion-challenge/: champions champions/:/best-games champions/:/best-games/: champions/:/games champions/:/games/: champions/list contact credits explain forgot-password game-history leaderboard live-events live-game/:/: login news news/candidates-2026 news/candidates-2026-conclusion news/candidates-2026-round-1 news/candidates-2026-round-3 news/candidates-2026-women news/sindarov-gukesh-head-to-head news/vaishali-ju-wenjun-title-match news/world-championship-2026-geneva play play-online player/: privacy profile puzzles puzzles/plan puzzles/progress reset-password signup terms verify-email world-championship-cycle world-cup-2025 world-cup-2025/:'.split(' ');
// --- END GENERATED ROUTE TABLE ---

var NOT_FOUND_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="robots" content="noindex,follow">' +
  '<meta name="theme-color" content="#0d1421">' +
  '<title>Page not found &mdash; Chess Playbook</title><style>' +
  'html,body{margin:0;height:100%}' +
  'body{background:hsl(218 42% 9%);color:hsl(42 78% 95%);' +
  'font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
  'display:flex;align-items:center;justify-content:center;padding:24px}' +
  'main{max-width:32rem;text-align:center}' +
  '.n{font-size:3rem;font-weight:700;color:hsl(42 72% 60%);margin:0}' +
  'h1{font-size:1.5rem;margin:.5rem 0 1rem}' +
  'p.m{color:hsl(42 20% 70%);margin:0 0 1.75rem}' +
  'a{display:inline-block;padding:.6rem 1.25rem;border-radius:.375rem;' +
  'background:hsl(42 72% 60%);color:hsl(218 42% 9%);font-weight:600;' +
  'text-decoration:none}' +
  '</style></head><body><main>' +
  '<p class="n">404</p><h1>This page does not exist</h1>' +
  '<p class="m">The address may be mistyped, or the page may have moved.</p>' +
  '<a href="https://staging.chessplaybook.com/">Go to the home page</a>' +
  '</main></body></html>';

function canonicalRoute(uri) {
  if (uri === '/') return '/';

  var parts = uri.split('/'); // leading '' because uri starts with '/'
  var depth = parts.length - 1;

  for (var i = 0; i < ROUTES.length; i++) {
    var pattern = ROUTES[i].split('/');
    if (pattern.length !== depth) continue;

    var ok = true;
    var out = '';
    for (var j = 0; j < pattern.length; j++) {
      var segment = parts[j + 1];
      if (segment === '') { ok = false; break; }
      if (pattern[j] === ':') { out += '/' + segment; continue; }
      if (pattern[j] !== segment.toLowerCase()) { ok = false; break; }
      out += '/' + pattern[j];
    }
    if (ok) return out;
  }
  return null;
}

var DOC_EXT = '|html|htm|php|asp|aspx|jsp|cgi|shtml|';

function looksLikeFile(uri) {
  var last = uri.slice(uri.lastIndexOf('/') + 1);
  var dot = last.lastIndexOf('.');
  if (dot < 1) return false;
  return DOC_EXT.indexOf('|' + last.slice(dot + 1).toLowerCase() + '|') === -1;
}

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value : 'staging.chessplaybook.com';
  var proto = request.headers['cloudfront-forwarded-proto']
    ? request.headers['cloudfront-forwarded-proto'].value
    : 'https';

  var canonicalUri = uri;

  // Strip /index.html anywhere, not just at the root. The original only
  // matched the exact string '/index.html', so /explain/index.html,
  // /champions/index.html and /news/index.html each served the SPA shell at
  // 200 with the homepage's title and canonical — crawlable duplicates of the
  // homepage sitting under every route.
  if (canonicalUri === '/index.html') {
    canonicalUri = '/';
  } else if (canonicalUri.length > 11 && canonicalUri.slice(-11) === '/index.html') {
    canonicalUri = canonicalUri.slice(0, -11);
  }

  // Lowercase champion paths only — asset paths elsewhere are case-sensitive.
  if (canonicalUri.substring(0, 11).toLowerCase() === '/champions/') {
    canonicalUri = canonicalUri.toLowerCase();
  }

  if (canonicalUri.length > 1 && canonicalUri.charAt(canonicalUri.length - 1) === '/') {
    canonicalUri = canonicalUri.slice(0, -1);
  }

  
  if (!looksLikeFile(canonicalUri)) {
    var routed = canonicalRoute(canonicalUri);
    if (routed === null) {
      return {
        statusCode: 404,
        statusDescription: 'Not Found',
        headers: {
          'content-type': { value: 'text/html; charset=utf-8' },
          'cache-control': { value: 'max-age=60' },
          'x-robots-tag': { value: 'noindex' },
          // Its own CSP: CloudFront skips the viewer-RESPONSE function when a
          // request function generates the response, so ChessPlaybook-CSP never
          // sees this page (measured on production — it shipped with HSTS and
          // the frame/type headers, and no CSP). Deliberately stricter than the
          // site policy: this page has no scripts, forms or external resources.
          'content-security-policy': {
            value:
              "default-src 'none'; style-src 'unsafe-inline'; " +
              "base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
          }
        },
        body: { encoding: 'text', data: NOT_FOUND_HTML }
      };
    }
    canonicalUri = routed;
  }

  if (proto === 'https' && host === 'staging.chessplaybook.com' && canonicalUri === uri) {
    return request;
  }

  var qs = '';
  var keys = Object.keys(request.querystring);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var entry = request.querystring[k];
    if (entry.multiValue) {
      for (var j = 0; j < entry.multiValue.length; j++) {
        qs += (qs ? '&' : '?') + k + '=' + entry.multiValue[j].value;
      }
    } else {
      qs += (qs ? '&' : '?') + k + (entry.value ? '=' + entry.value : '');
    }
  }

  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: 'https://staging.chessplaybook.com' + canonicalUri + qs },
      'cache-control': { value: 'max-age=3600' }
    }
  };
}
