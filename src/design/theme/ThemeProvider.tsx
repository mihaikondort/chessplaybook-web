/**
 * The app theme at runtime (plan §4 B3). Replaces `next-themes`, which was
 * installed and never mounted: Sonner called its `useTheme()` with no provider
 * and always got `system`.
 *
 * The pre-paint script has already put the right theme on `<html>` before
 * React runs, so the first render only confirms it. After that this owns it:
 *
 *   - follows the operating system ONLY while the preference is `system`,
 *     so a visitor who chose light or dark is never moved by an OS change;
 *   - follows other tabs through the `storage` event, so changing the theme in
 *     one tab changes it in all of them;
 *   - stores the choice with storage access wrapped, because a browser that
 *     blocks storage must still get a working page.
 *
 * Until F3 production ignores every stored preference and draws dark
 * (`THEME_CHOICE_LIVE`); the dev server honours it so B5 can be checked in
 * light.
 */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_PREFERENCE,
  THEME_CHOICE_LIVE,
  THEME_STORAGE_KEY,
  applyTheme,
  parsePreference,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  /** False until F3 in production: then `setPreference` does nothing. */
  choiceEnabled: boolean;
  setPreference: (preference: ThemePreference) => void;
}

const SYSTEM_DARK = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(SYSTEM_DARK).matches;
  } catch {
    return false;
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'dark',
  resolved: 'dark',
  choiceEnabled: false,
  setPreference: () => {},
});

export function ThemeProvider({
  children,
  choiceEnabled = THEME_CHOICE_LIVE || import.meta.env.DEV,
}: {
  children: ReactNode;
  /** Overridable for tests; the default is the rule above. */
  choiceEnabled?: boolean;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    choiceEnabled ? readStoredPreference() ?? DEFAULT_PREFERENCE : 'dark',
  );
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const resolved = choiceEnabled ? resolveTheme(preference, systemDark) : 'dark';

  // Before paint, so a change never shows one frame of the old theme.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, choiceEnabled ? preference : 'dark', resolved);
  }, [choiceEnabled, preference, resolved]);

  // The OS scheme matters only while the preference is `system`.
  useEffect(() => {
    if (!choiceEnabled || preference !== 'system') return;
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia(SYSTEM_DARK);
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [choiceEnabled, preference]);

  // Another tab changed it.
  useEffect(() => {
    if (!choiceEnabled) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return;
      setPreferenceState(parsePreference(e.newValue) ?? DEFAULT_PREFERENCE);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [choiceEnabled]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      if (!choiceEnabled) return;
      writeStoredPreference(next);
      setPreferenceState(next);
    },
    [choiceEnabled],
  );

  const value = useMemo(
    () => ({ preference: choiceEnabled ? preference : 'dark' as const, resolved, choiceEnabled, setPreference }),
    [choiceEnabled, preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
