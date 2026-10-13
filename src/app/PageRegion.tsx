import { Suspense, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * The page kinds of LAYOUT_SPEC §1. (A fourth value, `legacy`, marked the board
 * routes during the migration, A6 to D4b; it went with `AppLayout` in F2.)
 */
export type PageKind = 'workspace' | 'document' | 'focused';

/**
 * THE PAGE REGION: the one element that carries the route's kind.
 *
 * The kind is a static property of the route, declared once in the router by
 * which layout group the route sits in. It is never derived from a measurement,
 * a container query or the viewport.
 *
 * STILL A FLEX COLUMN, AND IT HAS TO BE. Until A6 the page and the footer were
 * flex children of the shell's own `flex flex-1 flex-col` wrapper: the footer's
 * `mt-auto` and the fitted pages' height chain both depend on that. Inserting a
 * plain block here would quietly break both, so the region repeats the same
 * three classes and every page sees exactly the parent it saw before.
 *
 * A DIRECT CHILD OF THE SHELL since C1a (spec §1, DOM contract): the shell's
 * second grid row. `pageKind.test.tsx` asserts it.
 */
export function PageRegion({ kind, children }: { kind: PageKind; children: ReactNode }) {
  return (
    <div data-kind={kind} className="flex flex-1 flex-col">
      {children}
    </div>
  );
}

/**
 * Shown while a route's chunk loads. Fills the page region, so the nav above
 * it stays put and the page does not jump.
 */
export function RouteFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * The route's page, inside its own Suspense boundary (C1a). The boundary is
 * INSIDE the page region and around the page only: a page whose chunk is
 * still loading keeps the nav AND the region carrying `data-kind`, so it can
 * neither take the chrome off screen nor unlock a Workspace shell (spec §1.1).
 */
export function PageOutlet() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}
