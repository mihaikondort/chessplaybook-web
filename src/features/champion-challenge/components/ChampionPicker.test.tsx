import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { chessDataService } from '@/services/ChessDataService';
import * as challengeApi from '../services/ChampionChallengeApi';
import {
  championPlayerFixture,
  championRosterFixture,
  TEST_CHAMPION,
} from '../testFixtures';
import { ChampionPicker } from './ChampionPicker';

afterEach(() => vi.restoreAllMocks());

function arrangeLoadedPicker() {
  vi.spyOn(challengeApi, 'fetchChampions').mockResolvedValue(championRosterFixture);
  vi.spyOn(chessDataService, 'loadPlayers').mockResolvedValue({
    [TEST_CHAMPION]: championPlayerFixture,
  });
}

describe('ChampionPicker', () => {
  it('renders portrait cards on the shared Puzzles surface', async () => {
    arrangeLoadedPicker();
    render(<ChampionPicker length={10} onSelect={vi.fn()} />, { wrapper: MemoryRouter });

    const action = await screen.findByRole('button', {
      name: `Take the ${championPlayerFixture.fullName} challenge`,
    });
    const card = action.closest('.surface-card');
    expect(card).not.toBeNull();
    expect(card).toHaveClass('rounded-lg', 'p-2.5', 'h-32', 'overflow-hidden');
    // #68: the whole round studio disc, never a photo cropped to the panel.
    const portrait = screen.getByRole('img', { name: championPlayerFixture.fullName });
    expect(portrait).toHaveClass('rounded-full', 'h-24', 'w-24');
    expect(portrait).not.toHaveClass('object-cover');
    expect(portrait.parentElement).toHaveClass('w-28', 'border-r');
    expect(action).toHaveTextContent('Challenge');
    expect(screen.getByText('64 positions')).toBeVisible();
  });

  it('keeps the explicit CTA as the only champion-selection action', async () => {
    arrangeLoadedPicker();
    const onSelect = vi.fn();
    render(<ChampionPicker length={20} onSelect={onSelect} />, { wrapper: MemoryRouter });

    fireEvent.click(await screen.findByRole('button', {
      name: `Take the ${championPlayerFixture.fullName} challenge`,
    }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(TEST_CHAMPION, 20, championPlayerFixture);
    const actions = screen.getAllByRole('button');
    expect(actions).toHaveLength(championRosterFixture.length);
    expect(actions.map(button => button.getAttribute('aria-label'))).toEqual([
      `Take the ${championPlayerFixture.fullName} challenge`,
      'Take the Carlsen challenge',
    ]);
  });

  it('keeps an honest empty state when the server has no challenges', async () => {
    vi.spyOn(challengeApi, 'fetchChampions').mockResolvedValue([]);
    vi.spyOn(chessDataService, 'loadPlayers').mockResolvedValue({});
    render(<ChampionPicker length={10} onSelect={vi.fn()} />, { wrapper: MemoryRouter });

    await waitFor(() => {
      expect(screen.getByText(/No champion challenges are available yet/).closest('.surface-card')).not.toBeNull();
    });
  });

  it('keeps an honest error state when the challenge roster fails', async () => {
    vi.spyOn(challengeApi, 'fetchChampions').mockRejectedValue(new Error('offline'));
    vi.spyOn(chessDataService, 'loadPlayers').mockResolvedValue({});
    render(<ChampionPicker length={10} onSelect={vi.fn()} />, { wrapper: MemoryRouter });

    const message = await screen.findByText(/Could not load the challenge list/);
    expect(message).toHaveClass('text-destructive');
    expect(message.closest('.surface-card')).not.toBeNull();
  });
});
