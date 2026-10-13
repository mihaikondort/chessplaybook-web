/**
 * Where sign-in returns to — and where it refuses to.
 *
 * The bug this closes: four places on the site build `/login?returnTo=…` and
 * nothing read it, so every "sign in to save your progress" link landed on the
 * homepage. The refusals matter as much: `returnTo` comes from a URL anyone
 * can write, and a login that forwards off-site after authenticating is an open
 * redirect with a session attached.
 */
import { describe, test, expect } from 'vitest';
import { safeReturnTo, returnToFrom } from './returnTo';

describe('returnTo', () => {
  test('keeps the query string, because the page is not the same without it', () => {
    expect(safeReturnTo('/puzzles?theme=fork')).toBe('/puzzles?theme=fork');
    expect(returnToFrom('?returnTo=%2Fpuzzles%3Ftheme%3Dfork')).toBe('/puzzles?theme=fork');
  });

  test('refuses another origin', () => {
    expect(safeReturnTo('https://evil.example/steal')).toBeNull();
    expect(safeReturnTo('//evil.example')).toBeNull();
    expect(safeReturnTo(String.raw`/\evil.example`)).toBeNull();
  });

  test('refuses anything that is not a path', () => {
    expect(safeReturnTo('javascript:alert(1)')).toBeNull();
    expect(safeReturnTo('puzzles')).toBeNull();
    expect(safeReturnTo('')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });

  test('a malformed encoding is refused rather than thrown', () => {
    expect(safeReturnTo('%E0%A4%A')).toBeNull();
  });
});
