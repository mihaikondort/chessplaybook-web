/**
 * The training reminders switch (EMAIL_REMINDERS_IMPLEMENTATION_PLAN, C3). One component
 * for the training record and plan setup.
 *
 * - SIGNED IN: a switch labelled with the consent wording the server records
 *   (`CONSENT_TEXT.training` in the backend). Off until the player turns it on.
 * - STOPPED: SES could not deliver to the address, so the server stopped sending. Said,
 *   and the player may turn it back on.
 * - A GUEST: reminders go to an account's address, so the ask is to sign in. Sign-in
 *   returns to the training record with this switch in view, NOT turned on: consent has
 *   to be the player's own tap.
 *
 * Only the TRAINING switch is offered: broadcast emails are not built (B2 deferred), and
 * the site does not ask for consent to something it does not send.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { logGA4Event } from '@/services/analytics';
import { fetchReminderSettings, saveReminderSettings, type ReminderSettings, type ReminderSource } from './RemindersApi';

/** The consent text. Must match the backend's `CONSENT_TEXT.training` (reminderSettings.ts). */
export const TRAINING_SWITCH_LABEL = "Email me when I've been away";

export const REMINDERS_RETURN_TO = '/puzzles/progress?reminders=1';

export function RemindersSwitch({ signedIn, source, compact = false }: {
  signedIn: boolean;
  source: ReminderSource;
  /** Plan setup: the switch alone, without the explaining line. */
  compact?: boolean;
}) {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetchReminderSettings()
      .then(result => { if (alive) setSettings(result); })
      .catch(() => { if (alive) setError('Could not load your reminder setting.'); });
    return () => { alive = false; };
  }, [signedIn]);

  if (!signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link
          to={`/login?returnTo=${encodeURIComponent(REMINDERS_RETURN_TO)}`}
          onClick={() => logGA4Event({ name: 'reminder_sign_in_started', params: { source } })}
          className="text-link hover:underline"
        >
          Sign in
        </Link>
        {' '}to get an email when you&apos;ve been away a few days.
      </p>
    );
  }

  const on = settings?.training ?? false;
  const onChange = (next: boolean) => {
    setSaving(true);
    setError(null);
    saveReminderSettings(next, source)
      .then(result => {
        setSettings(result);
        logGA4Event({ name: next ? 'reminder_turned_on' : 'reminder_turned_off', params: { source } });
      })
      .catch(() => setError('That did not save. Try again.'))
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <label className="flex items-center justify-between gap-4 text-sm text-foreground">
        <span>{TRAINING_SWITCH_LABEL}</span>
        <Switch
          checked={on}
          disabled={settings === null || saving}
          onCheckedChange={onChange}
          data-testid="reminders-switch"
        />
      </label>
      {!compact && (
        <p className="mt-1 text-xs text-muted-foreground" data-testid="reminders-note">
          {error
            ?? (settings?.status === 'stopped'
              ? 'Emails to your address could not be delivered, so they stopped.'
              : 'Also on your training plan days. Every email has a link to stop them.')}
        </p>
      )}
      {compact && error && <p className="mt-1 text-xs text-muted-foreground">{error}</p>}
    </div>
  );
}
