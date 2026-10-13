import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';

/*
  THE SUBJECT IS `WorkspaceCard`, NOT `Section` (2026-08-16).

  This test was written to lock the card grammar that Champion Challenge, Play
  Online, Play Computer and the champions pages were aligned to. Those pages
  render `WorkspaceCard` DIRECTLY - eleven files import it - and none of them
  imports `Section`, so the assertions belong on the component they actually use.

  `Section` stopped being the right subject when `/puzzles` became the rebuilt
  page. Its card grammar is expressed in `em` against `--card-type`, which the
  card box publishes from its own height and rows, because on that page a card's
  type has to follow the card. Asserting `p-2.5` against it would pin the rebuilt
  page to the previous page's fixed sizes, which is the opposite of what this
  test is for: it guards the SHARED face, and the shared face is `WorkspaceCard`.

  Every assertion below is unchanged.
*/
describe('shared workspace card visual contract', () => {
  it('keeps the shared card face, radius, padding and heading grammar', () => {
    render(
      <WorkspaceCard
        title="Reference section"
        icon={<span data-testid="reference-icon" />}
        aside="Reference aside"
        testId="reference-section"
      >
        <p>Reference body</p>
      </WorkspaceCard>,
    );

    const section = screen.getByTestId('reference-section');
    expect(section).toHaveClass('surface-card', 'rounded-lg', 'p-2.5');

    const heading = screen.getByText('Reference section');
    expect(heading).toHaveClass(
      'text-xs',
      'font-medium',
      'uppercase',
      'tracking-wide',
      'text-muted-foreground',
    );
    expect(heading.parentElement).toHaveClass('mb-3');
    expect(screen.getByTestId('reference-icon')).toBeInTheDocument();
    expect(screen.getByText('Reference aside')).toHaveClass('text-xs', 'text-muted-foreground');
  });
});
