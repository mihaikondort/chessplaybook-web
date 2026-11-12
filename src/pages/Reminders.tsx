/**
 * /reminders (EMAIL_REMINDERS_IMPLEMENTATION_PLAN, C4): the page an email's "Stop these
 * emails" link opens.
 *
 * NOTHING HAPPENS ON ARRIVAL. Mail scanners open every link in a message, so a page that
 * unsubscribed on load would unsubscribe players who never asked. The email's token is in
 * the URL; the button POSTs it. (Gmail's own Unsubscribe button uses the one-click POST in
 * the email's header and never comes here.)
 *
 * Turning reminders back ON needs the account, so it is the training record's switch (or
 * this page's, signed in): an email link can only ever switch them off.
 *
 * noindex, in the prerendered HTML (generate-route-html.cjs): one person's setting.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';
import { useAuth } from '@/features/auth/AuthContext';
import { logGA4Event } from '@/services/analytics';
import { RemindersSwitch, REMINDERS_RETURN_TO } from '@/features/reminders/RemindersSwitch';
import { RemindersApiError, unsubscribeWithToken } from '@/features/reminders/RemindersApi';

type Stop = 'idle' | 'working' | 'stopped' | 'already_off' | 'expired' | 'failed';

const RECORD_LINK = <Link to="/puzzles/progress" className="text-link hover:underline">training record</Link>;

export default function Reminders() {
  const [params] = useSearchParams();
  const token = params.get('t');
  const { user } = useAuth();
  const [stop, setStop] = useState<Stop>('idle');

  const onStop = () => {
    if (!token) return;
    setStop('working');
    unsubscribeWithToken(token)
      .then(({ result }) => {
        setStop(result === 'unsubscribed' ? 'stopped' : 'already_off');
        if (result === 'unsubscribed') logGA4Event({ name: 'reminder_turned_off', params: { source: 'reminders_page' } });
      })
      .catch(error => setStop(error instanceof RemindersApiError && (error.status === 404 || error.status === 400)
        ? 'expired' : 'failed'));
  };

  return (
    <>
      <SeoHead routeKey="reminders" />
      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-8">Reminder emails</h1>
            <div className="surface-card rounded-lg p-6 space-y-4 text-foreground" data-testid="reminders-page">
              {token ? (
                <>
                  {(stop === 'idle' || stop === 'working' || stop === 'failed') && (
                    <>
                      <p>Stop the reminder emails we send you?</p>
                      <button
                        type="button"
                        onClick={onStop}
                        disabled={stop === 'working'}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                      >
                        Stop these emails
                      </button>
                      {stop === 'failed' && <p className="text-sm text-muted-foreground">That did not work. Try again.</p>}
                    </>
                  )}
                  {stop === 'stopped' && <p>Done. We won&apos;t send you reminder emails any more.</p>}
                  {stop === 'already_off' && <p>These emails are already off.</p>}
                  {stop === 'expired' && <p>This link no longer works. Sign in to change your reminder emails.</p>}
                  {stop !== 'idle' && stop !== 'working' && stop !== 'failed' && (
                    <p className="text-sm text-muted-foreground">
                      {user ? <>You can turn them back on from your {RECORD_LINK}.</> : 'To turn them back on, sign in and open your training record.'}
                    </p>
                  )}
                </>
              ) : user ? (
                <RemindersSwitch signedIn source="reminders_page" />
              ) : (
                <p>
                  <Link to={`/login?returnTo=${encodeURIComponent(REMINDERS_RETURN_TO)}`} className="text-link hover:underline">
                    Sign in
                  </Link>{' '}
                  to change your reminder emails.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
