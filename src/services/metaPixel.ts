/**
 * Meta Pixel wrapper.
 *
 * Thin TypeScript layer over Meta's `fbevents.js` snippet. Exposes:
 *   - initMetaPixel()           — load + init + initial PageView
 *   - trackPageView()           — fire on SPA route change
 *   - trackLead()               — sign-up lead captured
 *   - trackViewContent(name?)   — content surface viewed (e.g. /explain)
 *   - trackCompleteRegistration() — full account creation done
 *
 * No-ops when VITE_META_PIXEL_ID is empty (local dev / preview
 * builds) — keeps the production dataset clean of dev events.
 *
 * See docs/Master Plan - Active/M1/META_PIXEL_INSTALL_PLAN.md.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let initialized = false;

export function initMetaPixel(): void {
  if (initialized) return;
  if (!PIXEL_ID) return;
  if (typeof window === 'undefined') return;

  // Belt-and-braces: even if a non-prod build accidentally has the
  // ID set, only run in production. Dev / preview builds never
  // pollute the dataset.
  if (!import.meta.env.PROD) return;

  // Standard Meta Pixel base code, paraphrased from Meta's docs.
  // Loads connect.facebook.net/en_US/fbevents.js asynchronously and
  // queues calls until the script resolves.
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq?.('init', PIXEL_ID);
  window.fbq?.('track', 'PageView');
  initialized = true;
}

export function trackPageView(): void {
  if (!initialized) return;
  window.fbq?.('track', 'PageView');
}

export function trackLead(): void {
  if (!initialized) return;
  window.fbq?.('track', 'Lead');
}

export function trackViewContent(contentName?: string): void {
  if (!initialized) return;
  if (contentName) {
    window.fbq?.('track', 'ViewContent', { content_name: contentName });
  } else {
    window.fbq?.('track', 'ViewContent');
  }
}

export function trackCompleteRegistration(): void {
  if (!initialized) return;
  window.fbq?.('track', 'CompleteRegistration');
}
