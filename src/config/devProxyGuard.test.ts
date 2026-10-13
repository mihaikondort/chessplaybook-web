import { describe, expect, it } from 'vitest';
import { isProductionApiTarget } from './devProxyGuard';

/* The cases are #35's verification list, plus the ones a regex gets wrong. */
describe('isProductionApiTarget (dev proxy write guard, #35)', () => {
  it.each([
    ['https://api.chessplaybook.com', true],
    ['https://www.chessplaybook.com', true],
    ['https://chessplaybook.com', true],
    // Not on the allowlist, so production: the case a narrowed regex unbans.
    ['https://api-v2.chessplaybook.com', true],
    // The issue's example spelling; staging is api.staging.chessplaybook.com, so
    // this one is refused, which is the fail-closed rule working.
    ['https://api-staging.chessplaybook.com', true],
    ['https://API.CHESSPLAYBOOK.COM/', true],
    ['https://api.chessplaybook.com:443/api', true],
    // Unparseable: production, never "probably fine".
    ['api.chessplaybook.com', true],
    ['', true],
  ])('%s is production: %s', (target, expected) => {
    expect(isProductionApiTarget(target)).toBe(expected);
  });

  it.each([
    ['https://api.staging.chessplaybook.com', false],
    ['http://localhost:3000', false],
    ['http://127.0.0.1:3000', false],
    // A different site that merely contains the name is not ours.
    ['https://notchessplaybook.com', false],
    ['https://chessplaybook.com.example.org', false],
  ])('%s is production: %s', (target, expected) => {
    expect(isProductionApiTarget(target)).toBe(expected);
  });
});
