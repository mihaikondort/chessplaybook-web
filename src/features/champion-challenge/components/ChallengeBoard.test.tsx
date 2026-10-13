import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { nextPositionFixture, publicPositionFixture } from '../testFixtures';

vi.mock('@/hooks/useBoardTheme', () => ({
  useBoardTheme: () => ({ currentTheme: { id: 'fixture-theme' } }),
}));

vi.mock('@/components/chess/ChessBoard', () => ({
  ChessBoard: ({ orientation, size }: { orientation: string; size?: string }) => (
    <div data-testid="chess-board" data-orientation={orientation} data-size={size ?? 'slot'} />
  ),
}));

import { ChallengeBoard } from './ChallengeBoard';

/*
  The board alone since D4b: the Workspace slot sizes it and the session owns
  the flip, whose control is in the toolbar. The reset of a flip on a new
  position is asserted in ChallengeSession.test.
*/
describe('ChallengeBoard workspace contract', () => {
  it('takes its size from the slot and draws no controls of its own', () => {
    render(<ChallengeBoard fen={publicPositionFixture.fen} onMove={vi.fn()} />);

    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-size', 'slot');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens on the side to move, and the other side when flipped', () => {
    const { rerender } = render(<ChallengeBoard fen={publicPositionFixture.fen} onMove={vi.fn()} />);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'white');

    rerender(<ChallengeBoard fen={publicPositionFixture.fen} onMove={vi.fn()} flipped />);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'black');

    rerender(<ChallengeBoard fen={nextPositionFixture.fen} onMove={vi.fn()} />);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-orientation', 'black');
  });
});
