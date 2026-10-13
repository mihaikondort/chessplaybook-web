import { describe, it, expect } from 'vitest';
import { isRatingProvisional, PROVISIONAL_ATTEMPTS } from './provisionalRating';

describe('isRatingProvisional', () => {
  it('is true for a visitor with no history at all', () => {
    expect(isRatingProvisional({ totalSolved: 0, totalFailed: 0 })).toBe(true);
  });

  it('stays true across the first few attempts', () => {
    expect(isRatingProvisional({ totalSolved: 1, totalFailed: 0 })).toBe(true);
    expect(isRatingProvisional({ totalSolved: 2, totalFailed: 2 })).toBe(true);
  });

  it('counts failures — a rating moves on those too', () => {
    expect(isRatingProvisional({ totalSolved: 0, totalFailed: PROVISIONAL_ATTEMPTS })).toBe(false);
  });

  it('turns off exactly at the threshold', () => {
    expect(isRatingProvisional({ totalSolved: PROVISIONAL_ATTEMPTS - 1, totalFailed: 0 })).toBe(true);
    expect(isRatingProvisional({ totalSolved: PROVISIONAL_ATTEMPTS, totalFailed: 0 })).toBe(false);
  });

  /*
    The reported defect, as a case. This is the owner's own record from the
    screenshot: 332 lifetime solves at rating 2269, shown the starting-estimate
    note at the top of a fresh session. The old gate read the session counter,
    which is zero here and for every returning player.
  */
  it('is false for a veteran opening a fresh session', () => {
    expect(isRatingProvisional({ totalSolved: 332, totalFailed: 88 })).toBe(false);
  });

  it('survives a missing or malformed history object', () => {
    expect(isRatingProvisional({ totalSolved: NaN, totalFailed: 0 } as never)).toBe(true);
    expect(isRatingProvisional({} as never)).toBe(true);
  });
});
