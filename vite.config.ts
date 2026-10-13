import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { BOARD_THEME_PREPAINT_MARKER, boardThemePrePaintScript } from "./src/design/boardThemePrePaint";
import { APP_THEME_PREPAINT_MARKER, appThemeHead } from "./src/design/theme/themePrePaint";
import { THEME_CHOICE_LIVE } from "./src/design/theme/themeCore";
import { isProductionApiTarget } from "./src/config/devProxyGuard";

/*
  THE BOARD-THEME PRE-PAINT SCRIPT IS GENERATED, NOT COPIED.

  `index.html` used to carry a hand-kept copy of the six board themes so it
  could paint the board before React loads. It now carries a marker, and this
  plugin replaces it with a script built from `src/config/boardThemes.ts`: the
  same table, the same default, the same storage key. A missing marker fails
  the build rather than shipping a page that flashes the default board.
*/
const boardThemePrePaint: Plugin = {
  name: 'board-theme-prepaint',
  transformIndexHtml(html) {
    if (!html.includes(BOARD_THEME_PREPAINT_MARKER)) {
      throw new Error(`board-theme-prepaint: index.html has no ${BOARD_THEME_PREPAINT_MARKER} marker`);
    }
    return html.replace(BOARD_THEME_PREPAINT_MARKER, boardThemePrePaintScript());
  },
};

/*
  THE APP-THEME HEAD IS GENERATED TOO (layout redesign B3): the `theme-color`
  meta(s) and the script that puts the theme on `<html>` before first paint,
  from the colour tokens and `theme.ts`. The dev server (`ctx.server`) honours
  a stored preference so the light theme can be checked; a build does so only
  once `THEME_CHOICE_LIVE` is true (F3), and until then is always dark.
*/
const appThemePrePaint: Plugin = {
  name: 'app-theme-prepaint',
  transformIndexHtml(html, ctx) {
    if (!html.includes(APP_THEME_PREPAINT_MARKER)) {
      throw new Error(`app-theme-prepaint: index.html has no ${APP_THEME_PREPAINT_MARKER} marker`);
    }
    return html.replace(APP_THEME_PREPAINT_MARKER, appThemeHead(THEME_CHOICE_LIVE || !!ctx.server));
  },
};

// https://vitejs.dev/config/
const DEV_API_TARGET = process.env.DEV_API_TARGET || 'https://api.chessplaybook.com';
// Fail-closed with an allowlist (#35): any chessplaybook.com host but the known
// staging API is production. See src/config/devProxyGuard.ts.
const DEV_API_IS_PRODUCTION = isProductionApiTarget(DEV_API_TARGET);
const DEV_API_WRITES_ALLOWED = process.env.DEV_API_WRITES === '1';

/*
  THE DEV SERVER READS PRODUCTION AND MAY NOT WRITE TO IT.

  `npm run dev` proxies `/api` to the live API unless `DEV_API_TARGET` says
  otherwise, and every Playwright context mints a fresh anonymous id — so each
  local run of a guard would write real rows into the production database,
  indistinguishable from a visitor, and test data has had to be cleaned out of
  production before.

  READING PRODUCTION IS THE POINT and is untouched: pointing dev at the live API
  is how real data is seen while working on a page. It is only WRITES that had
  no legitimate caller — a guard driving the trainer never intended to record an
  attempt against the real corpus, and a person testing a change locally wants
  their own database, not everyone else's.

  A 403 is deliberate rather than a silent drop: the guard fails loudly and says
  why, which is the difference between discovering this in seconds and
  discovering it in a fortnight.

  THE ESCAPE HATCH IS NAMED, NOT INFERRED. `DEV_API_WRITES=1` allows them for
  one session. It is not keyed on anything automatic, because every automatic
  test for "is this a probe" is a test a probe can pass.

  Pointing at a local backend disables all of this, since the target is then not
  production:  DEV_API_TARGET=http://localhost:3000 npm run dev
*/
const devApiWriteGuard: Plugin = {
  name: 'dev-api-write-guard',
  /*
    A plain `configureServer` function runs BEFORE Vite installs its internal
    middlewares, and the proxy is one of them — so this sees the request first.
    Returning a function here would defer it until after the proxy and the guard
    would never fire.
  */
  configureServer(server: ViteDevServer) {
    if (!DEV_API_IS_PRODUCTION || DEV_API_WRITES_ALLOWED) return;
    server.middlewares.use('/api', (req, res, next) => {
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method ?? 'GET')) return next();
      res.statusCode = 403;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        error: 'dev-api-write-guard',
        message:
          `Refusing to ${req.method} ${req.url} against ${DEV_API_TARGET}. `
          + 'The dev server may read production but not write to it. '
          + 'Run a local backend (DEV_API_TARGET=http://localhost:3000 npm run dev), '
          + 'or set DEV_API_WRITES=1 if you really mean to write to the live database.',
      }));
    });
  },
};

export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Dev requests are same-origin (see the VITE_API_URL define below) and
      // proxied to production by default — READS only, see devApiWriteGuard above.
      // Point them at a local backend with:
      //   DEV_API_TARGET=http://localhost:3000 npm run dev
      '/api': {
        target: DEV_API_TARGET,
        changeOrigin: true,
        secure: true,
      },
      /*
        THE GAME SOCKET, under the same rule as `/api` (2026-10-09). It used to
        bypass this config entirely and open on production whatever
        DEV_API_TARGET said, so local probes wrote seeks, challenges and rating
        rows to the live server. Against a local backend it is proxied there;
        against production it is not proxied at all unless DEV_API_WRITES=1,
        because a socket that can seek is a write. Online play then reads as
        offline in that mode, which is loud on purpose.
      */
      ...(!DEV_API_IS_PRODUCTION || DEV_API_WRITES_ALLOWED
        ? { '/ws': { target: DEV_API_TARGET, ws: true, changeOrigin: true, secure: true } }
        : {}),
    },
  },
  plugins: [react(), devApiWriteGuard, boardThemePrePaint, appThemePrePaint, mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    /*
      The single API-origin source of truth, consumed via src/config/env.ts.

      IT USED TO BE UNOVERRIDABLE, and that was the defect (#34). The comment
      here read "this define OVERRIDES any VITE_API_URL in a .env file - the .env
      entries are documentation, not configuration", which meant the frontend
      could not be built against a non-production API AT ALL. A staging build was
      impossible by construction, not by omission.

      An explicit value now wins. With nothing set the behaviour is exactly what
      it was: '' in dev so requests stay same-origin and hit the proxy above, the
      full origin in production.

      `??`, NOT `||`. An empty string is MEANINGFUL - it is how dev routes through
      the proxy - and `src/config/env.ts` checks `!== undefined` for the same
      reason. `||` here would silently upgrade a deliberate '' to production.
    */
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL ?? (mode === 'production' ? 'https://api.chessplaybook.com' : ''),
    ),
    /*
      '' on the dev server: same origin, through the `/ws` proxy above. See
      src/config/env.ts. DEFINED FOR THE DEV SERVER ONLY: a define beats a .env
      file, so defining it for builds too would shadow `.env.staging`'s socket
      URL and send a staging build's socket to its own website host. Builds
      read the .env files as they always did, and env.ts defaults to production.
    */
    ...(command === 'serve'
      ? { 'import.meta.env.VITE_WS_BASE_URL': JSON.stringify(process.env.VITE_WS_BASE_URL ?? '') }
      : {}),
  },
  /*
    NARRATIVE LOGGING IS DROPPED FROM PRODUCTION BUILDS; DIAGNOSTICS ARE NOT.

    Asked on 2026-08-10 whether the console noise on the dev server reaches
    production. It does not — the lines reported were Vite's HMR client,
    React's development build, React Router's `warnOnce` and our own
    `[AnalysisService] Engine config`, which is behind `import.meta.env.DEV`.
    Measured, not assumed: four pages on the live site printed **zero** console
    messages of any kind.

    Nothing ENFORCED that, though, and the same measurement found a genuine
    leak — `AnalysisService`'s commentary-search `console.info` is unguarded, so
    it prints on `/explain`'s custom-position path in production. It was missed
    by a sweep of page loads because it only fires when someone actually uses
    the feature. 34 unguarded `log`/`info`/`debug` calls exist in `src/`, and
    hand-auditing them is work that has to be redone on every new one.

    `pure` and not `drop: ['console']`, which is the important half.
    `warn` and `error` SURVIVE. They are what a production incident is
    diagnosed from, and this project has repeatedly been saved by console
    evidence — the engine double-init, four days of GA4 silence, the Meta Pixel
    CSP violations. Deleting the site's ability to report that it is broken, in
    order to tidy output nobody sees when it is working, would be a bad trade.

    `pure` marks the call side-effect-free so the minifier removes it along
    with its arguments — including any expensive string building — rather than
    leaving a call whose result is discarded.
  */
  esbuild: {
    pure: mode === 'production'
      ? ['console.log', 'console.info', 'console.debug']
      : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-slot', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-chess': ['chess.js', '@lichess-org/chessground'],
          'vendor-aws': ['aws-amplify'],
        },
      },
    },
  },
}));
