/**
 * Paddle checkout on the site (PREMIUM_OFFER_ANALYSIS section 9 item 5; 2026-11-13).
 *
 * Nothing here runs unless the API answers `GET /api/premium/checkout` with settings, which
 * production does not until launch: no Paddle script is loaded and no Premium control shows.
 *
 * Facts from developer.paddle.com (read 2026-11-13): Paddle.js is always loaded from
 * https://cdn.paddle.com/paddle/v2/paddle.js; `Paddle.Environment.set('sandbox')` comes before
 * `Paddle.Initialize({ token, eventCallback })`, which may run once per page; a checkout opens with
 * `items`, `customer.email` and `customData` (copied onto the subscription, which is how the
 * backend knows the account: owner, buying needs an account).
 */
import env from '@/config/env';

export interface CheckoutSettings {
  environment: 'sandbox' | 'production';
  clientToken: string;
  /** `oneYear`: paid once, never renewing (owner, 2026-11-13); null until configured. */
  prices: { monthly: string; yearly: string; oneYear: string | null };
}

export interface PremiumState {
  premium: boolean;
  kind: 'subscription' | 'pass' | null;
  status: string | null;
  periodEndsAt: string | null;
  scheduledChange: string | null;
}

interface PaddleGlobal {
  Environment: { set: (environment: string) => void };
  Initialize: (options: { token: string; eventCallback?: (event: { name?: string }) => void }) => void;
  Checkout: { open: (options: Record<string, unknown>) => void };
  PricePreview: (request: { items: Array<{ priceId: string; quantity: number }> }) => Promise<{
    data: { details: { lineItems: Array<{ price: { id: string }; formattedTotals: { total: string }; totals: { total: string } }> }; currencyCode: string };
  }>;
}

declare global {
  interface Window { Paddle?: PaddleGlobal }
}

const SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js';

export async function fetchCheckoutSettings(fetchImpl: typeof fetch = fetch): Promise<CheckoutSettings | null> {
  try {
    const response = await fetchImpl(`${env.apiBaseUrl}/api/premium/checkout`);
    if (!response.ok) return null;
    const body = await response.json() as { checkout?: CheckoutSettings | null };
    return body.checkout ?? null;
  } catch {
    return null;
  }
}

let loading: Promise<PaddleGlobal> | null = null;
const completedListeners = new Set<() => void>();

/** Load and initialise Paddle.js once per page. */
export function loadPaddle(settings: CheckoutSettings): Promise<PaddleGlobal> {
  if (loading) return loading;
  loading = new Promise<PaddleGlobal>((resolve, reject) => {
    const ready = () => {
      const paddle = window.Paddle;
      if (!paddle) { reject(new Error('Paddle.js did not load')); return; }
      if (settings.environment === 'sandbox') paddle.Environment.set('sandbox');
      paddle.Initialize({
        token: settings.clientToken,
        eventCallback: (event) => {
          if (event?.name === 'checkout.completed') completedListeners.forEach((listener) => listener());
        },
      });
      resolve(paddle);
    };
    if (window.Paddle) { ready(); return; }
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = ready;
    script.onerror = () => { loading = null; reject(new Error('Paddle.js could not be loaded')); };
    document.head.appendChild(script);
  });
  return loading;
}

export function onCheckoutCompleted(listener: () => void): () => void {
  completedListeners.add(listener);
  return () => { completedListeners.delete(listener); };
}

export interface PlanPrice { priceId: string; total: string; cents: number; currency: string }

/**
 * The visitor's own prices (Paddle localises by the visitor's address). The monthly plan is
 * offered only where the yearly one is full price (owner, 2026-11-13): elsewhere yearly only.
 */
export interface Plans { yearly: PlanPrice; monthly: PlanPrice | null; oneYear: PlanPrice | null }

export async function previewPlans(paddle: PaddleGlobal, settings: CheckoutSettings): Promise<Plans> {
  const ids = [settings.prices.yearly, settings.prices.monthly, ...(settings.prices.oneYear ? [settings.prices.oneYear] : [])];
  const preview = await paddle.PricePreview({ items: ids.map((priceId) => ({ priceId, quantity: 1 })) });
  const lines = preview.data.details.lineItems;
  const read = (id: string): PlanPrice => {
    const line = lines.find((l) => l.price.id === id)!;
    return { priceId: id, total: line.formattedTotals.total, cents: Number(line.totals.total), currency: preview.data.currencyCode };
  };
  const yearly = read(settings.prices.yearly);
  /* Full price is $25 a year; the reduced ones are $6.50 or Rs 549 (India, for UPI). Only a USD
     price of $20 or more is the full price; any other currency is a reduced one. */
  const fullPrice = yearly.currency === 'USD' && yearly.cents >= 2000;
  return {
    yearly,
    monthly: fullPrice ? read(settings.prices.monthly) : null,
    oneYear: settings.prices.oneYear ? read(settings.prices.oneYear) : null,
  };
}

export function openCheckout(paddle: PaddleGlobal, priceId: string, account: { sub: string; email: string }): void {
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: account.email ? { email: account.email } : undefined,
    customData: { cognitoSub: account.sub },
  });
}
