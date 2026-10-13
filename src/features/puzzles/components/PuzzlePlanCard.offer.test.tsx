/**
 * The one plan offer, on v3's plan card (C6, owner 2026-10-08).
 *
 * The rules v2's `PlanOffer` component was tested for, held on the card that
 * renders the offer now:
 *
 *  - There is NO generic version: an offer with no true sentence leaves the
 *    standing entry exactly as it is.
 *  - It claims coverage and predicts nothing.
 *  - Declining is one click.
 *  - It is spent once, when it is shown, and never when it is not.
 */
import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PuzzlePlanCard } from './PuzzlePlanCard';
import type { PlanOffer as Offer } from '../services/PlanApi';

const absence: Offer = {
  eligible: true, reason: null, form: 'absence', area: 'endgame',
  facts: {
    totalSolved: 41, totalAttempts: 52, areaAttempts: 0, areaAccuracy: null,
    strongestArea: null, strongestAccuracy: null,
  },
};

const card = (offer: Offer | null, handlers: Partial<Record<'onOfferShown' | 'onOfferAccept' | 'onOfferDismiss', () => void>> = {}) =>
  render(
    <MemoryRouter>
      <PuzzlePlanCard
        plan={null} activeItem={null} nextItem={null} nextDayTotal={0}
        onStart={vi.fn()} offer={offer} {...handlers}
      />
    </MemoryRouter>,
  );

describe('the plan offer on the plan card', () => {
  test('an earned offer says the player\'s own numbers and links to setup from the offer', () => {
    card(absence);
    expect(screen.getByTestId('plan-offer')).toHaveTextContent(
      'You have solved 41 positions and not one endgame. A training plan covers all three areas.',
    );
    expect(screen.getByRole('link', { name: 'Train with a plan' }))
      .toHaveAttribute('href', '/puzzles/plan?mode=setup&from=offer');
  });

  test('no true sentence, no offer: the standing entry, unchanged', () => {
    card({ eligible: false, reason: 'nothing_specific', form: null, area: null, facts: null });
    expect(screen.queryByTestId('plan-offer')).toBeNull();
    expect(screen.getByTestId('plan-link')).toHaveAttribute('href', '/puzzles/plan?mode=setup&from=card');
  });

  test('it claims coverage, and predicts nothing', () => {
    card(absence);
    expect(document.body.textContent ?? '').not.toMatch(/\+\s*\d+|points in|reach \d|improve by|guarantee/i);
  });

  test('declining is one click', () => {
    const onOfferDismiss = vi.fn();
    card(absence, { onOfferDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    expect(onOfferDismiss).toHaveBeenCalledTimes(1);
  });

  test('it is spent when shown, and not when it is not', () => {
    const shown = vi.fn();
    card(absence, { onOfferShown: shown });
    expect(shown).toHaveBeenCalledTimes(1);
    const unshown = vi.fn();
    card({ ...absence, eligible: false }, { onOfferShown: unshown });
    expect(unshown).not.toHaveBeenCalled();
  });
});
