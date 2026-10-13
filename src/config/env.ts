/**
 * Typed environment variables for the frontend.
 * All VITE_ prefixed vars are available at build time.
 * Defaults are for local development.
 */
const env = {
  // API. `VITE_API_URL` is the single source of truth: vite.config.ts defines
  // it per mode — '' in dev so requests go through the dev proxy, the full
  // origin in production. An empty string is therefore MEANINGFUL and must not
  // be replaced by the default, so this checks for undefined rather than using
  // `||` (which would fall back on '' and bypass the proxy).
  apiBaseUrl: import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : 'https://api.chessplaybook.com',
  /*
    THE WEBSOCKET FOLLOWS THE API'S RULE IN DEV (2026-10-09). It defaulted to
    production unconditionally, so a dev server pointed at a LOCAL backend still
    opened its game socket on the live server, so local probes could write
    there while every `/api` write was refused.
    vite.config.ts defines this as '' in dev, meaning "same origin": the socket
    goes to the dev server, whose `/ws` proxy follows `DEV_API_TARGET` and is
    absent when that target is production (writes refused, as for `/api`).
    An explicit value still wins; production builds get the live server.
  */
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL !== undefined && import.meta.env.VITE_WS_BASE_URL !== ''
    ? import.meta.env.VITE_WS_BASE_URL
    : import.meta.env.VITE_WS_BASE_URL === '' && typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
      : 'wss://api.chessplaybook.com',

  /*
    THE PUBLIC SITE THIS BUILD IS FOR, and the Cognito identity it signs in
    against (#34).

    These lived in `config/amplify.ts` and `features/auth/utils/oauth.ts`, each
    with its own copy of the client id and hosted-UI domain - two files that had
    to be edited together to change one value, which is the definition of drift.
    They are stated once here and imported by both.

    `siteUrl` REPLACES `import.meta.env.DEV ? localhost : production`, and that
    expression was a hard blocker rather than a nicety: **`DEV` is false in ANY
    production-mode build**, so a staging build emitted a PRODUCTION OAuth
    redirect URI and the sign-in would have bounced users to the live site.

    Every default is today's production value, so a build with none of these set
    behaves exactly as before. None of them is a secret: all three ship in the
    client bundle by design and are readable with DevTools - the same reasoning
    already recorded for `gaId` below.
  */
  siteUrl: import.meta.env.VITE_SITE_URL
    || (import.meta.env.DEV ? 'http://localhost:8080' : 'https://www.chessplaybook.com'),
  cognitoUserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_SOVV0R70B',
  cognitoClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '1fph494v8p3s9gbkvrkquui6ol',
  /* Stored without the scheme: Amplify wants a bare host, and a configured value
     that includes `https://` is a mistake worth absorbing rather than rejecting. */
  cognitoDomain: (import.meta.env.VITE_COGNITO_DOMAIN
    || 'chessplaybook-auth.auth.us-east-1.amazoncognito.com').replace('https://', ''),

  /*
    Analytics.

    THE FALLBACK IS LOAD-BEARING, and its absence cost a day of analytics
    (2026-08-09). `VITE_GA_MEASUREMENT_ID` lives only in `.env.local` and
    `.env.production`, both gitignored, so it exists on one machine. The GitHub
    Actions deploy passes AWS credentials and nothing else — so every CI-built
    bundle compiled this to `''`, and `logGA4Event` opens with
    `if (!MEASUREMENT_ID) return`. Every event was discarded in silence.

    Nothing else broke, which is what made it invisible: every other value here
    already has a real default (see `apiBaseUrl` above and the user pool id in
    `config/amplify.ts`), so the site and the product worked while analytics
    recorded almost nothing.

    A measurement id is NOT a secret: it ships in the client bundle by design and
    is readable by anyone with DevTools. Defaulting it here is the same decision
    `amplify.ts` already made for the Cognito pool id, and it removes the whole
    class of "built somewhere without the env file".
  */
  /* Overridable since #34 so a staging build cannot pollute the production
     property, but the fallback stays for the reason above.

     `off` TURNS ANALYTICS OFF (2026-10-13). An empty value cannot, because of
     the fallback: `.env.staging.example` used to say "leave it empty" and that
     would have reported staging to the production property. `off` is explicit,
     so it cannot happen by forgetting; `check-analytics-id` then asserts the
     production id is NOT in the bundle. */
  gaId: import.meta.env.VITE_GA_MEASUREMENT_ID === 'off'
    ? ''
    : import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-JXRW7LXQQY',

  // Feature flags
  enableOnlinePlay: import.meta.env.VITE_ENABLE_ONLINE_PLAY === 'true',
  enablePuzzles: import.meta.env.VITE_ENABLE_PUZZLES === 'true',

  // Build info
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export default env;
