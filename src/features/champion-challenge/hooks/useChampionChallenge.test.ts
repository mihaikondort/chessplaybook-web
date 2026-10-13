import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  distinctBestVerdictFixture,
  nextPositionFixture,
  publicPositionFixture,
  sessionSummaryFixture,
  TEST_CHAMPION,
} from '../testFixtures';

const apiMock = vi.hoisted(() => ({
  startSession: vi.fn(),
  resumeSession: vi.fn(),
  submitMove: vi.fn(),
  fetchSummary: vi.fn(),
}));

vi.mock('../services/ChampionChallengeApi', async (importOriginal) => ({
  ...await importOriginal<typeof import('../services/ChampionChallengeApi')>(),
  ...apiMock,
}));

import { useChampionChallenge } from './useChampionChallenge';

describe('useChampionChallenge lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    apiMock.startSession.mockResolvedValue({
      challengeId: 'session-1',
      champion: TEST_CHAMPION,
      total: 2,
      index: 0,
      position: publicPositionFixture,
      remaining: 54,
    });
  });

  it('starts, submits, advances, finishes and loads the summary', async () => {
    apiMock.submitMove
      .mockResolvedValueOnce({ verdict: distinctBestVerdictFixture, next: nextPositionFixture })
      .mockResolvedValueOnce({ verdict: distinctBestVerdictFixture, next: null });
    apiMock.fetchSummary.mockResolvedValue({ summary: sessionSummaryFixture, remaining: 52 });

    const { result } = renderHook(() => useChampionChallenge(TEST_CHAMPION, 10));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(apiMock.startSession).toHaveBeenCalledWith(TEST_CHAMPION, 10);

    act(() => result.current.submit('Rad1'));
    await waitFor(() => expect(result.current.currentVerdict).toEqual(distinctBestVerdictFixture));
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
    expect(result.current.current).toEqual(nextPositionFixture);

    act(() => result.current.submit('Rad8'));
    await waitFor(() => expect(result.current.currentVerdict).toEqual(distinctBestVerdictFixture));
    act(() => result.current.next());
    await waitFor(() => expect(result.current.summary).toEqual(sessionSummaryFixture));
    expect(result.current.finished).toBe(true);
    expect(result.current.remaining).toBe(52);
  });

  it('resumes a stored session and restart deliberately starts a fresh one', async () => {
    localStorage.setItem(`cpb_champion_challenge_${TEST_CHAMPION}`, 'saved-session');
    apiMock.resumeSession.mockResolvedValue({
      challengeId: 'saved-session',
      champion: TEST_CHAMPION,
      total: 10,
      index: 4,
      position: nextPositionFixture,
      answered: 4,
    });
    apiMock.startSession.mockResolvedValue({
      challengeId: 'session-2',
      champion: TEST_CHAMPION,
      total: 10,
      index: 0,
      position: publicPositionFixture,
    });

    const { result } = renderHook(() => useChampionChallenge(TEST_CHAMPION, 10));
    await waitFor(() => expect(result.current.challengeId).toBe('saved-session'));
    expect(apiMock.resumeSession).toHaveBeenCalledWith('saved-session');
    expect(apiMock.startSession).not.toHaveBeenCalled();

    act(() => result.current.restart());
    await waitFor(() => expect(result.current.challengeId).toBe('session-2'));
    expect(apiMock.startSession).toHaveBeenCalledOnce();
    expect(localStorage.getItem(`cpb_champion_challenge_${TEST_CHAMPION}`)).toBe('session-2');
  });
});
