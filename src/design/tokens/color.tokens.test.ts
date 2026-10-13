import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  COLOR_EFFECTS,
  COLOR_ROLES,
  colorCustomProperties,
  darkTheme,
  lightTheme,
  tailwindColors,
} from './color.tokens';
import tailwindConfig from '../../../tailwind.config';

const HSL = /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/;

describe('colour tokens', () => {
  it('every role has an HSL channel value, in both themes', () => {
    for (const theme of [darkTheme, lightTheme]) {
      for (const role of COLOR_ROLES) {
        expect(theme.roles[role], role).toMatch(HSL);
      }
    }
  });

  /*
    A theme missing a role would silently inherit the other theme's value
    from `:root`, which in light would put dark-theme ink on a light page.
  */
  it('both themes define exactly the same roles and effects', () => {
    expect(Object.keys(lightTheme.roles).sort()).toEqual(Object.keys(darkTheme.roles).sort());
    expect(Object.keys(lightTheme.effects).sort()).toEqual(Object.keys(darkTheme.effects).sort());
  });

  /*
    A background role without its text colour is how a component ends up
    reaching for a raw `text-white`. Every `-foreground` names a role that
    exists, and every role the spec uses as a background has one.
  */
  it('every foreground pairs with a role, and every background role has a foreground', () => {
    const roles = new Set<string>(COLOR_ROLES);
    for (const role of COLOR_ROLES) {
      if (role.endsWith('-foreground')) expect(roles.has(role.replace(/-foreground$/, '')), role).toBe(true);
    }
    const backgrounds = [
      'background', 'surface', 'surface-elevated', 'card', 'popover', 'muted', 'primary',
      'secondary', 'accent', 'success', 'warning', 'destructive', 'control', 'inverse-surface',
    ];
    for (const bg of backgrounds) {
      const fg = bg === 'background' ? 'foreground' : `${bg}-foreground`;
      expect(roles.has(fg), `${bg} has no foreground`).toBe(true);
    }
  });

  it('emits exactly one custom property per role and effect', () => {
    const props = colorCustomProperties();
    expect(Object.keys(props).sort()).toEqual(
      [...COLOR_ROLES, ...COLOR_EFFECTS].map((n) => `--${n}`).sort(),
    );
  });

  /*
    The colour map and the custom properties come from one list of names, so a
    utility can never read a property nobody defines.
  */
  it('every Tailwind colour reads a property the tokens define', () => {
    const defined = new Set(Object.keys(colorCustomProperties()));
    const refs = JSON.stringify(tailwindColors()).match(/var\(--[a-z-]+\)/g) ?? [];
    expect(refs.length).toBeGreaterThan(20);
    for (const r of refs) expect(defined.has(r.slice(4, -1)), r).toBe(true);
  });

  it('the Tailwind config uses the generated colour map', () => {
    expect(tailwindConfig.theme?.extend?.colors).toEqual(tailwindColors());
  });

  /*
    ONE SOURCE. B1 moved every colour out of the stylesheets; a role declared
    again in CSS would be a second copy that wins or loses depending on file
    order, which is how the `.dark` block drifted for two months unnoticed.
  */
  it('no stylesheet declares a colour role again', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = join(dir, e.name);
        if (e.isDirectory()) return walk(full);
        return e.name.endsWith('.css') ? [full] : [];
      });
    const files = walk('src');
    expect(files.some((f) => f.endsWith('index.css'))).toBe(true);

    const names = [...COLOR_ROLES, ...COLOR_EFFECTS];
    const offenders: string[] = [];
    for (const f of files) {
      const css = readFileSync(f, 'utf8');
      for (const n of names) {
        if (new RegExp(`(^|[\\s;{])--${n}\\s*:`, 'm').test(css)) offenders.push(`${f}: --${n}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
