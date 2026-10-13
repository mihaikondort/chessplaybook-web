/**
 * The homepage chooser grid is a measurement instrument (which card a visitor
 * picks, and from which position), so these tests pin the properties the *analysis*
 * depends on — array order, the event payload, and News staying quiet — not
 * just "it renders".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Features } from './Features';
import { featureCards } from '@/config/featureCards';

const logGA4Event = vi.fn();
vi.mock('@/services/analytics', () => ({
  logGA4Event: (...args: unknown[]) => logGA4Event(...args),
}));

const renderGrid = () =>
  render(
    <MemoryRouter>
      <Features />
    </MemoryRouter>,
  );

beforeEach(() => {
  logGA4Event.mockClear();
  // jsdom ships no matchMedia. The grid asks it two questions — column count
  // and prefers-reduced-motion — so without this the component throws and
  // every render test fails for a reason unrelated to what it asserts.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('min-width'), // desktop, motion allowed
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
});

describe('featureCards config', () => {
  it('has exactly six cards', () => {
    expect(featureCards).toHaveLength(6);
  });

  it('puts News last, because array order is grid order and position is measured', () => {
    expect(featureCards[featureCards.length - 1].href).toBe('/news');
  });

  it('marks News — and only News — as secondary', () => {
    const secondary = featureCards.filter((c) => c.tier === 'secondary');
    expect(secondary.map((c) => c.href)).toEqual(['/news']);
  });

  it('leads with the two features that need no opponent and no waiting', () => {
    // Ordering is by probability of a satisfying first experience for a cold
    // visitor, not by aesthetics. If this changes, the analysis's reading of
    // click share by position changes with it.
    expect(featureCards[0].href).toBe('/explain');
    expect(featureCards[1].href).toBe('/puzzles');
  });

  it('gives every card a mobile-safe title', () => {
    // Mobile renders `shortTitle ?? title` inside a fixed-height card with
    // overflow-hidden. "Champion Challenge" was clipped by exactly this once.
    for (const card of featureCards) {
      const mobileLabel = card.shortTitle ?? card.title;
      expect(mobileLabel.length, `${card.href} mobile label too long`).toBeLessThanOrEqual(12);
    }
  });

  it('has no duplicate destinations', () => {
    const hrefs = featureCards.map((c) => c.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('Features grid', () => {
  it('renders one link per card, pointing where the config says', () => {
    renderGrid();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(featureCards.length);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(featureCards.map((c) => c.href));
  });

  it('logs home_choice_click with the destination and its grid position', () => {
    renderGrid();

    // The News card — last, and the one whose click share is most at risk of
    // being misread, so it is the one worth pinning.
    const newsIndex = featureCards.findIndex((c) => c.href === '/news');
    fireEvent.click(screen.getAllByRole('link')[newsIndex]);

    expect(logGA4Event).toHaveBeenCalledWith({
      name: 'home_choice_click',
      params: { to: '/news', position: newsIndex },
    });
  });

  it('reports the first card at position 0, so shares are not off by one', () => {
    renderGrid();

    fireEvent.click(screen.getAllByRole('link')[0]);

    expect(logGA4Event).toHaveBeenCalledWith({
      name: 'home_choice_click',
      params: { to: featureCards[0].href, position: 0 },
    });
  });
});
