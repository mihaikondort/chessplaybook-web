import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, ChevronRight, Clock, MapPin, Users, Radio, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import SeoHead from '@/components/SeoHead';
import { MATCH_LAST_DAY, MATCH_PATH, SCHEDULED_GAMES, calendarState, genevaDate } from '@/features/world-championship/match';

interface EventStatus {
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
  statusText: string;
  countdown?: string;
}

/** The featured event is the 2026 World Championship match (features/world-championship/match.ts). */
function getMatchStatus(): EventStatus {
  const now = new Date();
  const { duringMatch, todaysGame, liveNow } = calendarState(now);
  const first = SCHEDULED_GAMES[0].startsAt;

  if (liveNow && todaysGame) {
    return { isLive: true, isUpcoming: false, isFinished: false, statusText: `Game ${todaysGame.game} in progress` };
  }
  if (genevaDate(now) > MATCH_LAST_DAY) {
    return { isLive: false, isUpcoming: false, isFinished: true, statusText: 'Match concluded' };
  }
  if (now < first) {
    const diff = first.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const countdown = days > 0 ? `Game 1 in ${days}d ${hours}h` : `Game 1 in ${hours}h`;
    return { isLive: false, isUpcoming: true, isFinished: false, statusText: 'Starting soon', countdown };
  }
  return {
    isLive: false, isUpcoming: false, isFinished: false,
    statusText: duringMatch && !todaysGame ? 'Rest day' : 'Next game soon',
  };
}

export default function LiveEventsHub() {
  const [status, setStatus] = useState<EventStatus>(getMatchStatus);

  useEffect(() => {
    setStatus(getMatchStatus());
    const interval = setInterval(() => setStatus(getMatchStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SeoHead routeKey="live-events">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": "FIDE World Championship Match 2026",
          "startDate": "2026-11-24T15:00:00+01:00",
          "endDate": "2026-12-12",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": { "@type": "Place", "name": "Fondation Martin Bodmer", "address": { "@type": "PostalAddress", "addressLocality": "Cologny", "addressRegion": "Geneva", "addressCountry": "CH" } },
          "organizer": { "@type": "Organization", "name": "FIDE", "url": "https://www.fide.com" },
          "competitor": [
            { "@type": "Person", "name": "Gukesh Dommaraju" },
            { "@type": "Person", "name": "Javokhir Sindarov" }
          ],
          "url": "https://www.chessplaybook.com/world-championship-2026",
          "sport": "Chess"
        })}</script>
      </SeoHead>

      <div className="bg-background flex flex-col">

        <main className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-5xl mx-auto">
            {/* Page Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Radio className="w-8 h-8 text-link" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-playfair font-bold text-foreground mb-3">
                Live Chess Events
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Watch major tournaments in the World Championship cycle.
                Follow the journey from qualifier to World Champion.
              </p>
            </div>

            {/* Featured Event: the 2026 World Championship match */}
            <Card className={`mb-8 overflow-hidden border-2 ${
              status.isLive ? 'border-live/50' :
              status.isUpcoming ? 'border-primary/50' :
              status.isFinished ? 'border-border' :
              'border-border'
            }`}>
              <CardContent className="p-0">
                <div className="relative">
                  {/* Background decoration */}
                  <div className="absolute inset-0 opacity-[0.03]">
                    <div className="grid grid-cols-8 h-full">
                      {Array.from({ length: 32 }).map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isDark = (row + col) % 2 === 1;
                        return <div key={i} className={isDark ? 'bg-foreground' : ''} />;
                      })}
                    </div>
                  </div>

                  <div className="relative p-6 sm:p-8">
                    {/* Status badge */}
                    <div className="mb-6">
                      {status.isLive ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-live/20 border border-live/30 text-live text-sm font-medium">
                          <div className="w-2.5 h-2.5 bg-live rounded-full animate-pulse" />
                          LIVE NOW
                        </div>
                      ) : status.isUpcoming ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-link text-sm font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {status.countdown}
                        </div>
                      ) : status.isFinished ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground text-sm font-medium">
                          <Trophy className="w-3.5 h-3.5" />
                          Completed
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-muted-foreground text-sm font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {status.statusText}
                        </div>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-playfair font-bold text-foreground mb-4">
                      World Championship 2026: Gukesh vs Sindarov
                    </h2>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-link" />
                        Geneva, Switzerland
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-link" />
                        24 November - 11 December 2026
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-link" />
                        14 games, first to 7&frac12;
                      </span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                      World Champion Gukesh Dommaraju defends his title against Javokhir Sindarov, who won the
                      Candidates in Cyprus without losing a game.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2 group" asChild>
                        <Link to={MATCH_PATH}>
                          {status.isLive ? (
                            <>
                              <Radio className="w-4 h-4" />
                              Watch the game live
                            </>
                          ) : status.isFinished ? (
                            <>
                              <Trophy className="w-4 h-4" />
                              See the match
                            </>
                          ) : (
                            <>
                              <Calendar className="w-4 h-4" />
                              Score and schedule
                            </>
                          )}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="gap-2" asChild>
                        <Link to="/news/world-championship-2026-geneva">
                          Schedule and rules
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finished: Candidates 2026 and World Cup 2025 */}
            <Card className="mb-8 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 font-playfair">
                  <Trophy className="w-5 h-5" />
                  Completed Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      FIDE Candidates Tournament 2026
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Paphos, Cyprus
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Mar 29 - Apr 16, 2026
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Javokhir Sindarov won with 10 out of 14 and earned the title match.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" asChild>
                    <Link to="/candidates-2026">
                      View Results
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      FIDE World Cup 2025
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Goa, India
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Oct 31 - Nov 27, 2025
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      206 players in knockout format. Top 3 earned Candidates Tournament spots.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 shrink-0" asChild>
                    <Link to="/world-cup-2025">
                      View Results
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* World Championship Cycle */}
            <Card className="mb-8 border-border">
              <CardHeader>
                <CardTitle className="text-link font-playfair">
                  About the World Championship Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  The journey to becoming World Chess Champion is one of the most demanding challenges in competitive sports.
                  The FIDE World Championship Cycle is a multi-stage system spanning nearly two years.
                </p>

                <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg mb-6">
                  <p className="text-foreground font-semibold mb-3">
                    The Three-Stage Path to Champion:
                  </p>
                  <ol className="list-decimal list-inside text-muted-foreground space-y-2 text-sm">
                    <li><strong className="text-foreground">Qualifying Tournaments</strong> - World Cup, Grand Swiss, FIDE Circuit, and rating qualification</li>
                    <li><strong className="text-foreground">Candidates Tournament</strong> - 8 qualifiers compete in double round-robin; winner becomes the Challenger</li>
                    <li><strong className="text-foreground">World Championship Match</strong> - Champion vs Challenger in best-of-14 classical games</li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="gap-2 flex-1" asChild>
                    <Link to="/world-championship-cycle">
                      Read Complete Guide
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="gap-2 flex-1" asChild>
                    <Link to="/champions">
                      Explore 18 World Champions
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attribution */}
            <p className="text-sm text-muted-foreground text-center">
              Live tournament broadcasts powered by{' '}
              <a
                href="https://lichess.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link hover:underline"
              >
                Lichess.org
              </a>
            </p>
          </div>
        </main>

      </div>
    </>
  );
}
