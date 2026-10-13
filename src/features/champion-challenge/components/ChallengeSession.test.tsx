import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ChromeContext } from '@/app/chromeContext';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  championPlayerFixture,
  distinctBestVerdictFixture,
  nextPositionFixture,
  publicPositionFixture,
  TEST_CHAMPION,
} from '../testFixtures';

const sessionMock = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const analyticsMock = vi.hoisted(() => ({ logGA4Event: vi.fn() }));

vi.mock('../hooks/useChampionChallenge', () => ({
  useChampionChallenge: () => sessionMock.current,
}));

vi.mock('@/hooks/useBoardTheme', () => ({
  useBoardTheme: () => ({ currentTheme: { id: 'fixture-theme' }, changeTheme: vi.fn() }),
}));

vi.mock('@/features/puzzles/components/PuzzleAppearanceCard', () => ({
  PuzzleAppearanceCard: () => <div data-testid="appearance" />,
}));

vi.mock('@/services/analytics', () => analyticsMock);

vi.mock('./ChallengeBoard', () => ({
  ChallengeBoard: ({ flipped, playedMove, frozen }: {
    flipped?: boolean;
    playedMove?: string;
    frozen?: boolean;
  }) => (
    <div
      data-testid="challenge-board"
      data-flipped={String(Boolean(flipped))}
      data-played-move={playedMove}
      data-frozen={String(Boolean(frozen))}
    />
  ),
}));

vi.mock('./MoveAnalysis', () => ({
  MoveAnalysis: ({ champion }: { champion: string }) => (
    <div data-testid="move-analysis">Review for {champion}</div>
  ),
}));

vi.mock('./SessionSummary', () => ({
  SessionSummary: () => <div data-testid="session-summary">Challenge complete</div>,
}));

import { ChallengeSession } from './ChallengeSession';

/* The session asks the shell to hide its chrome in focus mode (D4b). */
const chrome = { setChromeHidden: vi.fn(), chromeHidden: false };
function wrap(ui: ReactElement) {
  return <ChromeContext.Provider value={chrome as never}>{ui}</ChromeContext.Provider>;
}
const render = (ui: ReactElement) => {
  const r = rtlRender(wrap(ui));
  return { ...r, rerender: (next: ReactElement) => r.rerender(wrap(next)) };
};

function activeState(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    submitting: false,
    error: null,
    challengeId: 'fixture-session',
    total: 10,
    index: 0,
    current: publicPositionFixture,
    currentVerdict: null,
    finished: false,
    summary: null,
    remaining: 54,
    submit: vi.fn(),
    next: vi.fn(),
    restart: vi.fn(),
    ...overrides,
  };
}

describe('ChallengeSession workspace', () => {
  beforeEach(() => {
    sessionMock.current = activeState();
    analyticsMock.logGA4Event.mockClear();
  });

  it('maps the unanswered state into persistent Puzzles workspace regions', () => {
    const onExit = vi.fn();
    render(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={onExit}
      />,
    );

    expect(screen.getByText('Champion')).toBeVisible();
    expect(screen.getByText('This challenge')).toBeVisible();
    expect(screen.getByText('This position')).toBeVisible();
    expect(screen.getByText('Go to')).toBeVisible();
    expect(screen.getByText('Your move')).toBeVisible();
    /* Who is to move is in the toolbar since D4b (owner), not in "This position". */
    expect(screen.getByText('White to move')).toBeVisible();
    expect(screen.getByText('This challenge').closest('.surface-card')).toHaveTextContent('0/10');
    expect(screen.getByText('hard')).toHaveClass('capitalize');
    expect(screen.queryByText(distinctBestVerdictFixture.bestMove)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Pick another champion' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('flips from the toolbar, and a new position opens unflipped again', () => {
    const { rerender } = render(
      <ChallengeSession champion={TEST_CHAMPION} player={championPlayerFixture} length={10} onExit={vi.fn()} />,
    );
    expect(screen.getByTestId('challenge-board')).toHaveAttribute('data-flipped', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Flip board' }));
    expect(screen.getByTestId('challenge-board')).toHaveAttribute('data-flipped', 'true');

    sessionMock.current = activeState({ index: 1, current: nextPositionFixture });
    rerender(
      <ChallengeSession champion={TEST_CHAMPION} player={championPlayerFixture} length={10} onExit={vi.fn()} />,
    );
    expect(screen.getByTestId('challenge-board')).toHaveAttribute('data-flipped', 'false');
    expect(screen.getByText('Black to move')).toBeVisible();
  });

  it('keeps the same outer regions while swapping in move review', () => {
    sessionMock.current = activeState({ currentVerdict: distinctBestVerdictFixture });
    render(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('Champion')).toBeVisible();
    expect(screen.getByText('This challenge')).toBeVisible();
    expect(screen.getByText('Move review')).toBeVisible();
    expect(screen.getByTestId('move-analysis')).toHaveTextContent(`Review for ${TEST_CHAMPION}`);
    expect(screen.getByTestId('challenge-board')).toHaveAttribute(
      'data-played-move',
      distinctBestVerdictFixture.userMove,
    );
    expect(screen.getByText('This challenge').closest('.surface-card')).toHaveTextContent('1/10');
  });

  it('reports submission inside the live card and freezes the board', () => {
    sessionMock.current = activeState({ submitting: true });
    render(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Checking your move…');
    expect(screen.getByTestId('challenge-board')).toHaveAttribute('data-frozen', 'true');
  });

  it('logs start and completion once for a server session', () => {
    const { rerender } = render(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={vi.fn()}
      />,
    );

    expect(analyticsMock.logGA4Event).toHaveBeenCalledTimes(1);
    expect(analyticsMock.logGA4Event).toHaveBeenCalledWith(expect.objectContaining({
      name: 'champion_challenge_started',
    }));

    sessionMock.current = activeState({
      finished: true,
      current: null,
      summary: {
        totalScore: 8,
        positions: 10,
        championMatches: 3,
        bestMoveMatches: 4,
        averageCentipawnLoss: 42,
        moveQuality: { good: 10 },
      },
    });
    rerender(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={vi.fn()}
      />,
    );
    rerender(
      <ChallengeSession
        champion={TEST_CHAMPION}
        player={championPlayerFixture}
        length={10}
        onExit={vi.fn()}
      />,
    );

    expect(analyticsMock.logGA4Event).toHaveBeenCalledTimes(2);
    expect(analyticsMock.logGA4Event).toHaveBeenLastCalledWith(expect.objectContaining({
      name: 'champion_challenge_completed',
    }));
  });

  it.each([
    [{ loading: true, current: null }, 'Loading challenge'],
    [{ error: 'Server unavailable', current: null }, 'Challenge unavailable'],
    [{ current: null }, 'No positions available'],
    [{ finished: true, current: null, summary: null }, 'Preparing your results'],
    [{ finished: true, current: null, summary: null, error: 'Could not load your results.' }, 'Results unavailable'],
  ])('contains exceptional state %s in a shared surface', (overrides, title) => {
    sessionMock.current = activeState(overrides);
    render(
      <ChallengeSession champion={TEST_CHAMPION} length={10} onExit={vi.fn()} />,
    );
    expect(screen.getByText(title).closest('.surface-card')).not.toBeNull();
  });
});
