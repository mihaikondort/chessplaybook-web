/**
 * The board-theme pre-paint script, generated from `boardThemes.ts`.
 *
 * `index.html` sets the board's colours on `<html>` before React renders, so a
 * returning visitor never sees the default board flash before their own. That
 * script used to carry a hand-kept copy of the six themes, kept in step with
 * `boardThemes.ts` by nobody. It is now generated at build time by the
 * `board-theme-prepaint` Vite plugin from the same data, the same default and
 * the same storage key the app uses.
 *
 * Behaviour is unchanged: read the key, fall back to the default theme, write
 * the four colours and the square pattern as custom properties on `<html>`.
 */
import { boardThemes, defaultTheme, BOARD_THEME_STORAGE_KEY } from '../config/boardThemes';

/** The marker in `index.html` the plugin replaces. The build fails if it is missing. */
export const BOARD_THEME_PREPAINT_MARKER = '<!-- board-theme-prepaint -->';

/** The theme table as the script carries it: id -> light, dark, last move, selected. */
export function boardThemePrePaintTable(): Record<string, { l: string; d: string; m: string; s: string }> {
  return Object.fromEntries(
    boardThemes.map(t => [t.id, { l: t.colors.lightSquare, d: t.colors.darkSquare, m: t.colors.lastMove, s: t.colors.selected }]),
  );
}

export function boardThemePrePaintScript(): string {
  const table = JSON.stringify(boardThemePrePaintTable());
  const key = JSON.stringify(BOARD_THEME_STORAGE_KEY);
  const fallback = JSON.stringify(defaultTheme.id);
  // The SVG is the 8x8 pattern the board CSS reads as --board-pattern.
  return `<script>
    (function(){
      var T=${table};
      var id=null;try{id=localStorage.getItem(${key});}catch(e){}
      var t=T[id||${fallback}]||T[${fallback}];
      var s=document.documentElement.style;
      s.setProperty('--board-light-square',t.l);
      s.setProperty('--board-dark-square',t.d);
      s.setProperty('--board-last-move',t.m);
      s.setProperty('--board-selected',t.s);
      var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><g id="a"><g id="b"><g id="c"><g id="d"><rect width="1" height="1" fill="'+t.l+'"/><use x="1" y="1" href="#e"/><rect y="1" width="1" height="1" id="e" fill="'+t.d+'"/><use x="1" y="-1" href="#e"/></g><use x="2" href="#d"/></g><use x="4" href="#c"/></g><use y="2" href="#b"/></g><use y="4" href="#a"/></svg>';
      s.setProperty('--board-pattern','url("data:image/svg+xml;base64,'+btoa(svg)+'")');
    })();
    </script>`;
}
