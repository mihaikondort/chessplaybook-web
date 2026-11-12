/**
 * The one reminder offer on /puzzles (EMAIL_REMINDERS_IMPLEMENTATION_PLAN, C2; owner C0).
 *
 * WHEN: on a SOLVE ("Correct! Puzzle solved.", `status === 'correct'`), once the server
 * says it is earned (10 attempted puzzles, misses included; never offered; reminders not
 * already on). Never during a solve, never on a reveal: a player whose 10th attempt is a
 * miss sees it at their next solve. Asked again at each solve until it is earned or spent.
 *
 * HOW LONG: until the next puzzle, or its x. It is spent the moment it is SHOWN (the
 * server records it then, and merges it on sign-in), so a player sees it once, ever.
 *
 * A signed-in player's [Email me] turns the training switch on there and then; that tap
 * is the consent. A guest's link goes to sign-in, which returns to the training record
 * with the switch in view and OFF.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { logGA4Event } from '@/services/analytics';
import { fetchReminderOffer, markReminderOffer, saveReminderSettings } from './RemindersApi';

export type ReminderOfferState = 'hidden' | 'offered' | 'saving' | 'accepted' | 'failed';

export function useReminderOffer({ status, puzzleId, signedIn, confirmedSolves }: {
  status: string;
  puzzleId: string | null;
  signedIn: boolean;
  /**
   * The solve count AFTER the server confirmed the write (`usePuzzleRecord`). The page posts
   * the result while this asks whether the offer is earned; asking again when the confirmed
   * count moves means a solve that is the 10th attempt is counted, not raced.
   */
  confirmedSolves: number;
}) {
  const [state, setState] = useState<ReminderOfferState>('hidden');
  /** No more asking this page's life: shown, or the server said no for good. */
  const doneRef = useRef(false);
  const shownForRef = useRef<string | null>(null);

  // A new puzzle takes the offer away; it was spent when shown.
  useEffect(() => { setState('hidden'); }, [puzzleId]);

  useEffect(() => {
    if (status !== 'correct' || !puzzleId || doneRef.current) return;
    let alive = true;
    fetchReminderOffer()
      .then(offer => {
        if (!alive) return;
        if (offer.reason === 'already_offered' || offer.reason === 'already_on') doneRef.current = true;
        if (!offer.eligible) return;
        doneRef.current = true;
        shownForRef.current = puzzleId;
        setState('offered');
        logGA4Event({ name: 'reminder_offer_shown', params: { signed_in: signedIn } });
        markReminderOffer(false).catch(() => undefined);
      })
      .catch(() => undefined); // An offer nobody was going to see is not worth an error.
    return () => { alive = false; };
  }, [status, puzzleId, signedIn, confirmedSolves]);

  const accept = useCallback(() => {
    logGA4Event({ name: 'reminder_offer_accepted', params: { signed_in: signedIn } });
    if (!signedIn) {
      logGA4Event({ name: 'reminder_sign_in_started', params: { source: 'first_session' } });
      return; // The link itself navigates to sign-in.
    }
    setState('saving');
    saveReminderSettings(true, 'first_session')
      .then(() => {
        setState('accepted');
        logGA4Event({ name: 'reminder_turned_on', params: { source: 'first_session' } });
      })
      .catch(() => setState('failed'));
  }, [signedIn]);

  const dismiss = useCallback(() => {
    setState('hidden');
    logGA4Event({ name: 'reminder_offer_dismissed', params: { signed_in: signedIn } });
    markReminderOffer(true).catch(() => undefined);
  }, [signedIn]);

  return { state, visible: state !== 'hidden', accept, dismiss };
}
