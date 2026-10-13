/**
 * The one plan offer's sentence (TRAINING_SYSTEM E5), and the only place its
 * wording exists.
 *
 * The server decides whether we have earned the right to say something and what
 * it would be about; the SENTENCE is written here, because the site has one
 * voice and it lives in the frontend. A server-side copy would drift.
 *
 * It is built from the player's own results, so it says something true and
 * specific or it returns null. There is no generic version, deliberately: a
 * fallback sentence is how a fallback sentence ends up on screen. The numbers
 * come from the server as facts; nothing here computes a claim.
 *
 * Moved out of v2's `PlanOffer` component when C6 deleted it (2026-10-08); the
 * v3 plan card renders the offer (`PuzzlePlanCard`, `usePlanOffer`).
 */
import type { PlanOffer as Offer, PlanArea } from '../services/PlanApi';

const AREA_WORDS: Record<PlanArea, string> = {
  tactics: 'tactics',
  middlegame: 'middlegame play',
  endgame: 'endgames',
};

/**
 * The sentence.
 *
 * ABSENCE is stated as a count and a gap, with no adjective: "you have solved
 * 41 positions and not one endgame". It needs no intensifier — the fact is the
 * argument, and a player who reads it either recognises it or does not.
 *
 * COMPARISON quotes both rates. Quoting only the weak one ("you score 40% in
 * endgames") invites the reply "compared to what?", and the comparison is the
 * whole reason the sentence is true.
 *
 * Neither form predicts anything. Volume and coverage, never a projected gain.
 */
export function offerSentence(offer: Offer): string | null {
  if (!offer.eligible || !offer.area || !offer.facts) return null;
  const area = AREA_WORDS[offer.area];
  const f = offer.facts;

  if (offer.form === 'absence') {
    const solved = f.totalSolved;
    return `You have solved ${solved} position${solved === 1 ? '' : 's'} and not one ${
      offer.area === 'endgame' ? 'endgame' : offer.area === 'tactics' ? 'tactic' : 'middlegame position'
    }.`;
  }

  if (offer.form === 'comparison' && f.strongestArea && f.areaAccuracy != null
      && f.strongestAccuracy != null) {
    const weak = Math.round(f.areaAccuracy * 100);
    const strong = Math.round(f.strongestAccuracy * 100);
    return `You solve ${strong}% of your ${AREA_WORDS[f.strongestArea]} and ${weak}% of your ${area}.`;
  }

  return null;
}
