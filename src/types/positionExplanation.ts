/**
 * Structured Position Explanation types — frontend mirror of the backend
 * `StructuredExplanation` shape emitted by `CommentaryPipelineV2` in
 * PIPELINE 2.7.0+.
 *
 * Backend source of truth:
 *   backend/src/services/v2/types.ts (ExplanationSide, ExplanationTag,
 *   SectionItem, SectionContent, ThreatsAndTacticsSection,
 *   StructuredExplanation).
 *
 * Keep this file in sync with the backend. The API returns this shape
 * under `response.structured`.
 *
 * Design reference:
 *   docs/Master Plan - Active/M1/POSITION_EXPLANATION_LAYOUT_ANALYSIS.md
 */

export type ExplanationSide = 'white' | 'black' | 'neutral' | 'both';
export type ExplanationTag = 'asset' | 'warning' | 'problem';

export interface SectionItem {
  text: string;
  side: ExplanationSide;
  priority: number;
  tag?: ExplanationTag;
}

export interface SectionContent {
  summary: string;
  items: SectionItem[];
}

export interface ThreatsAndTacticsSection extends SectionContent {
  lastMoveLeadIn?: string;
}

export interface StructuredExplanation {
  verdict: {
    eval: string;
    opening?: string;
    eco?: string;
    phase: 'opening' | 'middlegame' | 'endgame';
    /** One line under the verdict: why the better side is better, when SF has one clear reason (2026-10-26). */
    reason?: string;
  };
  action: string;
  sections: {
    threats_and_tactics?: ThreatsAndTacticsSection;
    king_safety?: SectionContent;
    material?: SectionContent;
    /*
      NO `development` KEY (EX-012, 2026-08-11).

      It mirrored a backend field that could never be populated — no theme could
      route to it, and the corpus census found it on 0 of 15,006 explanations.
      The section header below it therefore carried a title and an icon that
      could never render.

      Kept in step with `backend/src/services/v2/types.ts`, which is where the
      shape is decided.
    */
    pieces?: SectionContent;
    pawn_structure?: SectionContent;
    plan?: SectionContent;
  };
}

/** Ordered list of section keys matching the agreed display order. */
export const SECTION_DISPLAY_ORDER: Array<keyof StructuredExplanation['sections']> = [
  'threats_and_tactics',
  'king_safety',
  'material',
  'pieces',
  'pawn_structure',
  'plan',
];

/** Sections that stay visible even when empty ("teaching scaffolding"). */
export const MAJOR_SECTIONS: ReadonlySet<keyof StructuredExplanation['sections']> = new Set([
  'threats_and_tactics',
  'king_safety',
  'material',
  'pieces',
  'pawn_structure',
]);
