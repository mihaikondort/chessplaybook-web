/**
 * The built bundle must carry a GA4 measurement id.
 *
 * WHY THIS EXISTS. On 2026-08-09 analytics recorded almost nothing for a day
 * while nothing was broken in the product. What had happened is that `VITE_GA_MEASUREMENT_ID` lives only in `.env.local` and
 * `.env.production`, both gitignored, and the GitHub Actions deploy passes AWS
 * credentials and nothing else — so a CI-built bundle compiled the id to `''`
 * and `logGA4Event` returned at its first line for every event, in silence.
 *
 * It was invisible because it is the ONLY env-dependent value without a real
 * default: the API origin and the Cognito pool id both fall back to the real
 * thing, so the site worked perfectly while measuring nothing.
 *
 * The fallback added alongside this check makes the failure impossible in
 * practice. The check exists because a fallback can be removed by someone who
 * reasonably thinks an id belongs in configuration, and the symptom of that
 * mistake is a number quietly going to zero — which is indistinguishable from
 * a bad traffic day until someone thinks to look at the bundle.
 *
 * Run as part of `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const ID_PATTERN = /G-[A-Z0-9]{6,}/;

function fail(message) {
  console.error(`\nAnalytics check FAILED: ${message}\n`);
  console.error('  Every GA4 event would be discarded silently by logGA4Event,');
  console.error('  which opens with `if (!MEASUREMENT_ID) return`.');
  console.error('  See src/config/env.ts — gaId must keep a real fallback.\n');
  process.exit(1);
}

const assetsDir = path.join(DIST, 'assets');
if (!fs.existsSync(assetsDir)) fail('dist/assets not found — run the build first');

const bundles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
if (bundles.length === 0) fail('no JS bundles in dist/assets');

/*
  ANALYTICS OFF (`VITE_GA_MEASUREMENT_ID=off`, for staging): the check turns
  round. A bundle that still carries the PRODUCTION id would report test traffic
  to the real property, which is the mistake `off` exists to prevent.
*/
const PRODUCTION_ID = 'G-JXRW7LXQQY';
if (process.env.VITE_GA_MEASUREMENT_ID === 'off') {
  const leaking = bundles.filter(f =>
    fs.readFileSync(path.join(assetsDir, f), 'utf8').includes(PRODUCTION_ID));
  if (leaking.length) {
    console.error(`\nAnalytics check FAILED: analytics is off, but ${leaking.join(', ')} carries the production id ${PRODUCTION_ID}.\n`);
    process.exit(1);
  }
  console.log('Analytics check passed: analytics is off and no bundle carries the production id.');
  process.exit(0);
}

const withId = bundles.filter(f =>
  ID_PATTERN.test(fs.readFileSync(path.join(assetsDir, f), 'utf8')));

if (withId.length === 0) {
  fail('no bundle contains a GA4 measurement id (G-XXXXXXX)');
}

const sample = fs.readFileSync(path.join(assetsDir, withId[0]), 'utf8');
const id = ID_PATTERN.exec(sample)[0];
console.log(`Analytics check passed: measurement id ${id} present in ${withId.length} bundle(s).`);
