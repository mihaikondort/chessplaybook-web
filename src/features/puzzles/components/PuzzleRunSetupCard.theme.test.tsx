import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PuzzleRunSetupCard } from './PuzzleRunSetupCard';

/* #109: a Patterns row's Replay link limits a "Missed before" run to one pattern. */
const options = [
  { id: 'adaptive', available: true },
  { id: 'failed_review', available: true },
];

function card(over: Partial<React.ComponentProps<typeof PuzzleRunSetupCard>> = {}) {
  return render(
    <PuzzleRunSetupCard
      options={options}
      areas={['tactics', 'middlegame', 'endgame']}
      selection="failed_review"
      onSelectionChange={() => {}}
      area={null}
      onAreaChange={() => {}}
      total={10}
      onTotalChange={() => {}}
      onStart={() => {}}
      {...over}
    />,
  );
}

describe('PuzzleRunSetupCard: a run limited to a pattern', () => {
  it('says where the puzzles come from: that pattern only', () => {
    card({ theme: 'discoveredAttack' });
    expect(screen.getByText('Discovered attack only')).toBeInTheDocument();
  });

  it('a pattern does not limit any other mode', () => {
    card({ theme: 'fork', selection: 'adaptive' });
    expect(screen.queryByText('Fork only')).not.toBeInTheDocument();
  });

  it('while the run is going, it reports the run\'s own pattern', () => {
    card({ running: true, runSelection: 'failed_review', runTheme: 'pin', theme: null, runTotal: 3 });
    expect(screen.getByText('Pin only')).toBeInTheDocument();
  });

  it('choosing an area drops the pattern limit', () => {
    const onThemeClear = vi.fn();
    const onAreaChange = vi.fn();
    card({ theme: 'fork', onThemeClear, onAreaChange });
    fireEvent.click(screen.getByText('Fork only'));
    fireEvent.click(screen.getByRole('option', { name: /Endgame/ }));
    expect(onThemeClear).toHaveBeenCalled();
    expect(onAreaChange).toHaveBeenCalledWith('endgame');
  });
});
