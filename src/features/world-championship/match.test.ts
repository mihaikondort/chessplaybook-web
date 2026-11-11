import { describe, expect, it } from 'vitest';
// The real 2024 title match, from Lichess's broadcast (tags and results only).
import PGN_2024 from './fixtures/wch2024-tags.pgn?raw';
import {
  MATCH_DAYS,
  SCHEDULED_GAMES,
  calendarState,
  formatPoints,
  parseGameSlug,
  readBroadcastTags,
  roundIdFromGameUrl,
  scoreMatch,
  type BroadcastGameTags,
  type MatchPlayer,
  whiteIn,
} from './match';

const PLAYERS_2024: MatchPlayer[] = [
  { key: 'gukesh', name: 'Gukesh D', shortName: 'Gukesh', country: 'India', countryCode: 'IN', pgnMatch: 'gukesh', role: 'World Champion', portrait: '' },
  { key: 'sindarov', name: 'Ding Liren', shortName: 'Ding', country: 'China', countryCode: 'UZ', pgnMatch: 'ding', role: 'Challenger', portrait: '' },
];

function game(round: number, white: string, black: string, result: string): BroadcastGameTags {
  return { round: String(round), white, black, result };
}

describe('scoreMatch on the 2024 match', () => {
  const tags = readBroadcastTags(PGN_2024);
  const score = scoreMatch(tags, PLAYERS_2024);

  it('reads all fourteen games', () => {
    expect(tags).toHaveLength(14);
    expect(score.games.size).toBe(14);
  });

  it('gives the real result, Gukesh 7.5-6.5, decided by game 14', () => {
    expect(score.points.gukesh).toBe(7.5);
    expect(score.points.sindarov).toBe(6.5); // Ding, in this fixture's key
    expect(score.winner).toEqual({ player: 'gukesh', afterGame: 14 });
    expect(score.tiebreak).toBe(false);
  });

  it('knows who had White and which game Ding won first', () => {
    const g1 = score.games.get(1)!;
    expect(g1).toMatchObject({ white: 'gukesh', black: 'sindarov', result: 'black', roundId: 'G2R2lPcA' });
    expect(score.games.get(3)!.result).toBe('white');
  });
});

describe('scoreMatch rules', () => {
  it('ends the match the moment someone reaches 7.5', () => {
    // Gukesh wins games 1-7 (7 points), game 8 is drawn: 7.5 after game 8.
    const tags = Array.from({ length: 8 }, (_, i) =>
      game(i + 1, 'Gukesh D', 'Sindarov, Javokhir', i < 7 ? '1-0' : '1/2-1/2'));
    const s = scoreMatch(tags);
    expect(s.points.gukesh).toBe(7.5);
    expect(s.winner).toEqual({ player: 'gukesh', afterGame: 8 });
  });

  it('counts nothing for a game in progress', () => {
    const s = scoreMatch([game(1, 'Gukesh D', 'Sindarov, Javokhir', '1/2-1/2'), game(2, 'Sindarov, Javokhir', 'Gukesh D', '*')]);
    expect(s.points).toEqual({ gukesh: 0.5, sindarov: 0.5 });
    expect(s.games.get(2)!.result).toBe('playing');
    expect(s.winner).toBeNull();
  });

  it('calls a 7-7 finish a tiebreak', () => {
    const tags = Array.from({ length: 14 }, (_, i) => game(i + 1, 'Gukesh D', 'Sindarov, Javokhir', '1/2-1/2'));
    const s = scoreMatch(tags);
    expect(s.points).toEqual({ gukesh: 7, sindarov: 7 });
    expect(s.tiebreak).toBe(true);
    expect(s.winner).toBeNull();
  });

  it('ignores other players and rounds outside 1-14', () => {
    const s = scoreMatch([
      game(1, 'Carlsen, Magnus', 'Gukesh D', '1-0'),
      game(15, 'Gukesh D', 'Sindarov, Javokhir', '1-0'),
      game(0, 'Gukesh D', 'Sindarov, Javokhir', '1-0'),
    ]);
    expect(s.games.size).toBe(0);
    expect(s.points).toEqual({ gukesh: 0, sindarov: 0 });
  });
});

describe('helpers', () => {
  it('formats points with halves', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(0.5)).toBe('½');
    expect(formatPoints(4.5)).toBe('4½');
    expect(formatPoints(7)).toBe('7');
  });

  it('parses game slugs 1-14 only', () => {
    expect(parseGameSlug('game-1')).toBe(1);
    expect(parseGameSlug('game-14')).toBe(14);
    expect(parseGameSlug('game-15')).toBeNull();
    expect(parseGameSlug('game-0')).toBeNull();
    expect(parseGameSlug('round-1')).toBeNull();
    expect(parseGameSlug(undefined)).toBeNull();
  });

  it('takes the round id from a GameURL', () => {
    expect(roundIdFromGameUrl('https://lichess.org/broadcast/x/game-1/G2R2lPcA/TAq3z9DR')).toBe('G2R2lPcA');
    expect(roundIdFromGameUrl(undefined)).toBeNull();
  });
});

describe('the schedule', () => {
  it('has fourteen games and four rest days, in date order', () => {
    expect(SCHEDULED_GAMES.map((g) => g.game)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(MATCH_DAYS.filter((d) => d.kind === 'rest').map((d) => d.date))
      .toEqual(['2026-11-27', '2026-12-01', '2026-12-05', '2026-12-09']);
    const dates = MATCH_DAYS.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('labels every day with its real weekday', () => {
    for (const d of MATCH_DAYS) {
      const weekday = new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
      expect(d.label.startsWith(weekday)).toBe(true);
    }
  });

  it('expects game 1 at 15:00 in Geneva', () => {
    expect(SCHEDULED_GAMES[0].startsAt.toISOString()).toBe('2026-11-24T14:00:00.000Z');
    expect(SCHEDULED_GAMES[0].timeConfirmed).toBe(true);
    expect(SCHEDULED_GAMES[1].timeConfirmed).toBe(false);
  });
});

describe('calendarState', () => {
  it('before the match: not during, next is game 1', () => {
    const s = calendarState(new Date('2026-11-11T12:00:00Z'));
    expect(s).toMatchObject({ duringMatch: false, todaysGame: null, liveNow: false });
    expect(s.nextGame!.game).toBe(1);
  });

  it('game 1 under way at 16:00 Geneva', () => {
    const s = calendarState(new Date('2026-11-24T15:00:00Z'));
    expect(s.duringMatch).toBe(true);
    expect(s.todaysGame!.game).toBe(1);
    expect(s.liveNow).toBe(true);
    expect(s.nextGame!.game).toBe(2);
  });

  it('a rest day is during the match with nothing live', () => {
    const s = calendarState(new Date('2026-11-27T15:00:00Z'));
    expect(s).toMatchObject({ duringMatch: true, todaysGame: null, liveNow: false });
    expect(s.nextGame!.game).toBe(4);
  });

  it('a match decided after game 10 has no next game', () => {
    const s = calendarState(new Date('2026-12-07T10:00:00Z'), undefined, 10);
    expect(s.todaysGame).toBeNull();
    expect(s.nextGame).toBeNull();
  });
});

describe('colours', () => {
  it('are unknown until drawn or broadcast', () => {
    expect(whiteIn(5, [], null)).toBeNull();
  });

  it('alternate from the drawn colour of game 1', () => {
    expect(whiteIn(1, [], 'sindarov')).toBe('sindarov');
    expect(whiteIn(2, [], 'sindarov')).toBe('gukesh');
    expect(whiteIn(14, [], 'sindarov')).toBe('gukesh');
  });

  it('follow from any game the broadcast shows, and match 2024 game by game', () => {
    const played = [...scoreMatch(readBroadcastTags(PGN_2024), PLAYERS_2024).games.values()];
    const game5 = played.filter((g) => g.game === 5);
    for (const g of played) expect(whiteIn(g.game, game5, null)).toBe(g.white);
  });

  it('take the broadcast over the drawn colour', () => {
    expect(whiteIn(3, [{ game: 2, white: 'gukesh' }], 'gukesh')).toBe('sindarov');
  });
});
