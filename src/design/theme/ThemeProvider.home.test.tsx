/**
 * The homepage is always dark while the v2 homepage is on (owner D3; visual redesign plan C3), through IN-APP
 * navigation too: the pre-paint script covers a full load only. The switches are mocked on here; with them off
 * the provider behaves exactly as ThemeProvider.test.tsx pins.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider, ThemeRouteSync } from './ThemeProvider';
import { NavThemeButton } from '@/components/ThemeToggle';

vi.mock('@/design/designFlags', () => ({ DESIGN_V2_LIVE: false, HOME_V2_LIVE: true }));
vi.mock('@/services/analytics', () => ({ logGA4Event: () => {} }));

let go: (to: string) => void = () => {};
function Navigator() { const n = useNavigate(); go = (to) => n(to); return null; }

function renderAt(path: string) {
  return render(
    <ThemeProvider choiceEnabled>
      <MemoryRouter initialEntries={[path]}>
        <ThemeRouteSync />
        <Navigator />
        <NavThemeButton />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const root = () => document.documentElement;

beforeEach(() => {
  localStorage.setItem('chessplaybook_theme', 'light');
  root().removeAttribute('data-theme');
  root().removeAttribute('data-design');
});

describe('the v2 homepage is always dark', () => {
  it('on /, a stored light preference draws dark, in design v2, and the stored value is untouched', () => {
    renderAt('/');
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().getAttribute('data-design')).toBe('v2');
    expect(localStorage.getItem('chessplaybook_theme')).toBe('light');
  });

  it('navigating away restores the visitor\'s light theme, and coming back is dark again', () => {
    renderAt('/');
    act(() => go('/puzzles'));
    expect(root().getAttribute('data-theme')).toBe('light');
    expect(root().getAttribute('data-design')).toBeNull();
    act(() => go('/'));
    expect(root().getAttribute('data-theme')).toBe('dark');
    expect(root().getAttribute('data-design')).toBe('v2');
  });

  it('a change from another tab while on / stays dark there and applies on the next page', () => {
    localStorage.setItem('chessplaybook_theme', 'dark');
    renderAt('/');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: 'chessplaybook_theme', newValue: 'light' })); });
    expect(root().getAttribute('data-theme')).toBe('dark');
    act(() => go('/news'));
    expect(root().getAttribute('data-theme')).toBe('light');
  });

  it('the nav theme button is hidden IN PLACE on / (the row keeps its box) and back elsewhere', () => {
    const { container } = renderAt('/');
    const hidden = container.querySelector('button')!;
    expect(hidden.className).toContain('invisible');
    expect(hidden.getAttribute('aria-hidden')).toBe('true');
    expect(hidden.tabIndex).toBe(-1);
    expect(screen.queryByRole('button', { name: /Switch to/ })).toBeNull();
    act(() => go('/puzzles'));
    expect(screen.getByRole('button', { name: /Switch to dark theme/ })).toBeTruthy();
  });
});
