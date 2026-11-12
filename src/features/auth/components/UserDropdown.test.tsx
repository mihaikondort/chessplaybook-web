/**
 * The account menu closes on any press outside it, and on Escape (owner, 2026-11-12).
 *
 * It used to rely on a `fixed inset-0` backdrop, which the nav's `backdrop-blur` trapped
 * inside the nav bar (1902x58 at 1917x920), so a click on the page left the menu open.
 * jsdom has no layout, so it could never have caught that; what this pins is the
 * mechanism that replaced it, a document listener no ancestor can trap.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'Player One', email: 'one@example.com' },
    isLoading: false,
    signOutUser: vi.fn(),
  }),
}));
vi.mock('@/services/analytics', () => ({ logGA4Event: vi.fn() }));

import { UserDropdown } from './UserDropdown';

function renderMenu() {
  render(
    <MemoryRouter>
      <div>
        <p data-testid="outside">The page</p>
        <UserDropdown />
      </div>
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: /Account menu for Player One/ });
  fireEvent.click(trigger);
  return trigger;
}

const menuOpen = () => screen.queryByText('Signed in as') !== null;

afterEach(cleanup);

describe('the account menu', () => {
  it('closes when the page is pressed anywhere outside it', () => {
    renderMenu();
    expect(menuOpen()).toBe(true);
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(menuOpen()).toBe(false);
  });

  it('stays open when the press is inside it', () => {
    renderMenu();
    fireEvent.pointerDown(screen.getByText('Signed in as'));
    expect(menuOpen()).toBe(true);
  });

  it('closes on Escape', () => {
    renderMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menuOpen()).toBe(false);
  });

  it('still toggles from the avatar, without the outside listener reopening it', () => {
    const trigger = renderMenu();
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    expect(menuOpen()).toBe(false);
  });

  it('has no backdrop element left to trap', () => {
    renderMenu();
    expect(document.querySelector('.fixed.inset-0')).toBeNull();
  });
});

describe('the account menu', () => {
  it('opens the reminder emails page (owner: the switch was too hidden)', () => {
    renderMenu();
    const link = screen.getByRole('link', { name: 'Reminder emails' });
    expect(link.getAttribute('href')).toBe('/reminders');
  });
});
