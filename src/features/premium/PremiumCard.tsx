/**
 * Premium on the account page (2026-11-13): the player's status, the plans in their own prices,
 * and Paddle's customer portal. Renders nothing unless the API has checkout settings, so it is
 * invisible in production until launch and live on staging (sandbox).
 *
 * Buying needs an account (owner), which this page already guarantees. The Premium page proper
 * comes with the visual direction; this card is how checkout is tested and how a Premium player
 * manages the subscription.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import env from '@/config/env';
import { getAuthHeader } from '@/features/auth/utils/getAuthToken';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchCheckoutSettings, loadPaddle, onCheckoutCompleted, openCheckout, previewPlans,
  type CheckoutSettings, type Plans, type PremiumState,
} from './paddleCheckout';

async function fetchPremium(): Promise<PremiumState | null> {
  try {
    const response = await fetch(`${env.apiBaseUrl}/api/premium`, { headers: await getAuthHeader() });
    return response.ok ? await response.json() as PremiumState : null;
  } catch {
    return null;
  }
}

function day(sqliteUtc: string | null): string | null {
  if (!sqliteUtc) return null;
  const at = new Date(`${sqliteUtc.replace(' ', 'T')}Z`);
  return Number.isNaN(at.getTime()) ? null : at.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PremiumCard() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [state, setState] = useState<PremiumState | null>(null);
  const [plans, setPlans] = useState<Plans | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await fetchCheckoutSettings();
      if (cancelled || !found) return;
      setSettings(found);
      setState(await fetchPremium());
      try {
        const paddle = await loadPaddle(found);
        const preview = await previewPlans(paddle, found);
        if (!cancelled) setPlans(preview);
      } catch {
        if (!cancelled) setMessage('Prices could not be loaded. Please try again later.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* After a purchase, Paddle tells our server by webhook; wait for it, up to a minute. */
  useEffect(() => onCheckoutCompleted(() => {
    setMessage('Thank you. Your Premium is being set up…');
    let tries = 0;
    const poll = async () => {
      const next = await fetchPremium();
      if (next?.premium) { setState(next); setMessage(null); return; }
      if (++tries < 30) window.setTimeout(poll, 2000);
      else setMessage('Your payment went through. Premium can take a few minutes to appear; reload this page soon.');
    };
    void poll();
  }), []);

  if (!settings || !user) return null;

  const buy = async (priceId: string) => {
    try {
      openCheckout(await loadPaddle(settings), priceId, { sub: user.userId, email: user.email });
    } catch {
      setMessage('Checkout could not be opened. Please try again later.');
    }
  };

  const manage = async () => {
    setBusy(true);
    try {
      const response = await fetch(`${env.apiBaseUrl}/api/premium/portal`, { method: 'POST', headers: await getAuthHeader() });
      const body = await response.json().catch(() => null) as { url?: string } | null;
      if (body?.url) window.location.assign(body.url);
      else setMessage('The subscription page could not be opened. Please try again later.');
    } finally {
      setBusy(false);
    }
  };

  const ends = day(state?.periodEndsAt ?? null);
  const cancelling = state?.scheduledChange?.startsWith('cancel@') ?? false;

  return (
    <Card data-testid="premium-card">
      <CardHeader><CardTitle>Premium</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state?.premium ? (
          <>
            {state.kind === 'pass' ? (
              <p>You have Premium until {ends ?? 'the end of your year'}. It does not renew; you can buy another year whenever you like.</p>
            ) : (
              <>
                <p>You have Premium.{ends && (cancelling ? ` It ends on ${ends}.` : ` It renews on ${ends}.`)}</p>
                <Button variant="outline" onClick={manage} disabled={busy}>Manage your subscription</Button>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Unlimited game reports and explanations, and the full opening trainer.
              {plans?.oneYear && ' Subscribe and it renews each period, or pay once for one year with no renewal.'}
            </p>
            {plans && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => buy(plans.yearly.priceId)}>{plans.yearly.total} a year</Button>
                {plans.monthly && (
                  <Button variant="outline" onClick={() => buy(plans.monthly!.priceId)}>{plans.monthly.total} a month</Button>
                )}
                {plans.oneYear && (
                  <Button variant="outline" onClick={() => buy(plans.oneYear!.priceId)}>{plans.oneYear.total} once, for one year</Button>
                )}
              </div>
            )}
          </>
        )}
        {message && <p role="status" className="text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
