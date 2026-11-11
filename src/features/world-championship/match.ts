/**
 * The 2026 World Championship match: Gukesh D vs Javokhir Sindarov.
 *
 * ONE SOURCE for the match's facts. The hub, the game pages, the nav's Live link,
 * /live-events and the announcement article all read from here, so a date cannot
 * be right on one page and wrong on another (the Candidates kept a second copy of
 * its schedule in Navigation.tsx).
 *
 * Schedule: FIDE, 14 Sep 2026, the schedule graphic in
 * https://www.fide.com/salesforce-fide-world-championship-match-2026-schedule-format-and-prize-fund-confirmed/
 * (the per-game dates are in the image only). Game 1's 15:00 CET start is
 * Chess.com's (10 Nov 2026). No source gives the other games' start time, so
 * `timeConfirmed` is true for game 1 only; once Lichess creates the broadcast its
 * round times are used instead.
 *
 * LIVE DATA: set `LICHESS_TOURNAMENT_ID` when Lichess creates the broadcast. The
 * round list, every game's round id, its start time and the results all come
 * from Lichess after that; nothing else needs editing per game.
 */

import { portraitPath } from '@/config/championPortraits';

/** Lichess broadcast tournament id, e.g. "n3yHJI5Y" for 2024. Null until it exists. */
export const LICHESS_TOURNAMENT_ID: string | null = null;

export const MATCH_PATH = '/world-championship-2026';

export const POINTS_TO_WIN = 7.5;
export const CLASSICAL_GAMES = 14;

export type PlayerKey = 'gukesh' | 'sindarov';

export interface MatchPlayer {
  key: PlayerKey;
  name: string;
  shortName: string;
  country: string;
  /** Lower-case fragment that identifies the player in a PGN White/Black tag. */
  pgnMatch: string;
  /** ISO 3166 code, for the flag. */
  countryCode: 'IN' | 'UZ';
  /** "World Champion" or "Challenger". */
  role: string;
  /** The studio portrait, in the champion portraits' style (`championPortraits.ts`). */
  portrait: string;
}

export const PLAYERS: Record<PlayerKey, MatchPlayer> = {
  gukesh: { key: 'gukesh', name: 'Gukesh Dommaraju', shortName: 'Gukesh', country: 'India', countryCode: 'IN', pgnMatch: 'gukesh', role: 'World Champion', portrait: `/${portraitPath('Gukesh')}` },
  sindarov: { key: 'sindarov', name: 'Javokhir Sindarov', shortName: 'Sindarov', country: 'Uzbekistan', countryCode: 'UZ', pgnMatch: 'sindarov', role: 'Challenger', portrait: `/${portraitPath('Sindarov')}` },
};

/** The champion is listed first everywhere. */
export const PLAYER_ORDER: PlayerKey[] = ['gukesh', 'sindarov'];

/**
 * Who has White in game 1: drawn by lot, usually at the opening ceremony (22 Nov). Set it then;
 * until it is set, and until the broadcast shows a game, the colours are unknown.
 */
export const GAME_1_WHITE: PlayerKey | null = null;

/**
 * Who has White in game `n`. The colours alternate every game (2024: Gukesh had
 * White in every odd game, all 14), so one known game fixes all of them. The
 * broadcast's games win over the drawn colour, in case the two ever disagree.
 */
export function whiteIn(n: number, known: Iterable<{ game: number; white: PlayerKey }> = [], game1White: PlayerKey | null = GAME_1_WHITE): PlayerKey | null {
  const other = (p: PlayerKey): PlayerKey => (p === 'gukesh' ? 'sindarov' : 'gukesh');
  for (const g of known) return (n - g.game) % 2 === 0 ? g.white : other(g.white);
  if (game1White) return n % 2 === 1 ? game1White : other(game1White);
  return null;
}

export type MatchDayKind = 'ceremony' | 'media' | 'game' | 'rest' | 'tiebreak';

export interface MatchDay {
  /** YYYY-MM-DD in Geneva. */
  date: string;
  /** Short display date, weekday included (24 Nov 2026 is a Tuesday). */
  label: string;
  kind: MatchDayKind;
  /** Game number for kind 'game'. */
  game?: number;
  title: string;
}

export const MATCH_DAYS: MatchDay[] = [
  { date: '2026-11-22', label: 'Sun 22 Nov', kind: 'ceremony', title: 'Opening ceremony' },
  { date: '2026-11-23', label: 'Mon 23 Nov', kind: 'media', title: 'Media day' },
  { date: '2026-11-24', label: 'Tue 24 Nov', kind: 'game', game: 1, title: 'Game 1' },
  { date: '2026-11-25', label: 'Wed 25 Nov', kind: 'game', game: 2, title: 'Game 2' },
  { date: '2026-11-26', label: 'Thu 26 Nov', kind: 'game', game: 3, title: 'Game 3' },
  { date: '2026-11-27', label: 'Fri 27 Nov', kind: 'rest', title: 'Rest day' },
  { date: '2026-11-28', label: 'Sat 28 Nov', kind: 'game', game: 4, title: 'Game 4' },
  { date: '2026-11-29', label: 'Sun 29 Nov', kind: 'game', game: 5, title: 'Game 5' },
  { date: '2026-11-30', label: 'Mon 30 Nov', kind: 'game', game: 6, title: 'Game 6' },
  { date: '2026-12-01', label: 'Tue 1 Dec', kind: 'rest', title: 'Rest day' },
  { date: '2026-12-02', label: 'Wed 2 Dec', kind: 'game', game: 7, title: 'Game 7' },
  { date: '2026-12-03', label: 'Thu 3 Dec', kind: 'game', game: 8, title: 'Game 8' },
  { date: '2026-12-04', label: 'Fri 4 Dec', kind: 'game', game: 9, title: 'Game 9' },
  { date: '2026-12-05', label: 'Sat 5 Dec', kind: 'rest', title: 'Rest day' },
  { date: '2026-12-06', label: 'Sun 6 Dec', kind: 'game', game: 10, title: 'Game 10' },
  { date: '2026-12-07', label: 'Mon 7 Dec', kind: 'game', game: 11, title: 'Game 11' },
  { date: '2026-12-08', label: 'Tue 8 Dec', kind: 'game', game: 12, title: 'Game 12' },
  { date: '2026-12-09', label: 'Wed 9 Dec', kind: 'rest', title: 'Rest day' },
  { date: '2026-12-10', label: 'Thu 10 Dec', kind: 'game', game: 13, title: 'Game 13' },
  { date: '2026-12-11', label: 'Fri 11 Dec', kind: 'game', game: 14, title: 'Game 14' },
  { date: '2026-12-12', label: 'Sat 12 Dec', kind: 'tiebreak', title: 'Tiebreak if 7-7, closing ceremony' },
];

/** Geneva in November and December is CET, UTC+1. */
export const GENEVA_TZ = 'Europe/Zurich';

/** Expected start, 15:00 CET. Confirmed for game 1 only (see the header). */
const EXPECTED_START_UTC_HOUR = 14;

/** A classical game can run past six hours; seven covers it. */
const LIVE_WINDOW_HOURS = 7;

export interface ScheduledGame {
  game: number;
  date: string;
  label: string;
  /** Expected start (UTC). Replaced by Lichess's round time once known. */
  startsAt: Date;
  timeConfirmed: boolean;
}

export const SCHEDULED_GAMES: ScheduledGame[] = MATCH_DAYS
  .filter((d) => d.kind === 'game')
  .map((d) => ({
    game: d.game!,
    date: d.date,
    label: d.label,
    startsAt: new Date(`${d.date}T${String(EXPECTED_START_UTC_HOUR).padStart(2, '0')}:00:00Z`),
    timeConfirmed: d.game === 1,
  }));

export const MATCH_FIRST_DAY = MATCH_DAYS[0].date;
export const MATCH_LAST_DAY = MATCH_DAYS[MATCH_DAYS.length - 1].date;

export function gamePath(game: number): string {
  return `${MATCH_PATH}/game-${game}`;
}

/** "game-7" -> 7; anything else -> null. */
export function parseGameSlug(slug: string | undefined): number | null {
  const m = /^game-(\d{1,2})$/.exec(slug ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= CLASSICAL_GAMES ? n : null;
}

/** YYYY-MM-DD of an instant, in Geneva. */
export function genevaDate(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: GENEVA_TZ });
}

/** "15:00" of an instant, in Geneva. */
export function genevaTime(at: Date): string {
  return at.toLocaleTimeString('en-GB', { timeZone: GENEVA_TZ, hour: '2-digit', minute: '2-digit' });
}

export interface MatchCalendarState {
  /** Between the opening ceremony and the closing day, inclusive. */
  duringMatch: boolean;
  /** Today's game, if today is a game day. */
  todaysGame: ScheduledGame | null;
  /** Inside today's game's live window. */
  liveNow: boolean;
  /** The next game not yet started, if any. */
  nextGame: ScheduledGame | null;
}

/**
 * Where the calendar stands, from the schedule alone. The score can end the match
 * early (first to 7.5); callers that know the score pass `lastGame` so games after
 * it are not reported as next or live.
 */
export function calendarState(now: Date, starts: (g: number) => Date = defaultStart, lastGame = CLASSICAL_GAMES): MatchCalendarState {
  const today = genevaDate(now);
  const duringMatch = today >= MATCH_FIRST_DAY && today <= MATCH_LAST_DAY;
  const games = SCHEDULED_GAMES.filter((g) => g.game <= lastGame);
  const todaysGame = games.find((g) => g.date === today) ?? null;
  let liveNow = false;
  if (todaysGame) {
    const start = starts(todaysGame.game).getTime();
    liveNow = now.getTime() >= start && now.getTime() < start + LIVE_WINDOW_HOURS * 3600_000;
  }
  const nextGame = games.find((g) => starts(g.game).getTime() > now.getTime()) ?? null;
  return { duringMatch, todaysGame, liveNow, nextGame };
}

function defaultStart(g: number): Date {
  return SCHEDULED_GAMES[g - 1].startsAt;
}

// ---------------------------------------------------------------------------
// The score
// ---------------------------------------------------------------------------

/** One game as the broadcast PGN reports it (tags only). */
export interface BroadcastGameTags {
  round: string;
  white: string;
  black: string;
  result: string;
  /** https://lichess.org/broadcast/<slug>/<round-slug>/<roundId>/<gameId> */
  gameUrl?: string;
}

export type GameResult = 'white' | 'black' | 'draw' | 'playing';

export interface ScoredGame {
  game: number;
  white: PlayerKey;
  black: PlayerKey;
  result: GameResult;
  roundId: string | null;
}

export interface MatchScore {
  points: Record<PlayerKey, number>;
  /** Games found in the broadcast, keyed by game number. */
  games: Map<number, ScoredGame>;
  /** Set once a player reaches 7.5: the match is over after `afterGame`. */
  winner: { player: PlayerKey; afterGame: number } | null;
  /** All fourteen played and level: the tiebreak decides it. */
  tiebreak: boolean;
}

function playerFor(name: string, players: MatchPlayer[]): PlayerKey | null {
  const n = name.toLowerCase();
  const hit = players.find((p) => n.includes(p.pgnMatch));
  return hit ? hit.key : null;
}

function resultOf(tag: string): GameResult {
  if (tag === '1-0') return 'white';
  if (tag === '0-1') return 'black';
  if (tag === '1/2-1/2' || tag === '½-½') return 'draw';
  return 'playing';
}

/** Round id from a Lichess GameURL (the second-last path segment). */
export function roundIdFromGameUrl(url: string | undefined): string | null {
  if (!url) return null;
  const parts = url.split('?')[0].split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

/**
 * The match score from the broadcast's games. A game counts once its result is
 * in; a game in progress counts nothing. Games whose players are not the two
 * match players, or whose Round tag is not a classical game number, are ignored
 * (a tiebreak is a separate broadcast).
 *
 * `players` defaults to 2026's pair; the tests pass 2024's (Ding, Gukesh) and
 * check the real result, 7.5-6.5.
 */
export function scoreMatch(
  tags: BroadcastGameTags[],
  players: MatchPlayer[] = PLAYER_ORDER.map((k) => PLAYERS[k]),
): MatchScore {
  const points = Object.fromEntries(players.map((p) => [p.key, 0])) as Record<PlayerKey, number>;
  const games = new Map<number, ScoredGame>();

  for (const t of tags) {
    const game = Number.parseInt(t.round, 10);
    if (!Number.isInteger(game) || game < 1 || game > CLASSICAL_GAMES) continue;
    const white = playerFor(t.white, players);
    const black = playerFor(t.black, players);
    if (!white || !black || white === black) continue;
    games.set(game, { game, white, black, result: resultOf(t.result), roundId: roundIdFromGameUrl(t.gameUrl) });
  }

  let winner: MatchScore['winner'] = null;
  const ordered = [...games.values()].sort((a, b) => a.game - b.game);
  for (const g of ordered) {
    if (g.result === 'white') points[g.white] += 1;
    else if (g.result === 'black') points[g.black] += 1;
    else if (g.result === 'draw') { points[g.white] += 0.5; points[g.black] += 0.5; }
    if (!winner && g.result !== 'playing') {
      const leader = players.find((p) => points[p.key] >= POINTS_TO_WIN);
      if (leader) winner = { player: leader.key, afterGame: g.game };
    }
  }

  const finished = ordered.filter((g) => g.result !== 'playing').length;
  const [a, b] = players;
  const tiebreak = !winner && finished === CLASSICAL_GAMES && points[a.key] === points[b.key];

  return { points, games, winner, tiebreak };
}

/** 4.5 -> "4½", 0.5 -> "½", 3 -> "3". */
export function formatPoints(p: number): string {
  const whole = Math.floor(p);
  const half = p - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
}

/** Tags of every game in a PGN text (no move parsing: the score needs none). */
export function readBroadcastTags(pgn: string): BroadcastGameTags[] {
  const out: BroadcastGameTags[] = [];
  for (const block of pgn.split(/\r?\n\r?\n(?=\[Event )/)) {
    const tag = (name: string) => new RegExp(`^\\[${name} "([^"]*)"\\]`, 'm').exec(block)?.[1];
    const white = tag('White');
    const black = tag('Black');
    if (!white || !black) continue;
    out.push({ round: tag('Round') ?? '', white, black, result: tag('Result') ?? '*', gameUrl: tag('GameURL') });
  }
  return out;
}
