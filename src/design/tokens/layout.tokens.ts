/**
 * Layout tokens: the one source for the Workspace's geometry.
 *
 * LAYOUT_SPEC.md §3, §6 and §7. Every value the board formula, the lanes and the
 * mode threshold depend on is declared here and nowhere else:
 *
 *   - `tailwind.config.ts` reads it, so CSS gets the threshold literals through
 *     `theme('workspace.*')` (Tailwind resolves `theme()` in at-rule params,
 *     which is what lets a container query use a value no custom property can
 *     reach) and the constants as `:root` custom properties.
 *   - The geometry guards read it, so they recompute what the CSS was built from
 *     instead of trusting a second copy.
 *
 * Theme-independent by construction: nothing here is a colour, so switching
 * theme cannot move a box.
 *
 * The starting values are the implementation plan's §3 A3 table. They are to be
 * confirmed with the simulator in C2, not trusted.
 */

/** A length that grows with a container axis between two bounds. */
export interface FluidLength {
  /** Lower bound, px. */
  min: number;
  /** Share of the container axis, 0..1 (rendered as `<n>cqw` / `<n>cqh`). */
  share: number;
  /** Upper bound, px. */
  max: number;
}

/**
 * v3's page air (2026-08-15, `pageAirFor`): a gap that comes off on a curve,
 * `clamp(min, max x (h / anchor)^2, max)`. Air is the first thing a short lane
 * gives up; at the anchor and above the cap binds and nothing moves.
 *
 * `h` IS THE LANE'S HEIGHT, NOT THE WINDOW'S (owner, 2026-10-07, D25). v3 keys
 * it on the page region, which stands in for the lane only while the board is
 * bound by height. Where the board is bound by WIDTH (780-800 wide on a tall
 * window) the lane is short while the window is tall, the gap stayed near 12px
 * and the /puzzles record cards overflowed by up to 5px. The anchor is v3's 677
 * less the two 8px columns paddings, so where height binds nothing moves.
 */
export interface AirCurve {
  /** Floor, px. */
  min: number;
  /** The lane height at which the gap reaches its maximum, px. */
  anchor: number;
}

export interface LayoutTokens {
  /** Canvas padding in STACKED mode, px. Each side is max(this, the safe-area inset). */
  pad: number;
  /**
   * Canvas padding in COLUMNS mode, px: v3's `cols:p-2` (owner, 2026-10-06, D23).
   * It is also what the columns thresholds are computed with.
   */
  padColumns: number;
  /** Gap between the board and the toolbar, and between a lane's stack and its foot, px. */
  gapToolbar: number;
  /**
   * Gap between the cards in a lane, and between stacked regions, px (spec §5,
   * `--gap-card`). In columns mode it is the CAP of `gapCardColumns`.
   */
  gapCard: number;
  /**
   * Columns mode: the card gap shrinks on a short window by v3's curve (owner,
   * 2026-10-06, D23: at 12px fixed the record cards overflowed at 800x600 and
   * 788x467, where today's page fits). Stacked mode keeps `gapCard`.
   */
  gapCardColumns: AirCurve;
  /** Gap between the three columns. Fluid on the workspace width. */
  gapCol: FluidLength;
  /** Toolbar block size. Fluid on the workspace height (v3's strip rule, 2026-08-15). */
  toolbar: FluidLength;
  /**
   * Lane inline sizes, fluid on the workspace width. TWO, not one (owner,
   * 2026-10-06, looking at the real `/puzzles` cards: *"the left column cards
   * too wide... the right column cards are too narrow"*): the context lane is
   * narrower and the activity lane wider, as on today's page (176/208/240
   * against 224/288/416). The equal-lanes rule (decision log Q1) is retired.
   *
   * Each share is capped by the threshold: at `columnsMinInline` both lanes
   * must be at their minimum or the board drops under `boardMin` there.
   */
  laneContext: FluidLength;
  laneActivity: FluidLength;
  /** Smallest board columns mode may produce, px. */
  boardMin: number;
  /** Largest board, px. Bounded by height in practice (v3's value). */
  boardMax: number;
  /** Stacked mode: each lane's block size as a share of the page region. */
  stackedShare: { activity: number; context: number };
  /**
   * Stacked mode: no lane is shorter than this, px (owner, 2026-10-07, D25). It
   * was the shortest columns lane, 320 + 8 + 56 = 384, and the /puzzles context
   * lane does not fit that: four cards at 79px, three 12px gaps, the 8px gap and
   * the 56px foot make 416. At 384 its record cards overflowed by 6.7px on a
   * phone held sideways and by 2.1px at 320x568. The region scrolls further.
   */
  stackedLaneMin: number;
  /**
   * Columns mode also needs a workspace at least this many times wider than
   * tall (spec §6, D19). Width alone let every portrait tablet into columns
   * with a 320-386px board, because there the width fits three columns only
   * at the board floor. It is the WORKSPACE's shape, not the device's, so a
   * browser sidebar still counts.
   */
  columnsMinAspect: number;
}

export const layoutTokens: LayoutTokens = {
  pad: 12,
  padColumns: 8,
  gapToolbar: 8,
  gapCard: 12,
  gapCardColumns: { min: 4, anchor: 661 },
  gapCol: { min: 12, share: 0.009, max: 18 },
  toolbar: { min: 56, share: 0.0654, max: 96 },
  laneContext: { min: 176, share: 0.19, max: 240 },
  laneActivity: { min: 224, share: 0.2916, max: 416 },
  boardMin: 320,
  boardMax: 2400,
  stackedShare: { activity: 0.68, context: 0.64 },
  stackedLaneMin: 416,
  columnsMinAspect: 1,
};

/**
 * The smallest workspace width at which columns mode is feasible (spec §6).
 * At the threshold every fluid length is at its lower bound.
 */
export function columnsMinInline(t: LayoutTokens = layoutTokens): number {
  return t.laneContext.min + t.laneActivity.min + 2 * t.gapCol.min + 2 * t.padColumns + t.boardMin;
}

/** The smallest workspace height at which columns mode is feasible (spec §6). */
export function columnsMinBlock(t: LayoutTokens = layoutTokens): number {
  return 2 * t.padColumns + t.boardMin + t.gapToolbar + t.toolbar.min;
}

/** The columns-mode card gap for a lane `h` px tall: v3's `pageAirFor` on the lane, unrounded. */
export function columnsCardGap(h: number, t: LayoutTokens = layoutTokens): number {
  const r = Math.min(1, Math.max(0, h / t.gapCardColumns.anchor));
  return Math.max(t.gapCardColumns.min, Math.min(t.gapCard, t.gapCard * r * r));
}

const px = (n: number) => `${n}px`;
const pct = (share: number) => Number((share * 100).toFixed(4));

/**
 * The constants as custom properties, for `:root`.
 *
 * Only absolute values live here. The fluid lengths are composed with container
 * units on the Workspace canvas (spec §3), because container units resolve
 * where they are used and `:root` is not inside any container.
 */
export function layoutCustomProperties(t: LayoutTokens = layoutTokens): Record<string, string> {
  return {
    '--pad-base': px(t.pad),
    '--gap-toolbar': px(t.gapToolbar),
    '--pad-columns': px(t.padColumns),
    '--gap-card': px(t.gapCard),
    '--gap-card-max': px(t.gapCard),
    '--gap-card-min': px(t.gapCardColumns.min),
    '--gap-card-anchor': px(t.gapCardColumns.anchor),
    '--gap-col-min': px(t.gapCol.min),
    '--gap-col-share': String(pct(t.gapCol.share)),
    '--gap-col-max': px(t.gapCol.max),
    '--toolbar-min': px(t.toolbar.min),
    '--toolbar-share': String(pct(t.toolbar.share)),
    '--toolbar-max': px(t.toolbar.max),
    '--lane-ctx-min': px(t.laneContext.min),
    '--lane-ctx-share': String(pct(t.laneContext.share)),
    '--lane-ctx-max': px(t.laneContext.max),
    '--lane-act-min': px(t.laneActivity.min),
    '--lane-act-share': String(pct(t.laneActivity.share)),
    '--lane-act-max': px(t.laneActivity.max),
    '--board-min': px(t.boardMin),
    '--board-max': px(t.boardMax),
    '--activity-share-stacked': String(t.stackedShare.activity),
    '--context-share-stacked': String(t.stackedShare.context),
    '--stacked-lane-min': px(t.stackedLaneMin),
  };
}

/**
 * THE NAV ROW (spec §1.1, layout redesign C1b). `--nav-block` is what the bar
 * occupies, its 1px rule included, and the one height anything reads. Its
 * value reproduces the bar heights the owner approved on 2026-08-23: a flat
 * 38px row on a stacked layout, and in the landscape row
 * `--nav-brand x 2.29 + --nav-air + 5px`, where `--nav-brand` and the
 * `--nav-air` height chords stay in `index.css` as the curve's inputs (their
 * place in the cascade was measured twice and is load-bearing).
 */
export const navTokens = {
  /** The stacked row, px. */
  rowStacked: 38,
  /** The nav's bottom rule, px. */
  rule: 1,
  /** Landscape: the brand size multiplier and the fixed extra, px. */
  landscapeBrandFactor: 2.29,
  landscapeExtra: 5,
  /** The landscape row's media query: `navrow` in tailwind.config.ts. */
  landscapeQuery: '(orientation: landscape) and (min-width: 840px)',
} as const;

export function navCustomProperties(n = navTokens) {
  return {
    root: {
      '--nav-row-stacked': px(n.rowStacked),
      '--nav-rule': px(n.rule),
      '--nav-block': 'calc(var(--nav-row-stacked) + var(--nav-rule))',
    },
    landscape: {
      '--nav-block': `calc(var(--nav-brand) * ${n.landscapeBrandFactor} + var(--nav-air) + ${px(n.landscapeExtra)} + var(--nav-rule))`,
    },
  };
}

/** What `theme('workspace.*')` returns in CSS. */
export function workspaceTheme(t: LayoutTokens = layoutTokens) {
  return {
    columnsMinInline: px(columnsMinInline(t)),
    columnsMinBlock: px(columnsMinBlock(t)),
    columnsMinAspect: `${t.columnsMinAspect}/1`,
  };
}
