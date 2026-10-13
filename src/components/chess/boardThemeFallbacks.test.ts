import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { defaultTheme } from '@/config/boardThemes';

/*
  The board CSS names a fallback for each theme variable. It must be the
  DEFAULT theme's colour: until B4 it was classic brown while the app's default
  was Blue, so the two disagreed about what "no theme yet" looks like.
*/
describe('chessboard.css fallbacks', () => {
  const css = readFileSync('src/components/chess/chessboard.css', 'utf8');
  /** The text after the comma in `var(--name, <fallback>)`, up to the matching paren. */
  const fallback = (name: string) => {
    const start = css.indexOf(`var(--${name},`);
    if (start < 0) return undefined;
    let depth = 0;
    let i = start + `var(--${name},`.length;
    const from = i;
    for (; i < css.length; i++) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')') {
        if (depth === 0) break;
        depth--;
      }
    }
    return css.slice(from, i).trim();
  };

  it('name the default board theme', () => {
    expect(fallback('cg-light')).toBe(defaultTheme.colors.lightSquare);
    expect(fallback('cg-lastmove')).toBe(defaultTheme.colors.lastMove);
    expect(fallback('cg-selected')).toBe(defaultTheme.colors.selected);
  });
});
