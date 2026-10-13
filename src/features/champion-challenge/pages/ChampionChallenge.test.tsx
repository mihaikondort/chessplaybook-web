import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SiteShell } from '@/app/SiteShell';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation" />,
}));

vi.mock('@/components/SeoHead', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/ChampionPicker', () => ({
  ChampionPicker: ({
    length,
    onSelect,
  }: {
    length: 5 | 10 | 20;
    onSelect: (champion: string, length: 5 | 10 | 20) => void;
  }) => (
    <button data-testid="champion-picker" onClick={() => onSelect('Kasparov', length)}>
      Select champion for {length}
    </button>
  ),
}));

vi.mock('../components/HowItWorks', () => ({
  HowItWorks: () => <aside data-testid="how-it-works">How it works</aside>,
}));

import ChampionChallenge from './ChampionChallenge';

/*
  The session is its own route since #68. This stands in for it: it shows what
  the picker handed over and goes back the way "Pick another champion" does,
  with the length in navigation state.
*/
function FixtureSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const length = (location.state as { length?: number } | null)?.length;
  return (
    <button onClick={() => navigate('/champion-challenge', { state: { length } })}>
      Exit fixture session at {location.pathname} for {length}
    </button>
  );
}

function renderPicker() {
  return render(
    <MemoryRouter initialEntries={['/champion-challenge']}>
      <SiteShell>
        <Routes>
          <Route path="/champion-challenge" element={<ChampionChallenge />} />
          <Route path="/champion-challenge/:champion" element={<FixtureSession />} />
        </Routes>
      </SiteShell>
    </MemoryRouter>,
  );
}

describe('ChampionChallenge page shell', () => {
  it('keeps one semantic H1 and both structured-data blocks in the compact shell', () => {
    const { container } = renderPicker();

    const heading = screen.getByRole('heading', { level: 1, name: 'Champion Challenge' });
    expect(heading.closest('.sr-only')).not.toBeNull();
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(2);
  });

  it('puts How it works between setup and the champions (#68, owner)', () => {
    // It used to come after the champions, where on a phone nobody reached it
    // (y=2805 of 4118). It sits under setup now: a strip on desktop, one
    // collapsed row on a phone, so the first champion card barely moves.
    renderPicker();

    const setup = screen.getByTestId('challenge-setup');
    const support = screen.getByTestId('how-it-works');
    const picker = screen.getByTestId('champion-picker');
    expect(setup.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(support.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the session at /champion-challenge/<champion> and keeps the length across it', async () => {
    renderPicker();

    fireEvent.click(screen.getByRole('button', { name: '20' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select champion for 20' }));
    fireEvent.click(await screen.findByRole('button', {
      name: 'Exit fixture session at /champion-challenge/kasparov for 20',
    }));

    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Select champion for 20' })).toBeVisible();
  });
});
