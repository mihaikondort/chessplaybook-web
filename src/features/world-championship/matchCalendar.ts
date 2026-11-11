/**
 * The match in a visitor's own calendar: a Google Calendar link per game, and one
 * .ics file with every game (iPhone, Outlook, desktop calendars).
 *
 * WHY BOTH. Much of the audience is on Android, where a downloaded .ics is awkward to
 * open; Google's "add event" link works in one tap. The .ics covers everyone else.
 *
 * A TIME IS GIVEN ONLY WHEN IT IS CONFIRMED. FIDE has published game 1's start
 * (15:00 in Geneva) and no other; Lichess's round times replace the expectation once
 * the broadcast exists. A game without a confirmed time is an all-day entry that says
 * so, because a timed entry at a guessed hour would send someone to the board at the
 * wrong time. Timed entries are written in UTC, so no time-zone table is needed.
 */

import { escapeText, foldLine } from '@/features/puzzles/lib/icsExport';
import { CLASSICAL_GAMES, MATCH_PATH, PLAYERS, SCHEDULED_GAMES, gamePath } from './match';

/** A classical game can run past five hours; the calendar block covers the usual length. */
const GAME_HOURS = 5;
const SITE = 'https://www.chessplaybook.com';

export interface MatchCalendarEvent {
  game: number;
  uid: string;
  title: string;
  /** Geneva date, YYYY-MM-DD. */
  date: string;
  /** The confirmed start, or null when it has not been announced. */
  start: Date | null;
  url: string;
  description: string;
}

export function matchCalendarEvents(
  startOf: (game: number) => Date,
  confirmed: (game: number) => boolean,
  lastGame: number = CLASSICAL_GAMES,
  site: string = SITE,
): MatchCalendarEvent[] {
  return SCHEDULED_GAMES.filter((g) => g.game <= lastGame).map((g) => {
    const start = confirmed(g.game) ? startOf(g.game) : null;
    const url = `${site}${gamePath(g.game)}`;
    return {
      game: g.game,
      uid: `chessplaybook-wch2026-game-${g.game}@chessplaybook.com`,
      title: `World Championship game ${g.game}: ${PLAYERS.gukesh.shortName} vs ${PLAYERS.sindarov.shortName}`,
      date: g.date,
      start,
      url,
      description: start
        ? `Watch it live on Chess Playbook: ${url}`
        : `The start time has not been announced yet. Check the match page: ${site}${MATCH_PATH}`,
    };
  });
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function compactDate(iso: string): string {
  return iso.replaceAll('-', '');
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Google Calendar's "add event" link for one game. */
export function googleCalendarUrl(e: MatchCalendarEvent): string {
  const dates = e.start
    ? `${utcStamp(e.start)}/${utcStamp(new Date(e.start.getTime() + GAME_HOURS * 3_600_000))}`
    : `${compactDate(e.date)}/${compactDate(nextDay(e.date))}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    details: e.description,
    location: 'Geneva, Switzerland',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** One .ics with every game: timed in UTC with a 30-minute alarm when confirmed, all-day otherwise. */
export function serializeMatchCalendar(events: MatchCalendarEvent[], now: Date = new Date()): string {
  const stamp = utcStamp(now);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chess Playbook//World Championship 2026//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:World Championship 2026',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${escapeText(e.uid)}`, `DTSTAMP:${stamp}`, 'SEQUENCE:0');
    if (e.start) {
      lines.push(
        `DTSTART:${utcStamp(e.start)}`,
        `DTEND:${utcStamp(new Date(e.start.getTime() + GAME_HOURS * 3_600_000))}`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(e.date))}`, 'TRANSP:TRANSPARENT');
    }
    lines.push(
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      'LOCATION:Geneva\\, Switzerland',
      `URL:${e.url}`,
    );
    if (e.start) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT30M', `DESCRIPTION:${escapeText(`Game ${e.game} starts in 30 minutes`)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** Saves the .ics in the browser. */
export function downloadMatchCalendar(events: MatchCalendarEvent[]): void {
  const url = URL.createObjectURL(new Blob([serializeMatchCalendar(events)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'world-championship-2026.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
