import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { THEME_STORAGE_KEY } from './theme';

/* A controllable `prefers-color-scheme: dark`. */
let systemDark = false;
const listeners = new Set<(e: { matches: boolean }) => void>();
function setSystemDark(v: boolean) {
  systemDark = v;
  listeners.forEach((l) => l({ matches: v }));
}

beforeEach(() => {
  systemDark = false;
  listeners.clear();
  localStorage.clear();
  vi.stubGlobal('matchMedia', (q: string) => ({
    media: q,
    get matches() { return systemDark; },
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
  }));
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="state">{`${preference}/${resolved}`}</span>
      <button onClick={() => setPreference('light')}>light</button>
      <button onClick={() => setPreference('system')}>system</button>
    </div>
  );
}
const state = () => screen.getByTestId('state').textContent;
const html = () => document.documentElement.getAttribute('data-theme');

describe('ThemeProvider', () => {
  it('with choice off, stays dark and ignores a stored light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(<ThemeProvider choiceEnabled={false}><Probe /></ThemeProvider>);
    expect(state()).toBe('dark/dark');
    expect(html()).toBe('dark');
    act(() => { screen.getByText('light').click(); });
    expect(state()).toBe('dark/dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light'); // untouched, not rewritten
  });

  it('with choice on, applies and stores a choice', () => {
    render(<ThemeProvider choiceEnabled><Probe /></ThemeProvider>);
    expect(state()).toBe('dark/dark');
    act(() => { screen.getByText('light').click(); });
    expect(state()).toBe('light/light');
    expect(html()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('follows the OS only while the preference is system', () => {
    render(<ThemeProvider choiceEnabled><Probe /></ThemeProvider>);
    act(() => { screen.getByText('light').click(); });
    act(() => setSystemDark(true));
    expect(state()).toBe('light/light');

    act(() => { screen.getByText('system').click(); });
    expect(state()).toBe('system/dark');
    act(() => setSystemDark(false));
    expect(state()).toBe('system/light');
    expect(html()).toBe('light');
  });

  it('follows another tab', () => {
    render(<ThemeProvider choiceEnabled><Probe /></ThemeProvider>);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' }));
    });
    expect(state()).toBe('light/light');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'nonsense' }));
    });
    expect(state()).toBe('dark/dark');
  });
});
