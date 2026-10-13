/**
 * positionVerdictPresentation — presentation-only classifier for the
 * Position Explainer verdict string.
 *
 * The backend delivers `structured.verdict.eval` as a human string, not a
 * structured side/magnitude value. The Editorial Ledger card needs a
 * directional + magnitude cue for its evaluation indicator, so this helper
 * maps ONLY the known canonical phrases to a `VerdictPresentation`. It:
 *
 *   - never rewrites or replaces the supplied verdict text (the caller
 *     always renders the original string);
 *   - never inspects the board or derives a chess evaluation;
 *   - returns a neutral `unknown` presentation for any unfamiliar copy, so
 *     future/renamed verdict phrasing degrades to a calm typographic
 *     treatment rather than a wrong indicator.
 *
 * The canonical phrase set is defined by the backend eval classifier
 * (`backend/src/services/v2/EvalClassifierV2.ts` — the `evalDescription`
 * branches). Kept in lockstep with that file; if the backend adds or
 * renames a tier, extend the table here and its test. Note the mate case
 * is emitted as `Mate in N for White|Black` (NOT "forced mate").
 */

export type AdvantageSide = 'white' | 'black' | 'equal';

export type AdvantageMagnitude =
  | 'equal'
  | 'slight'
  | 'clear'
  | 'decisive'
  | 'winning'
  | 'mate'
  | 'unknown';

export interface VerdictPresentation {
  side: AdvantageSide;
  magnitude: AdvantageMagnitude;
  /**
   * Ordinal strength 0–5 used to drive the evaluation indicator geometry:
   * 0 equal, 1 slight, 2 clear, 3 decisive, 4 winning, 5 mate. `unknown`
   * maps to 0 (neutral) — the indicator renders in its neutral state.
   */
  level: 0 | 1 | 2 | 3 | 4 | 5;
}

/** The neutral fallback for unrecognised copy. */
const UNKNOWN: VerdictPresentation = { side: 'equal', magnitude: 'unknown', level: 0 };

/** Non-mate tier phrases → magnitude + level. Side is parsed separately. */
const TIER_TABLE: Array<{ re: RegExp; magnitude: AdvantageMagnitude; level: 1 | 2 | 3 | 4 }> = [
  { re: /^(white|black) has a slight edge$/i,        magnitude: 'slight',   level: 1 },
  { re: /^(white|black) has a clear advantage$/i,    magnitude: 'clear',    level: 2 },
  { re: /^(white|black) has a decisive advantage$/i, magnitude: 'decisive', level: 3 },
  { re: /^(white|black) is winning$/i,               magnitude: 'winning',  level: 4 },
];

/**
 * Classify a verdict string into a presentation model. Trims surrounding
 * whitespace; matching is case-insensitive so capitalisation drift does not
 * fall through to `unknown`. Any unrecognised input returns {@link UNKNOWN}.
 */
export function classifyVerdict(evalText: string | null | undefined): VerdictPresentation {
  if (!evalText) return UNKNOWN;
  const text = evalText.trim();
  if (!text) return UNKNOWN;

  // Equal — no side.
  if (/^equal position$/i.test(text)) {
    return { side: 'equal', magnitude: 'equal', level: 0 };
  }

  // Mate — "Mate in N for White|Black".
  const mate = text.match(/^mate in \d+ for (white|black)$/i);
  if (mate) {
    return { side: mate[1].toLowerCase() as AdvantageSide, magnitude: 'mate', level: 5 };
  }

  // Graded tiers — side is the leading "White|Black".
  for (const { re, magnitude, level } of TIER_TABLE) {
    const m = text.match(re);
    if (m) {
      return { side: m[1].toLowerCase() as AdvantageSide, magnitude, level };
    }
  }

  return UNKNOWN;
}
