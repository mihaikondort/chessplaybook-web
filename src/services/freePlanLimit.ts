/**
 * The free plan's daily limits, as the site meets them (2026-11-13).
 *
 * The server refuses with HTTP 402 and `{ error: 'daily_limit', feature, limit, resetsAt }`
 * (backend/src/services/funnel/freePlanLimits.ts). This turns that answer into one sentence
 * the player can act on, and records it for the funnel (stage 7, `limit_reached`).
 *
 * No Premium link yet: the Premium page comes with the visual direction (owner, 2026-11-13).
 */
import { logGA4Event } from '@/services/analytics';

export type LimitedFeature = 'game_report' | 'explain_position' | 'challenge_session' | 'opening_session';

export interface DailyLimit {
  feature: LimitedFeature;
  limit: number;
  /** ISO UTC: the next Europe/Bucharest midnight. */
  resetsAt: string;
}

const FEATURES: readonly LimitedFeature[] = ['game_report', 'explain_position', 'challenge_session', 'opening_session'];

/** The limit an error answer carries, or null when it is some other error. */
export function readDailyLimit(status: number | undefined, body: unknown): DailyLimit | null {
  if (status !== 402 || !body || typeof body !== 'object') return null;
  const value = body as Record<string, unknown>;
  if (value.error !== 'daily_limit') return null;
  if (!FEATURES.includes(value.feature as LimitedFeature)) return null;
  if (typeof value.limit !== 'number' || typeof value.resetsAt !== 'string') return null;
  return { feature: value.feature as LimitedFeature, limit: value.limit, resetsAt: value.resetsAt };
}

/** "tomorrow", "at 02:00" or "tomorrow at 02:00", in the visitor's own time. */
export function whenBack(resetsAt: string, now: Date = new Date()): string {
  const at = new Date(resetsAt);
  if (Number.isNaN(at.getTime())) return 'tomorrow';
  // At the visitor's own midnight (every visitor in Romania), "tomorrow" says it all.
  if (at.getHours() === 0 && at.getMinutes() === 0) return 'tomorrow';
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return at.toDateString() === now.toDateString() ? `at ${time}` : `tomorrow at ${time}`;
}

export function dailyLimitMessage(limit: DailyLimit, now: Date = new Date()): string {
  const back = whenBack(limit.resetsAt, now);
  switch (limit.feature) {
    case 'game_report':
      return `You've used today's free game report. You can review another game ${back}.`;
    case 'explain_position':
      return `You've used today's ${limit.limit} free explanations. You can explain more positions ${back}.`;
    case 'challenge_session':
      return `You've played today's free Champion Challenge. You can play another one ${back}.`;
    case 'opening_session':
      return `You've used today's free training session. You can train again ${back}.`;
  }
}

/** Record that the visitor met a limit (GA4 mirror of funnel stage 7). */
export function reportDailyLimit(limit: DailyLimit): void {
  logGA4Event({ name: 'limit_reached', params: { feature: limit.feature } });
}
