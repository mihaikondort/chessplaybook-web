import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionSummaryFixture, TEST_CHAMPION } from '../testFixtures';

const authMock = vi.hoisted(() => ({ user: null as null | { id: string } }));
vi.mock('@/features/auth/AuthContext', () => ({ useAuth: () => authMock }));

import { SessionSummary } from './SessionSummary';

function renderSummary(onRestart = vi.fn(), onExit = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/champion-challenge?from=test']}>
      <SessionSummary
        champion={TEST_CHAMPION}
        summary={sessionSummaryFixture}
        remaining={54}
        onRestart={onRestart}
        onExit={onExit}
      />
    </MemoryRouter>,
  );
  return { onRestart, onExit };
}

describe('SessionSummary', () => {
  beforeEach(() => { authMock.user = null; });

  it('keeps every metric, distribution value, remaining count and ungated action', () => {
    const { onRestart, onExit } = renderSummary();
    expect(screen.getByText(String(sessionSummaryFixture.totalScore))).toBeVisible();
    expect(screen.getByText('3/10')).toBeVisible();
    expect(screen.getByText('4/10')).toBeVisible();
    expect(screen.getByText(/0.36 pawns/)).toBeVisible();
    expect(screen.getByText(/54 more Kasparov positions/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Playing as guest/ })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fchampion-challenge%3Ffrom%3Dtest',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick another champion' }));
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('does not show the guest persistence prompt to an authenticated player', () => {
    authMock.user = { id: 'player-1' };
    renderSummary();
    expect(screen.queryByRole('link', { name: /Playing as guest/ })).toBeNull();
  });
});
