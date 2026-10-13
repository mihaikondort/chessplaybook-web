/**
 * The one plan offer (TRAINING_SYSTEM E5), for the rebuilt page.
 *
 * Ported from `PuzzleTrainerV2` (C6, owner 2026-10-08). It was restored there on
 * purpose on 2026-08-06 (`57684d2a`) and the rebuilt page never carried it over,
 * so from the 08-16 swap no player was offered a plan and the `plan_offer_*`
 * funnel went dark. The rules are v2's, unchanged:
 *
 *   - SPENT WHEN SHOWN, not when fetched. The card calls `onShown` from its own
 *     render path, so an offer computed and never displayed (a plan already
 *     exists, the tab closed mid-load) does not use up the only one there is.
 *   - Declining is recorded on top of being shown, so "they said no" stays
 *     distinguishable from "we asked and they went away".
 *   - Accepting leaves for the setup page; the source travels in the URL and
 *     that page fires the one `plan_setup_opened` event.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { logGA4Event } from '@/services/analytics';
import { fetchPlanOffer, markOffer, type PlanOffer } from '../services/PlanApi';

export function usePlanOffer() {
  const [offer, setOffer] = useState<PlanOffer | null>(null);
  const shownRef = useRef(false);
  const declinedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetchPlanOffer()
      .then(result => { if (alive) setOffer(result); })
      /* Silent: almost nobody is eligible, and an error about a message they
         were never going to see is worse than no message. */
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const onShown = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    if (offer?.form && offer.area) {
      logGA4Event({ name: 'plan_offer_shown', params: { form: offer.form, area: offer.area } });
    }
    // A failed POST must not put the offer back in front of someone who read it.
    markOffer(false).catch(() => undefined);
  }, [offer]);

  const recordAnswer = useCallback((accepted: boolean) => {
    if (!offer?.form || !offer.area) return;
    logGA4Event({
      name: 'plan_offer_answered',
      params: { form: offer.form, area: offer.area, accepted },
    });
  }, [offer]);

  /* The card is a link to setup; this only records the answer on the way out. */
  const onAccept = useCallback(() => recordAnswer(true), [recordAnswer]);

  const onDismiss = useCallback(() => {
    if (!declinedRef.current) {
      declinedRef.current = true;
      recordAnswer(false);
      markOffer(true).catch(() => undefined);
    }
    setOffer(null);
  }, [recordAnswer]);

  return { offer: offer?.eligible ? offer : null, onShown, onAccept, onDismiss };
}
