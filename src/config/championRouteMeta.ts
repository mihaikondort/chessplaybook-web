/**
 * Title and description of a champion game page, from champion-route-meta.json,
 * the same file scripts/generate-route-html.cjs bakes into the prerendered HTML.
 * Both passes must carry the same text (the 2026-07-28 lesson: two copies drift).
 */
import meta from './champion-route-meta.json';

export type ChampionPageKind = 'games' | 'bestGames';

export interface ChampionRouteMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
  heading: string;
}

export function championRouteMeta(kind: ChampionPageKind, name: string, slug: string): ChampionRouteMeta {
  const fill = (t: string) => t.replace(/\{name\}/g, name).replace(/\{slug\}/g, slug);
  const m = meta[kind];
  return {
    title: fill(m.title),
    description: fill(m.description),
    ogTitle: fill(m.ogTitle),
    ogDescription: fill(m.ogDescription),
    keywords: fill(m.keywords),
    heading: fill(m.heading),
  };
}
