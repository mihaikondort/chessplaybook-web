/**
 * Fixtures for the Editorial Ledger prototype gallery. Uses real baked demo
 * content (production-shaped density) where possible, plus small synthetic
 * fixtures for the sparse and verdict-range states. Dev/prototype only.
 */

import demoExplanations from '@/features/explain/demo-explanations.json';
import type { StructuredExplanation } from '@/types/positionExplanation';

interface Baked { structured: StructuredExplanation; action?: string }
const byFen = demoExplanations.byFen as Record<string, Baked>;

function findByVerdict(evalText: string): StructuredExplanation | null {
  for (const e of Object.values(byFen)) {
    if (e.structured?.verdict?.eval === evalText) return e.structured as StructuredExplanation;
  }
  return null;
}

/** Rich/tactical: Rotlewi–Rubinstein, "Black is winning" (dense sections). */
export const RICH: StructuredExplanation =
  findByVerdict('Black is winning') ?? findByVerdict('Black has a slight edge')!;

/** Sparse/equal: minimal meaningful content + a major section with nothing
 *  notable, so the empty-major treatment is exercised. */
export const SPARSE: StructuredExplanation = {
  verdict: { eval: 'Equal position', opening: 'Queen’s Gambit Declined', eco: 'D37', phase: 'middlegame' },
  action: 'No forcing line stands out — improve your worst piece and keep the tension.',
  sections: {
    threats_and_tactics: { summary: '', items: [] },
    king_safety: {
      summary: '',
      items: [{ text: 'both kings are castled kingside behind intact pawns', side: 'both', priority: 50 }],
    },
    material: {
      summary: '',
      items: [{ text: 'material is level', side: 'both', priority: 50 }],
    },
    pieces: {
      summary: '',
      items: [
        { text: 'White’s knight on d5 is a strong outpost the pawns cannot challenge', side: 'white', priority: 60 },
      ],
    },
    pawn_structure: {
      summary: '',
      items: [{ text: 'symmetrical pawns; the half-open c-file is the only lever', side: 'both', priority: 50 }],
    },
  },
};

/** A base with a warning item, to exercise the warning treatment. */
export const WITH_WARNING: StructuredExplanation = {
  verdict: { eval: 'White has a clear advantage', opening: 'Sicilian Defence', eco: 'B33', phase: 'middlegame' },
  action: 'Play Nd5 to plant a knight Black cannot easily remove.',
  sections: {
    threats_and_tactics: {
      summary: '',
      items: [
        { text: 'Nd5 forks the queen and the weak e7 pawn', side: 'white', priority: 70 },
        { text: 'avoid Bxf6 — it hands Black the two bishops and repairs the structure', side: 'white', priority: 60, tag: 'warning' },
      ],
    },
    king_safety: { summary: '', items: [] },
    material: { summary: '', items: [] },
    pieces: {
      summary: '',
      items: [{ text: 'the b1-knight is a step behind — bring it to d5 via c3', side: 'white', priority: 55 }],
    },
    pawn_structure: {
      summary: '',
      items: [{ text: 'Black’s d6 pawn is backward on the half-open d-file', side: 'black', priority: 55, tag: 'problem' }],
    },
  },
};

/** Every canonical verdict string + an unknown fallback, for the indicator
 *  range. Reuses the RICH sections so each renders as a full card. */
export const VERDICT_RANGE: string[] = [
  'Equal position',
  'White has a slight edge',
  'Black has a slight edge',
  'White has a clear advantage',
  'Black has a clear advantage',
  'White has a decisive advantage',
  'Black has a decisive advantage',
  'White is winning',
  'Black is winning',
  'Mate in 3 for White',
  'Mate in 5 for Black',
  'Advantage unclear — a double-edged mess', // unknown fallback copy
];

/** Clone a base structured explanation with a swapped verdict string. */
export function withVerdict(base: StructuredExplanation, evalText: string): StructuredExplanation {
  return { ...base, verdict: { ...base.verdict, eval: evalText } };
}
