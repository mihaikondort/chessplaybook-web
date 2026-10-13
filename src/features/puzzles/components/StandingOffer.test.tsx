/**
 * The row may never name a place the player would not get.
 *
 * That is the whole risk in this feature. A rank is a promise — accepting it
 * means creating an account — so a row that says "You are 4th" to someone
 * below the leaderboard's thresholds is a lie the player discovers by taking
 * us up on it. The server answers `eligible: false` with a null rank, and these
 * assert that the surface respects it in every shape that can arrive: not yet
 * fetched, fetched and ineligible, and the malformed middle case of
 * `eligible: true` with no rank.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StandingRow, hasStanding } from './StandingOffer';
import { ordinal, type PuzzleStanding } from '../services/StandingService';

const ELIGIBLE: PuzzleStanding = {
  identified: true, eligible: true, rank: 4, total: 13, rating: 1840,
};

const row = (standing: PuzzleStanding | null) => render(
  <MemoryRouter>
    <StandingRow standing={standing} onOpen={() => {}} returnTo="/puzzles" />
  </MemoryRouter>,
);

describe('the standing row', () => {
  it('names the rank when the player would actually be listed', () => {
    /*
      THE RANK, NOT THE SENTENCE. This asserted the literal "You'd be 4th" and broke on
      2026-08-20 when the copy became "You are 4th" - guests joined the puzzle board, so the
      rank stopped being conditional and the old wording became false.

      The copy was right to change and the test was pinned to it, which is the failure this
      project has recorded before: a guard keyed on a string tests the string. What must hold
      is that the row names the rank it was given.
    */
    row(ELIGIBLE);
    // Matched on the element's own text: `You are {ordinal}` renders as two text nodes
    // inside one span, and a plain string matcher does not see across them.
    const mine = screen.getByText(
      (_, el) => el?.tagName === 'SPAN' && el.textContent?.trim() === 'You are 4th',
    );
    expect(mine).toBeTruthy();
  });

  it('falls back to the old copy while the answer has not arrived', () => {
    row(null);
    expect(screen.getByText('Sign in to save')).toBeTruthy();
  });

  it('falls back to the old copy for a player below the thresholds', () => {
    row({ identified: true, eligible: false, rank: null, total: 9, rating: 1750 });
    expect(screen.getByText('Sign in to save')).toBeTruthy();
  });

  /*
    `eligible` and `rank` come from one server expression, so this pairing
    should be impossible — which is exactly why it is asserted. The surface must
    fail toward saying less, never toward inventing a number.
  */
  it('names nothing when eligible arrives without a rank', () => {
    row({ identified: true, eligible: true, rank: null, total: 9, rating: 1750 });
    expect(screen.getByText('Sign in to save')).toBeTruthy();
  });

  it('and the guard agrees with what is rendered', () => {
    expect(hasStanding(ELIGIBLE)).toBe(true);
    expect(hasStanding(null)).toBe(false);
    expect(hasStanding({ ...ELIGIBLE, eligible: false })).toBe(false);
  });
});

describe('ordinal', () => {
  it('handles the ordinary cases', () => {
    expect([1, 2, 3, 4, 21, 22, 23].map(ordinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '21st', '22nd', '23rd']);
  });

  /*
    The case a last-digit rule gets wrong. A board of nine names reaches it as
    soon as it has thirteen.
  */
  it('handles the teens', () => {
    expect([11, 12, 13, 111, 112].map(ordinal))
      .toEqual(['11th', '12th', '13th', '111th', '112th']);
  });
});
