import { createContext } from 'react';

/**
 * THE SHELL'S STATE, IN ITS OWN FILE.
 *
 * It lived in `SiteShell.tsx` while `useChrome` was its only reader. `#70` gave
 * it a second one that needs `chromeHidden` and must NOT be handed the throwing
 * accessor (`useNavTotal` then, deleted in F2; `Workspace` since C2), so the
 * context had to be exported, and a component file that also exports a context
 * breaks Fast Refresh. Splitting it is the fix the lint rule actually asks for.
 */
export interface Chrome {
  /**
   * Hide the site chrome. Focus mode on the trainer and the play workspaces.
   *
   * A CONTEXT, NOT `useOutletContext`. The outlet's context reaches only the
   * outlet's IMMEDIATE child, and two of the three callers - the trainer layout
   * skeleton and the play workspace - sit deeper than the route element, so they
   * would have needed the value threaded down by hand. That is prop drilling
   * under another name, which is the thing this change exists to remove.
   *
   * And NOT a store: this is state about the shell, owned by the shell. Putting
   * it in a global store would make it reachable, and therefore settable, from
   * anywhere - which is how the shell became something any page could change in
   * the first place.
   */
  setChromeHidden: (hidden: boolean) => void;
  /**
   * Whether the chrome is currently hidden. `Workspace` reads it for focus
   * mode; a page never does: a page that needs this needs the bar's HEIGHT,
   * which is `--nav-block`, and deciding "is the bar there" in a page is a
   * second opinion on a question the shell already answers.
   */
  chromeHidden: boolean;
}

/*
  READ DIRECTLY BY `Workspace` (focus mode, layout redesign C2), AND BY
  NOTHING ELSE.

  `useChrome` throws outside the shell, deliberately: a page that calls
  `setChromeHidden` with no shell above it is a bug, and failing loudly is how
  that stays true. Reading is a different question - `Workspace` only wants to
  know whether the bar is on screen, and a component rendered outside the shell
  (a unit test, a dev fixture) has no bar at all, so the answer is available
  without one. It reads this directly rather than being handed a weakened
  `useChrome`, so the write path keeps its guarantee.
*/
export const ChromeContext = createContext<Chrome | null>(null);
