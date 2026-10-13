import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendAPIClient } from '@/services/BackendAPIClient';
import {
  championGalleryApiUpgradeFixture,
  championGalleryPlayersFixture,
} from '@/features/champions/testFixtures';

vi.mock('@/components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock('@/components/SeoHead', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import Champions from './Champions';

function response(data: unknown): Response {
  return { json: vi.fn().mockResolvedValue(data) } as unknown as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Champions />
    </MemoryRouter>,
  );
}

describe('Champions data and route contract', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the first successful static source and upgrades it from the API', async () => {
    const api = deferred<typeof championGalleryApiUpgradeFixture>();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(championGalleryPlayersFixture)));
    vi.spyOn(backendAPIClient, 'getPlayers').mockReturnValue(api.promise);

    renderPage();
    expect(await screen.findByText('The youngest world chess champion in history.')).toBeVisible();

    api.resolve(championGalleryApiUpgradeFixture);
    expect(await screen.findByText('API-upgraded champion biography.')).toBeVisible();
  });

  it('renders API data when the static source fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('static unavailable')));
    vi.spyOn(backendAPIClient, 'getPlayers').mockResolvedValue(championGalleryPlayersFixture);

    renderPage();
    expect(await screen.findByText('Dommaraju Gukesh')).toBeVisible();
    expect(screen.queryByText(/Failed to load some data/)).toBeNull();
  });

  it('renders a truthful contained state when both sources fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('static unavailable')));
    vi.spyOn(backendAPIClient, 'getPlayers').mockRejectedValue(new Error('api unavailable'));

    renderPage();
    expect(await screen.findByText('We couldn’t load the champions right now. Please try again later.')).toBeVisible();
    expect(screen.queryByText(/cached results/i)).toBeNull();
  });

  it('keeps a successful empty response distinct from source failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({})));
    vi.spyOn(backendAPIClient, 'getPlayers').mockResolvedValue({});

    renderPage();
    expect(await screen.findByText('The champion gallery is currently empty.')).toBeVisible();
    expect(screen.queryByText(/couldn’t load/i)).toBeNull();
  });

  it('preserves SEO structure and all existing card destinations', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(championGalleryPlayersFixture)));
    vi.spyOn(backendAPIClient, 'getPlayers').mockResolvedValue(championGalleryPlayersFixture);

    const { container } = renderPage();
    await screen.findByText('Dommaraju Gukesh');

    expect(screen.getByRole('heading', { level: 1, name: 'World Chess Champions' })).toBeVisible();
    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    /*
      THE FOOTER IS NOT THIS PAGE'S ANY MORE (#72). It moved to the content
      layout route, so asserting it here would test the shell through a page -
      and would have passed just as well against the arrangement where all 32
      pages rendered their own. `pageKind.test.tsx` owns it now, including the
      node-identity check a presence assertion cannot make.
    */
    expect(screen.getAllByRole('link', { name: 'View all games by Dommaraju Gukesh' })[0]).toHaveAttribute(
      'href',
      '/champions/gukesh/games',
    );
    expect(screen.getAllByRole('link', { name: /Best 100/ })[0]).toHaveAttribute(
      'href',
      '/champions/gukesh/best-games',
    );
    expect(screen.getAllByRole('link', { name: 'View all games by Dommaraju Gukesh' })[1]).toHaveAttribute(
      'href',
      '/champions/gukesh/games',
    );
  });
});
