import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PuzzleLiveCard } from './PuzzleLiveCard';

/*
  The explanation names the solution, so the button may exist only on a
  RESOLVED puzzle (`correct` or `solution`), never while it is played or during
  the transient `failed` flash, where the same slot holds "Show solution".
*/
const base = {
  message: '', exploring: false, isMidSolve: false, loading: false,
  onNextPuzzle: () => {}, onShowSolution: () => {},
};

describe('PuzzleLiveCard: Explain solution', () => {
  it.each(['playing', 'failed'])('offers Show solution and no explanation while %s', (status) => {
    render(<PuzzleLiveCard {...base} status={status} onExplain={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /explain solution/i })).toBeNull();
    expect(screen.getByRole('button', { name: /show solution/i })).toBeTruthy();
  });

  it.each(['correct', 'solution'])('offers Explain solution once %s', (status) => {
    const onExplain = vi.fn();
    render(<PuzzleLiveCard {...base} status={status} onExplain={onExplain} />);
    screen.getByRole('button', { name: /explain solution/i }).click();
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /show solution/i })).toBeNull();
  });

  it('offers nothing in the slot when there is no explanation to fetch', () => {
    const { container } = render(<PuzzleLiveCard {...base} status="correct" />);
    expect(screen.queryByRole('button', { name: /explain solution/i })).toBeNull();
    expect(container.querySelector('.live-reveal-row[inert]')).not.toBeNull();
  });
});
