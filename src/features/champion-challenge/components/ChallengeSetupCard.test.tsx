import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChallengeSetupCard } from './ChallengeSetupCard';

describe('ChallengeSetupCard', () => {
  it('uses the shared workspace surface and exact Puzzles selection grammar', () => {
    render(<ChallengeSetupCard length={10} onLengthChange={vi.fn()} />);

    expect(screen.getByTestId('challenge-setup')).toHaveClass(
      'surface-card', 'rounded-lg', 'p-2.5',
    );
    expect(screen.getByRole('button', { name: '10' })).toHaveClass(
      'border-primary', 'bg-primary/10', 'text-foreground',
    );
    expect(screen.getByRole('button', { name: '20' })).toHaveClass(
      'border-border', 'text-muted-foreground',
    );
  });

  it('reports the chosen session length without owning session state', () => {
    const onLengthChange = vi.fn();
    render(<ChallengeSetupCard length={10} onLengthChange={onLengthChange} />);

    fireEvent.click(screen.getByRole('button', { name: '20' }));
    expect(onLengthChange).toHaveBeenCalledOnce();
    expect(onLengthChange).toHaveBeenCalledWith(20);
  });
});
