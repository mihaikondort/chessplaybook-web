import { useContext, useMemo, useState, type ReactNode } from 'react';
import { ChromeContext, type Chrome } from './chromeContext';
import { Outlet } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';

/**
 * WHAT THIS IS FOR.
 *
 * Until #55 there was no shell. Forty-three page components each wrote
 * `<Navigation />` into their own JSX, so navigating unmounted one page together
 * with its nav and mounted another page with its own. There was never a single
 * instance to be consistent, which is why the bar could differ by route at all -
 * different width on `/puzzles`, different type on `/analysis`, a visible
 * correction after paint - and why every fix had to be verified by measurement
 * rather than guaranteed by construction.
 *
 * This is a LAYOUT ROUTE: it is the parent of every page, it renders the chrome
 * once, and `<Outlet />` is where the page goes. React reconciles only the
 * outlet's subtree on navigation, so the nav element is never unmounted and
 * never re-created. "The menu row changes between pages" stops being something
 * to test and becomes something that cannot happen.
 *
 * It also owns the page FRAME - the `min-h-screen` flex column the 42 pages each
 * declared for themselves. The frame belongs to whoever owns the chrome inside
 * it; a page that declared its own was really declaring the shell's.
 */


/**
 * Hide or show the site chrome from inside a page.
 *
 * Returns a stable setter. Call it from an effect keyed on your own state, and
 * restore it when that state clears or when the page unmounts - a page that
 * leaves focus mode by navigating away would otherwise hide the nav on every
 * route after it.
 */
export function useChrome(): Chrome {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    throw new Error('useChrome must be used inside SiteShell. Every page route is a child of it.');
  }
  return ctx;
}

export function SiteShell({ children }: { children?: ReactNode }) {
  const [chromeHidden, setChromeHidden] = useState(false);
  const value = useMemo(() => ({ setChromeHidden, chromeHidden }), [chromeHidden]);

  return (
    <ChromeContext.Provider value={value}>
      {/*
        THE SHELL IS A TWO-ROW GRID WITH EXACTLY TWO CHILDREN (spec §1, layout
        redesign C1a): the `<nav>` and the page region, which is the kind
        layout's element carrying `data-kind`. No wrapper between them: the
        Workspace lock is `:has(> [data-kind="workspace"])` on this element and
        only sees a DIRECT child. The rows, the lock and the print reset are in
        `index.css` under `[data-shell]`, because `min-block-size` needs its
        `100vh` fallback before `100dvh`, which a class cannot express.

        THE SUSPENSE BOUNDARY MOVED INTO THE PAGE REGION. It used to wrap
        `<Routes>` (above the shell, so a loading chunk replaced the nav), then
        sat here around a wrapper div. It is now inside each kind layout,
        around the page only, so a loading page keeps both the nav and its own
        region, `data-kind` included, and cannot unlock a Workspace shell.
      */}
      <div data-shell className="bg-background">
        {/*
          FOCUS MODE KEEPS THE NAV MOUNTED (C1a). It used to be unmounted, which
          threw away its state and made the bar a new element on the way back,
          the defect #55 exists to prevent. Now it stays, collapsed to a zero
          row and `inert`, so it cannot take focus, be clicked or be read.
        */}
        <Navigation hidden={chromeHidden} />
        {children ?? <Outlet />}
      </div>
    </ChromeContext.Provider>
  );
}
