import { PageOutlet, PageRegion } from './PageRegion';

/**
 * A FOCUSED PAGE: one short task, no footer. Sign-in, sign-up and the password
 * flows.
 *
 * These sat in the app group until A6, with a comment saying they were "not
 * really either kind" and that a third kind was a product question. The
 * contract settled it: they are their own kind, and they keep exactly what they
 * had, document scroll and no footer.
 */
export function FocusedLayout() {
  return (
    <PageRegion kind="focused">
      <PageOutlet />
    </PageRegion>
  );
}
