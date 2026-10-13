import { describe, expect, it } from 'vitest';
import { boardThemes, contrastRatio, coordinateInk, defaultTheme } from './boardThemes';

/*
  BOARD PALETTES ARE DOMAIN DATA (layout redesign B6), not colour tokens: a
  board keeps its colours in the light and dark app themes alike. So they are
  checked here, by their own rules, instead of by the role guards.
*/
const HEX = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(?:0|1|0?\.\d+)\s*\)$/;

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe('board palettes', () => {
  it('have unique ids and include the default', () => {
    const ids = boardThemes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(defaultTheme.id);
  });

  it('write squares as hex and highlights as rgba, which is what the CSS and the pre-paint script expect', () => {
    for (const t of boardThemes) {
      expect(t.colors.lightSquare, t.id).toMatch(HEX);
      expect(t.colors.darkSquare, t.id).toMatch(HEX);
      expect(t.colors.lastMove, t.id).toMatch(RGBA);
      expect(t.colors.selected, t.id).toMatch(RGBA);
    }
  });

  it('keep the light square lighter than the dark square', () => {
    for (const t of boardThemes) {
      expect(lum(t.colors.lightSquare), t.id).toBeGreaterThan(lum(t.colors.darkSquare));
    }
  });
});

/*
  THE COORDINATES MEET AA ON EVERY SQUARE OF EVERY THEME (D26, owner
  2026-10-08). 10px labels are normal text, so 4.5:1. Derived per square, so a
  theme added later is held to it without anyone remembering to.
*/
describe('board coordinates', () => {
  it('reach 4.5:1 on both squares of every theme', () => {
    for (const t of boardThemes) {
      for (const square of [t.colors.lightSquare, t.colors.darkSquare]) {
        const ratio = contrastRatio(coordinateInk(square), square);
        expect(ratio, `${t.id} ${square}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('take the stronger ink, not a fixed one (purple needs white, gray needs black)', () => {
    expect(coordinateInk('#6b5d9e')).toBe('#ffffff');
    expect(coordinateInk('#7d7d7d')).toBe('#000000');
  });
});
