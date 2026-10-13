import type { SessionLength } from '../services/ChampionChallengeApi';

/**
 * What the picker and the session pass each other in navigation state (#68):
 * the session length, which the picker owns and a session needs only when it
 * deals a new one.
 *
 * Its own module so the picker can use it without importing the session page,
 * which would put the board graph back in the picker's chunk.
 */
export interface ChallengeNavState {
  length?: SessionLength;
}

const LENGTHS: readonly SessionLength[] = [5, 10, 20];

/** The length in a navigation state, or null when there is none or it is not one we offer. */
export function readLength(state: unknown): SessionLength | null {
  const length = (state as ChallengeNavState | null)?.length;
  return LENGTHS.includes(length as SessionLength) ? (length as SessionLength) : null;
}
