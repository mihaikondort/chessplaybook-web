import type { ReactNode } from 'react';
import { WorkspaceCard } from '@/components/workspace/Workspace';
import type { CardType } from '@/components/workspace/cardTypes';

/**
 * HOW A PAGE'S CARD SITS IN A `WorkspaceCard` (layout redesign C5; moved out of
 * `features/puzzles` in Dg, 2026-10-08, because every Workspace page uses it).
 *
 * Each component goes in a `display: contents` wrapper carrying a
 * `data-skeleton-card` name, so its children stay direct children of the card's
 * content box (the rhythm's flex column, C5a) and the card-scoped rules in
 * `index.css` (`[data-skeleton-card='…']`) still reach them. One copy, used by
 * every page and by the fixture, so no two can wrap a card differently.
 *
 * THE ATTRIBUTE'S NAME IS HISTORICAL: it began on v3, `TrainerLayoutSkeleton`,
 * and about twenty guards read it. It names a Workspace card, on any page.
 *
 * Functions, not components: a lane accepts only `WorkspaceCard` elements
 * (spec §9), and a wrapper component would be one level too far.
 */
export function slot(
  name: string,
  type: CardType,
  children: ReactNode,
  share: 1 | 2 | 3 = 1,
  keepInFocus?: boolean,
) {
  return (
    <WorkspaceCard key={name} type={type} share={share} keepInFocus={keepInFocus}>
      <div data-skeleton-card={name} data-fixture-card={name} style={{ display: 'contents' }}>{children}</div>
    </WorkspaceCard>
  );
}

/* A lane's foot holding one of the two shared bands - the appearance card
   (`theme-focus`) and the analysis card (`analysis`) - in the same wrapper, so
   the band rules (`[data-skeleton-card='theme-focus' | 'analysis']`) reach them
   on whichever page renders them. */
export function footSlot(name: 'theme-focus' | 'analysis', children: ReactNode) {
  return (
    <WorkspaceCard type="foot">
      <div data-skeleton-card={name} data-fixture-card={name} style={{ display: 'contents' }}>{children}</div>
    </WorkspaceCard>
  );
}
