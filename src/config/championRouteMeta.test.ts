/**
 * The champion game pages carry ONE title and description: the prerendered
 * HTML (scripts/generate-route-html.cjs) and the rendered page both read
 * champion-route-meta.json. Before 2026-11-11 they were written separately and
 * differed ("Browse and replay..." against "Study 7818 chess games..."), so
 * Google saw two versions of every page.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { championRouteMeta } from './championRouteMeta';

const require = createRequire(import.meta.url);
const { buildRoutes } = require('../../scripts/generate-route-html.cjs');
const players = JSON.parse(readFileSync(path.resolve(__dirname, '../../public/assets/players/players_list.json'), 'utf-8'));
const content = JSON.parse(readFileSync(path.resolve(__dirname, './champion-content.json'), 'utf-8'));

describe('champion page meta', () => {
  const routes: Array<Record<string, string>> = buildRoutes(players);

  it('the prerendered and rendered titles and descriptions are the same, for every champion', () => {
    for (const key of Object.keys(players)) {
      const slug = key.toLowerCase();
      const name = players[key].fullName || key;
      for (const [kind, segment] of [['games', 'games'], ['bestGames', 'best-games']] as const) {
        const route = routes.find(r => r.key === `champions/${slug}/${segment}`);
        const page = championRouteMeta(kind, name, slug);
        expect(route, `${slug}/${segment}`).toBeDefined();
        expect(route!.title).toBe(page.title);
        expect(route!.description).toBe(page.description);
        expect(route!.ogTitle).toBe(page.ogTitle);
        expect(route!.ogDescription).toBe(page.ogDescription);
      }
    }
  });

  it('a champion with written content is prerendered with its intro', () => {
    for (const slug of Object.keys(content).filter(k => !k.startsWith('_'))) {
      const route = routes.find(r => r.key === `champions/${slug}/games`);
      expect(route!.body).toBe(content[slug].intro);
    }
  });
});
