/**
 * Deleting your account, from the account page (2026-08-04).
 *
 * The privacy policy has always promised "Request deletion of your
 * information". Until now that meant emailing a person. This is the control
 * that makes it real, and it is self-service because a right that depends on
 * someone being available to honour it is a weaker right.
 *
 * FOUR THINGS THIS UI OWES THE PLAYER, each of which is easy to skip:
 *
 *  1. **Say what will be destroyed, in its own terms.** "Delete my account" is
 *     an abstraction; "341 solved puzzles and a rating of 2286" is the thing.
 *     The counts come from the server, so they are what will actually go.
 *  2. **Say what will NOT be destroyed.** Games played against other people are
 *     kept and anonymised, because they are the opponent's record too. A player
 *     who expects total erasure and finds a game later should have been told,
 *     and backups take up to 30 days to age out.
 *  3. **Make it deliberate, not clickable.** Typing the username is the
 *     standard because it cannot be done by accident or by a stray tap on a
 *     phone.
 *  4. **Tell the truth when it half-works.** The data and the login are two
 *     systems, and the second can fail after the first succeeded. Saying
 *     "deleted" when the login survives is the kind of lie a person only
 *     discovers by trying to sign in.
 */
import { useEffect, useState } from 'react';
import { signOut } from 'aws-amplify/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { getAuthHeader } from '../utils/getAuthToken';
import env from '@/config/env';

interface AccountSummary {
  identityIds: string[];
  counts: Record<string, number>;
}

type Phase =
  | { status: 'idle' }
  | { status: 'confirming' }
  | { status: 'deleting' }
  | { status: 'data-gone-login-remains'; message: string }
  | { status: 'failed'; message: string };

const COUNT_LABELS: Array<{ key: string; singular: string; plural: string }> = [
  { key: 'puzzle_attempts', singular: 'puzzle attempt', plural: 'puzzle attempts' },
  { key: 'challenge_answers', singular: 'Champion Challenge answer', plural: 'Champion Challenge answers' },
  { key: 'ratings', singular: 'rating', plural: 'ratings' },
];

export function DeleteAccountCard({ username }: { username: string }) {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [phase, setPhase] = useState<Phase>({ status: 'idle' });
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await getAuthHeader();
        const res = await fetch(`${env.apiBaseUrl}/api/account/summary`, { headers });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled && body?.success) setSummary(body.data);
      } catch {
        // The summary is a courtesy; its absence must not remove the control.
        // A player who cannot see the counts can still delete their account.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const confirmed = typed.trim() === username;

  async function handleDelete() {
    setPhase({ status: 'deleting' });
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${env.apiBaseUrl}/api/account`, { method: 'DELETE', headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setPhase({ status: 'failed', message: body?.error || `The server refused the request (${res.status}).` });
        return;
      }

      /*
        BOTH halves are the server's job now (2026-08-04). This used to call
        Amplify's `deleteUser()` here, which requires an access token carrying
        `aws.cognito.signin.user.admin`: a native password sign-in has it, a
        Google one does not, and most accounts in this pool are Google. The
        owner deleted a real account and the login survived.
      */
      const body = await res.json().catch(() => null);
      if (body?.data?.cognito && body.data.cognito.deleted === false) {
        setPhase({
          status: 'data-gone-login-remains',
          message: body.data.cognito.reason || 'Unknown error',
        });
        return;
      }

      // The account no longer exists; the session in this tab is a ghost.
      // Signing out clears it, and a full page load (not a router navigation)
      // makes sure nothing in memory keeps rendering as though it were live.
      try { await signOut(); } catch { /* the account is gone either way */ }
      window.location.href = '/?account=deleted';
    } catch (err) {
      setPhase({
        status: 'failed',
        message: err instanceof Error ? err.message : 'The request could not be sent.',
      });
    }
  }

  const counts = summary?.counts ?? {};
  const described = COUNT_LABELS
    .filter(({ key }) => (counts[key] ?? 0) > 0)
    .map(({ key, singular, plural }) => `${counts[key]} ${counts[key] === 1 ? singular : plural}`);

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Delete your account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          This removes your account and everything stored against it. It cannot be undone.
        </p>

        {described.length > 0 && (
          <p>
            You will lose <span className="font-medium text-foreground">{described.join(', ')}</span>,
            along with your puzzle history and preferences.
          </p>
        )}

        {/*
          Stated up front, not in a policy nobody reads. A player who expects
          every trace to vanish and later finds a game they played is entitled
          to have been told first.
        */}
        <p className="text-muted-foreground">
          Games you played against other people are kept, with your name replaced by
          &ldquo;Deleted player&rdquo; — they are part of your opponent&rsquo;s record too. Backups
          are removed within 30 days.
        </p>

        {phase.status === 'idle' && (
          <button
            onClick={() => setPhase({ status: 'confirming' })}
            className="rounded-lg border border-destructive/60 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Delete my account
          </button>
        )}

        {phase.status === 'confirming' && (
          <div className="space-y-3">
            <label htmlFor="confirm-username" className="block">
              Type <span className="font-mono font-medium">{username}</span> to confirm.
            </label>
            <input
              id="confirm-username"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={!confirmed}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete permanently
              </button>
              <button
                onClick={() => { setPhase({ status: 'idle' }); setTyped(''); }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {phase.status === 'deleting' && (
          <p aria-live="polite" className="text-muted-foreground">Deleting your account…</p>
        )}

        {phase.status === 'failed' && (
          <div aria-live="polite" className="rounded-lg border border-destructive/40 p-3">
            <p className="font-medium">Nothing was deleted.</p>
            <p className="text-muted-foreground mt-1">
              The whole deletion is one transaction, so your account is exactly as it was. {phase.message}
            </p>
          </div>
        )}

        {phase.status === 'data-gone-login-remains' && (
          <div aria-live="polite" className="rounded-lg border border-destructive/40 p-3">
            <p className="font-medium">Your data is deleted, but the login itself was not removed.</p>
            <p className="text-muted-foreground mt-1">
              Signing in again would create an empty account. Email{' '}
              <a href="mailto:support@chessplaybook.com" className="underline">support@chessplaybook.com</a>{' '}
              and we will finish removing it. ({phase.message})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
