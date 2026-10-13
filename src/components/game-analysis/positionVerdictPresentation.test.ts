import { describe, it, expect } from 'vitest';
import { classifyVerdict, type VerdictPresentation } from './positionVerdictPresentation';

/**
 * The canonical phrases are the `evalDescription` branches in
 * backend/src/services/v2/EvalClassifierV2.ts. This table IS the contract —
 * if the backend changes a phrase, this test should fail first.
 */
const CANONICAL: Array<[string, VerdictPresentation]> = [
  ['Equal position',                { side: 'equal', magnitude: 'equal',    level: 0 }],
  ['White has a slight edge',       { side: 'white', magnitude: 'slight',   level: 1 }],
  ['Black has a slight edge',       { side: 'black', magnitude: 'slight',   level: 1 }],
  ['White has a clear advantage',   { side: 'white', magnitude: 'clear',    level: 2 }],
  ['Black has a clear advantage',   { side: 'black', magnitude: 'clear',    level: 2 }],
  ['White has a decisive advantage',{ side: 'white', magnitude: 'decisive', level: 3 }],
  ['Black has a decisive advantage',{ side: 'black', magnitude: 'decisive', level: 3 }],
  ['White is winning',              { side: 'white', magnitude: 'winning',  level: 4 }],
  ['Black is winning',              { side: 'black', magnitude: 'winning',  level: 4 }],
  ['Mate in 1 for White',          { side: 'white', magnitude: 'mate',     level: 5 }],
  ['Mate in 7 for Black',          { side: 'black', magnitude: 'mate',     level: 5 }],
  ['Mate in 12 for White',         { side: 'white', magnitude: 'mate',     level: 5 }],
];

describe('classifyVerdict — canonical phrases', () => {
  it.each(CANONICAL)('classifies %s', (text, expected) => {
    expect(classifyVerdict(text)).toEqual(expected);
  });
});

describe('classifyVerdict — robustness', () => {
  it('is case-insensitive', () => {
    expect(classifyVerdict('black is winning')).toEqual({ side: 'black', magnitude: 'winning', level: 4 });
    expect(classifyVerdict('EQUAL POSITION')).toEqual({ side: 'equal', magnitude: 'equal', level: 0 });
  });

  it('trims surrounding whitespace', () => {
    expect(classifyVerdict('  White has a clear advantage  ')).toEqual({ side: 'white', magnitude: 'clear', level: 2 });
  });

  const UNKNOWN = { side: 'equal', magnitude: 'unknown', level: 0 };
  it.each([
    ['', ],
    ['   ',],
    ['White has forced mate',],   // handoff paraphrase — NOT a real backend phrase
    ['White is slightly better',], // near-miss wording
    ['Black has the initiative',],
    ['completely winning for White',],
    ['Mate in for White',],        // malformed mate (no number)
    ['Mate in 3',],                // mate without side
  ])('returns neutral unknown for unrecognised copy: %j', (text) => {
    expect(classifyVerdict(text as string)).toEqual(UNKNOWN);
  });

  it('returns neutral unknown for null/undefined', () => {
    expect(classifyVerdict(null)).toEqual(UNKNOWN);
    expect(classifyVerdict(undefined)).toEqual(UNKNOWN);
  });
});
