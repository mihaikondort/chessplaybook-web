/**
 * Game dates come in several forms (2026-11-11): the re-imported games store
 * "1961" for a year-only date and "1955-06" for a month, the rest
 * "1961-05-12"; PGN text has "1961.05.12" and "1961.??.??". The list's
 * default order is by date, and the old parser read a bare "1961" as NaN,
 * which sorted every year-only game to the end of its list.
 */
import { describe, expect, it } from 'vitest';
import { GameFilterService, gameDateTime, gameDateYear } from './GameFilterService';
import { DEFAULT_SORT_STATE } from '@/types/filter';
import type { GameMetadata } from '@/types/chess';

const game = (date: string): GameMetadata =>
  ({ white: 'Tal, Mihail', black: 'X', result: '1-0', event: 'E', date } as GameMetadata);

describe('game dates', () => {
  it('reads every stored form', () => {
    expect(gameDateYear('1961')).toBe(1961);
    expect(gameDateYear('1955-06')).toBe(1955);
    expect(gameDateYear('1961-05-12')).toBe(1961);
    expect(gameDateYear('1961.??.??')).toBe(1961);
    expect(gameDateYear('2021-07-10T00:00:00.000Z')).toBe(2021);
    expect(gameDateYear('????.??.??')).toBeNull();
    expect(gameDateTime('1961.05.12')).toBe(gameDateTime('1961-05-12'));
    expect(gameDateTime('1961')).toBe(gameDateTime('1961-01-01'));
  });

  it('sorts year-only games among the dated ones, newest first', () => {
    const sorted = GameFilterService.sortGames(
      [game('1955-06'), game('1961'), game('1960-03-15'), game('1962-01-02'), game('1958.??.??')],
      DEFAULT_SORT_STATE,
    );
    expect(sorted.map(g => g.date)).toEqual(['1962-01-02', '1961', '1960-03-15', '1958.??.??', '1955-06']);
  });

  it('filters and reports the year range on year-only dates', () => {
    const games = [game('1961'), game('1955-06'), game('1972-07-11')];
    expect(GameFilterService.getDateRange(games)).toEqual({ min: 1955, max: 1972 });
  });
});
