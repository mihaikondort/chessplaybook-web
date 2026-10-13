/**
 * The client half of training plans and the one offer (TRAINING_SYSTEM E3–E5).
 *
 * Same shape as `PuzzleSessionApi` — same `request<T>` wrapper, same
 * `{success, data, error}` unwrapping, same CALL-TIME import of the auth
 * headers. That last one is not style: a static import of `getAuthToken` pulls
 * the Cognito/AWS graph into whichever chunk touches it, which is what kept the
 * Champion Challenge picker ~650ms behind `/champions` until it was found.
 *
 * Nothing here is reachable from free solving.
 */
import env from '@/config/env';

const BASE = `${env.apiBaseUrl}/api/puzzles`;

export type PlanStatus = 'active' | 'completed' | 'abandoned';
export type PlanArea = 'tactics' | 'middlegame' | 'endgame';
/** A review covers all three areas at once — see MIXED_AREA on the server. */
export type PlanItemArea = PlanArea | 'mixed';

export interface PlanItem {
  id: string;
  scheduledOn: string;
  ordinal: number;
  area: PlanItemArea;
  total: number;
  /** `review` is the plan's closing measurement — mixed, and unrated. */
  kind: 'training' | 'review';
  sessionId: string | null;
  /** Derived from the run that executed it — never stored. */
  status: 'pending' | 'active' | 'completed' | 'abandoned';
}

export interface PlanProgress {
  items: number;
  completed: number;
  positions: number;
  positionsDone: number;
  finished: boolean;
}

export interface TrainingPlan {
  id: string;
  status: PlanStatus;
  sessionsPerWeek: number;
  /** Positions in a full session. Named for what it is — "length" read as minutes. */
  positionsPerSession: number;
  startsOn: string;
  endsOn: string;
  targetEvent: string | null;
  createdAt: string;
  endedAt: string | null;
  items: PlanItem[];
  progress: PlanProgress;
}

export interface GeneratedPlanSummary {
  sessions: number;
  positions: number;
  positionsPerSession: number;
  firstSessionPositions: number;
  ramped: boolean;
  /** True when every session covers all three areas — the short-plan shape. */
  mixed: boolean;
  positionsByArea: Record<PlanArea, number>;
  /** The day the plan measures whether any of it worked. */
  reviewOn: string | null;
  reviewPositions: number;
  byArea: Record<PlanArea, number>;
  weeks: number;
  emphasis: PlanArea | null;
  /*
    `player_asked` was missing here (found 2026-08-06 by the type checker, while
    giving each reason a sentence).

    The server has been able to send it since the area preferences shipped on
    2026-08-05 — it is what the thumbs write — and the client type said it could
    not, so the UI had no branch for it and rendered an emphasis with no reason
    at all. The one case where the reason matters most, because it was the
    player's own doing, was the one case that explained nothing.
  */
  emphasisReason:
    'never_trained' | 'not_enough_evidence' | 'lowest_accuracy' | 'player_asked' | null;
}

export interface GeneratedPlan {
  startsOn: string;
  endsOn: string;
  sessionsPerWeek: number;
  positionsPerSession: number;
  targetEvent: string | null;
  items: Array<{
    scheduledOn: string; ordinal: number; area: PlanItemArea; total: number;
    kind?: 'training' | 'review';
  }>;
  summary: GeneratedPlanSummary;
}

/** Start the run for a plan item — created and attached as one act (E7). */
export function startPlanItem(planId: string, itemId: string): Promise<TrainingPlan> {
  return request<TrainingPlan>(`/plans/${planId}/items/${itemId}/start`, { method: 'POST' });
}

/** Catch the calendar up after missed days. Placement only. */
export function reflowPlan(planId: string): Promise<{
  plan: TrainingPlan; moved: number; overflow: number; extended: boolean;
}> {
  return request(`/plans/${planId}/reflow`, {
    method: 'POST',
    body: JSON.stringify({ today: localToday() }),
  });
}

export interface PlanOffer {
  eligible: boolean;
  reason: 'already_offered' | 'has_plan' | 'too_early' | 'nothing_specific' | null;
  form: 'absence' | 'comparison' | null;
  area: PlanArea | null;
  facts: {
    totalSolved: number;
    totalAttempts: number;
    areaAttempts: number;
    areaAccuracy: number | null;
    strongestArea: PlanArea | null;
    strongestAccuracy: number | null;
  } | null;
}

export class PlanApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** On a 409 the server returns the plan that is in the way. */
    readonly active: TrainingPlan | null = null,
  ) {
    super(message);
    this.name = 'PlanApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
  /*
    Content-Type ONLY when there is a body.
    
    Fastify rejects `application/json` with an empty body — FST_ERR_CTP_EMPTY_JSON_BODY,
    a 400 — so the parameterless POSTs (starting a plan session) failed on
    production while every test passed: `app.inject` was given `payload: {}`,
    which is a body, and `fetch` sends none. The probe and the product were
    making different requests, which is the whole reason this was found by
    clicking the button rather than by running the suite.
  */
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      ...init?.headers,
    },
  });

  let body: { success?: boolean; data?: T; error?: string } | null = null;
  try {
    body = await response.json();
  } catch {
    // A gateway or proxy error page — fall through to the status.
  }

  if (!response.ok || body?.success === false) {
    throw new PlanApiError(
      body?.error || `Request failed (${response.status})`,
      response.status,
      (body?.data as TrainingPlan | null) ?? null,
    );
  }
  return body!.data as T;
}

/**
 * The player's own today, as `YYYY-MM-DD`.
 *
 * Computed HERE and sent, because the server's UTC date is not the player's for
 * a good part of every day — a plan that starts "tomorrow" and opens yesterday
 * is a bad first impression, and it would be the server's fault for guessing.
 */
export function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export interface GenerateInput {
  sessionsPerWeek: number;
  positionsPerSession?: number;
  weeks?: number;
  targetEvent?: { name: string; date: string };
}

/** A plan, NOT saved. Shown in full before an account is ever mentioned. */
export function generatePlan(input: GenerateInput): Promise<GeneratedPlan> {
  return request<GeneratedPlan>('/plans/generate', {
    method: 'POST',
    body: JSON.stringify({ today: localToday(), ...input }),
  });
}

/** Commit the plan the player has just read. */
export function createPlan(plan: GeneratedPlan): Promise<TrainingPlan> {
  return request<TrainingPlan>('/plans', {
    method: 'POST',
    body: JSON.stringify({
      sessionsPerWeek: plan.sessionsPerWeek,
      positionsPerSession: plan.positionsPerSession,
      startsOn: plan.startsOn,
      endsOn: plan.endsOn,
      targetEvent: plan.targetEvent,
      items: plan.items,
    }),
  });
}

export function fetchActivePlan(): Promise<TrainingPlan | null> {
  return request<TrainingPlan | null>('/plans/active');
}

/**
 * Abandon a plan. There is no "complete" — a plan is completed by finishing its
 * items, server-side, and the client cannot claim the word.
 */
export function endPlan(id: string): Promise<TrainingPlan> {
  return request<TrainingPlan>(`/plans/${id}/end`, {
    method: 'POST',
    body: JSON.stringify({ status: 'abandoned' }),
  });
}

/** Whether we have earned the right to make the one offer, and about what. */
export function fetchPlanOffer(): Promise<PlanOffer> {
  return request<PlanOffer>('/plan-offer');
}

/**
 * Spend the offer.
 *
 * Called when it is actually on SCREEN, never when it is merely computed —
 * asking must not use up the only one the player ever gets.
 */
export function markOffer(dismissed: boolean): Promise<PlanOffer> {
  return request<PlanOffer>('/plan-offer/shown', {
    method: 'POST',
    body: JSON.stringify({ dismissed }),
  });
}

export type AreaPreference = 'more' | 'less';

/**
 * State what the player wants more or less of (owner, 2026-08-05).
 *
 * PUT because it replaces and is idempotent: pressing the same button twice
 * must not mean something different from pressing it once. `null` clears.
 *
 * Lives in PlanApi rather than PuzzleSessionApi because the PLAN is what reads
 * it — the session summary is only where the question is asked, and filing it
 * by where the button sits would put it a long way from what it affects.
 */
export function setAreaPreference(
  area: string,
  preference: AreaPreference | null,
): Promise<Record<string, AreaPreference>> {
  return request<Record<string, AreaPreference>>('/area-preference', {
    method: 'PUT',
    body: JSON.stringify({ area, preference }),
  });
}
