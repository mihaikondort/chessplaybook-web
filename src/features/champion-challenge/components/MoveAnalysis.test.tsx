import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  distinctBestVerdictFixture,
  matchingBestVerdictFixture,
  TEST_CHAMPION,
} from '../testFixtures';

vi.mock('@/components/game-analysis/PositionExplanationCard', () => ({
  PositionExplanationCard: ({ structured, className }: { structured: unknown; className: string }) => (
    <div data-testid="coaching" data-structured={String(Boolean(structured))} className={className} />
  ),
}));

import { Workspace, WorkspaceCard } from '@/components/workspace/Workspace';
import { MoveAnalysis } from './MoveAnalysis';

/* In a Workspace lane, as on the page: the explanation opens over the lane. */
const inLane = (node: JSX.Element) => (
  <Workspace board={<div data-testid="board" />} toolbar={<div />} focus={false}
    activity={{ title: 'Your answer', cards: [<WorkspaceCard key="live" type="challengeLive">{node}</WorkspaceCard>] }} />
);

describe('MoveAnalysis', () => {
  it('preserves verdict values, comparisons, coaching and the next action', () => {
    const onNext = vi.fn();
    render(inLane(
      <MoveAnalysis champion={TEST_CHAMPION} verdict={distinctBestVerdictFixture} isLast={false} onNext={onNext} />,
    ));

    expect(screen.getByText('Inaccuracy')).toBeVisible();
    expect(screen.getByText(/58 \/ 100/)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.userMove)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.championMove)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.bestMove)).toBeVisible();
    /* Closed until asked for; it opens over the lane, beside the board (2026-11-03). */
    expect(screen.queryByTestId('coaching')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Explain this position' }));
    const panel = screen.getByRole('region', { name: 'The position you solved' });
    expect(panel.closest('[data-lane="activity"]')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('coaching')).toHaveClass('shadow-none');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'The position you solved' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next position' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('omits a redundant Best row and exposes the final action', () => {
    render(
      <MoveAnalysis champion={TEST_CHAMPION} verdict={matchingBestVerdictFixture} isLast onNext={vi.fn()} />,
    );

    expect(screen.queryByText('Best')).toBeNull();
    expect(screen.getByRole('button', { name: 'See results' })).toBeVisible();
  });
});
