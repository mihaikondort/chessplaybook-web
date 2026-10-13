import { describe, expect, it } from 'vitest';
import {
  columnsCardGap,
  columnsMinBlock,
  columnsMinInline,
  layoutCustomProperties,
  navCustomProperties,
  navTokens,
  layoutTokens,
  workspaceTheme,
  type LayoutTokens,
} from './layout.tokens';
import tailwindConfig from '../../../tailwind.config';

/*
  The thresholds are recomputed here from the spec's own wording, not from the
  functions under test, so a change to either side shows up as a disagreement.
*/
describe('layout tokens', () => {
  it('columns-min is two lanes, two gaps and two pads at their lower bounds, plus the board floor (spec §6)', () => {
    const t = layoutTokens;
    expect(columnsMinInline()).toBe(t.laneContext.min + t.laneActivity.min + t.gapCol.min * 2 + t.padColumns * 2 + t.boardMin);
    // 768 until D23 (2026-10-06) moved the columns padding to v3's 8px; 760 is v3's own `cols` width.
    expect(columnsMinInline()).toBe(760);
  });

  it('columns-min-block is two pads, the board floor, the toolbar gap and the toolbar floor (spec §6)', () => {
    const t = layoutTokens;
    expect(columnsMinBlock()).toBe(t.padColumns * 2 + t.boardMin + t.gapToolbar + t.toolbar.min);
    expect(columnsMinBlock()).toBe(400);
  });

  it("the columns card gap is v3's page air on the LANE: clamp(4, 12 x (h / 661)^2, 12) (D23, D25)", () => {
    // 661 is v3's 677-tall region less two 8px paddings, so a lane that tall gets v3's full 12.
    expect(layoutTokens.gapCardColumns.anchor).toBe(677 - 2 * layoutTokens.padColumns);
    expect(columnsCardGap(661)).toBe(12);
    expect(columnsCardGap(900)).toBe(12);
    expect(columnsCardGap(404)).toBeCloseTo(12 * (404 / 661) ** 2, 6); // 800x600's lane
    expect(columnsCardGap(384)).toBeCloseTo(4.05, 2); // the shortest columns lane
    expect(columnsCardGap(300)).toBe(4);
    const props = layoutCustomProperties();
    expect(props['--pad-columns']).toBe('8px');
    expect(props['--gap-card-max']).toBe(props['--gap-card']);
    expect(props['--gap-card-min']).toBe('4px');
    expect(props['--gap-card-anchor']).toBe('661px');
  });

  it('a stacked lane is never shorter than the /puzzles context lane needs (D25)', () => {
    // four 79px cards, three card gaps, the toolbar gap and the toolbar floor
    const t = layoutTokens;
    expect(t.stackedLaneMin).toBe(4 * 79 + 3 * t.gapCard + t.gapToolbar + t.toolbar.min);
    expect(layoutCustomProperties()['--stacked-lane-min']).toBe('416px');
  });

  it('columns mode also needs a workspace at least as wide as it is tall (spec §6, D19)', () => {
    expect(layoutTokens.columnsMinAspect).toBe(1);
    expect(workspaceTheme().columnsMinAspect).toBe('1/1');
  });

  it('the thresholds follow the tokens rather than being fixed numbers', () => {
    const wider: LayoutTokens = { ...layoutTokens, laneContext: { ...layoutTokens.laneContext, min: 216 } };
    expect(columnsMinInline(wider)).toBe(columnsMinInline() + 40);
  });

  it('at the columns threshold both lanes are at their minimum, so the board is at least boardMin there', () => {
    const t = layoutTokens;
    const cqw = columnsMinInline();
    expect(t.laneContext.share * cqw).toBeLessThanOrEqual(t.laneContext.min);
    expect(t.laneActivity.share * cqw).toBeLessThanOrEqual(t.laneActivity.min);
  });

  it('the context lane is the narrower one at every width (owner, 2026-10-06)', () => {
    const t = layoutTokens;
    const lane = (f: { min: number; share: number; max: number }, w: number) => Math.min(f.max, Math.max(f.min, f.share * w));
    for (let w = columnsMinInline(); w <= 3000; w += 50) expect(lane(t.laneContext, w)).toBeLessThan(lane(t.laneActivity, w));
  });

  it('every bound is ordered and every share is a fraction', () => {
    for (const f of [layoutTokens.gapCol, layoutTokens.toolbar, layoutTokens.laneContext, layoutTokens.laneActivity]) {
      expect(f.min).toBeLessThanOrEqual(f.max);
      expect(f.share).toBeGreaterThan(0);
      expect(f.share).toBeLessThan(1);
    }
    expect(layoutTokens.boardMin).toBeLessThan(layoutTokens.boardMax);
  });

  it('emits only absolute values for :root, never container units', () => {
    const props = layoutCustomProperties();
    for (const value of Object.values(props)) expect(value).not.toMatch(/cq[whib]|cqmin|cqmax/);
    expect(props['--lane-ctx-min']).toBe('176px');
    expect(props['--lane-act-min']).toBe('224px');
    expect(props['--toolbar-share']).toBe('6.54');
  });

  it('tailwind exposes the same thresholds the tokens compute, so CSS cannot drift from them', () => {
    const theme = (tailwindConfig as { theme: { extend: { workspace: unknown } } }).theme.extend.workspace;
    expect(theme).toEqual(workspaceTheme());
  });
});

/*
  THE NAV'S APPROVED HEIGHTS (C1b). `verify-nav-total` compares the token with
  the rendered bar, and since C1b both come from these numbers, so a changed
  number would move both and still pass it. The owner approved the bar
  heights on 2026-08-23 (38px + 1px stacked; brand x 2.29 + air + 5px + 1px in
  landscape); these four values ARE those heights, so they are pinned here.
*/
describe('the nav row', () => {
  it('keeps the approved constants', () => {
    expect(navTokens.rowStacked).toBe(38);
    expect(navTokens.rule).toBe(1);
    expect(navTokens.landscapeBrandFactor).toBe(2.29);
    expect(navTokens.landscapeExtra).toBe(5);
    expect(navTokens.landscapeQuery).toBe('(orientation: landscape) and (min-width: 840px)');
  });

  it('includes the rule in the block, in both orientations', () => {
    const { root, landscape } = navCustomProperties();
    expect(root['--nav-block']).toBe('calc(var(--nav-row-stacked) + var(--nav-rule))');
    expect(landscape['--nav-block']).toBe('calc(var(--nav-brand) * 2.29 + var(--nav-air) + 5px + var(--nav-rule))');
  });
});
