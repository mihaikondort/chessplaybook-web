/**
 * The client's session-length bounds must be the server's.
 *
 * They are duplicated on purpose — a form that cannot bound its own input until
 * a round trip completes is a form that offers values it will then refuse — and
 * a duplicated constant is a constant that drifts. This reads the backend source
 * and compares, so the failure is a red test rather than a player being told
 * "positionsPerSession must be between 5 and 60" by a control that let them
 * pick 70.
 *
 * A static read rather than an import: the backend is a separate package with
 * its own tsconfig, and importing across that boundary to check a number would
 * be a build-time coupling far heavier than the thing it protects.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { MIN_POSITIONS, MAX_POSITIONS, POSITIONS_STEP, LENGTHS } from './planFormat';

const GENERATION = join(
  process.cwd(), 'backend', 'src', 'services', 'puzzles', 'planGeneration.ts',
);
// The published frontend source has no backend/ (THIRD_PARTY_LICENSING.md §1).
// Skip only when the WHOLE folder is absent: a moved file in this repo still fails.
const HAS_BACKEND = existsSync(join(process.cwd(), 'backend'));

function serverConstant(name: string): number {
  const source = readFileSync(GENERATION, 'utf-8');
  const match = source.match(new RegExp(`export const ${name} = (\\d+)`));
  if (!match) throw new Error(`${name} not found in planGeneration.ts — has it been renamed?`);
  return Number(match[1]);
}

describe.skipIf(!HAS_BACKEND)('session-length bounds mirror the server', () => {
  it('MIN_POSITIONS equals MIN_POSITIONS_PER_SESSION', () => {
    expect(MIN_POSITIONS).toBe(serverConstant('MIN_POSITIONS_PER_SESSION'));
  });

  it('MAX_POSITIONS equals MAX_POSITIONS_PER_SESSION', () => {
    expect(MAX_POSITIONS).toBe(serverConstant('MAX_POSITIONS_PER_SESSION'));
  });

  /*
    Every preset has to be reachable by the stepper as well, or the two controls
    describe different sets and a player who steps past a preset can never land
    back on it.
  */
  it('every preset is on the stepper grid and inside the bounds', () => {
    for (const n of LENGTHS) {
      expect(n).toBeGreaterThanOrEqual(MIN_POSITIONS);
      expect(n).toBeLessThanOrEqual(MAX_POSITIONS);
      expect((n - MIN_POSITIONS) % POSITIONS_STEP).toBe(0);
    }
  });

  it('the bounds themselves are on the grid, so both ends are reachable', () => {
    expect((MAX_POSITIONS - MIN_POSITIONS) % POSITIONS_STEP).toBe(0);
  });
});
