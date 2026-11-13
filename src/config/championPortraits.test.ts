import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HOME_PORTRAIT_OVERRIDES, PLAYER_PORTRAIT_CREDITS, PORTRAIT_CREDITS, PORTRAIT_DIR, portraitPath } from './championPortraits';

/*
  Two places name the portrait files: players_list.json (static) and the API
  fallback in BackendAPIClient. They drifted apart once before (#68), so this
  pins both to `portraitPath`, and the files and credits to the roster.
*/
const roster: Record<string, { imagePath: string }> = JSON.parse(
  readFileSync(join(process.cwd(), 'public/assets/players/players_list.json'), 'utf8'),
);
const names = Object.keys(roster);

describe('champion portraits', () => {
  it('covers all 18 champions', () => {
    expect(names).toHaveLength(18);
  });

  it.each(names)('players_list.json points %s at portraitPath', (name) => {
    expect(roster[name].imagePath).toBe(portraitPath(name));
  });

  it.each(names)('the portrait file for %s exists', (name) => {
    expect(existsSync(join(process.cwd(), 'public', portraitPath(name)))).toBe(true);
  });

  it('credits every champion exactly once, and nobody else', () => {
    expect(PORTRAIT_CREDITS.map((c) => c.champion).sort()).toEqual([...names].sort());
  });

  it.each(PLAYER_PORTRAIT_CREDITS.map((c) => c.champion))('the portrait file for player %s exists', (name) => {
    expect(existsSync(join(process.cwd(), 'public', portraitPath(name)))).toBe(true);
  });

  it('gives every attribution licence a deed link', () => {
    for (const c of [...PORTRAIT_CREDITS, ...PLAYER_PORTRAIT_CREDITS]) {
      if (/^CC BY/.test(c.licence)) expect(c.licenceUrl, c.champion).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(c.source, c.champion).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it('the API fallback builds the path through portraitPath, not a copy of the folder', () => {
    const client = readFileSync(join(process.cwd(), 'src/services/BackendAPIClient.ts'), 'utf8');
    expect(client).toContain('portraitPath(');
    expect(client).not.toContain('assets/images/champions/');
  });

  it('lives in a versioned folder, because assets/ is cached immutable for a year', () => {
    expect(PORTRAIT_DIR).toMatch(/\/portraits-v\d+$/);
  });
});

/*
  The design v2 homepage's portraits (redesign plan C7): every champion has a toned portrait and a colour one
  in portraits-v2, and every photo that differs from v1 is credited with its author, licence and source.
*/
describe('homepage (v2) portraits', () => {
  it.each(names)('portraits-v2 has %s, toned and in colour', (name) => {
    expect(existsSync(join(process.cwd(), 'public/assets/images/champions/portraits-v2', `${name}.webp`))).toBe(true);
    expect(existsSync(join(process.cwd(), 'public/assets/images/champions/portraits-v2/color', `${name}.webp`))).toBe(true);
  });

  it('credits every override with a deed link and its Commons source', () => {
    expect(HOME_PORTRAIT_OVERRIDES.length).toBeGreaterThan(0);
    for (const c of HOME_PORTRAIT_OVERRIDES) {
      expect(names).toContain(c.champion);
      expect(c.author, c.champion).toBeTruthy();
      if (/^CC BY/.test(c.licence)) expect(c.licenceUrl, c.champion).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(c.source, c.champion).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
