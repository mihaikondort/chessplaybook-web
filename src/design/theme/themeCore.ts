/**
 * The DOM-free half of the app theme: names, rules and colours.
 *
 * Split from `theme.ts` because `vite.config.ts` needs these at build time
 * (through `themePrePaint.ts`), and the build's TypeScript project has no DOM.
 * Everything here is a pure value or function; the half that touches
 * `window`, storage or elements is `theme.ts`.
 */
// Relative, not `@/`: `vite.config.ts` loads this before the path alias exists.
import { darkTheme, lightTheme, type Hsl } from '../tokens/color.tokens';
import { darkV2Roles } from '../tokens/designV2.tokens';
import { DESIGN_V2_LIVE, HOME_V2_LIVE } from '../designFlags';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'chessplaybook_theme';

/**
 * WHETHER VISITORS MAY CHOOSE (plan §4 B3 and F3). `true` since F3 (2026-10-12),
 * after the B5 sweep and F1's audit (every visible text clears AA in both
 * themes, `verify-text-contrast`). Set it back to `false` to withdraw the choice:
 * production then resolves to dark and ignores any stored preference, and the
 * nav button and menu row render nothing.
 */
export const THEME_CHOICE_LIVE = true;

/**
 * The preference a visitor has before choosing. Dark (owner, F0, 2026-10-12):
 * nobody's site changes unless they choose light.
 */
export const DEFAULT_PREFERENCE: ThemePreference = 'dark';

/** The stored value, validated: anything else is treated as no choice. */
export function parsePreference(value: unknown): ThemePreference | null {
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/**
 * THE HOMEPAGE IS ALWAYS DARK while the design v2 homepage is on (owner D3, 2026-11-13; visual redesign plan C3):
 * one homepage and one measurement, and its photo stage is built for dark. Every other page follows the visitor's
 * preference. The stored preference is never touched, so leaving `/` restores the visitor's own theme.
 * The pre-paint script (themePrePaint.ts) and ThemeProvider both use these, so they cannot disagree.
 */
export function isAlwaysDarkPath(path: string, homeV2: boolean = HOME_V2_LIVE): boolean {
  return homeV2 && (path === '/' || path === '');
}

export function resolveThemeForPath(path: string, preference: ThemePreference, systemPrefersDark: boolean, homeV2: boolean = HOME_V2_LIVE): ResolvedTheme {
  return isAlwaysDarkPath(path, homeV2) ? 'dark' : resolveTheme(preference, systemPrefersDark);
}

/** Whether the page draws design v2: everywhere with its switch, or on the homepage that needs it. */
export function designV2ForPath(path: string, homeV2: boolean = HOME_V2_LIVE, designV2: boolean = DESIGN_V2_LIVE): boolean {
  return designV2 || isAlwaysDarkPath(path, homeV2);
}

/** `'218 42% 9%'` -> `#0d1421`. */
export function hslToHex(hsl: Hsl): string {
  const [h, s, l] = hsl.replace(/%/g, '').split(/\s+/).map(Number);
  const sat = s / 100, light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

/**
 * The browser chrome's colour for a theme: the Android address bar, the iOS
 * status area of an installed app. It must equal the page background, or the
 * page sits in a frame of a different colour, so it is computed from the
 * `background` token rather than copied. (The hand-kept copy drifted twice:
 * to #1a1a2e against a #121b2b page, and again when the page darkened on
 * 2026-08-07.)
 */
export function themeColor(theme: ResolvedTheme): string {
  return themeColorFor(theme, DESIGN_V2_LIVE);
}

/**
 * The same, for a stated design (redesign plan B3): with design v2 the dark page is v2's
 * `background`, so the browser frame follows it. Light is unchanged (v2 is dark only).
 */
export function themeColorFor(theme: ResolvedTheme, designV2: boolean): string {
  if (theme === 'dark') return hslToHex(designV2 && darkV2Roles.background ? darkV2Roles.background : darkTheme.roles.background);
  return hslToHex(lightTheme.roles.background);
}
