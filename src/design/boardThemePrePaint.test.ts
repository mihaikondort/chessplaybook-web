import { describe, expect, it } from 'vitest';
import { boardThemes, defaultTheme, BOARD_THEME_STORAGE_KEY } from '@/config/boardThemes';
import { boardThemePrePaintScript, boardThemePrePaintTable } from './boardThemePrePaint';

describe('board-theme pre-paint script', () => {
  it('carries every theme in boardThemes.ts, with the same four colours', () => {
    const table = boardThemePrePaintTable();
    expect(Object.keys(table)).toEqual(boardThemes.map(t => t.id));
    for (const t of boardThemes) {
      expect(table[t.id]).toEqual({
        l: t.colors.lightSquare,
        d: t.colors.darkSquare,
        m: t.colors.lastMove,
        s: t.colors.selected,
      });
    }
  });

  it('reads the key the app writes and falls back to the app default', () => {
    const script = boardThemePrePaintScript();
    expect(script).toContain(`localStorage.getItem(${JSON.stringify(BOARD_THEME_STORAGE_KEY)})`);
    expect(script).toContain(`T[${JSON.stringify(defaultTheme.id)}]`);
  });

  it('paints a stored theme, and falls back for a missing or unknown one', () => {
    const body = boardThemePrePaintScript().replace(/^\s*<script>/, '').replace(/<\/script>\s*$/, '');
    const run = (stored: string | null) => {
      const set: Record<string, string> = {};
      const fakeWindow = {
        localStorage: { getItem: () => stored },
        document: { documentElement: { style: { setProperty: (k: string, v: string) => { set[k] = v; } } } },
        btoa: (s: string) => Buffer.from(s).toString('base64'),
      };
      new Function('localStorage', 'document', 'btoa', body)(fakeWindow.localStorage, fakeWindow.document, fakeWindow.btoa);
      return set['--board-light-square'];
    };
    const green = boardThemes.find(t => t.id === 'green')!;
    expect(run('green')).toBe(green.colors.lightSquare);
    expect(run(null)).toBe(defaultTheme.colors.lightSquare);
    expect(run('no-such-theme')).toBe(defaultTheme.colors.lightSquare);
  });
});
