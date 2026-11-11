/**
 * The 2026 World Championship match hub: Gukesh vs Sindarov, Geneva.
 *
 * A Document page: the score, what is on today, and every game with its date and
 * result, each linking to its game page (the live board). Facts and schedule come
 * from `features/world-championship/match.ts`; the score and results from
 * Lichess's broadcast once `LICHESS_TOURNAMENT_ID` is set. Until then it shows the
 * schedule with the score at 0-0, which is true.
 *
 * Indexed and in the sitemap (the queries: "Gukesh Sindarov live", "world chess
 * championship 2026 score"). The game pages are not: they are a board with no text.
 */

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronRight, Radio } from 'lucide-react';
import SeoHead from '@/components/SeoHead';
import {
  CLASSICAL_GAMES,
  MATCH_DAYS,
  PLAYERS,
  PLAYER_ORDER,
  SCHEDULED_GAMES,
  calendarState,
  formatPoints,
  gamePath,
  genevaTime,
  type PlayerKey,
  type ScoredGame,
} from '@/features/world-championship/match';
import { startOf, useMatchBroadcast } from '@/features/world-championship/useMatchBroadcast';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: 'FIDE World Championship Match 2026',
  description: 'Gukesh Dommaraju defends the World Chess Championship against Javokhir Sindarov over fourteen classical games in Geneva.',
  startDate: '2026-11-24T15:00:00+01:00',
  endDate: '2026-12-12',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: 'Fondation Martin Bodmer',
    address: { '@type': 'PostalAddress', addressLocality: 'Cologny', addressRegion: 'Geneva', addressCountry: 'CH' },
  },
  organizer: { '@type': 'Organization', name: 'FIDE', url: 'https://www.fide.com' },
  competitor: [
    { '@type': 'Person', name: 'Gukesh Dommaraju' },
    { '@type': 'Person', name: 'Javokhir Sindarov' },
  ],
  sport: 'Chess',
  url: 'https://www.chessplaybook.com/world-championship-2026',
  image: 'https://www.chessplaybook.com/assets/news/title-matches-2026/geneva-jet-deau.webp',
};

/** Re-render each minute so "live now" and "next game" follow the clock. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function resultText(g: ScoredGame | undefined): string {
  if (!g) return '';
  if (g.result === 'playing') return 'Live';
  if (g.result === 'draw') return '½-½';
  return g.result === 'white' ? '1-0' : '0-1';
}

function colours(g: ScoredGame | undefined): string {
  if (!g) return '';
  return `${PLAYERS[g.white].shortName} - ${PLAYERS[g.black].shortName}`;
}

export default function WorldChampionship2026Hub() {
  const now = useNow();
  const broadcast = useMatchBroadcast();
  const score = broadcast.score;
  const points: Record<PlayerKey, number> = score?.points ?? { gukesh: 0, sindarov: 0 };
  const lastGame = score?.winner?.afterGame ?? CLASSICAL_GAMES;
  const start = (g: number) => startOf(g, broadcast.rounds);
  const cal = calendarState(now, start, lastGame);
  const liveGame = [...(score?.games.values() ?? [])].find((g) => g.result === 'playing')?.game
    ?? (cal.liveNow ? cal.todaysGame?.game : undefined);

  const timeKnown = (g: number) => broadcast.rounds.get(g)?.startsAt != null || SCHEDULED_GAMES[g - 1].timeConfirmed;

  let status: string;
  if (score?.winner) {
    const w = PLAYERS[score.winner.player];
    const l = PLAYERS[PLAYER_ORDER.find((k) => k !== w.key)!];
    status = `${w.name} wins the match ${formatPoints(points[w.key])}-${formatPoints(points[l.key])}.`;
  } else if (score?.tiebreak) {
    status = 'It is 7-7. The title is decided in rapid and blitz tiebreaks on Saturday 12 December.';
  } else if (liveGame) {
    status = `Game ${liveGame} is being played now.`;
  } else if (cal.nextGame) {
    const g = cal.nextGame;
    status = timeKnown(g.game)
      ? `Game ${g.game} starts ${g.label} at ${genevaTime(start(g.game))} in Geneva.`
      : `Game ${g.game} is on ${g.label}.`;
  } else {
    status = 'The classical games are over.';
  }

  return (
    <>
      <SeoHead routeKey="world-championship-2026">
        <script type="application/ld+json">{JSON.stringify(JSON_LD)}</script>
      </SeoHead>

      <div className="bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-3 text-center">
            FIDE World Championship 2026
          </p>
          <h1 className="text-4xl sm:text-5xl font-playfair font-bold text-foreground mb-3 text-center">
            Gukesh vs Sindarov
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Geneva, 24 November to 11 December. Fourteen games, and the first to 7&frac12; points wins.
          </p>

          {/* -- The score ---------------------------------------------------- */}
          <section aria-label="Match score" className="surface-card rounded-lg p-5 sm:p-7 mb-8">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              {PLAYER_ORDER.map((key, i) => (
                <div key={key} className={i === 0 ? 'text-right order-1' : 'text-left order-3'}>
                  <div className="text-lg sm:text-2xl font-semibold text-foreground">{PLAYERS[key].shortName}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {key === 'gukesh' ? 'Champion' : 'Challenger'}, {PLAYERS[key].country}
                  </div>
                </div>
              ))}
              <div className="order-2 text-3xl sm:text-5xl font-bold tabular-nums text-foreground whitespace-nowrap">
                {formatPoints(points.gukesh)} <span className="text-muted-foreground">-</span> {formatPoints(points.sindarov)}
              </div>
            </div>
            <p className="mt-5 text-center text-foreground">{status}</p>
            {liveGame && (
              <div className="mt-4 flex justify-center">
                <Link
                  to={gamePath(liveGame)}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Radio className="h-4 w-4" />
                  Watch game {liveGame} live
                </Link>
              </div>
            )}
          </section>

          {/* -- The games ---------------------------------------------------- */}
          <section className="surface-card rounded-lg p-5 sm:p-7 mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">The games</h2>
            <ol>
              {MATCH_DAYS.filter((d) => d.kind === 'game' || d.kind === 'tiebreak').map((d) => {
                if (d.kind === 'tiebreak') {
                  return (
                    <li key={d.date} className="flex items-baseline justify-between gap-4 py-3">
                      <span className="text-foreground">Tiebreaks, if 7-7</span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{d.label}</span>
                    </li>
                  );
                }
                const n = d.game!;
                const g = score?.games.get(n);
                const notNeeded = n > lastGame;
                const right = notNeeded ? 'Not needed' : resultText(g) || (timeKnown(n) ? `${d.label}, ${genevaTime(start(n))}` : d.label);
                return (
                  <li key={d.date} className="border-b border-border/60">
                    <Link
                      to={gamePath(n)}
                      className="flex items-baseline justify-between gap-4 py-3 hover:text-foreground group"
                    >
                      <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                        <span className="font-semibold text-foreground">Game {n}</span>
                        {g && <span className="text-sm text-muted-foreground">{colours(g)}</span>}
                      </span>
                      <span className="flex items-center gap-1 text-sm whitespace-nowrap">
                        <span className={g?.result === 'playing' ? 'text-live font-semibold' : 'text-muted-foreground'}>{right}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              Times are in Geneva (CET). Game 1 starts at 15:00. The other games show their time once it is published.
            </p>
          </section>

          {/* -- Read more ---------------------------------------------------- */}
          <section className="surface-card rounded-lg p-5 sm:p-7">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">About the match</h2>
            <ul className="space-y-2">
              <li><Link to="/news/world-championship-2026-geneva" className="text-link hover:underline">The schedule, the venue and the rules</Link></li>
              <li><Link to="/news/sindarov-gukesh-head-to-head" className="text-link hover:underline">Every game Gukesh and Sindarov have played</Link></li>
              <li><Link to="/news/candidates-2026-conclusion" className="text-link hover:underline">How Sindarov won the Candidates</Link></li>
              <li><Link to="/champions/gukesh/games" className="text-link hover:underline">Gukesh&rsquo;s games</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
