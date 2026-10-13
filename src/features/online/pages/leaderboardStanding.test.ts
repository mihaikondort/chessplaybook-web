import { existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { shouldOfferStanding, standingPromptText, MIN_RATED_ATTEMPTS } from './Leaderboard';
import type { PuzzleStanding } from '@/features/puzzles/services/StandingService';

/*
  NOTE THE FIXTURE: `identified` is TRUE for a guest.

  That is the whole lesson of this file. The server sets `identified` whenever it
  resolved an identity at all, and a guest carrying an anonymous id qualifies —
  so the first version of the guard, which read `!standing.identified`, hid the
  offer from every person it was written for. It shipped to the dev server and
  the owner found it in about a minute.

  A fixture with `identified: false` would have made that bug pass its own test,
  which is exactly how a wrong guard survives review.
*/
const guest = (over: Partial<PuzzleStanding> = {}): PuzzleStanding => ({
  identified: true,
  eligible: true,
  rank: 6,
  total: 12,
  rating: 1452,
  ...over,
});

describe('shouldOfferStanding', () => {
  it('offers a guest who would be listed — even though the server calls them identified', () => {
    expect(shouldOfferStanding('puzzle', guest(), false)).toBe(true);
  });

  it('never offers a place to someone already signed in', () => {
    // `eligible` is true for them too, so without the auth check the page would
    // render "You'd be 8th" to the person it is displaying at 8th.
    expect(shouldOfferStanding('puzzle', guest(), true)).toBe(false);
  });

  it('says nothing when the rating would not be listed', () => {
    // Below the board's thresholds the server returns eligible:false with a null
    // rank. Naming a place here is the offer breaking on acceptance.
    expect(shouldOfferStanding('puzzle', guest({ eligible: false, rank: null }), false)).toBe(false);
    expect(shouldOfferStanding('puzzle', guest({ rank: null }), false)).toBe(false);
  });

  it('only describes the puzzle board', () => {
    // The standing endpoint measures puzzles alone; showing it beside the blitz
    // ranking would be a claim about a board it never looked at.
    for (const tc of ['blitz', 'bullet', 'rapid', 'classical']) {
      expect(shouldOfferStanding(tc, guest(), false)).toBe(false);
    }
  });

  it('is safe before the fetch lands', () => {
    expect(shouldOfferStanding('puzzle', null, false)).toBe(false);
  });
});

/*
  The prompt shown to guests who do NOT clear the gate yet -- ten times the
  audience of the offer above, and the group the page previously said nothing to.
*/
describe('standingPromptText', () => {
  it('says nothing to a guest who already qualifies (they get a rank instead)', () => {
    expect(standingPromptText(guest())).toBeNull();
  });

  it('counts down from the real threshold', () => {
    expect(standingPromptText(guest({ eligible: false, rank: null, ratedAttempts: 0 })))
      .toBe('Solve 5 puzzles to see how you rank.');
    expect(standingPromptText(guest({ eligible: false, rank: null, ratedAttempts: 3 })))
      .toBe('Solve 2 puzzles to see how you rank.');
  });

  it('says "puzzle" not "puzzles" when one is left', () => {
    expect(standingPromptText(guest({ eligible: false, rank: null, ratedAttempts: 4 })))
      .toBe('Solve 1 puzzle to see how you rank.');
  });

  it('stops counting when the block is the deviation, not the attempts', () => {
    // At or past the attempt threshold but still ineligible: RD is what is
    // holding them. "Solve 0 more puzzles" is nonsense and "solve 5" is a lie.
    expect(standingPromptText(guest({ eligible: false, rank: null, ratedAttempts: 9 })))
      .toBe('Keep solving to see how you rank.');
  });

  it('treats an unknown attempt count as none done', () => {
    expect(standingPromptText(guest({ eligible: false, rank: null, ratedAttempts: undefined })))
      .toBe('Solve 5 puzzles to see how you rank.');
  });

  it('is safe before the fetch lands', () => {
    expect(standingPromptText(null)).toBeNull();
  });
});

/*
  MIN_RATED_ATTEMPTS is duplicated from the backend. Read the backend source and
  assert they agree -- the same technique the session-length bounds use. If they
  drift, this page tells people to solve a number of puzzles that does not
  actually put them on the board.
*/
// The published frontend source has no backend/ (THIRD_PARTY_LICENSING.md §1).
// Skip only when the WHOLE folder is absent: a moved file in this repo still fails.
describe.skipIf(!existsSync('backend'))('MIN_RATED_ATTEMPTS agrees with the server gate', () => {
  it('matches LEADERBOARD_GATES.puzzle.minGames', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('backend/src/db/ratings.ts', 'utf8');
    const m = src.match(/puzzle:\s*\{\s*minGames:\s*(\d+)/);
    expect(m, 'could not find LEADERBOARD_GATES.puzzle.minGames in the backend').not.toBeNull();
    expect(Number(m![1])).toBe(MIN_RATED_ATTEMPTS);
  });
});
