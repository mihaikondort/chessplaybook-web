/**
 * A RUN THAT ENDED SAYS WHICH WAY IT ENDED, AND HOW FAR IT GOT.
 *
 * Owner, 2026-08-16, after pressing Stop run two positions into a ten-position
 * training plan day: *"it wrongly shows run completed 10 out of ten"*.
 *
 * The bug lived in ONE line and was false in three ways at once. Every case
 * below is one of them, asserted against `PuzzleRunSetupCard`. (Until C6 they
 * also ran against v2's `SessionSetup`, which it was written from and inherited
 * the bug from whole.)
 *
 * WHY A UNIT TEST AND NOT ONLY A PROBE. `verify-run-outcome.mjs` drives a real
 * run and is the stronger evidence, but it needs a server, a browser and a
 * minute; these run on every commit. The defect was a pure rendering decision
 * from four props, which is exactly the shape a unit test catches cheaply - and
 * the reason it survived is that nothing asserted the ENDED states at all
 * (Codex, 2026-08-16: "the abandonment behavior is only asserted at the hook
 * layer").
 */
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PuzzleRunSetupCard } from './PuzzleRunSetupCard';

const OPTIONS = [
  { id: 'adaptive', available: true },
  { id: 'random', available: true },
];
const AREAS = ['tactics', 'middlegame', 'endgame'];

/**
 * A run of TEN that was stopped after TWO, with the picker sitting at its
 * default of ten.
 *
 * The default matters: it is why the old card's "10 of 10" looked plausible.
 * Every case here also runs with a run length that does NOT match the picker,
 * so a number taken from the wrong place cannot pass by coincidence.
 */
const ended = (extra: Record<string, unknown>) => ({
  options: OPTIONS,
  areas: AREAS,
  running: false,
  finished: true,
  completed: 2,
  runTotal: 10,
  runSelection: 'adaptive' as const,
  runArea: null,
  servedByRun: true,
  ...extra,
});

const rebuilt = (props: Record<string, unknown>) => render(
  <PuzzleRunSetupCard
    selection="adaptive"
    onSelectionChange={vi.fn()}
    area={null}
    onAreaChange={vi.fn()}
    total={10}
    onTotalChange={vi.fn()}
    onStart={vi.fn()}
    onStop={vi.fn()}
    {...(props as Record<string, unknown> as object)}
  />,
);

/* v2's `SessionSetup` was asserted here too until C6 deleted it (2026-10-08). */
describe.each([
  ['the run card', rebuilt],
])('%s', (_name, mount) => {
  test('a STOPPED run says it was stopped, and how far it got', () => {
    mount(ended({ runStatus: 'abandoned' }));
    const line = screen.getByTestId('run-progress');
    expect(line).toHaveTextContent('Run stopped, 2 of 10');
    /* The whole complaint: it must not claim completion. */
    expect(line.textContent).not.toMatch(/complete/i);
  });

  test('a COMPLETED run is the one case where "N of N" is true', () => {
    mount(ended({ runStatus: 'completed', completed: 10 }));
    expect(screen.getByTestId('run-progress')).toHaveTextContent('Run complete, 10 of 10');
  });

  test('the number is the RUN\'s length, never the picker\'s', () => {
    /* A run of five, stopped at one, while the picker shows ten. A card reading
       `shownTotal` after the run ended prints "of 10" here. */
    mount(ended({ runStatus: 'abandoned', runTotal: 5, completed: 1 }));
    const line = screen.getByTestId('run-progress');
    expect(line).toHaveTextContent('Run stopped, 1 of 5');
    expect(line.textContent).not.toContain('of 10');
  });

  test('a run still going reports which puzzle this is, not the outcome', () => {
    mount(ended({ running: true, finished: false, runStatus: 'active' }));
    const line = screen.getByTestId('run-progress');
    /* `completed + 1`: the count answers "how many attempts exist", the row asks
       "which puzzle is this". */
    expect(line).toHaveTextContent('3 of 10');
    expect(line.textContent).not.toMatch(/stopped|complete/i);
  });
});
