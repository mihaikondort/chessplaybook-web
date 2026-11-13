/**
 * Every link below the chooser is measured (owner D1; visual redesign plan C4): `home_section_click` with its
 * section, destination and position, and never `home_choice_click`, whose series must keep counting only the
 * six chooser cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomeSections from './HomeSections';
import { newsArticles } from '@/config/newsArticles';

const logGA4Event = vi.fn();
vi.mock('@/services/analytics', () => ({
  logGA4Event: (...args: unknown[]) => logGA4Event(...args),
}));

beforeEach(() => {
  logGA4Event.mockClear();
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ Fischer: { fullName: 'Robert James Fischer', championshipYears: '1972-1975' } }) })));
});

const renderSections = () => render(<MemoryRouter><HomeSections /></MemoryRouter>);
const sectionEvents = () => logGA4Event.mock.calls.map(([e]) => e).filter((e) => e.name === 'home_section_click').map((e) => e.params);

describe('HomeSections: every link is measured', () => {
  it('the Journey card call to action', () => {
    renderSections();
    fireEvent.click(screen.getByRole('link', { name: /Solve a puzzle/ }));
    expect(sectionEvents()).toEqual([{ section: 'journey', to: '/puzzles', position: 0 }]);
  });

  it('the featured champion, at its index among the three', () => {
    renderSections();
    fireEvent.click(screen.getByRole('link', { name: /Featured champion/ }));
    expect(sectionEvents()).toEqual([{ section: 'featured', to: '/champions/fischer/games', position: 0 }]);
  });

  it('a strip card at its slot, and the strip\'s "All champions" at -1', () => {
    renderSections();
    fireEvent.click(screen.getByRole('link', { name: 'Capablanca' }));
    fireEvent.click(screen.getByRole('link', { name: /All champions/ }));
    expect(sectionEvents()).toEqual([
      { section: 'strip', to: '/champions/capablanca/games', position: 0 },
      { section: 'strip', to: '/champions', position: -1 },
    ]);
  });

  it('each news article at its index, and "All news" at -1', () => {
    renderSections();
    const news = screen.getByRole('heading', { name: 'Latest news' }).closest('section')!;
    const links = within(news).getAllByRole('link');
    fireEvent.click(links[0]);                                // All news
    fireEvent.click(links[2]);                                // the second article
    expect(sectionEvents()).toEqual([
      { section: 'news', to: '/news', position: -1 },
      { section: 'news', to: newsArticles[1].href, position: 1 },
    ]);
  });

  it('never fires home_choice_click', () => {
    renderSections();
    for (const a of screen.getAllByRole('link')) fireEvent.click(a);
    expect(logGA4Event.mock.calls.every(([e]) => e.name === 'home_section_click')).toBe(true);
    expect(sectionEvents().length).toBe(screen.getAllByRole('link').length);
  });

  it('never downloads a hover-only colour portrait on a touch screen', () => {
    const { container } = renderSections();
    const sources = [...container.querySelectorAll('picture source')];
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s.getAttribute('media')).toBe('(hover: none)');
      expect(s.getAttribute('srcset')).toMatch(/^data:image\/gif/);
    }
  });
});
