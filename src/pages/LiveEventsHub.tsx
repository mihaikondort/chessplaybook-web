import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, ChevronRight, Clock, MapPin, Users, Radio, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import SeoHead from '@/components/SeoHead';

interface EventStatus {
  isLive: boolean;
  isUpcoming: boolean;
  isFinished: boolean;
  statusText: string;
  countdown?: string;
}

function getCandidatesStatus(): EventStatus {
  const now = new Date();
  const start = new Date('2026-03-29T13:30:00Z');
  const end = new Date('2026-04-16T20:00:00Z');

  if (now < start) {
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const countdown = days > 0 ? `Starts in ${days}d ${hours}h` : `Starts in ${hours}h`;
    return { isLive: false, isUpcoming: true, isFinished: false, statusText: 'Starting Soon', countdown };
  }

  if (now > end) {
    return { isLive: false, isUpcoming: false, isFinished: true, statusText: 'Tournament Concluded' };
  }

  // During tournament - check Cyprus time for playing hours (15:30-22:00 local)
  const cyprusTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Nicosia' }));
  const hour = cyprusTime.getHours();
  const minute = cyprusTime.getMinutes();
  const timeValue = hour + minute / 60;
  const isPlaying = timeValue >= 15.5 && timeValue < 22;

  // Rest days: April 2, 6, 10, 13
  const dayOfMonth = cyprusTime.getDate();
  const month = cyprusTime.getMonth(); // 3 = April
  const isRestDay = month === 3 && [2, 6, 10, 13].includes(dayOfMonth);

  if (isRestDay) {
    return { isLive: false, isUpcoming: false, isFinished: false, statusText: 'Rest Day' };
  }

  if (isPlaying) {
    return { isLive: true, isUpcoming: false, isFinished: false, statusText: 'Games in Progress' };
  }

  return { isLive: false, isUpcoming: false, isFinished: false, statusText: 'Next Round Soon' };
}

export default function LiveEventsHub() {
  const [status, setStatus] = useState<EventStatus>(getCandidatesStatus);

  useEffect(() => {
    setStatus(getCandidatesStatus());
    const interval = setInterval(() => setStatus(getCandidatesStatus()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SeoHead routeKey="live-events">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": "FIDE Candidates Tournament 2026",
          "startDate": "2026-03-29",
          "endDate": "2026-04-16",
          "location": { "@type": "Place", "name": "Cap St George's Hotel & Resort", "address": { "@type": "PostalAddress", "addressLocality": "Paphos", "addressCountry": "CY" } },
          "organizer": { "@type": "Organization", "name": "FIDE", "url": "https://www.fide.com" },
          "performer": [
            { "@type": "Person", "name": "Fabiano Caruana" },
            { "@type": "Person", "name": "Hikaru Nakamura" },
            { "@type": "Person", "name": "Praggnanandhaa Rameshbabu" },
            { "@type": "Person", "name": "Wei Yi" },
            { "@type": "Person", "name": "Anish Giri" },
            { "@type": "Person", "name": "Javokhir Sindarov" },
            { "@type": "Person", "name": "Matthias Bluebaum" },
            { "@type": "Person", "name": "Andrey Esipenko" }
          ],
          "url": "https://www.chessplaybook.com/candidates-2026",
          "sport": "Chess",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-03-01",
            "url": "https://www.chessplaybook.com/candidates-2026"
          }
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

            {/* Featured Event: Candidates 2026 */}
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
                      FIDE Candidates Tournament 2026
                    </h2>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-link" />
                        Paphos, Cyprus
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-link" />
                        March 29 - April 16, 2026
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-link" />
                        8 Players, 14 Rounds
                      </span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
                      The world's top grandmasters battle for the right to challenge World Champion Gukesh.
                      Caruana, Nakamura, Praggnanandhaa, Wei Yi, Giri, Sindarov, Bluebaum, and Esipenko compete
                      in a double round-robin format.
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2 group" asChild>
                        <Link to="/candidates-2026">
                          {status.isLive ? (
                            <>
                              <Radio className="w-4 h-4" />
                              Watch Live Games
                            </>
                          ) : status.isUpcoming ? (
                            <>
                              <Calendar className="w-4 h-4" />
                              View Schedule
                            </>
                          ) : (
                            <>
                              <Trophy className="w-4 h-4" />
                              View Tournament
                            </>
                          )}
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                      <Button variant="outline" className="gap-2" asChild>
                        <Link to="/news/candidates-2026">
                          Tournament Preview
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming: World Championship */}
            <Card className="mb-8 border-border">
              <CardHeader>
                <CardTitle className="text-link flex items-center gap-2 font-playfair">
                  <Calendar className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-l-2 border-primary/30 pl-4 py-2">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    World Chess Championship 2026
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-link" />
                      TBD
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-link" />
                      Nov-Dec 2026
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    World Champion Gukesh vs Candidates Winner for the ultimate title.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Finished: World Cup 2025 */}
            <Card className="mb-8 border-border/50">
              <CardHeader>
                <CardTitle className="text-muted-foreground flex items-center gap-2 font-playfair">
                  <Trophy className="w-5 h-5" />
                  Completed Events
                </CardTitle>
              </CardHeader>
              <CardContent>
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
