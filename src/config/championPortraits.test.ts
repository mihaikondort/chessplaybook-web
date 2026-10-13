import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORTRAIT_CREDITS, PORTRAIT_DIR, portraitPath } from './championPortraits';

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

  it('gives every attribution licence a deed link', () => {
    for (const c of PORTRAIT_CREDITS) {
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
