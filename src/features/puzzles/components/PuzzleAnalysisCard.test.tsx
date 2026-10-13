import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PuzzleAnalysisCard } from './PuzzleAnalysisCard';
import { logGA4Event } from '@/services/analytics';

vi.mock('@/services/analytics', () => ({ logGA4Event: vi.fn() }));
vi.mock('@/services/AnalysisService', () => ({
  analysisService: {
    subscribeCompact: vi.fn(() => () => undefined),
    stopCompactAnalysis: vi.fn(),
    requestCompactAnalysis: vi.fn(),
    subscribeEngineAvailable: vi.fn(() => () => undefined),
    isEngineHeldElsewhere: vi.fn(() => false),
  },
}));

const fen = '8/8/8/8/8/8/8/K6k w - - 0 1';

describe('PuzzleAnalysisCard feature semantics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps Puzzles copy as the default', () => {
    render(<PuzzleAnalysisCard enabled={false} fen={fen} orientation="white" />);
    expect(screen.getByLabelText('Puzzle analysis')).toBeInTheDocument();
    expect(screen.getByText('Available once the puzzle is over')).toBeInTheDocument();
  });

  it('uses game copy and Online analytics on Play Online', () => {
    render(
      <PuzzleAnalysisCard
        enabled
        fen={fen}
        orientation="white"
        surface="play_online"
      />,
    );

    expect(screen.getByLabelText('Game analysis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /full analysis/i }));
    expect(logGA4Event).toHaveBeenCalledWith({
      name: 'online_full_analysis_opened',
      params: { source: 'compact' },
    });
  });

  it('uses game-specific inactive copy', () => {
    render(
      <PuzzleAnalysisCard
        enabled={false}
        fen={fen}
        orientation="black"
        surface="play_online"
      />,
    );
    expect(screen.getByText('Available once the game is over')).toBeInTheDocument();
    expect(screen.queryByText('Available once the puzzle is over')).not.toBeInTheDocument();
  });

  it('attributes computer analysis to the computer mode', () => {
    render(
      <PuzzleAnalysisCard
        enabled
        fen={fen}
        orientation="white"
        surface="play_computer"
      />,
    );

    expect(screen.getByLabelText('Game analysis')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /full analysis/i }));
    expect(logGA4Event).toHaveBeenCalledWith({
      name: 'computer_full_analysis_opened',
      params: { source: 'compact' },
    });
  });
});
