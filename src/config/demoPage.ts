/**
 * Demo page configuration.
 *
 * When unauthenticated users try to access auth-required features,
 * they're redirected to a real game analysis demo with a sign-up modal.
 */

/** The demo game: Carlsen vs Nakamura, 2nd Sinquefield Cup 2014 (best game rank 8, index 7) */
export const DEMO_GAME_URL = '/champions/carlsen/best-games/7';

/** Half-move index to auto-navigate to (after 11.Nf3 = ply 21) */
export const DEMO_MOVE_INDEX = 21;

/**
 * Build the demo URL with returnTo param.
 * @param returnTo - the page the user originally wanted to visit
 */
export function getDemoUrl(returnTo: string): string {
  return `${DEMO_GAME_URL}?demo=true&returnTo=${encodeURIComponent(returnTo)}`;
}
