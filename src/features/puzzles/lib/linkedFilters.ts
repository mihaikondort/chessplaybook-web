/**
 * Which filter the trainer opens with, when a link chose one (C9).
 *
 * "Train this" on the progress surface is that page's whole purpose: it has
 * just told the player their endgames are behind, and the click has to land on
 * endgames. A filter remembered from three sessions ago silently winning that
 * argument would make every one of those links decorative — the same class of
 * defect as `preferExplained` reordering a batch of one, or the starting-estimate
 * note gated on a counter that resets every visit.
 *
 * So the link wins. Extracted into a function because the rule is a decision,
 * not a render: the component that used to hold it inline is 1,700 lines and a
 * counterfactual that deleted the rule still passed every test.
 *
 * NOT persisted by the caller, deliberately — arriving once with `?area=endgame`
 * must not pin the trainer to endgames forever. Same reasoning as A2's
 * non-persisted `?trainer=` override.
 */

export const TRAINABLE_AREAS = ['tactics', 'middlegame', 'endgame'] as const;
export type TrainableArea = (typeof TRAINABLE_AREAS)[number];

export interface LinkedFilters {
  /** Theme to open with; '' means "whatever was saved". */
  theme: string;
  /** Area to open with; '' means none. There is no picker for it until D4. */
  area: string;
}

/**
 * Which run mode the run card opens with, when a link chose one (#108).
 *
 * The training record's "Replay them" lands on the trainer with "Missed before"
 * already picked, so the player sets a length and starts. Only that one mode
 * can be linked; any other value is ignored. Like the filters above, it is read
 * once and never saved.
 */
export function linkedRunSelection(params: URLSearchParams): 'failed_review' | null {
  return params.get('run') === 'missed' ? 'failed_review' : null;
}

/**
 * The pattern a linked replay run is limited to (#109): a Patterns row's
 * "Replay" link is `?run=missed&theme=fork`. Only with `run=missed`; the
 * server refuses a theme that is not a motif, so nothing is checked here.
 */
export function linkedRunTheme(params: URLSearchParams): string | null {
  if (params.get('run') !== 'missed') return null;
  return params.get('theme') || null;
}

/**
 * @param params  the URL's query string
 * @param savedTheme  the player's remembered theme, or '' if none
 */
export function resolveLinkedFilters(
  params: URLSearchParams,
  savedTheme: string,
): LinkedFilters {
  const linkedTheme = params.get('theme') ?? '';
  const linkedArea = params.get('area') ?? '';

  return {
    // A linked theme beats the saved one; without a link, the saved one stands.
    theme: linkedTheme || savedTheme,
    // An area only ever comes from a link, and an unrecognised value is
    // ignored rather than sent to the server, which would refuse it anyway.
    area: (TRAINABLE_AREAS as readonly string[]).includes(linkedArea) ? linkedArea : '',
  };
}
