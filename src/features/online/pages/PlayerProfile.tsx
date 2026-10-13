import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import env from '@/config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatingInfo {
  rating: number;
  gamesPlayed: number;
  provisional: boolean;
}

interface GameSummary {
  id: string;
  white: { username: string; rating: number };
  black: { username: string; rating: number };
  result: string;
  endReason: string;
  timeControl: { initial: number; increment: number; category: string };
  rated: boolean;
  playedAt: string;
}

interface PuzzleStats {
  solved: number;
  failed: number;
  bestStreak: number;
  accuracy: number;
}

interface PlayerProfileData {
  username: string;
  memberSince: string;
  puzzleStats: PuzzleStats | null;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  };
  ratings: Record<string, RatingInfo>;
  recentGames: GameSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function formatTimeControl(tc: { initial: number; increment: number }): string {
  const min = tc.initial / 60;
  return min >= 1 ? `${min}+${tc.increment}` : `${tc.initial}s+${tc.increment}`;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : name.slice(0, 2);
  return <span className="text-2xl font-bold uppercase">{letters}</span>;
}

function isFederatedId(name: string): boolean {
  return /^(Google|Facebook|SignInWithApple)_/.test(name);
}

const TIME_CONTROL_ORDER = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'];

const REASON_LABELS: Record<string, string> = {
  checkmate: 'Checkmate',
  resignation: 'Resign',
  timeout: 'Time',
  stalemate: 'Stalemate',
  insufficient_material: 'Insufficient',
  fifty_move: '50-move',
  repetition: 'Repetition',
  draw_agreement: 'Agreement',
  abandonment: 'Abandon',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(false);
    fetch(`${env.apiBaseUrl}/api/players/profile/${encodeURIComponent(username)}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data: PlayerProfileData) => setProfile(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Helmet><title>Player Not Found - Chess Playbook</title></Helmet>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
          <h1 className="text-xl font-bold">Player not found</h1>
          <p className="text-muted-foreground text-sm">
            No player with username "{username}" exists.
          </p>
          <Link to="/leaderboard" className="text-link text-sm hover:underline">
            View leaderboard
          </Link>
        </div>
      </>
    );
  }

  const { stats, ratings } = profile;
  const sortedRatings = TIME_CONTROL_ORDER
    .filter(tc => ratings[tc] && ratings[tc].gamesPlayed > 0)
    .map(tc => ({ tc, ...ratings[tc] }));

  // Show puzzle section first if user has more puzzle activity than games
  const puzzleFirst = (profile.puzzleStats?.solved ?? 0) > stats.totalGames;

  return (
    <>
      <Helmet>
        <title>{profile.username} - Chess Playbook</title>
        <meta name="description" content={`${profile.username}'s chess profile on Chess Playbook. ${stats.totalGames} games played.`} />
      </Helmet>


      <div className="min-h-screen bg-background pt-6 pb-12">
        <div className="max-w-3xl mx-auto px-4 space-y-6">

          {/* Identity card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Initials name={profile.username} />
                </div>
                <div className="min-w-0">
                  <h1 className="font-playfair text-2xl font-bold truncate">{profile.username}</h1>
                  <p className="text-sm text-muted-foreground">
                    Member since {formatDate(profile.memberSince)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ratings */}
          {sortedRatings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {sortedRatings.map(r => (
                    <div key={r.tc} className="space-y-1">
                      <p className="text-2xl font-bold">
                        {r.rating}
                        {r.provisional && <span className="text-base text-muted-foreground">?</span>}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {r.tc} ({r.gamesPlayed} {r.tc === 'puzzle' ? 'solved' : 'games'})
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Puzzle Statistics — shown before games when user has more puzzle activity */}
          {puzzleFirst && profile.puzzleStats && profile.puzzleStats.solved + profile.puzzleStats.failed > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Puzzle Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Puzzles Solved" value={profile.puzzleStats.solved.toLocaleString()} />
                  <Stat label="Accuracy" value={`${profile.puzzleStats.accuracy}%`} />
                  <Stat label="Best Streak" value={profile.puzzleStats.bestStreak.toLocaleString()} />
                  <Stat label="Failed" value={profile.puzzleStats.failed.toLocaleString()} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game stats */}
          {stats.totalGames > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Game Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Stat label="Games Played" value={stats.totalGames.toLocaleString()} />
                    <Stat label="Win Rate" value={`${stats.winRate}%`} />
                    <Stat label="Wins" value={stats.wins.toLocaleString()} />
                    <Stat label="Draws / Losses" value={`${stats.draws} / ${stats.losses}`} />
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                    <div className="bg-win transition-all" style={{ width: `${(stats.wins / stats.totalGames) * 100}%` }} title={`${stats.wins} wins`} />
                    <div className="bg-muted-foreground transition-all" style={{ width: `${(stats.draws / stats.totalGames) * 100}%` }} title={`${stats.draws} draws`} />
                    <div className="bg-loss transition-all" style={{ width: `${(stats.losses / stats.totalGames) * 100}%` }} title={`${stats.losses} losses`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Puzzle Statistics — shown after games when user has more game activity */}
          {!puzzleFirst && profile.puzzleStats && profile.puzzleStats.solved + profile.puzzleStats.failed > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Puzzle Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat label="Puzzles Solved" value={profile.puzzleStats.solved.toLocaleString()} />
                  <Stat label="Accuracy" value={`${profile.puzzleStats.accuracy}%`} />
                  <Stat label="Best Streak" value={profile.puzzleStats.bestStreak.toLocaleString()} />
                  <Stat label="Failed" value={profile.puzzleStats.failed.toLocaleString()} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent games */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Games</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.recentGames.length > 0 ? (
                <div className="space-y-1.5">
                  {profile.recentGames.map(game => {
                    const isWhite = game.white.username === profile.username;
                    const opponent = isWhite ? game.black : game.white;
                    const won =
                      (isWhite && game.result === '1-0') ||
                      (!isWhite && game.result === '0-1');
                    const drew = game.result === '1/2-1/2';
                    const resultCls = won
                      ? 'text-win'
                      : drew
                        ? 'text-muted-foreground'
                        : 'text-loss';
                    const resultLabel = won ? 'W' : drew ? 'D' : 'L';

                    return (
                      <div key={game.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-border/50 last:border-0">
                        <span className={`font-bold w-5 text-center ${resultCls}`}>{resultLabel}</span>
                        <span className="text-muted-foreground">{isWhite ? '♔' : '♚'}</span>
                        {isFederatedId(opponent.username) ? (
                          <span className="text-muted-foreground truncate">Anonymous</span>
                        ) : (
                          <Link
                            to={`/player/${opponent.username}`}
                            className="hover:text-link transition-colors truncate"
                          >
                            {opponent.username}
                          </Link>
                        )}
                        <span className="text-xs text-muted-foreground">({opponent.rating})</span>
                        <span className="text-xs px-1 py-0.5 rounded bg-muted text-muted-foreground capitalize ml-auto">
                          {game.timeControl.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {REASON_LABELS[game.endReason] ?? game.endReason}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatShortDate(game.playedAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No games played yet.</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
