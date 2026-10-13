/**
 * THE ONE BOARD-THEME RESOLVER (layout redesign B4).
 *
 * Until B4 there were three, and they disagreed:
 *
 *   - this hook, with its own state per caller (13 callers), each starting at
 *     the default and issuing its own GET to `/api/user/preferences`;
 *   - `ChessBoard`, which resolved the theme again in a `useState`
 *     initialiser and let the legacy `boardTheme` key OUTRANK the current one,
 *     so a visitor carrying both saw an older theme on every play board than
 *     the one they last chose;
 *   - the pre-paint script in `index.html` (now generated, A3).
 *
 * Now there is one module-level store, read through `useSyncExternalStore`, so
 * every board on a page shows the same theme and a change reaches all of them
 * at once. It is a store rather than a context provider so it needs no
 * mounting: a component rendered alone (in a test, or a page with no provider
 * above it) still gets the real theme.
 *
 * Resolution, in this order: the server's stored choice once it answers (for
 * cross-device sync), else this browser's `BOARD_THEME_STORAGE_KEY`, else the
 * default theme. The legacy key is read ONCE, migrated if it is the only
 * choice there is, and deleted.
 *
 * The board theme is independent of the app theme: a board keeps its colours
 * in light and dark alike.
 */
import { useSyncExternalStore } from 'react';
import {
  BoardTheme,
  BOARD_THEME_STORAGE_KEY,
  LEGACY_BOARD_THEME_STORAGE_KEY,
  boardThemes,
  defaultTheme,
  getBoardTheme,
} from '@/config/boardThemes';
import { userPreferencesService } from '@/services/UserPreferencesService';

let current: BoardTheme | null = null;
let started = false;
/** Bumped by every local choice, so a server answer that started earlier cannot overwrite it. */
let localChanges = 0;
/**
 * A legacy choice migrated on this load, not yet on the server. The server
 * answers `blue` for an identity that never chose (D16), so without this the
 * first server answer would erase the visitor's only real choice.
 */
let migratedThisLoad: string | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * This browser's choice, with the legacy key migrated and removed. A visitor
 * holding both keys gets the current one: it is the choice they made last.
 */
function storedThemeId(): string | null {
  const s = storage();
  if (!s) return null;
  try {
    let id = s.getItem(BOARD_THEME_STORAGE_KEY);
    const legacy = s.getItem(LEGACY_BOARD_THEME_STORAGE_KEY);
    if (legacy !== null) {
      if (!id && boardThemes.some((t) => t.id === legacy)) {
        s.setItem(BOARD_THEME_STORAGE_KEY, legacy);
        id = legacy;
        migratedThisLoad = legacy;
      }
      s.removeItem(LEGACY_BOARD_THEME_STORAGE_KEY);
    }
    return id;
  } catch {
    return null;
  }
}

function fromStorage(): BoardTheme {
  return getBoardTheme(storedThemeId() ?? defaultTheme.id);
}

function set(theme: BoardTheme) {
  if (current?.id === theme.id) return;
  current = theme;
  applyTheme(theme);
  listeners.forEach((l) => l());
}

/** Cross-device sync: the server's choice, unless the visitor chose since we asked. */
function loadFromServer() {
  const asked = localChanges;
  userPreferencesService.loadFromServer().then((prefs) => {
    if (!prefs?.boardTheme || localChanges !== asked) return;
    try {
      storage()?.setItem(BOARD_THEME_STORAGE_KEY, prefs.boardTheme);
    } catch {
      /* the theme still applies for this visit */
    }
    set(getBoardTheme(prefs.boardTheme));
  });
}

function start() {
  if (started) return;
  started = true;
  current ??= fromStorage();
  applyTheme(current);
  if (migratedThisLoad) {
    // A real choice the server has never seen: push it, and do not let the
    // server's default answer replace it on the way.
    localChanges++;
    userPreferencesService.save({ boardTheme: migratedThisLoad });
    migratedThisLoad = null;
  } else {
    loadFromServer();
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === BOARD_THEME_STORAGE_KEY) set(getBoardTheme(e.newValue ?? defaultTheme.id));
    });
  }
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BoardTheme {
  return (current ??= fromStorage());
}

export function changeBoardTheme(themeId: string) {
  localChanges++;
  const theme = getBoardTheme(themeId);
  try {
    const s = storage();
    s?.setItem(BOARD_THEME_STORAGE_KEY, theme.id);
    s?.removeItem(LEGACY_BOARD_THEME_STORAGE_KEY);
  } catch {
    /* the theme still applies for this visit */
  }
  set(theme);
  userPreferencesService.save({ boardTheme: theme.id });
}

/**
 * Re-resolve after the identity changes (sign-in, sign-out). The old hook
 * re-read storage and the server on every mount, so the next page always
 * showed the new person's board; a store that lives for the whole visit has to
 * be told instead.
 */
export function reloadBoardTheme() {
  set(fromStorage());
  if (started) loadFromServer();
}

export function useBoardTheme() {
  const currentTheme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { currentTheme, changeTheme: changeBoardTheme };
}

/** Tests only: forget everything, as a fresh page load would. */
export function resetBoardThemeStoreForTests() {
  current = null;
  started = false;
  localChanges = 0;
  migratedThisLoad = null;
  listeners.clear();
}

function applyTheme(theme: BoardTheme) {
  if (typeof document === 'undefined') return;
  const s = document.documentElement.style;
  s.setProperty('--board-light-square', theme.colors.lightSquare);
  s.setProperty('--board-dark-square', theme.colors.darkSquare);
  s.setProperty('--board-last-move', theme.colors.lastMove);
  s.setProperty('--board-selected', theme.colors.selected);
  s.setProperty('--board-pattern', `url("${checkerboardSvg(theme.colors.lightSquare, theme.colors.darkSquare)}")`);
}

function checkerboardSvg(lightColor: string, darkColor: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">
      <g id="a">
        <g id="b">
          <g id="c">
            <g id="d">
              <rect width="1" height="1" fill="${lightColor}"/>
              <use x="1" y="1" href="#e"/>
              <rect y="1" width="1" height="1" id="e" fill="${darkColor}"/>
              <use x="1" y="-1" href="#e"/>
            </g>
            <use x="2" href="#d"/>
          </g>
          <use x="4" href="#c"/>
        </g>
        <use y="2" href="#b"/>
      </g>
      <use y="4" href="#a"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
