import { Footer } from '@/components/Footer';
import { PageOutlet, PageRegion } from './PageRegion';

/**
 * A DOCUMENT PAGE: read and left, scrolled by the window, and the site's footer
 * belongs at the bottom of it. (Called `ContentLayout` until A6 of the layout
 * redesign gave the kinds their spec names.)
 *
 * WHY THIS IS A ROUTE AND NOT A PROP. Until #72 the footer was written into 35
 * places across 32 page components, every one a bare `<Footer />` - the same
 * defect #55 removed from the nav, one component over, and for the same reason:
 * the site grew a page at a time and each new page copied the previous one's
 * shape. So the footer was a different element on every route, and whether a
 * page had one was decided by which file somebody copied.
 *
 * WHY IT NESTS INSIDE `SiteShell` RATHER THAN BESIDE IT. The obvious shape is
 * two sibling layout routes, `<SiteShell withFooter />` and `<SiteShell />`.
 * That would DESTROY the guarantee #55 exists for: two sibling routes are two
 * branches, so navigating from one kind to another unmounts one shell and
 * mounts the other, and the nav is a new DOM node again. One shell, the kind
 * layouts inside it, and the chrome never moves.
 *
 * The footer is a SIBLING of the page, which is what it already was - every one
 * of those 32 pages rendered `<><div>...</div><Footer /></>`, so hoisting it
 * changes nothing about the box it sits in.
 */
export function DocumentLayout() {
  return (
    <PageRegion kind="document">
      <PageOutlet />
      <Footer />
    </PageRegion>
  );
}
