#!/usr/bin/env node
/*
  The built index.html must carry the generated board-theme pre-paint script.

  `index.html` holds only a marker; the `board-theme-prepaint` Vite plugin
  replaces it with a script generated from `src/config/boardThemes.ts`, and
  throws if the marker is missing. That leaves one silent failure: the plugin
  itself removed from `vite.config.ts`. The marker would then ship as an inert
  HTML comment and every board page would flash the default board before
  React loads. This check fails the build in that case.

  Usage: node scripts/check-board-theme-prepaint.cjs [path/to/index.html]
*/
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const problems = [];

if (html.includes('<!-- board-theme-prepaint -->')) {
  problems.push('the marker is still present, so the plugin did not run');
}
const table = html.match(/var T=(\{.*?\});/);
if (!table) {
  problems.push('no generated theme table (var T={...}) found');
} else {
  let parsed = null;
  try { parsed = JSON.parse(table[1]); } catch (e) { problems.push(`the theme table is not valid JSON: ${e.message}`); }
  if (parsed) {
    const ids = Object.keys(parsed);
    if (ids.length === 0) problems.push('the theme table is empty');
    for (const id of ids) {
      const t = parsed[id];
      if (!t || !t.l || !t.d || !t.m || !t.s) problems.push(`theme "${id}" is missing a colour`);
    }
  }
}
for (const prop of ['--board-light-square', '--board-dark-square', '--board-last-move', '--board-selected', '--board-pattern']) {
  if (!html.includes(`'${prop}'`)) problems.push(`the script never sets ${prop}`);
}

if (problems.length) {
  console.error(`check-board-theme-prepaint: ${file}`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('check-board-theme-prepaint: generated script present and complete');
