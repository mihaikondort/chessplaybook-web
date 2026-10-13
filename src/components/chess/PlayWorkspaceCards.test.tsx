import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerCard } from './PlayWorkspaceCards';
import { formatMs } from '@/features/online/components/ChessClock';

describe('PlayerCard', () => {
  it('shows a title before the name and a rating after it, on the name row', () => {
    const { container } = render(<PlayerCard icon={null} label="White" name="Carlsen, Magnus" title="GM" rating={2830} detail="" />);
    const row = container.querySelector('.card-body .card-row');
    expect([...row!.children].map(c => c.textContent)).toEqual(['GM', 'Carlsen, Magnus', '2830']);
  });

  it('renders as before without them (/play and /play-online pass neither)', () => {
    const { container } = render(<PlayerCard icon={null} label="Opponent" name="Stockfish Level 3" detail="Club · Rating ~1500" />);
    const row = container.querySelector('.card-body .card-row');
    expect([...row!.children].map(c => c.textContent)).toEqual(['Stockfish Level 3']);
    expect(screen.getByText('Club · Rating ~1500')).toBeInTheDocument();
  });
});

describe('ChessClock formatMs', () => {
  it.each([
    [7198000, '1:59:58'],
    [3600000, '1:00:00'],
    [3599000, '59:59'],
    [600000, '10:00'],
    [9500, '0:09.5'],
    [0, '0:00'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatMs(ms)).toBe(text);
  });
});
