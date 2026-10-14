/**
 * Reading the training record (TRAINING_SYSTEM C6/C7).
 *
 * The server owns every number here. Nothing on this side derives an area,
 * expands a motif or decides whether a figure has enough evidence to be shown:
 * those rules live in `backend/src/services/puzzles/puzzleTaxonomy` and
 * `db/puzzleProgress`, and a second copy in the browser would be a second
 * definition of what the player's own progress means.
 */
import env from '@/config/env';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

/** How much evidence a number has behind it. The server decides; we render. */
export type Confidence = 'none' | 'insufficient' | 'provisional' | 'established';

export type PuzzleArea = 'tactics' | 'middlegame' | 'endgame';

export interface AreaProgress {
  area: PuzzleArea;
  /** Everything attempted, rated or not — the coverage number. */
  attempts: number;
  solved: number;
  /** Attempts that moved the rating; the only ones behind a performance claim. */
  rated: number;
  ratedSolved: number;
  averageRatingFaced: number | null;
  accuracy: number | null;
  /** null means "not enough evidence", NOT "zero". Never render it as 0. */
  performance: number | null;
  confidence: Confidence;
  lastAttemptAt: string | null;
}

export interface MotifProgress {
  motif: string;
  attempts: number;
  solved: number;
  accuracy: number | null;
  confidence: Confidence;
  lastAttemptAt: string | null;
}

export interface ProgressSummary {
  totalAttempts: number;
  totalSolved: number;
  unrated: number;
  unratedReasons: Record<string, number>;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  untouchedAreas: PuzzleArea[];
}

export interface HistoryPoint {
  week: string;
  area: PuzzleArea;
  attempts: number;
  solved: number;
}

export interface OverallRating {
  /** The Glicko rating the trainer shows. null when this identity has none. */
  rating: number | null;
  rd: number | null;
  ratedAttempts: number | null;
  /** Lifetime counters, which predate the attempt log and outlive its window. */
  lifetimeSolved: number | null;
  lifetimeFailed: number | null;
}

export interface PuzzleProgressData {
  /** False when the request carried no identity at all — a first visit. */
  identified: boolean;
  overall: OverallRating;
  summary: ProgressSummary;
  /** Weakest first, the same order weak-areas selection uses. */
  areas: AreaProgress[];
  motifs: MotifProgress[];
  history: HistoryPoint[];
  /**
   * What the player has asked for more or less of, by area.
   *
   * Carried on this payload rather than fetched separately: the record page is
   * the only surface that shows it, and until 2026-08-06 it had no reader at all
   * — `setAreaPreference` returns the new map, so a control could show what you
   * had just pressed and nothing else. Reloading made your own stated preference
   * invisible.
   *
   * Optional so an older server (or a cached response mid-deploy) renders the
   * control unset rather than crashing the page around it.
   */
  areaPreferences?: Record<string, 'more' | 'less'>;
  /*
    #108. Optional for the same reason as `areaPreferences`: during a deploy the
    page can meet the previous API, and it must render without these rather
    than crash.
  */
  /** Puzzles whose latest attempt was a miss: what "Missed before" serves. */
  missedToReplay?: number;
  ratingSeries?: { points: RatingPoint[]; peak: RatingPoint | null };
  /** Days with at least one attempt in the last 12 weeks, on the player's calendar. */
  trainingDays?: TrainingDay[];
}

export interface RatingPoint {
  /** The player's local date, YYYY-MM-DD. */
  day: string;
  rating: number;
}

export interface TrainingDay {
  day: string;
  attempts: number;
  solved: number;
}

export const AREA_LABELS: Record<PuzzleArea, string> = {
  tactics: 'Tactics',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

/**
 * Motif ids come from Lichess and are camelCase. Displayed as-is they read as
 * engine output ("rookEndgame"), which is the same complaint the commentary
 * work has already settled: a label the player has to decode is not a label.
 */
export function motifLabel(motif: string): string {
  const spaced = motif.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * How a per-area figure is labelled, and whether it is shown at all.
 *
 * The server decides the confidence; this decides the words. The PRD is strict
 * about the claim staying narrow (§9): these positions are puzzles, so the
 * figure is performance ON ENDGAME PUZZLES, never "your endgame strength". The
 * judgment trainers do not exist yet, and a label that outruns its evidence is
 * how a number nobody earned ends up steering a training plan.
 */
export function confidenceNote(confidence: Confidence, rated: number): string | null {
  switch (confidence) {
    case 'none':
      return null;
    case 'insufficient':
      return `${rated} rated ${rated === 1 ? 'attempt' : 'attempts'} — not enough to rate yet`;
    case 'provisional':
      return `provisional, from ${rated} rated attempts`;
    case 'established':
      return `from ${rated} rated attempts`;
  }
}

export async function fetchPuzzleProgress(signal?: AbortSignal): Promise<PuzzleProgressData> {
  const headers = await getRequestHeaders();
  // Minutes EAST of UTC, so the server groups days on the player's calendar.
  const tz = -new Date().getTimezoneOffset();
  const res = await fetch(`${env.apiBaseUrl}/api/puzzles/progress?tz=${tz}`, { headers, signal });
  if (!res.ok) throw new Error(`progress request failed: ${res.status}`);
  const body = await res.json();
  if (!body?.success || !body?.data) throw new Error('progress response malformed');
  return body.data as PuzzleProgressData;
}
