import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SiteShell } from '@/app/SiteShell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChampionsList from './ChampionsList';
import { championsListPlayersFixture } from '@/features/champions/championsListTestFixtures';
import { CHAMPIONS_LIST_GC_TIME, CHAMPIONS_LIST_QUERY_KEY, CHAMPIONS_LIST_STALE_TIME } from '@/features/champions/championsListData';

vi.mock('@/components/Navigation', () => ({ Navigation: () => <nav>Navigation</nav> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }));
vi.mock('@/components/SeoHead', () => ({ default: ({ children }: { children?: React.ReactNode }) => <div data-testid="seo-head">{children}</div> }));

let queryClient: QueryClient;

function renderPage() {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  /*
    RENDERED INSIDE THE SHELL, because that is where the page lives (#55). The
    nav, the page frame and the footer belong to `SiteShell` now; a page test
    that mounted the page alone would assert a nav the page no longer owns.
  */
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><SiteShell><ChampionsList /></SiteShell></MemoryRouter></QueryClientProvider>);
}

function successfulResponse(data: unknown = championsListPlayersFixture) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => successfulResponse())));
afterEach(() => { queryClient?.clear(); vi.unstubAllGlobals(); });

describe('ChampionsList visual, data and SEO contract', () => {
  it('preserves newest-first rows while showing historical champion numbers', async () => {
    renderPage();
    const rows = within(await screen.findByRole('table', { name: 'Complete chronology' })).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(18);
    expect(rows[0]).toHaveTextContent('18');
    expect(rows[0]).toHaveTextContent('Dommaraju Gukesh');
    expect(rows.at(-1)).toHaveTextContent('1');
    expect(rows.at(-1)).toHaveTextContent('Wilhelm Steinitz');
  });

  it('keeps ItemList positions independent from historical champion numbers', async () => {
    renderPage();
    await screen.findByRole('table');
    const scripts = screen.getByTestId('seo-head').querySelectorAll('script');
    expect(scripts).toHaveLength(2);
    const itemList = JSON.parse(scripts[1].textContent ?? '{}');
    expect(itemList.numberOfItems).toBe(18);
    expect(itemList.itemListElement[0]).toMatchObject({ position: 1, item: { name: 'Dommaraju Gukesh' } });
    expect(itemList.itemListElement[17]).toMatchObject({ position: 18, item: { name: 'Wilhelm Steinitz' } });
  });

  it('uses one accessible internal Games destination per champion', async () => {
    renderPage();
    expect(await screen.findAllByRole('link', { name: /^View games by / })).toHaveLength(18);
    expect(screen.getByRole('link', { name: 'View games by Garry Kasparov' })).toHaveAttribute('href', '/champions/kasparov/games');
    expect(document.querySelector('a button, button a')).toBeNull();
  });

  it('retains native labelled table semantics and minimum-size controls', async () => {
    renderPage();
    const table = await screen.findByRole('table', { name: 'Complete chronology' });
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'View Champions Gallery' })).toHaveClass('min-h-10');
    expect(screen.getByRole('link', { name: 'View games by Dommaraju Gukesh' })).toHaveClass('min-h-10');
  });

  it('keeps shell and Breadcrumb SEO during loading without emitting a false ItemList', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('navigation')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('World Chess Champions List');
    // The footer belongs to the content layout route since #72, not to this
    // page and not to `SiteShell` - see `pageKind.test.tsx`.
    expect(screen.getByText('Loading champions list')).toBeInTheDocument();
    expect(screen.getByTestId('seo-head').querySelectorAll('script')).toHaveLength(1);
  });

  it('distinguishes successful empty data from total failure and supports retry', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => successfulResponse({}));
    const emptyView = renderPage();
    expect(await screen.findByText('No champions available')).toBeVisible();
    expect(screen.getByTestId('seo-head').querySelectorAll('script')).toHaveLength(2);
    emptyView.unmount();
    queryClient.clear();

    vi.mocked(fetch).mockRejectedValueOnce(new Error('network')).mockImplementationOnce(() => successfulResponse());
    renderPage();
    expect(await screen.findByText('Champions list unavailable')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });

  it('hides only a failed flag and retains the row metadata', async () => {
    const { container } = renderPage();
    await screen.findByRole('table');
    const flags = container.querySelectorAll<HTMLImageElement>('img[src*="flagcdn.com"]');
    expect(flags).toHaveLength(18);
    fireEvent.error(flags[0]);
    expect(container.querySelectorAll('img[src*="flagcdn.com"]')).toHaveLength(17);
    expect(screen.getByText('Dommaraju Gukesh')).toBeVisible();
    expect(screen.getAllByText('India').length).toBeGreaterThan(0);
  });

  it('retains the production query cache contract', async () => {
    renderPage();
    await screen.findByRole('table');
    const query = queryClient.getQueryCache().find({ queryKey: CHAMPIONS_LIST_QUERY_KEY });
    const options = query?.options as { staleTime?: number; gcTime?: number } | undefined;
    expect(options?.staleTime).toBe(CHAMPIONS_LIST_STALE_TIME);
    expect(options?.gcTime).toBe(CHAMPIONS_LIST_GC_TIME);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
