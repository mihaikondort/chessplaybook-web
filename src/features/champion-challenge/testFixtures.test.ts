import { describe, expect, it } from 'vitest';
import {
  challengeStateFixtures,
  championRosterFixture,
  distinctBestVerdictFixture,
  matchingBestVerdictFixture,
  publicPositionFixture,
  sessionSummaryFixture,
  verdictFixture,
} from './testFixtures';

describe('Champion Challenge deterministic UI fixtures', () => {
  it('keeps the pre-answer position on the public security contract', () => {
    expect(Object.keys(publicPositionFixture).sort()).toEqual([
      'champion', 'difficulty', 'fen', 'id', 'legalMoves', 'moveNumber', 'sideToMove',
    ]);
    expect(JSON.stringify(publicPositionFixture)).not.toMatch(
      /championMove|bestMove|EvalCp|feedback|encouragement/,
    );
  });

  it('covers all accepted quality bands used by feedback and summary UI', () => {
    const qualities = ['excellent', 'great', 'good', 'inaccuracy', 'mistake', 'blunder'];
    expect(qualities.map(quality => verdictFixture(quality).quality)).toEqual(qualities);
    expect(Object.keys(sessionSummaryFixture.moveQuality)).toEqual(qualities);
  });

  it('covers champion-equals-best and distinct-best comparison layouts', () => {
    expect(matchingBestVerdictFixture.championMove).toBe(matchingBestVerdictFixture.bestMove);
    expect(matchingBestVerdictFixture.matchedChampion).toBe(true);
    expect(matchingBestVerdictFixture.matchedBest).toBe(true);
    expect(distinctBestVerdictFixture.championMove).not.toBe(distinctBestVerdictFixture.bestMove);
  });

  it('covers the roster and session states required by the visual matrix', () => {
    expect(championRosterFixture).toHaveLength(2);
    expect(challengeStateFixtures.loading.loading).toBe(true);
    expect(challengeStateFixtures.submitting.submitting).toBe(true);
    expect(challengeStateFixtures.answered.currentVerdict).not.toBeNull();
    expect(challengeStateFixtures.resumed.index).toBe(4);
    expect(challengeStateFixtures.summaryLoading.summary).toBeNull();
    expect(challengeStateFixtures.finished.summary).toBe(sessionSummaryFixture);
    expect(challengeStateFixtures.empty.current).toBeNull();
  });
});
