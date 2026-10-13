import env from '@/config/env';

export const PRESENCE_STORAGE_KEY = 'chessplaybook.presence.session.v1';
export const VISITOR_STORAGE_KEY = 'chessplaybook.visitor.v1';
export type RouteGroup = 'home' | 'puzzles' | 'explain' | 'champions' | 'online-play' | 'analysis' | 'auth' | 'other';

let memoryPresenceId: string | undefined;
let memoryVisitorId: string | undefined;
let cachedAuthToken: string | null = null;
let authLookupInFlight = false;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeRouteGroup(pathname: string): RouteGroup {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/puzzles')) return 'puzzles';
  if (pathname.startsWith('/explain')) return 'explain';
  if (pathname.startsWith('/champions')) return 'champions';
  if (pathname.startsWith('/play-online')) return 'online-play';
  if (pathname.startsWith('/analysis')) return 'analysis';
  if (/^\/(auth|login|signup)(\/|$)/.test(pathname)) return 'auth';
  return 'other';
}

export function getPresenceId(storage: Storage = sessionStorage): string {
  try {
    const existing = storage.getItem(PRESENCE_STORAGE_KEY);
    if (existing && UUID_V4_RE.test(existing)) return existing;
    const created = crypto.randomUUID();
    storage.setItem(PRESENCE_STORAGE_KEY, created);
    return created;
  } catch {
    memoryPresenceId ??= crypto.randomUUID();
    return memoryPresenceId;
  }
}

export function getVisitorId(storage: Storage = localStorage): string {
  try {
    const existing = storage.getItem(VISITOR_STORAGE_KEY);
    if (existing && UUID_V4_RE.test(existing)) return existing;
    const created = crypto.randomUUID();
    storage.setItem(VISITOR_STORAGE_KEY, created);
    return created;
  } catch {
    memoryVisitorId ??= crypto.randomUUID();
    return memoryVisitorId;
  }
}

function warmAuthToken(): void {
  if (authLookupInFlight) return;
  authLookupInFlight = true;
  void import('@/features/auth/utils/getAuthToken')
    .then(({ getAuthToken }) => getAuthToken())
    .then(token => { cachedAuthToken = token; })
    .catch(() => { cachedAuthToken = null; })
    .finally(() => { authLookupInFlight = false; });
}

export async function sendPresenceHeartbeat(
  routeGroup: RouteGroup,
  options: { fetchImpl?: typeof fetch; sessionStore?: Storage; visitorStore?: Storage; timeoutMs?: number } = {},
): Promise<void> {
  warmAuthToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 4_000);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cachedAuthToken) headers.Authorization = `Bearer ${cachedAuthToken}`;
    await (options.fetchImpl ?? fetch)(`${env.apiBaseUrl}/api/presence/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        presenceId: getPresenceId(options.sessionStore),
        visitorId: getVisitorId(options.visitorStore),
        routeGroup,
      }),
      signal: controller.signal,
      keepalive: true,
    });
  } catch {
    // Presence is operational telemetry and must never disrupt the public app.
  } finally {
    clearTimeout(timeout);
  }
}
