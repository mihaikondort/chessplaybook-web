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
import fullPriceCountries from '@/config/premium-full-price-countries.json';

export interface CheckoutSettings {
  environment: 'sandbox' | 'production';
  clientToken: string;
  /** `oneYear`: paid once, never renewing (owner, 2026-11-13); null until configured. */
  prices: { monthly: string; yearly: string; oneYear: string | null };
}

/** A full refund within 30 days of a payment (owner, 2026-11-13). */
export interface RefundInfo {
  available: { kind: 'pass' | 'subscription'; until: string; totalMinor: string | null; currency: string | null } | null;
  pending: boolean;
}

/* Paddle's currencies with no minor unit. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'VND']);

/** "€22.49", from Paddle's minor units; null when the amount is not known. */
export function formatMinor(totalMinor: string | null, currency: string | null): string | null {
  if (!totalMinor || !currency || !/^\d+$/.test(totalMinor)) return null;
  const amount = Number(totalMinor) / (ZERO_DECIMAL.has(currency) ? 1 : 100);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export interface PremiumState {
  refund?: RefundInfo;
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
    data: {
      details: { lineItems: Array<{ price: { id: string }; formattedTotals: { total: string }; totals: { total: string } }> };
      currencyCode: string;
      address?: { countryCode?: string } | null;
    };
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

export interface Plans { yearly: PlanPrice; monthly: PlanPrice | null; oneYear: PlanPrice | null }

/** The countries that pay the full price, and may also subscribe monthly (owner, 2026-11-13). */
const FULL_PRICE = new Set(Object.entries(fullPriceCountries as Record<string, unknown>)
  .filter(([key]) => !key.startsWith('_')).flatMap(([, codes]) => codes as string[]));

/** The reduced-price currencies (scripts/paddle/local-currencies.json); every other one is full price. */
export const REDUCED_CURRENCIES = new Set(['INR', 'BRL', 'MXN', 'ZAR', 'ARS', 'CLP', 'COP', 'PEN', 'CNY', 'THB', 'VND', 'UAH', 'TRY']);

function isFullPriceCurrency(currency: string, preview: { data: { details: { lineItems: Array<{ totals: { total: string } }> } } }): boolean {
  const total = Number(preview.data.details.lineItems[0]?.totals.total ?? 0);
  if (currency === 'USD') return total >= 2000;
  /* The euro is used at both levels: the Balkans and Moldova pay EUR 5.49, the euro area EUR 22.49. */
  if (currency === 'EUR') return total >= 1000;
  return !REDUCED_CURRENCIES.has(currency);
}

export function isFullPriceCountry(countryCode: string | null | undefined): boolean {
  return Boolean(countryCode) && FULL_PRICE.has(countryCode!.toUpperCase());
}

/**
 * The visitor's own prices, in their own currency (Paddle localises by the visitor's address).
 * Monthly is offered only in the full-price countries (owner, 2026-11-13): elsewhere yearly and
 * one year only. Monthly is previewed on its own, because one preview must be in one currency and
 * in a reduced-price country the yearly price is local while monthly is not.
 */
export async function previewPlans(paddle: PaddleGlobal, settings: CheckoutSettings): Promise<Plans> {
  const yearlyIds = [settings.prices.yearly, ...(settings.prices.oneYear ? [settings.prices.oneYear] : [])];
  const yearly = await paddle.PricePreview({ items: yearlyIds.map((priceId) => ({ priceId, quantity: 1 })) });
  const read = (preview: typeof yearly, id: string): PlanPrice => {
    const line = preview.data.details.lineItems.find((l) => l.price.id === id)!;
    return { priceId: id, total: line.formattedTotals.total, cents: Number(line.totals.total), currency: preview.data.currencyCode };
  };
  /* The country when Paddle reports it (it does, from the visitor's IP: checked 2026-11-13); else the
     currency. EUR and USD are used at both levels and are told apart by amount; every other currency
     belongs to one level only. */
  const country = yearly.data.address?.countryCode;
  const fullPrice = country ? isFullPriceCountry(country) : isFullPriceCurrency(yearly.data.currencyCode, yearly);
  let monthly: PlanPrice | null = null;
  if (fullPrice) {
    const preview = await paddle.PricePreview({ items: [{ priceId: settings.prices.monthly, quantity: 1 }] });
    monthly = read(preview, settings.prices.monthly);
  }
  return {
    yearly: read(yearly, settings.prices.yearly),
    monthly,
    oneYear: settings.prices.oneYear ? read(yearly, settings.prices.oneYear) : null,
  };
}

export function openCheckout(paddle: PaddleGlobal, priceId: string, account: { sub: string; email: string }): void {
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: account.email ? { email: account.email } : undefined,
    customData: { cognitoSub: account.sub },
  });
}
