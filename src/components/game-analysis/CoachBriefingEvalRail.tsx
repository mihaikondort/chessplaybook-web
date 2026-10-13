/**
 * CoachBriefingEvalRail — the vertical qualitative evaluation rail for the
 * Coach's Briefing (D2) card variant. A chess-eval-bar silhouette: Black
 * fills from the top, White (cream) from the bottom, boundary set by the
 * qualitative tier.
 *
 * PURELY VISUAL — like `EvalLedger`, it renders NO chess text of its own
 * (no "WINNING"/"SLIGHT" caption — that would be frontend-authored chess
 * text; see DESIGN_SPEC §0.4). Meaning is carried, non-colour, by: the fill
 * boundary, the B/W endpoint letters, the Crown on mate, and the `role="img"`
 * accessible name set to the backend verdict string verbatim. The verdict
 * heading beside the rail states the evaluation in the backend's own words.
 *
 * Data comes from `classifyVerdict(verdict.eval)` — this component authors
 * nothing and never inspects the board.
 */

import { Crown } from 'lucide-react';
import type { VerdictPresentation } from './positionVerdictPresentation';

/**
 * Advantaged-side share of the rail per qualitative tier. These are LAYOUT
 * CONSTANTS representing discrete tiers — NOT centipawn evaluations. The rail
 * must never imply numeric precision.
 *   level: 0 equal · 1 slight · 2 clear · 3 decisive · 4 winning · 5 mate
 */
const TIER_SHARE = [50, 58, 66, 74, 82, 92] as const;

interface Props {
  presentation: VerdictPresentation;
  /** Backend verdict string — used verbatim as the accessible name. */
  verdictText: string;
}

export function CoachBriefingEvalRail({ presentation, verdictText }: Props) {
  const { side, level, magnitude } = presentation;

  // Unknown copy → no rail (matches EvalLedger's safe fallback).
  if (magnitude === 'unknown') return null;

  const share = TIER_SHARE[level];
  // Black occupies the top. Its height is its share when Black is favoured,
  // the complement when White is favoured, and 50% at equal.
  const blackPct = side === 'black' ? share : side === 'white' ? 100 - share : 50;

  return (
    <div
      className="flex flex-col items-center gap-1.5 select-none"
      role="img"
      aria-label={verdictText}
    >
      <span className="text-[10px] font-semibold text-muted-foreground leading-none" aria-hidden>B</span>
      <div className="relative w-[18px] flex-none rounded-full overflow-hidden border border-border" style={{ height: 104 }}>
        {/* Black (top) — a hair darker than the card so it reads as "black" */}
        <div
          className="w-full bg-eval-black transition-[height] duration-300 motion-reduce:transition-none"
          style={{ height: `${blackPct}%` }}
        />
        {/* White (bottom) — cream fills the remainder */}
        <div className="w-full bg-eval-white" style={{ height: `${100 - blackPct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground leading-none" aria-hidden>W</span>
      {magnitude === 'mate' && <Crown className="h-3.5 w-3.5 text-link mt-0.5" aria-hidden />}
    </div>
  );
}
