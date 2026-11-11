/**
 * One game of the 2026 World Championship match: /world-championship-2026/game-N.
 *
 * A Workspace page, the same board page in every state (owner, 2026-11-11: "can't
 * we show the board yet?"). Before the game the board holds the starting position,
 * the player cards the two players with their portraits, and the game card the
 * date; once Lichess's broadcast has the game it is `LiveRoundGame` (the same poll
 * as /live-game), and the board follows the moves. The broadcast's round list and
 * the round's PGN are both polled, so the change happens on its own.
 *
 * COLOURS: drawn for game 1 at the opening ceremony and alternating after it
 * (`whiteIn`). Until one game's colours are known the cards say "Player", not a
 * guessed White and Black.
 *
 * `noindex, follow`, like every round page: it is a board with no text. The hub
 * is the page that is indexed.
 */

import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { LiveRoundGame } from '@/components/live-broadcast/LiveRoundGame';
import { CountryFlag } from '@/components/flags/CountryFlag';
import { GameViewerWorkspace, type ViewerGoTo, type ViewerPlayer } from '@/components/game-viewer/GameViewerWorkspace';
import {
  CLASSICAL_GAMES,
  MATCH_PATH,
  PLAYERS,
  PLAYER_ORDER,
  SCHEDULED_GAMES,
  formatPoints,
  gamePath,
  genevaTime,
  parseGameSlug,
  whiteIn,
  type PlayerKey,
} from '@/features/world-championship/match';
import { startOf, useMatchBroadcast } from '@/features/world-championship/useMatchBroadcast';
import { googleCalendarUrl, matchCalendarEvents } from '@/features/world-championship/matchCalendar';
import { logGA4Event } from '@/services/analytics';
import type { LiveGame } from '@/types/LiveBroadcast';

function isMatchGame(g: LiveGame): boolean {
  const names = `${g.white.name} ${g.black.name}`.toLowerCase();
  return names.includes(PLAYERS.gukesh.pgnMatch) && names.includes(PLAYERS.sindarov.pgnMatch);
}

/** The match player behind a PGN name, for the portrait and the full name. */
function playerByPgnName(name: string): PlayerKey | undefined {
  const lower = name.toLowerCase();
  return PLAYER_ORDER.find((k) => lower.includes(PLAYERS[k].pgnMatch));
}

function flagOf(key: PlayerKey) {
  return <CountryFlag code={PLAYERS[key].countryCode} className="h-full w-full" />;
}

function cardPlayer(key: PlayerKey, label?: string): ViewerPlayer {
  const p = PLAYERS[key];
  return { name: p.shortName, title: 'GM', detail: p.role, portrait: p.portrait, flag: flagOf(key), label };
}

export default function WorldChampionship2026Game() {
  const { slug } = useParams<{ slug: string }>();
  const n = parseGameSlug(slug);
  const broadcast = useMatchBroadcast();

  const title = n
    ? `Game ${n}: Gukesh vs Sindarov, World Championship 2026 | Chess Playbook`
    : 'World Championship 2026 | Chess Playbook';
  const head = (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={n ? `Follow game ${n} of the 2026 World Championship match between Gukesh and Sindarov, move by move.` : 'The 2026 World Championship match between Gukesh and Sindarov.'} />
      <meta name="robots" content="noindex, follow" />
    </Helmet>
  );

  if (!n) {
    return (
      <>
        {head}
        <div className="flex h-full items-center justify-center p-4">
          <div className="space-y-4 text-center">
            <h1 className="text-xl text-foreground">There is no such game in the match.</h1>
            <Button asChild variant="outline"><Link to={MATCH_PATH}>Back to the match</Link></Button>
          </div>
        </div>
      </>
    );
  }

  const scheduled = SCHEDULED_GAMES[n - 1];
  const round = broadcast.rounds.get(n);
  const timeKnown = round?.startsAt != null || scheduled.timeConfirmed;
  const when = timeKnown
    ? `${scheduled.label}, ${genevaTime(startOf(n, broadcast.rounds))} in Geneva`
    : scheduled.label;
  const winner = broadcast.score?.winner;
  const notNeeded = winner != null && n > winner.afterGame;

  const score = broadcast.score;
  const scoreLine = `Gukesh ${formatPoints(score?.points.gukesh ?? 0)} - ${formatPoints(score?.points.sindarov ?? 0)} Sindarov`;

  const goTo: ViewerGoTo[] = [
    ...(n > 1 ? [{ label: `Game ${n - 1}`, to: gamePath(n - 1), direction: 'back' as const }] : []),
    ...(n < CLASSICAL_GAMES ? [{ label: `Game ${n + 1}`, to: gamePath(n + 1), direction: 'forward' as const }] : []),
    { label: 'The match', to: MATCH_PATH, direction: 'back' },
  ];

  /* Before the game, the Go to card also offers the game for the visitor's calendar:
     timed when the start is confirmed, all day otherwise (matchCalendar.ts). */
  const calendarEvent = notNeeded ? undefined : matchCalendarEvents(
    (g) => startOf(g, broadcast.rounds),
    (g) => broadcast.rounds.get(g)?.startsAt != null || SCHEDULED_GAMES[g - 1].timeConfirmed,
  ).find((e) => e.game === n);
  const beforeGoTo: ViewerGoTo[] = calendarEvent
    ? [...goTo, {
        label: 'Add to Google Calendar',
        direction: 'forward',
        onClick: () => {
          logGA4Event({ name: 'match_calendar_added', params: { method: 'google', game: n, surface: 'game' } });
          window.open(googleCalendarUrl(calendarEvent), '_blank', 'noopener,noreferrer');
        },
      }]
    : goTo;

  /* Before the game: the same Workspace, on the starting position. */
  const white = whiteIn(n, score?.games.values() ?? []);
  const [w, b] = white ? [white, white === 'gukesh' ? 'sindarov' as const : 'gukesh' as const] : PLAYER_ORDER;
  const pgn = `[Event "FIDE World Championship 2026"]\n[Round "${n}"]\n[White "${PLAYERS[w].name}"]\n[Black "${PLAYERS[b].name}"]\n[Result "*"]\n\n*`;
  const beforeGame = (
    <>
      <h1 className="sr-only">{`Game ${n}: ${PLAYERS[w].name} vs ${PLAYERS[b].name}`}</h1>
      <GameViewerWorkspace
        key={`before-${n}-${w}-${white ? 'drawn' : 'open'}`}
        pgn={pgn}
        info={{
          headline: `Game ${n}`,
          lines: notNeeded
            ? [`${PLAYERS[winner!.player].shortName} won after game ${winner!.afterGame}`]
            : [when, white ? scoreLine : 'Colours not drawn yet'],
          status: notNeeded ? 'Not needed' : 'Not started',
        }}
        players={{
          white: cardPlayer(w, white ? undefined : 'Player'),
          black: cardPlayer(b, white ? undefined : 'Player'),
        }}
        goTo={beforeGoTo}
        initialPly="start"
        analyticsSurface="live_game"
        boardLabel={`Chess board, game ${n}, not started`}
      />
    </>
  );

  if (!round || notNeeded) return <>{head}{beforeGame}</>;

  return (
    <>
      {head}
      <LiveRoundGame
        key={round.roundId}
        roundId={round.roundId}
        pick={(games) => games.find(isMatchGame)}
        goTo={goTo}
        waiting={beforeGame}
        loadingView={beforeGame}
        back={{ label: 'Back to the match', to: MATCH_PATH }}
        player={(name) => {
          const key = playerByPgnName(name);
          return key ? { name: PLAYERS[key].shortName, portrait: PLAYERS[key].portrait, flag: flagOf(key) } : undefined;
        }}
        info={(game) => ({
          headline: `Game ${n}`,
          lines: [scoreLine, [game.eco, game.opening !== 'Unknown Opening' ? game.opening : ''].filter(Boolean).join(' · ')],
        })}
      />
    </>
  );
}
