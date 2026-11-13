/**
 * The free plan's daily limits, as the site meets them (2026-11-13).
 *
 * The server refuses with HTTP 402 and `{ error: 'daily_limit', feature, limit, resetsAt }`
 * (backend/src/services/funnel/freePlanLimits.ts). This turns that answer into one sentence
 * the player can act on, and records it for the funnel (stage 7, `limit_reached`).
 *
 * Reporting a limit also opens the one daily-limit dialog (DailyLimitDialog, mounted in the site
 * shell), which says when it is back and offers the Premium page.
 */
import { logGA4Event } from '@/services/analytics';

export type LimitedFeature = 'game_report' | 'explain_position' | 'challenge_session' | 'opening_session' | 'opening_variation';

export interface DailyLimit {
  feature: LimitedFeature;
  limit: number;
  /** ISO UTC: the next Europe/Bucharest midnight. */
  resetsAt: string;
}

const FEATURES: readonly LimitedFeature[] = ['game_report', 'explain_position', 'challenge_session', 'opening_session', 'opening_variation'];

/** The free plan's daily allowances: backend FREE_PLAN_LIMITS (a test reads it, so the two cannot drift). */
export const FREE_PLAN_ALLOWANCE: Readonly<Record<LimitedFeature, number>> = {
  game_report: 1,
  explain_position: 3,
  challenge_session: 1,
  opening_session: 1,
  opening_variation: 1,
};

/** The window event the daily-limit dialog listens for; its `detail` is the DailyLimit. */
export const DAILY_LIMIT_EVENT = 'cp:daily-limit';

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

/** What was used up, as a dialog title. */
export function dailyLimitTitle(limit: DailyLimit): string {
  switch (limit.feature) {
    case 'game_report': return "That's today's free game report";
    case 'explain_position': return `That's today's ${limit.limit} free explanations`;
    case 'challenge_session': return "That's today's free Champion Challenge";
    case 'opening_session': return "That's today's free training session";
    case 'opening_variation': return "That's today's free variation";
  }
}

/** When the visitor can do it again, in their own time. */
export function dailyLimitBack(limit: DailyLimit, now: Date = new Date()): string {
  const back = whenBack(limit.resetsAt, now);
  switch (limit.feature) {
    case 'game_report': return `You can review another game ${back}.`;
    case 'explain_position': return `You can explain more positions ${back}.`;
    case 'challenge_session': return `You can play another one ${back}.`;
    case 'opening_session': return `You can train again ${back}.`;
    case 'opening_variation': return `You can learn another one ${back}.`;
  }
}

export function dailyLimitMessage(limit: DailyLimit, now: Date = new Date()): string {
  const used = {
    game_report: "You've used today's free game report.",
    explain_position: `You've used today's ${limit.limit} free explanations.`,
    challenge_session: "You've played today's free Champion Challenge.",
    opening_session: "You've used today's free training session.",
    opening_variation: "You've learned today's free variation.",
  }[limit.feature];
  return `${used} ${dailyLimitBack(limit, now)}`;
}

/** Record that the visitor met a limit (GA4 mirror of funnel stage 7), and open the dialog. */
export function reportDailyLimit(limit: DailyLimit): void {
  logGA4Event({ name: 'limit_reached', params: { feature: limit.feature } });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<DailyLimit>(DAILY_LIMIT_EVENT, { detail: limit }));
}
