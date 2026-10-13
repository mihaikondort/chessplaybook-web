/**
 * WCAG 2.2 contrast, computed from the colour tokens (layout redesign B6).
 *
 * Pure functions over the token values, so the contrast guard runs in a unit
 * test. `verify-theme-tokens.mjs` proves, in a browser, that the CSS serves
 * exactly these values, which is what makes these numbers the ones on screen.
 */
import type { Hsl } from './color.tokens';

export type Rgb = [number, number, number];

/** `'218 42% 9%'` -> [r, g, b] in 0..1. */
export function hslToRgb(hsl: Hsl): Rgb {
  const [h, s, l] = hsl.replace(/%/g, '').split(/\s+/).map(Number);
  const sat = s / 100, light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** A colour at `alpha` laid over an opaque background, as the browser composites it. */
export function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as Rgb;
}

export function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
