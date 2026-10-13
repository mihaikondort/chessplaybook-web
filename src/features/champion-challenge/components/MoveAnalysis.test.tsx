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

import { MoveAnalysis } from './MoveAnalysis';

describe('MoveAnalysis', () => {
  it('preserves verdict values, comparisons, coaching and the next action', () => {
    const onNext = vi.fn();
    render(
      <MoveAnalysis champion={TEST_CHAMPION} verdict={distinctBestVerdictFixture} isLast={false} onNext={onNext} />,
    );

    expect(screen.getByText('Inaccuracy')).toBeVisible();
    expect(screen.getByText(/58 \/ 100/)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.userMove)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.championMove)).toBeVisible();
    expect(screen.getByText(distinctBestVerdictFixture.bestMove)).toBeVisible();
    /* The explanation is in a dialog since D4a: closed until asked for. */
    expect(screen.queryByTestId('coaching')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Explain this position' }));
    expect(screen.getByRole('dialog', { name: 'The position you solved' })).toBeVisible();
    expect(screen.getByTestId('coaching')).toHaveClass('shadow-none');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
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
