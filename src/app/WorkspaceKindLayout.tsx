import { PageOutlet, PageRegion } from './PageRegion';

/**
 * A WORKSPACE PAGE: a board you work on, locked to the viewport (spec §1).
 *
 * Every board page is here since D4b (champion and live viewers since E4b-E5);
 * a route joined it in the commit its page moved onto the `Workspace` primitive.
 * `pageKind.test.tsx` holds the rule.
 */
export function WorkspaceKindLayout() {
  return (
    <PageRegion kind="workspace">
      <PageOutlet />
    </PageRegion>
  );
}
