/**
 * E5 - the one offer's wording, which is the only thing about it that lives in
 * the client. Ported from `PlanOffer.test.tsx` when C6 deleted v2's component;
 * the card rules are in `PuzzlePlanCard.offer.test.tsx`.
 *
 *  - Absence is stated as a fact with no adjective. The count is the argument.
 *  - A comparison quotes BOTH rates, because "you score 40% in endgames"
 *    invites "compared to what?" and the comparison is why it is true.
 *  - Facts that support no true sentence give no sentence.
 */
import { describe, test, expect } from 'vitest';
import { offerSentence } from './planOfferSentence';
import type { PlanOffer as Offer } from '../services/PlanApi';

const absence: Offer = {
  eligible: true,
  reason: null,
  form: 'absence',
  area: 'endgame',
  facts: {
    totalSolved: 41, totalAttempts: 52, areaAttempts: 0, areaAccuracy: null,
    strongestArea: null, strongestAccuracy: null,
  },
};

const comparison: Offer = {
  eligible: true,
  reason: null,
  form: 'comparison',
  area: 'endgame',
  facts: {
    totalSolved: 60, totalAttempts: 80, areaAttempts: 20, areaAccuracy: 0.4,
    strongestArea: 'tactics', strongestAccuracy: 0.9,
  },
};

describe('the one offer\'s sentence', () => {
  test('the absence form states the count and the gap, with no adjective', () => {
    expect(offerSentence(absence)).toBe('You have solved 41 positions and not one endgame.');
  });

  test('the comparison form quotes both rates, not just the weak one', () => {
    const sentence = offerSentence(comparison)!;
    expect(sentence).toContain('90%');
    expect(sentence).toContain('40%');
    expect(sentence).toMatch(/tactics.*endgames/);
  });

  test('an ineligible offer has no sentence', () => {
    expect(offerSentence({ eligible: false, reason: 'nothing_specific', form: null, area: null, facts: null })).toBeNull();
  });

  test('eligible but with facts that support no sentence still has none', () => {
    expect(offerSentence({ ...comparison, facts: { ...comparison.facts!, strongestArea: null } })).toBeNull();
  });

  test('a single solved position is not "1 positions"', () => {
    const one = { ...absence, facts: { ...absence.facts!, totalSolved: 1 } };
    expect(offerSentence(one)).toContain('1 position and');
  });
});
