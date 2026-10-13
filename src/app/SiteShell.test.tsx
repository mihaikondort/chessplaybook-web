import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { lazy, useEffect } from 'react';
import { SiteShell, useChrome } from './SiteShell';
import { WorkspaceKindLayout } from './WorkspaceKindLayout';

/* Forwards `hidden` the way the real nav does: a marker and `inert`. */
vi.mock('@/components/Navigation', () => ({
  Navigation: ({ hidden }: { hidden?: boolean }) => (
    <nav data-testid="site-nav" data-chrome-hidden={hidden || undefined} {...(hidden ? { inert: '' } : {})} />
  ),
}));

function PageA() {
  return <div><span>page a</span><Link to="/b">go to b</Link></div>;
}
function PageB() {
  return <span>page b</span>;
}
function FocusPage({ focus }: { focus: boolean }) {
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focus);
    return () => setChromeHidden(false);
  }, [focus, setChromeHidden]);
  return <span>focus page</span>;
}

function renderApp(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<SiteShell />}>
          <Route path="/" element={<PageA />} />
          <Route path="/b" element={<PageB />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('SiteShell', () => {
  it('renders exactly one nav', () => {
    renderApp();
    expect(screen.getAllByTestId('site-nav')).toHaveLength(1);
  });

  /*
    THE POINT OF THE WHOLE CHANGE (#55).

    Before this, 43 pages each rendered their own `<Navigation />`, so navigating
    unmounted one nav and mounted another - a different element every time, which
    is why the bar could differ by route and why "is it the same?" could only be
    answered by measuring it.

    Asserting the same DOM NODE, not merely that a nav is present. A test for
    presence passes just as happily against the old arrangement, where a nav was
    always present and never the same one.
  */
  it('keeps the very same nav element across a navigation', async () => {
    renderApp();
    const before = screen.getByTestId('site-nav');
    expect(screen.getByText('page a')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('go to b').click();
    });

    expect(screen.getByText('page b')).toBeInTheDocument();
    const after = screen.getByTestId('site-nav');
    expect(after).toBe(before);
  });

  /*
    FOCUS MODE KEEPS THE NAV (C1a). It used to be unmounted, so leaving focus
    mode made the bar a new element. Now the SAME node goes inert and comes
    back, which is what this asserts, not merely that a nav is present.
  */
  it('hides the chrome when a page asks, as the same inert node, and restores it', () => {
    const { rerender } = render(
      <MemoryRouter>
        <SiteShell><FocusPage focus={false} /></SiteShell>
      </MemoryRouter>,
    );
    const nav = screen.getByTestId('site-nav');
    expect(nav.hasAttribute('inert')).toBe(false);

    rerender(
      <MemoryRouter>
        <SiteShell><FocusPage focus /></SiteShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('site-nav')).toBe(nav);
    expect(nav.hasAttribute('inert')).toBe(true);
    expect(nav.hasAttribute('data-chrome-hidden')).toBe(true);

    rerender(
      <MemoryRouter>
        <SiteShell><FocusPage focus={false} /></SiteShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('site-nav')).toBe(nav);
    expect(nav.hasAttribute('inert')).toBe(false);
  });

  /*
    THE HOLE CODEX FOUND, PINNED.

    The Suspense boundary used to wrap <Routes>, ABOVE the shell, so a route whose
    chunk had not loaded suspended to a boundary that owned the nav too - and the
    fallback replaced the entire tree. It is rare in practice only because Vite
    emits `modulepreload` for route chunks, which is a property of the bundler,
    not a guarantee of the layout.

    A lazy component that NEVER resolves makes the suspension certain, so this
    does not depend on network timing the way a browser probe would. With the
    boundary above the shell this fails: there is no nav to find.
  */
  /*
    Since C1a the boundary is inside the page region, so the page's KIND stays
    mounted too (spec §1.1): a loading page cannot unlock a Workspace shell.
    Every real route sits in a kind layout, as this one does.
  */
  it('keeps the nav, and the page region with its kind, while a lazy route is still loading', async () => {
    const NeverLoads = lazy(() => new Promise<never>(() => {}));
    const { container } = render(
      <MemoryRouter initialEntries={['/slow']}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route element={<WorkspaceKindLayout />}>
              <Route path="/slow" element={<NeverLoads />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-nav')).toBeVisible();
    expect(container.querySelector('[data-kind="workspace"]')).not.toBeNull();
  });

  it('refuses to be used outside the shell rather than silently doing nothing', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<MemoryRouter><FocusPage focus /></MemoryRouter>)).toThrow(/inside SiteShell/);
    quiet.mockRestore();
  });
});
