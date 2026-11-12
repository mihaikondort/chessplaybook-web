/**
 * The funnel's visit record (#46, FUNNEL_EVENT_CONTRACT §2 and §5).
 *
 * - THE FIRST TOUCH is read from the first page this browser ever loads: the path, the
 *   utm values, whether the click was paid, the referrer's host. Kept in localStorage
 *   until the server has it, then never sent again.
 * - THE VISIT goes once per Europe/Bucharest day: the server's "this player was here today".
 *
 * Only a path and a host leave the browser (owner decision Q3): no query string, no full
 * referrer, no click id. Every failure is swallowed: measuring must never break a page.
 */
import env from '@/config/env';

const FIRST_TOUCH_KEY = 'cp_first_touch';
const FIRST_TOUCH_SENT_KEY = 'cp_first_touch_sent';
const VISIT_DAY_KEY = 'cp_visit_day';

export interface FirstTouch {
  touchedAt: string;
  landingPath: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  paidClick: boolean;
  referrerHost?: string;
}

/** The server's patterns (backend/src/routes/funnel.ts); anything else is left out. */
const UTM_VALUE = /^[A-Za-z0-9._~+\- ]{1,100}$/;
const PATH = /^\/[^?#\s]{0,199}$/;
const HOST = /^[A-Za-z0-9.-]{1,120}$/;
const PAID_MEDIA = new Set(['cpc', 'ppc', 'paid', 'paidsearch', 'paid_search', 'paid-social', 'paid_social', 'display']);
/** Google Ads and Meta click ids: their presence marks a paid click; the value is never kept. */
const CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid'];

function utm(params: URLSearchParams, name: string): string | undefined {
  const value = params.get(name)?.trim();
  return value && UTM_VALUE.test(value) ? value : undefined;
}

/** What a first page load says about where the visitor came from. */
export function readFirstTouch(location: { pathname: string; search: string; host: string }, referrer: string, now: Date): FirstTouch {
  const params = new URLSearchParams(location.search);
  const medium = utm(params, 'utm_medium');
  let referrerHost: string | undefined;
  try {
    const host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
    // Our own pages are not a source.
    if (host && host !== location.host.toLowerCase() && HOST.test(host)) referrerHost = host;
  } catch { /* an unreadable referrer is no referrer */ }
  return {
    touchedAt: now.toISOString(),
    landingPath: PATH.test(location.pathname) ? location.pathname : '/',
    utmSource: utm(params, 'utm_source'),
    utmMedium: medium,
    utmCampaign: utm(params, 'utm_campaign'),
    utmContent: utm(params, 'utm_content'),
    paidClick: CLICK_IDS.some(id => params.has(id)) || (medium !== undefined && PAID_MEDIA.has(medium.toLowerCase())),
    referrerHost,
  };
}

/** Today in Europe/Bucharest, the day every reporting figure uses. */
export function bucharestDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode: the next visit tries again */ }
}

/** Keep the first touch, once, on the first page this browser loads. */
export function captureFirstTouch(now = new Date()): void {
  if (read(FIRST_TOUCH_SENT_KEY) || read(FIRST_TOUCH_KEY)) return;
  write(FIRST_TOUCH_KEY, JSON.stringify(readFirstTouch(window.location, document.referrer, now)));
}

let inFlight = false;

/** Record today's visit (and the first touch, until the server has it). At most once a day. */
export async function recordVisit(options: { fetchImpl?: typeof fetch; now?: Date } = {}): Promise<void> {
  const now = options.now ?? new Date();
  const day = bucharestDay(now);
  if (inFlight || read(VISIT_DAY_KEY) === day) return;
  inFlight = true;
  try {
    // Lazy, like the presence heartbeat: the auth module is not part of every page's first load.
    const { getRequestHeaders } = await import('@/features/auth/utils/getAuthToken');
    const headers = await getRequestHeaders();
    // Signed in but no token right now: send nothing rather than a guest's identity.
    if (!headers.Authorization && !headers['X-Anonymous-Id']) return;
    let firstTouch: FirstTouch | undefined;
    if (!read(FIRST_TOUCH_SENT_KEY)) {
      try { firstTouch = JSON.parse(read(FIRST_TOUCH_KEY) ?? 'null') ?? undefined; } catch { firstTouch = undefined; }
    }
    const response = await (options.fetchImpl ?? fetch)(`${env.apiBaseUrl}/api/funnel/visit`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(firstTouch ? { firstTouch } : {}),
      keepalive: true,
    });
    if (response.status === 204) {
      write(VISIT_DAY_KEY, day);
      if (firstTouch) write(FIRST_TOUCH_SENT_KEY, '1');
    } else if (response.status === 400 && firstTouch) {
      // A stored touch the server refuses would be refused for ever: drop it, keep the visits.
      write(FIRST_TOUCH_SENT_KEY, '1');
    }
  } catch {
    // Offline or blocked: tried again on the next page load.
  } finally {
    inFlight = false;
  }
}
