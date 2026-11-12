/**
 * A reminder email's link was opened (EMAIL_REMINDERS_IMPLEMENTATION_PLAN, B3/B4).
 *
 * Every link in a reminder carries `utm_source=reminder` and `s=<send id>`. Reporting it
 * does two jobs: a click counts as a visit (the absence emails start over), and it is how
 * the test campaign tells which emails brought a player back. It needs no sign-in, because
 * the mail app may open a browser where the player is signed out.
 *
 * Mounted once, in the site shell, because the links land on more than one page. Reported
 * once per send id per browser session; the server keeps only the first click anyway.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { reportReminderClick } from './RemindersApi';

const SEND_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function useReminderClick(): void {
  const { search } = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(search);
    const sendId = params.get('s');
    if (params.get('utm_source') !== 'reminder' || !sendId || !SEND_ID.test(sendId)) return;
    const key = `cp_reminder_click_${sendId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* storage blocked: report anyway, the server keeps the first */ }
    reportReminderClick(sendId);
  }, [search]);
}
