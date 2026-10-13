import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { BOARD_THEME_STORAGE_KEY, LEGACY_BOARD_THEME_STORAGE_KEY, defaultTheme } from '@/config/boardThemes';

/* The server's answer is controlled per test. */
let resolveServer: (v: { boardTheme?: string } | null) => void = () => {};
vi.mock('@/services/UserPreferencesService', () => ({
  userPreferencesService: {
    loadFromServer: vi.fn(() => new Promise((r) => { resolveServer = r; })),
    save: vi.fn(),
  },
}));

import { useBoardTheme, reloadBoardTheme, resetBoardThemeStoreForTests } from './useBoardTheme';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { ChessBoard } from '@/components/chess/ChessBoard';

function Show({ label }: { label: string }) {
  const { currentTheme, changeTheme } = useBoardTheme();
  return (
    <div>
      <span data-testid={label}>{currentTheme.id}</span>
      <button onClick={() => changeTheme('green')}>{`pick-${label}`}</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  resetBoardThemeStoreForTests();
  vi.mocked(userPreferencesService.loadFromServer).mockClear();
  vi.mocked(userPreferencesService.save).mockClear();
});
afterEach(() => resetBoardThemeStoreForTests());

describe('the one board-theme resolver', () => {
  it('starts from this browser\'s choice, synchronously, before the server answers', () => {
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, 'green');
    render(<Show label="a" />);
    expect(screen.getByTestId('a').textContent).toBe('green');
  });

  it('migrates a legacy-only choice once and deletes the legacy key', () => {
    localStorage.setItem(LEGACY_BOARD_THEME_STORAGE_KEY, 'classic-brown');
    render(<Show label="a" />);
    expect(screen.getByTestId('a').textContent).toBe('classic-brown');
    expect(localStorage.getItem(BOARD_THEME_STORAGE_KEY)).toBe('classic-brown');
    expect(localStorage.getItem(LEGACY_BOARD_THEME_STORAGE_KEY)).toBeNull();
  });

  /*
    The regression this guards: the server answers `blue` for anyone who never
    chose (D16). A migrated legacy choice must survive that answer and reach
    the server, or the visitor's only real choice is erased.
  */
  it('keeps a migrated legacy choice against the server default, and saves it', async () => {
    localStorage.setItem(LEGACY_BOARD_THEME_STORAGE_KEY, 'classic-brown');
    render(<Show label="a" />);
    await act(async () => { resolveServer({ boardTheme: 'blue' }); });
    expect(screen.getByTestId('a').textContent).toBe('classic-brown');
    expect(userPreferencesService.save).toHaveBeenCalledWith({ boardTheme: 'classic-brown' });
  });

  /* The bug B4 closes: ChessBoard let the legacy key win. */
  it('prefers the current key over the legacy one, and still deletes the legacy key', () => {
    localStorage.setItem(LEGACY_BOARD_THEME_STORAGE_KEY, 'classic-brown');
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, 'green');
    render(<Show label="a" />);
    expect(screen.getByTestId('a').textContent).toBe('green');
    expect(localStorage.getItem(LEGACY_BOARD_THEME_STORAGE_KEY)).toBeNull();
  });

  it('is one state: a change in one component reaches every other', () => {
    render(<><Show label="a" /><Show label="b" /></>);
    act(() => { screen.getByText('pick-a').click(); });
    expect(screen.getByTestId('b').textContent).toBe('green');
    expect(localStorage.getItem(BOARD_THEME_STORAGE_KEY)).toBe('green');
  });

  it('asks the server once, however many components mount', () => {
    render(<><Show label="a" /><Show label="b" /><Show label="c" /></>);
    expect(userPreferencesService.loadFromServer).toHaveBeenCalledTimes(1);
  });

  it('takes the server\'s choice when it answers', async () => {
    render(<Show label="a" />);
    await act(async () => { resolveServer({ boardTheme: 'purple' }); });
    expect(screen.getByTestId('a').textContent).toBe('purple');
  });

  it('never lets a late server answer overwrite a choice made after it was asked', async () => {
    render(<Show label="a" />);
    act(() => { screen.getByText('pick-a').click(); });
    await act(async () => { resolveServer({ boardTheme: 'purple' }); });
    expect(screen.getByTestId('a').textContent).toBe('green');
  });

  it('re-resolves after an identity change (sign-out clears the key)', () => {
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, 'green');
    render(<Show label="a" />);
    localStorage.removeItem(BOARD_THEME_STORAGE_KEY);
    act(() => reloadBoardTheme());
    expect(screen.getByTestId('a').textContent).toBe(defaultTheme.id);
  });
});

describe('ChessBoard reads the resolver', () => {
  const lightOf = (c: HTMLElement) =>
    (c.querySelector('.chess-board-wrapper') as HTMLElement).style.getPropertyValue('--cg-light');

  it('follows the store when no themeId is given, and the store\'s changes', () => {
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, 'classic-brown');
    const { container } = render(<><ChessBoard fen="8/8/8/8/8/8/8/K6k w - - 0 1" /><Show label="a" /></>);
    expect(lightOf(container)).toBe('#f0d9b5');
    act(() => { screen.getByText('pick-a').click(); });
    expect(lightOf(container)).not.toBe('#f0d9b5');
  });

  it('honours an explicit themeId', () => {
    const { container } = render(<ChessBoard fen="8/8/8/8/8/8/8/K6k w - - 0 1" themeId="classic-brown" />);
    expect(lightOf(container)).toBe('#f0d9b5');
  });
});
