import { describe, expect, it } from 'vitest';
import { COLOR_ROLES, darkTheme, lightTheme, type ColorRole, type ColorTheme } from './color.tokens';
import { contrast, hslToRgb, over } from './contrast';

/*
  THE CONTRAST GUARD (layout redesign B6). WCAG 2.2 AA for every pair of
  roles the site draws together, in both themes: 4.5:1 for text, 3:1 for
  boundaries and icons. Computed from the token values;
  `verify-theme-tokens.mjs` proves in a browser that the CSS serves exactly
  these values, so the numbers here are the numbers on screen.

  A pair is declared here because the site uses it, not because the roles
  happen to exist. A new combination in a component belongs in this list.
*/

const TEXT = 4.5;
const NON_TEXT = 3;

type Check = { label: string; fg: (t: ColorTheme) => [number, number, number]; bg: (t: ColorTheme) => [number, number, number]; min: number };
const role = (r: ColorRole) => (t: ColorTheme) => hslToRgb(t.roles[r]);
const alphaOver = (r: ColorRole, a: number, under: ColorRole) => (t: ColorTheme) => over(hslToRgb(t.roles[r]), a, hslToRgb(t.roles[under]));

const checks: Check[] = [];
const add = (label: string, fg: Check['fg'], bg: Check['bg'], min: number) => checks.push({ label, fg, bg, min });

// Every fill with its own text colour.
for (const r of COLOR_ROLES) {
  if (!r.endsWith('-foreground')) continue;
  const fill = r.replace(/-foreground$/, '') as ColorRole;
  add(`${r} on ${fill}`, role(r), role(fill), TEXT);
}
add('foreground on background', role('foreground'), role('background'), TEXT);
add('inverse-accent on inverse-surface', role('inverse-accent'), role('inverse-surface'), TEXT);

// Text roles on every surface they are drawn on.
const SURFACES: ColorRole[] = ['background', 'card', 'muted', 'popover', 'surface'];
const TEXT_ROLES: ColorRole[] = [
  'foreground', 'muted-foreground', 'link', 'success', 'warning', 'destructive',
  'live', 'event-day', 'win', 'loss', 'editorial',
  'move-brilliant', 'move-best', 'move-great', 'move-excellent', 'move-good',
  'move-inaccuracy', 'move-mistake', 'move-blunder', 'move-severe-blunder',
];
for (const s of SURFACES) for (const x of TEXT_ROLES) add(`${x} text on ${s}`, role(x), role(s), TEXT);

// Hover fills keep their label readable.
add('primary-foreground on primary/90 (hover)', role('primary-foreground'), alphaOver('primary', 0.9, 'background'), TEXT);
add('secondary-foreground on secondary/80 (hover)', role('secondary-foreground'), alphaOver('secondary', 0.8, 'background'), TEXT);
add('destructive-foreground on destructive/90 (hover)', role('destructive-foreground'), alphaOver('destructive', 0.9, 'background'), TEXT);
add('control-foreground on control-hover', role('control-foreground'), role('control-hover'), TEXT);
// The live badge lightens on hover, as its green-600 to green-500 did.
add('live-fill-foreground on live (hover)', role('live-fill-foreground'), role('live'), TEXT);

// Move badges write the page background colour on their fill.
for (const m of ['brilliant', 'best', 'great', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder', 'severe-blunder'] as const) {
  add(`background text on move-${m} badge`, role('background'), role(`move-${m}`), TEXT);
}

// Boundaries and icons, 3:1.
for (const s of ['background', 'card'] as ColorRole[]) {
  add(`focus ring on ${s}`, role('ring'), role(s), NON_TEXT);
  add(`border-strong on ${s}`, role('border-strong'), role(s), NON_TEXT);
  add(`primary as a boundary on ${s}`, role('primary'), role(s), NON_TEXT);
  for (const x of ['feature-explain', 'feature-puzzles', 'feature-play', 'feature-challenge',
    'medal-gold', 'medal-silver', 'medal-bronze', 'cycle-swiss', 'cycle-circuit', 'cycle-rating'] as ColorRole[]) {
    add(`${x} icon on ${s}`, role(x), role(s), NON_TEXT);
  }
}
// The News card's quiet border separates the card from the PAGE, which is the
// side it was tuned against (3.22:1, owner 2026-08-02).
add('border-quiet against the page', role('border-quiet'), role('background'), NON_TEXT);

/*
  ACCEPTED EXCEPTIONS, each with its reason. A failing pair not listed here
  fails the test; a listed pair that starts passing also fails it, so this
  list cannot go stale.
*/
const EXCEPTIONS: Record<string, string> = {
  'light: primary as a boundary on background':
    'A filled gold button is identified by its label (8.1:1), not its edge; WCAG 1.4.11 needs the edge only when it is what identifies the control. Light theme, not yet exposed (F3).',
  'light: primary as a boundary on card':
    'Same as on the background.',
};

describe('WCAG contrast for every role pair, in both themes', () => {
  const failures: string[] = [];
  const excepted: string[] = [];
  for (const [name, theme] of [['dark', darkTheme], ['light', lightTheme]] as const) {
    for (const c of checks) {
      const ratio = contrast(c.fg(theme), c.bg(theme));
      const key = `${name}: ${c.label}`;
      if (ratio >= c.min) continue;
      (key in EXCEPTIONS ? excepted : failures).push(`${key} = ${ratio.toFixed(2)} (needs ${c.min})`);
    }
  }

  it('checks a meaningful number of pairs', () => {
    expect(checks.length).toBeGreaterThan(150);
  });

  it('has no failing pair outside the accepted exceptions', () => {
    expect(failures).toEqual([]);
  });

  it('every accepted exception still fails, so the list cannot go stale', () => {
    expect(excepted.map((e) => e.split(' = ')[0]).sort()).toEqual(Object.keys(EXCEPTIONS).sort());
  });
});
