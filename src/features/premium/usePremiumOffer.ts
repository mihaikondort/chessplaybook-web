/**
 * Premium as one hook (2026-11-14): checkout settings, the visitor's own prices, the account's
 * Premium state, and buying. Shared by the account page's card and the Premium page, so the two
 * cannot load or sell differently.
 *
 * `settings` is null where the API has no Paddle settings (production until launch): no Paddle
 * script is loaded and nothing can be bought. Prices come from Paddle, which localises them by the
 * visitor's address, so a guest sees their own price too; buying needs an account (owner).
 */
import { useCallback, useEffect, useState } from 'react';
import env from '@/config/env';
import { getAuthHeader } from '@/features/auth/utils/getAuthToken';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchCheckoutSettings, loadPaddle, onCheckoutCompleted, openCheckout, previewPlans,
  type CheckoutSettings, type Plans, type PremiumState,
} from './paddleCheckout';

export async function fetchPremium(): Promise<PremiumState | null> {
  try {
    const response = await fetch(`${env.apiBaseUrl}/api/premium`, { headers: await getAuthHeader() });
    return response.ok ? await response.json() as PremiumState : null;
  } catch {
    return null;
  }
}

export interface PremiumOffer {
  /** False until the checkout settings have been asked for. */
  checked: boolean;
  settings: CheckoutSettings | null;
  plans: Plans | null;
  /** The signed-in account's Premium; null for a guest or before it loads. */
  state: PremiumState | null;
  setState: (state: PremiumState | null) => void;
  message: string | null;
  setMessage: (message: string | null) => void;
  buy: (priceId: string) => Promise<void>;
}

export function usePremiumOffer(): PremiumOffer {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [settings, setSettings] = useState<CheckoutSettings | null>(null);
  const [plans, setPlans] = useState<Plans | null>(null);
  const [state, setState] = useState<PremiumState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await fetchCheckoutSettings();
      if (cancelled) return;
      setSettings(found);
      setChecked(true);
      if (!found) return;
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

  /* The account's state, once there are settings and an account (a guest has none). */
  useEffect(() => {
    if (!settings || !user) { setState(null); return; }
    let cancelled = false;
    void fetchPremium().then((next) => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
  }, [settings, user]);

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

  const buy = useCallback(async (priceId: string) => {
    if (!settings || !user) return;
    try {
      openCheckout(await loadPaddle(settings), priceId, { sub: user.userId, email: user.email });
    } catch {
      setMessage('Checkout could not be opened. Please try again later.');
    }
  }, [settings, user]);

  return { checked, settings, plans, state, setState, message, setMessage, buy };
}
