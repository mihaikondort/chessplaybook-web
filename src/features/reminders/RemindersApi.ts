/**
 * The email reminders API (EMAIL_REMINDERS_IMPLEMENTATION_PLAN, phase C).
 *
 * Reminders go to the ACCOUNT's address, so turning them on needs a signed-in player;
 * the offer and its record work for guests too. Every request carries a JSON body when it
 * has a body at all: Fastify answers `application/json` with no body with a 400 (the
 * trap recorded in PlanApi.ts).
 */
import env from '@/config/env';

const BASE = `${env.apiBaseUrl}/api/reminders`;

export interface ReminderSettings {
  broadcasts: boolean;
  training: boolean;
  status: 'active' | 'off' | 'stopped' | 'none';
  timeZone: string | null;
  sendHour: number | null;
}

export interface ReminderOffer {
  eligible: boolean;
  reason: 'already_offered' | 'already_on' | 'too_early' | null;
  /** Attempted puzzles, misses included: the offer is earned at 10 (server). */
  attempts: number;
}

/** Where a switch was turned on, recorded with the consent. */
export type ReminderSource = 'first_session' | 'plan' | 'record' | 'reminders_page';

export class RemindersApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'RemindersApiError';
  }
}

async function request<T>(path: string, init?: RequestInit & { anonymous?: boolean }): Promise<T> {
  const headers = init?.anonymous
    ? {}
    : await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...headers, ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  let body: { success?: boolean; data?: T; error?: string } | null = null;
  try { body = await response.json(); } catch { /* a proxy's error page */ }
  if (!response.ok || body?.success === false) {
    throw new RemindersApiError(body?.error || `Request failed (${response.status})`, response.status);
  }
  return body!.data as T;
}

/** The browser's own time zone: reminders arrive at the player's local hour. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const fetchReminderSettings = () => request<ReminderSettings>('');

/**
 * Set both switches. Broadcast emails are not built yet (B2 deferred), so the site only
 * ever sends `broadcasts: false`; the server keeps the switch for when they are.
 */
export const saveReminderSettings = (training: boolean, source: ReminderSource) =>
  request<ReminderSettings>('', {
    method: 'PUT',
    body: JSON.stringify({ broadcasts: false, training, timeZone: browserTimeZone(), source }),
  });

export const fetchReminderOffer = () => request<ReminderOffer>('/offer');

export const markReminderOffer = (dismissed: boolean) =>
  request<ReminderOffer>('/offer', { method: 'POST', body: JSON.stringify({ dismissed }) });

/** From an email's link: no sign-in, the token is the key. */
export const unsubscribeWithToken = (token: string) =>
  request<{ result: 'unsubscribed' | 'already_off' }>('/unsubscribe', {
    method: 'POST', body: JSON.stringify({ token }), anonymous: true,
  });

/** A reminder link was opened. Fire and forget: a lost click costs a statistic. */
export function reportReminderClick(sendId: string): void {
  request<void>('/clicked', { method: 'POST', body: JSON.stringify({ sendId }), anonymous: true })
    .catch(() => undefined);
}
