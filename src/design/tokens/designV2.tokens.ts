/**
 * DESIGN V2 (experiment, branch `feat/visual-redesign`): the dark theme's roles
 * re-tuned toward the co-founder's mock. See docs/Features Development/VISUAL_REDESIGN_ANALYSIS.md.
 *
 * INERT UNLESS SWITCHED ON. `tailwind.config.ts` emits these only under
 * `:root[data-design="v2"]:not([data-theme="light"])`, and nothing sets that
 * attribute except the DEV preview (`/dev/home-v2`) and its "every page" switch.
 * The live dark theme is `darkTheme` in color.tokens.ts, untouched.
 *
 * Measured from the mock (region medians, analysis §1): the page is near-black
 * navy (L5-7%), cards sit at the page's own tone (L8-10%) carried by a 1px
 * hairline, the gold is warmer than ours (hue 33-36, a top-to-bottom gradient).
 * Only the roles that change are listed; the rest inherit from `darkTheme`.
 * Every value is a starting point to judge on the owner's screen, then re-measured
 * by verify-text-contrast before anything is kept.
 */
import type { ColorEffect, ColorRole, Hsl } from './color.tokens';

export const darkV2Roles: Partial<Record<ColorRole, Hsl>> = {
  background: '212 48% 6%',
  foreground: '36 55% 94%',

  surface: '212 36% 9%',
  'surface-foreground': '36 55% 94%',
  'surface-elevated': '212 32% 11%',
  'surface-elevated-foreground': '36 55% 94%',

  card: '212 34% 9%',
  'card-foreground': '36 55% 94%',
  popover: '212 32% 11%',
  'popover-foreground': '36 55% 94%',

  input: '212 16% 22%',
  muted: '212 28% 12%',
  'muted-foreground': '30 8% 72%',

  border: '212 14% 21%',
  'border-strong': '30 10% 46%',
  /* The News card's quiet edge, against the v2 page: L40% is 3.26:1, the 3.22:1 the owner approved
     for today's dark theme on 2026-08-02 (L30% was 2.21:1; caught by contrast.test.ts, plan A4). */
  'border-quiet': '212 11% 40%',

  primary: '36 78% 62%',
  'primary-foreground': '212 50% 8%',
  secondary: '212 28% 13%',
  'secondary-foreground': '36 55% 94%',
  accent: '36 85% 68%',
  'accent-foreground': '212 50% 8%',
  link: '36 80% 64%',
  selection: '36 80% 62%',
  ring: '36 85% 64%',

  control: '212 18% 22%',
  'control-hover': '212 18% 30%',
  'control-foreground': '36 40% 94%',

  'inverse-surface': '36 55% 94%',
  'inverse-surface-foreground': '212 48% 6%',
};

export const darkV2Effects: Partial<Record<ColorEffect, string>> = {
  'surface-card-sheen': 'rgb(255 255 255 / 0.015)',
  'surface-card-highlight': 'rgb(255 255 255 / 0.03)',
  'surface-card-shadow': 'rgb(0 0 0 / 0.35)',
  /* The mock's hairline: hsl(212 14% 22%), drawn as the inset ring `.surface-card` already has. */
  'surface-card-edge': 'hsl(212 14% 22%)',
  'glow-golden': '0 0 32px hsl(36 80% 62% / 0.28)',
};

/**
 * Properties that exist only in v2 (no role yet): the warm editorial hairline,
 * the two stops of the gold button, and the faint "lift" used by the preview's
 * card-style switch. HSL channels, like the roles.
 */
export const darkV2Extras: Record<string, Hsl> = {
  'hairline': '212 14% 22%',
  'hairline-warm': '30 10% 42%',
  'gold-top': '37 82% 70%',
  'gold-bottom': '33 74% 55%',
  'card-lift': '212 30% 12%',
  /* The gold button's top highlight (drawn at 35%), a token so the v2 CSS holds no raw colour (plan A4). */
  'btn-sheen': '0 0% 100%',
};

export function designV2CustomProperties(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(darkV2Roles)) out[`--${k}`] = v as string;
  for (const [k, v] of Object.entries(darkV2Effects)) out[`--${k}`] = v as string;
  for (const [k, v] of Object.entries(darkV2Extras)) out[`--${k}`] = v;
  return out;
}
