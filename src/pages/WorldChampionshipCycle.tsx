import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Target, Crown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoHead from '@/components/SeoHead';

const WorldChampionshipCycle = () => {
  return (
    <>
      <SeoHead routeKey="world-championship-cycle">
        {/* Open Graph */}

        {/* Twitter */}
      </SeoHead>

      <div className="bg-background flex flex-col">
        <div className="flex-1">
          <div className="container max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <Trophy className="w-16 h-16 text-link mx-auto mb-4" />
              <h1 className="font-playfair text-4xl md:text-5xl font-bold mb-4">
                World Championship Cycle
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The complete journey from qualifying tournaments to the ultimate prize in chess—
                the World Championship title. Discover how the modern system determines who becomes
                the next World Chess Champion.
              </p>
            </div>

            {/* Historical Background */}
            <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-link" />
                  The World Chess Championship: A Legacy Since 1886
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The World Chess Championship is the most prestigious title in chess, with a storied history
                  spanning nearly 140 years. The official championship began in <strong>1886</strong> when
                  Wilhelm Steinitz defeated Johannes Zukertort in a match recognized as the first official
                  World Championship match. Since then, only <strong>18 players</strong> have earned the right
                  to call themselves World Chess Champion.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  <div className="bg-background/50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-link mb-2">Notable Records</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><strong>Longest reign:</strong> Emanuel Lasker (27 years, 1894-1921)</li>
                      <li><strong>Youngest champion:</strong> Gukesh Dommaraju (18 years old, 2024)</li>
                      <li><strong>Highest peak rating:</strong> Magnus Carlsen (2882)</li>
                    </ul>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-link mb-2">Championship Evolution</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><strong>1886-1946:</strong> Challenge system (champion chose challenger)</li>
                      <li><strong>1948:</strong> FIDE takes control; tournament format introduced</li>
                      <li><strong>1950-present:</strong> Candidates system to determine challenger</li>
                    </ul>
                  </div>
                </div>

                <p className="text-muted-foreground">
                  The championship has evolved from informal challenge matches to today's rigorous qualification
                  system. What remains constant is the title's prestige—becoming World Champion means joining
                  an exclusive club of chess immortals whose games are studied by generations of players.
                </p>

                <Link to="/champions/list">
                  <Button variant="outline" className="border-primary text-link hover:bg-primary hover:text-primary-foreground">
                    View All 18 World Champions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Overview */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-link" />
                  The Modern Path to Champion
                </CardTitle>
                <CardDescription>
                  FIDE World Championship Cycle 2025-2026
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Today's World Championship cycle is a multi-stage competition system designed by
                  FIDE (Fédération Internationale des Échecs) to determine the strongest chess player
                  in the world. The journey spans nearly two years and involves hundreds of players from
                  around the globe, ultimately culminating in a head-to-head match between the reigning
                  World Champion and the Challenger.
                </p>
                <p className="text-muted-foreground">
                  Recent champions like <strong>Gukesh Dommaraju</strong> (2024), <strong>Ding Liren</strong> (2023),
                  and <strong>Magnus Carlsen</strong> (2013-2023) all navigated this rigorous pathway to claim
                  chess's highest honor.
                </p>
              </CardContent>
            </Card>

            {/* Stage 1: Qualifying Tournaments */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-link" />
                  Stage 1: Qualifying Tournaments
                </CardTitle>
                <CardDescription>
                  Multiple pathways to the Candidates Tournament
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  The first stage features multiple qualifying tournaments running throughout the two-year
                  cycle. Eight players earn the right to compete in the Candidates Tournament through
                  various pathways:
                </p>

                {/* World Cup */}
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-xl font-semibold mb-2">FIDE World Cup (3 spots)</h3>
                  <p className="text-muted-foreground mb-2">
                    <strong>Format:</strong> 206-player single-elimination knockout tournament
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>2025 Edition:</strong> October 31 - November 27, Goa, India
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>Qualification:</strong> Top 3 finishers (1st, 2nd, 3rd place)
                  </p>
                  <p className="text-muted-foreground mb-3">
                    The World Cup is the most dramatic qualifying event. Players face elimination after
                    every match in a knockout format featuring 2-game classical matches, with rapid tiebreaks
                    if needed. A third-place playoff determines the final qualifying spot.
                  </p>
                  <Link to="/world-cup-2025">
                    <Button variant="outline" size="sm">
                      View 2025 World Cup
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                {/* Grand Swiss */}
                <div className="border-l-4 border-cycle-swiss pl-4">
                  <h3 className="text-xl font-semibold mb-2">FIDE Grand Swiss (2 spots)</h3>
                  <p className="text-muted-foreground mb-2">
                    <strong>Format:</strong> 114-player Swiss system, 11 rounds
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>2025 Edition:</strong> September 3-15, Samarkand, Uzbekistan
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>Qualification:</strong> Top 2 finishers
                  </p>
                  <p className="text-muted-foreground">
                    The Grand Swiss uses a Swiss system where players are paired based on performance.
                    Unlike knockout format, a single loss doesn't eliminate you, but consistent excellence
                    across 11 rounds is required to finish in the top 2.
                  </p>
                </div>

                {/* FIDE Circuit */}
                <div className="border-l-4 border-cycle-circuit pl-4">
                  <h3 className="text-xl font-semibold mb-2">FIDE Circuit 2024 & 2025 (2 spots)</h3>
                  <p className="text-muted-foreground mb-2">
                    <strong>Format:</strong> Cumulative scoring across multiple tournaments
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>Scoring Period:</strong> January 2024 - December 2025
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>Qualification:</strong> Highest cumulative scores (one spot per year)
                  </p>
                  <p className="text-muted-foreground">
                    Players earn points from their best performances across FIDE-rated tournaments worldwide.
                    The scoring system rewards both tournament strength and consistent performance. Points are
                    calculated based on placement and a tournament strength multiplier. The 2024 Circuit winner
                    was <strong>Fabiano Caruana</strong>.
                  </p>
                </div>

                {/* Rating Qualifier */}
                <div className="border-l-4 border-cycle-rating pl-4">
                  <h3 className="text-xl font-semibold mb-2">Highest-Rated Player (1 spot)</h3>
                  <p className="text-muted-foreground mb-2">
                    <strong>Criteria:</strong> Six-month average rating (August 2025 - January 2026)
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>Requirements:</strong> Minimum 40 standard-rated games during the period
                  </p>
                  <p className="text-muted-foreground">
                    The highest-rated player who hasn't already qualified earns a spot. The six-month average
                    prevents "rating manipulation" where players could rest on high ratings or chase last-minute
                    tournaments. This ensures the spot goes to sustained excellence.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stage 2: Candidates Tournament */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-link" />
                  Stage 2: Candidates Tournament
                </CardTitle>
                <CardDescription>
                  The strongest and most intense tournament in chess
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2">
                    <strong>Format:</strong> Double round-robin (each player faces all others twice)
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>2026 Edition:</strong> April 3-28, Toronto, Canada
                  </p>
                  <p className="text-muted-foreground mb-4">
                    <strong>Prize:</strong> Winner becomes the official Challenger for the World Championship
                  </p>
                </div>

                <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-link mb-2">Why the Candidates is Unique</h3>
                  <p className="text-muted-foreground mb-3">
                    The Candidates Tournament stands alone as chess's most intense competition. While other
                    elite tournaments may feature higher-rated fields, no event matches the Candidates' unique
                    combination of factors:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-link mt-0.5">•</span>
                      <span><strong>Peak Form:</strong> Every participant is at their absolute best—these are the
                      players who proved themselves in form by qualifying through grueling tournaments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-link mt-0.5">•</span>
                      <span><strong>Universal Ambition:</strong> All eight players are playing to win. Unlike invitational
                      tournaments where some may aim for respectable results, every Candidates participant has the
                      skill, preparation, and determination to win it all</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-link mt-0.5">•</span>
                      <span><strong>Ultimate Stakes:</strong> The prize isn't money—it's the right to challenge for
                      the World Championship, a once-in-a-lifetime opportunity that drives players to their absolute limits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-link mt-0.5">•</span>
                      <span><strong>Equal Capability:</strong> Every single player is genuinely capable of winning.
                      There are no "hopefuls" or "outsiders"—just eight world-class players at their peak</span>
                    </li>
                  </ul>
                </div>

                <p className="text-muted-foreground">
                  The eight qualifiers battle over 14 rounds of classical chess, facing every opponent twice
                  (once with White, once with Black). The tournament typically spans three weeks with rest days,
                  during which players analyze their games and prepare for upcoming opponents.
                </p>

                <p className="text-muted-foreground">
                  The player with the highest score at the end becomes the Challenger. If tied, tiebreak
                  rules apply (head-to-head results, then total wins, then rapid/blitz playoffs if needed).
                  Recent Candidates tournaments have averaged ratings above 2770, with every participant
                  ranked in the world's top 15.
                </p>

                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Historical Moments:</strong> The Candidates Tournament, first held in 1950,
                    has produced chess's most legendary performances. Bobby Fischer's undefeated 1971 run,
                    Garry Kasparov's emergence in 1984, and recent nail-biting finishes decided in the final
                    rounds or tiebreaks showcase the tournament's unmatched intensity. Every game matters—a
                    single mistake can end World Championship dreams.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Stage 3: World Championship Match */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-link" />
                  Stage 3: World Championship Match
                </CardTitle>
                <CardDescription>
                  Champion vs Challenger—The ultimate test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground mb-2">
                    <strong>Format:</strong> Best of 14 classical games (first to 7.5 points wins)
                  </p>
                  <p className="text-muted-foreground mb-2">
                    <strong>2026 Match:</strong> November-December 2026 (location TBD)
                  </p>
                  <p className="text-muted-foreground mb-4">
                    <strong>Title:</strong> Winner is crowned FIDE World Chess Champion
                  </p>
                </div>

                <p className="text-muted-foreground">
                  The World Championship Match is chess's pinnacle event. The reigning World Champion
                  defends their title against the Candidates winner in a match of up to 14 classical games.
                  The first player to reach 7.5 points wins the title and joins the ranks of chess immortals.
                </p>

                <p className="text-muted-foreground">
                  If the match is tied 7-7 after 14 games, rapid tiebreak games determine the champion.
                  This format has produced unforgettable moments, from dramatic comebacks to last-game
                  victories that changed chess history.
                </p>

                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>The 18 World Champions:</strong>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    From Wilhelm Steinitz (1886) to Gukesh Dommaraju (2024), only 18 players in history
                    have held the title of World Chess Champion. Each champion's games are preserved
                    and studied by generations of players seeking to understand the highest level of chess.
                  </p>
                </div>

                <Link to="/champions">
                  <Button className="w-full sm:w-auto">
                    Explore All 18 World Champions
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Key Changes in Modern Cycle */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Recent Changes to the Cycle</CardTitle>
                <CardDescription>
                  2025-2026 cycle introduces important reforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Automatic Qualifier for Runner-Up</h3>
                  <p className="text-muted-foreground">
                    Previously, the World Championship Match runner-up automatically qualified for the next
                    Candidates Tournament. This rule has been eliminated—now even the runner-up must earn
                    their spot through qualifying tournaments.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Six-Month Rating Average</h3>
                  <p className="text-muted-foreground">
                    The rating-based qualification now uses a six-month average instead of a single date.
                    This prevents players from "rating manipulation" strategies and rewards sustained excellence.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Expanded FIDE Circuit</h3>
                  <p className="text-muted-foreground">
                    The Circuit scoring system now considers up to seven events (previously five), giving
                    players more opportunities to accumulate qualifying points throughout the year.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Live Events */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle>Follow the 2025-2026 Cycle Live</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The current cycle is underway! Follow live coverage of the FIDE World Cup 2025 in Goa, India,
                  where 206 players are battling for three precious Candidates Tournament spots.
                </p>
                <Link to="/live-events">
                  <Button>
                    Watch Live Events
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
};

export default WorldChampionshipCycle;
