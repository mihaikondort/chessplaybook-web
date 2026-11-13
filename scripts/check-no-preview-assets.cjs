#!/usr/bin/env node
/**
 * THE VISUAL REDESIGN'S PREVIEW ASSETS NEVER SHIP (VISUAL_REDESIGN_IMPLEMENTATION_PLAN A1).
 *
 * The preview of design v2 (`/dev/home-v2`) uses images that must not be published: the co-founder's AI
 * images before his written OK, a draft of the Master character, photos not yet credited on
 * /credits. They live in `preview-assets/` at the repo root, outside `public/` (which is copied
 * to `dist` and cached immutable for a year) and outside `src/` (which is republished as GPL
 * source on every deploy), and the dev server serves them in DEV only (vite.config.ts).
 *
 * This fails the build if anything under `dist/` is one of them, or if any built HTML or JS still
 * points at `/assets/images/home-preview/` (a dead URL in production at best, a published asset at
 * worst). Run after `vite build`.
 */
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const NEEDLE = 'home-preview';
const problems = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(DIST, full).replace(/\\/g, '/');
    if (rel.includes(NEEDLE)) problems.push(`file in dist: ${rel}`);
    if (entry.isDirectory()) { walk(full); continue; }
    if (/\.(html|js|css)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (text.includes(NEEDLE)) problems.push(`reference in ${rel}`);
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.error('check-no-preview-assets: dist/ does not exist; run vite build first.');
  process.exit(1);
}
walk(DIST);
if (problems.length) {
  console.error('check-no-preview-assets: preview assets would ship:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('check-no-preview-assets: no preview asset or reference in dist/');
