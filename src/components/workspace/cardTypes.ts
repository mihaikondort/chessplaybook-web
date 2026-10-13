/**
 * Card types (LAYOUT_SPEC.md §5 and §9, layout redesign C2, C3, C5a).
 *
 * A closed union: one entry per KIND of card. They belong to the card type,
 * never to the page. A page that needs a new kind of card adds an entry here,
 * which is a reviewed change in the layout layer rather than a number passed
 * at a call site.
 *
 * TYPE (C3): `rows` is how many text rows the card holds and `reserve` the
 * share of its height its controls take. The card's type is derived from them.
 *
 * RHYTHM (C5a, D22): the card shares the height its content does not use as
 * spacing, in UNITS - 2 for the title boundary, 1 per gap between the card's
 * top-level items, the declared weight of each spacer, 1 at the bottom, and
 * half a unit per pixel-of-air the content uses inside its rows - each unit
 * capped at half the type. v3 measured the content to do this; here each type
 * DECLARES it:
 *
 *   content   the content's height in multiples of the type, measured once on
 *             v3 with the air at zero, AT ITS TALLEST STATE, so the spacing
 *             never changes when the card's state does
 *   controls  any part of the content sized from the card's height rather than
 *             its type, as a CSS length (container units resolve against the
 *             card at any depth inside it)
 *   gaps      top-level items minus one, at least one
 *   spacers   the summed weight of the card's `data-card-spacer` elements
 *   nested    pixels the content grows per pixel of `--card-air` inside it
 *   lead      the plan card's blank line under its title: the height its
 *             tallest state holds, in multiples of the type
 *
 * The `/puzzles` values were measured on 2026-10-06 at nine viewports from
 * 360x800 to 1920x947 (the per-card spread is in the plan's C5a log entry).
 */
export interface CardTypeSpec {
  rows: number;
  reserve: number;
  content: number;
  controls?: string;
  gaps: number;
  spacers: number;
  nested: number;
  lead?: number;
}

export const CARD_TYPES = {
  /** A few lines of text, no controls. */
  text: { rows: 4, reserve: 0, content: 0, gaps: 1, spacers: 0, nested: 0 },
  /** Text above a row of controls. */
  actions: { rows: 3, reserve: 0.4, content: 0, gaps: 1, spacers: 0, nested: 0 },
  /** A list that may scroll inside the card (`WorkspaceList`). */
  list: { rows: 8, reserve: 0, content: 0, gaps: 1, spacers: 0, nested: 0 },
  /** A lane foot: one row, the toolbar's height. */
  foot: { rows: 1, reserve: 0, content: 0, gaps: 1, spacers: 0, nested: 0 },

  /*
    `/puzzles`. `rows` and `reserve` are v3's approved `Box` declarations,
    unchanged. `content` is the TALLEST measured on the Workspace's own lane
    widths across 25 viewports (2026-10-06, on the two-lane widths): settings
    6.32-6.52, records 6.78-6.97, standings 6.16-6.36 (it was 7.52 from 1600
    wide, where the 240px lane at 17.5px+ type wrapped "Your training record";
    the owner shortened the label to "Training record", 2026-10-06, and it
    no longer wraps at any of 16 viewports), plan 2.51-4.83 (v3's own
    tallest-state `lead`, 4.9), the live card's text 4.60-6.15 and run setup
    9.56-10.99, the last two because their text wraps further in a narrower
    lane. Re-measured whenever a lane width changes: on the earlier equal lanes
    standings never wrapped and run setup reached 11.74.
  */
  /** The live card: status rows above New Puzzle and the reveal, both sized from the card's height. */
  puzzleLive: {
    rows: 4, reserve: 0.36, content: 6.15,
    controls: 'clamp(28px, 21cqh, 64px) + clamp(26px, 17cqh, 52px)',
    gaps: 1, spacers: 0, nested: 6,
  },
  /** Run setup: length, mode and the start control. */
  puzzleRunSetup: { rows: 7, reserve: 0, content: 10.99, gaps: 5, spacers: 4, nested: 4 },
  /** The training plan entry: title, today's line, one action. */
  puzzlePlan: { rows: 3, reserve: 0, content: 4.9, gaps: 1, spacers: 0, nested: 0, lead: 4.9 },
  /** Puzzle settings: three toggles. */
  puzzleSettings: { rows: 3, reserve: 0, content: 6.52, gaps: 3, spacers: 0, nested: 0 },
  /** A record card (session or overall): a title over a two-column stat grid. */
  puzzleRecord: { rows: 4, reserve: 0, content: 6.97, gaps: 1, spacers: 0, nested: 2 },
  /** Standings: a title and three links. */
  puzzleStandings: { rows: 4, reserve: 0, content: 6.36, gaps: 3, spacers: 0, nested: 0 },

  /*
    `/play` (D1, 2026-10-08). `content` measured as the /puzzles values were: the
    TALLEST across the full viewport matrix (`viewportMatrix()`, every screen and
    variant), air at zero, in the tallest state - a TIMED game that has ENDED,
    so both clocks, the moves header, the result and the end-of-game actions are
    all on screen. The game card's move list is excluded: it is a `WorkspaceList`
    that takes whatever height is left. Measured: live 10.10 (1354x635), settings
    10.33 (788x467; 8.86 before the time control got its own row), players 5.86 (1354x635), go-to 3.02 (788x467).
  */
  /** The game card: title, level line, then either the start actions or the moves
   *  (a `WorkspaceList` taking the remaining height), the result and the actions. */
  playLive: { rows: 7, reserve: 0, content: 10.2, gaps: 5, spacers: 0, nested: 0 },
  /** Game settings: engine level, time control, play as. */
  playSettings: { rows: 7, reserve: 0, content: 10.4, gaps: 3, spacers: 0, nested: 0 },
  /** A player: name, detail, the clock. */
  playPlayer: { rows: 4, reserve: 0, content: 5.9, gaps: 2, spacers: 0, nested: 0 },
  /** Go to: a title and one link. */
  playGoTo: { rows: 3, reserve: 0, content: 3.1, gaps: 1, spacers: 0, nested: 0 },

  /*
    `/play-online` (D2a, D2b 2026-10-09). Measured as `/play` was, air at zero,
    in every phase REACHED with two local players (lobby, settings, friend panel,
    challenge link, incoming challenge, in game, confirm draw, draw offered,
    confirm resign, ended, seeking, the unmatched fallback) at 800x600, 788x467,
    1366x768, 1920x947 and 390x844. The game card's move list is excluded, as on
    `/play`. Tallest: live 23.71 (an incoming challenge over the lobby, 285px of
    a 332px card at 788x467; in game it is 5.79; the guest notice is sized in
    `em` since D2b, 24.98 when it was not), settings 6.33 (seeking, with
    Cancel search). The game card's content is one `card-body`, so its spacing
    is nested (16px per px of air in that state), not gaps. The time-control
    choices open in a panel (`useAnchoredPopover`): opened inside the card they
    needed 14.32 and overflowed it by 12-16px. The players and go-to reuse
    `playPlayer` and `playGoTo`.
  */
  /** The online game card: title, preset line, then the phase's content. */
  onlineLive: { rows: 7, reserve: 0, content: 23.8, gaps: 1, spacers: 0, nested: 16 },
  /** Online game settings: the time control (its choices open in a panel). */
  onlineSettings: { rows: 6, reserve: 0, content: 6.4, gaps: 1, spacers: 0, nested: 2 },

  /*
    `/analysis` live mode (D3b, 2026-10-09). Measured as `/play` was, air at
    zero, at 15 viewports from 320x568 to 2560x1080. The engine card's lines
    block takes the height its other rows leave and holds as many fixed-height
    line slots as fit (owner, D3a), so its content is ONE slot: 6.75 with a line
    or with analysis off, 9.07 with the notice for a linked position that could
    not be read (its tallest). The import card: 14.73 idle, 17.02 with an import
    error (its tallest). Signed in it also shows "My Recent Games" and a list (a
    `WorkspaceList`, excluded); the local stack cannot sign in, so that state is
    NOT measured: about 2.5 units more on paper, inside every lane.
  */
  /** The engine: evaluation in the title row, the line selector, the lines, depth. */
  analysisEngine: { rows: 8, reserve: 0, content: 9.1, gaps: 1, spacers: 0, nested: 8 },
  /** Import a game: the buttons, the PGN box, load and upload, the guest notice. */
  analysisImport: { rows: 7, reserve: 0, content: 17.1, gaps: 1, spacers: 0, nested: 8 },

  /*
    Champion Challenge's session (D4b, 2026-10-09). Measured as `/play` was,
    air at zero, at nine viewports from 390x844 to 2560x1080 with a real session
    played. Who is to move went to the toolbar (owner); the position's number
    moved from "This challenge"'s title (it wrapped at 240px) into "This
    position". Tallest: live 15.66 in a move review with a third comparison row
    (added to the rendered list and measured; a real verdict shows it when the
    engine's best differs from the champion's move), plus 1.38 for the
    encouragement's third line (it is clamped at three and was measured at two),
    so 17.1; "Your move" is 9.79. Champion 4.82, progress 4.19, position 4.05.
    Go to reuses `playGoTo`.
  */
  /** The solver's card: "Your move", or the move review once answered. */
  challengeLive: { rows: 8, reserve: 0, content: 17.1, gaps: 1, spacers: 0, nested: 7 },
  /** The champion: portrait, name and reign. */
  challengeChampion: { rows: 4, reserve: 0, content: 4.9, gaps: 1, spacers: 0, nested: 0 },
  /** Positions answered of the session. */
  challengeProgress: { rows: 4, reserve: 0, content: 4.2, gaps: 1, spacers: 0, nested: 2 },
  /** This position: its number and its difficulty. */
  challengePosition: { rows: 4, reserve: 0, content: 4.1, gaps: 1, spacers: 0, nested: 2 },

  /*
    The champion game viewer (E4b-1, 2026-10-10; owner's composition, plan §7 E4a
    findings). Measured as `/play` was, air at zero, at 24 viewports (the matrix
    plus 390x844, 360x800, 844x390, 800x600, 788x467) on a best game, whose info
    card has all four rows, at index 3, where Go to holds all three links.
    Tallest: moves 3.36 since E4b-2 (the title and the report and explain row,
    with the report button's longest label; 1.16 before; the list is a
    `WorkspaceList` and excluded, as on `/play`), info 6.37, Go to 6.36. The players reuse `playPlayer`
    (3.86 here, with no clock). No card overflowed at any of them.
  */
  /** The moves: title, the list taking the remaining height, then Game report and Explain position. */
  viewerMoves: { rows: 7, reserve: 0, content: 3.4, gaps: 1, spacers: 0, nested: 0 },
  /** The game: event, date and round, opening, result. */
  viewerInfo: { rows: 7, reserve: 0, content: 6.4, gaps: 1, spacers: 0, nested: 0 },
  /** Go to: previous game, next game, the list. */
  viewerGoTo: { rows: 4, reserve: 0, content: 6.4, gaps: 1, spacers: 0, nested: 0 },
} as const satisfies Record<string, CardTypeSpec>;

export type CardType = keyof typeof CARD_TYPES;

/** The units the leftover height is shared in (see the header). */
export function cardUnits(t: CardTypeSpec): number {
  return 2 + t.gaps + t.spacers + 1 + t.nested / 2;
}
