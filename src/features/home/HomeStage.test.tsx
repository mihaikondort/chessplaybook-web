/**
 * The design v2 homepage stage (visual redesign plan C1a, C2, C4). The chooser is a measurement instrument,
 * so these pin what the analysis depends on, exactly as Features.test.tsx does for today's grid: the same six
 * destinations in the same order, the same `home_choice_click` payload, a secondary card quiet; and the headline is
 * route-meta's, with the accent drawn from its own words.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeStage } from './HomeStage';
import { featureCards } from '@/config/featureCards';
import routeMeta from '@/config/route-meta.json';

const logGA4Event = vi.fn();
vi.mock('@/services/analytics', () => ({
  logGA4Event: (...args: unknown[]) => logGA4Event(...args),
}));

const renderStage = () => render(<MemoryRouter><HomeStage /></MemoryRouter>);
beforeEach(() => logGA4Event.mockClear());

describe('HomeStage (design v2 homepage)', () => {
  it('renders the six chooser destinations in featureCards order', () => {
    renderStage();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(featureCards.map((c) => c.href));
  });

  it('logs home_choice_click exactly as today, position included', () => {
    renderStage();
    const last = featureCards.length - 1;
    fireEvent.click(screen.getAllByRole('link')[last]);
    fireEvent.click(screen.getAllByRole('link')[0]);
    expect(logGA4Event).toHaveBeenCalledWith({ name: 'home_choice_click', params: { to: featureCards[last].href, position: last } });
    expect(logGA4Event).toHaveBeenCalledWith({ name: 'home_choice_click', params: { to: featureCards[0].href, position: 0 } });
    expect(logGA4Event).toHaveBeenCalledTimes(2);
  });

  it('draws a secondary card quiet (muted icon) and every other card gold (owner D5)', () => {
    const { container } = renderStage();
    const icons = [...container.querySelectorAll('a > svg')];
    expect(icons).toHaveLength(featureCards.length);
    featureCards.forEach((card, i) => {
      const cls = icons[i].getAttribute('class') ?? '';
      if (card.tier === 'secondary') {
        expect(cls).toContain('text-muted-foreground');
        expect(cls).not.toContain('v2-gold-icon');
      } else {
        expect(cls).toContain('v2-gold-icon');
      }
    });
  });

  it("draws the h1 from route-meta, its last headingAccentWords words in gold", () => {
    renderStage();
    const meta = routeMeta[''] as { heading: string; headingAccentWords: number };
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(meta.heading);
    const accent = h1.querySelector('.v2-gold-text');
    expect(accent?.textContent).toBe(meta.heading.split(' ').slice(-meta.headingAccentWords).join(' '));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('gives the hero photo a srcset with width descriptors (no single 2400px file for phones)', () => {
    const { container } = renderStage();
    const img = container.querySelector('img.v2-stage-img');
    expect(img?.getAttribute('srcset')).toMatch(/720w, .*1200w, .*2400w/);
    expect(img?.getAttribute('sizes')).toContain('100vw');
  });
});
