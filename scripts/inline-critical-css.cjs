/**
 * Post-build script: inline critical (above-the-fold) CSS into index.html
 * and lazy-load the full stylesheet. Uses Beasties (Google Critters fork).
 */
const fs = require('fs');
const path = require('path');
const Beasties = require('beasties');

/*
  THE LIGHT THEME'S COLOURS BEFORE FIRST PAINT (2026-11-13). The pre-paint script sets
  `data-theme="light"` on <html> before the first frame, but Beasties judges rules against the
  static document, where no `data-theme` exists, so it dropped the `[data-theme=light]` token
  block: a visitor who chose light saw the DARK page until the stylesheet arrived, a visible flash
  on a slow phone. Proven on a built dist with stylesheets held
  (scripts/verify-first-paint-design.mjs). Exactly that selector, nothing else that mentions light.
*/
const LIGHT_THEME_BLOCK = /^\[data-theme=["']?light["']?\]$/;

async function run() {
  const htmlPath = path.resolve(__dirname, '../dist/index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const beasties = new Beasties({
    path: path.resolve(__dirname, '../dist'),
    preload: 'media',
    inlineFonts: false,
    compress: true,
    pruneSource: false,
    reduceInlineStyles: true,
    allowRules: [LIGHT_THEME_BLOCK],
    logLevel: 'info',
  });

  const result = await beasties.process(html);
  fs.writeFileSync(htmlPath, result);
  console.log('Critical CSS inlined successfully!');
}

run().catch(err => {
  // Fail the build (audit P2 #14): exiting 0 here shipped a perf regression
  // invisibly — the site works without inlined critical CSS, just slower,
  // which is exactly the kind of break nobody notices for months.
  console.error('Critical CSS extraction failed:', err.message);
  process.exit(1);
});
