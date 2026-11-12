/**
 * The reminder offer, as one line in the live card's detail slot (owner, C0 2026-11-12).
 *
 * THE SLOT IS EMPTY ONCE A PUZZLE IS SOLVED, which is why the offer can live there at all:
 * the run's performance line uses the same slot for the same reason. Its controls are
 * inline links, not filled buttons, because a button is taller than the line the slot
 * reserves and the card must not move.
 *
 * Wording settled with the owner: "Get an email when you've been away a few days."
 * [Email me]. A guest's action is "Sign in to get reminders".
 */
import { Link } from 'react-router-dom';
import { Mail, X } from 'lucide-react';
import { REMINDERS_RETURN_TO } from './RemindersSwitch';
import type { ReminderOfferState } from './useReminderOffer';

const ACTION = 'font-medium text-link hover:underline disabled:opacity-60';

export function ReminderOfferLine({ state, signedIn, onAccept, onDismiss }: {
  state: ReminderOfferState;
  signedIn: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (state === 'accepted') {
    return <span data-testid="reminder-offer">Reminders are on. Every email has a link to stop them.</span>;
  }
  return (
    <span className="inline-flex items-start gap-[0.4em]" data-testid="reminder-offer">
      <Mail className="w-[1em] h-[1em] mt-[0.2em] shrink-0" aria-hidden />
      {/* BALANCED (owner, 2026-11-12: the wrap read untidy, "away a / few days" with a short
          second line). The sentence and its action cannot share one line at any card width
          the page uses, so the browser picks the break that makes the two lines about the
          same length. Browsers without `text-wrap: balance` wrap as before. */}
      <span className="[text-wrap:balance]">
        {state === 'failed' ? 'That did not save. ' : "Get an email when you've been away a few days. "}
        {signedIn ? (
          <button type="button" onClick={onAccept} disabled={state === 'saving'} className={ACTION}>
            {state === 'failed' ? 'Try again' : 'Email me'}
          </button>
        ) : (
          <Link
            to={`/login?returnTo=${encodeURIComponent(REMINDERS_RETURN_TO)}`}
            onClick={onAccept}
            className={ACTION}
          >
            Sign in to get reminders
          </Link>
        )}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        /* Its own name: the plan offer's x is "No thanks", and both can be on screen at once. */
        aria-label="No reminder emails"
        className="ml-auto shrink-0 mt-[0.15em] hover:text-foreground"
      >
        <X className="w-[1em] h-[1em]" />
      </button>
    </span>
  );
}
