import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../AuthContext';
import { getAuthHeader } from '../utils/getAuthToken';
import { userPreferencesService, type ServerPreferences } from '@/services/UserPreferencesService';
import env from '@/config/env';
import { DeleteAccountCard } from '../components/DeleteAccountCard';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

interface RatingInfo {
  rating: number;
  gamesPlayed: number;
  provisional: boolean;
}

interface PublicProfileData {
  stats: PlayerStats;
  ratings: Record<string, RatingInfo>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function accuracy(solved: number, failed: number): string {
  const total = solved + failed;
  if (total === 0) return '--';
  return `${Math.round((solved / total) * 100)}%`;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : name.slice(0, 2);
  return <span className="text-2xl font-bold uppercase">{letters}</span>;
}

const TIME_CONTROL_ORDER = ['bullet', 'blitz', 'rapid', 'classical'];

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [prefs, setPrefs] = useState<ServerPreferences | null>(null);
  const [publicData, setPublicData] = useState<PublicProfileData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeader();
        const profileRes = await fetch(`${env.apiBaseUrl}/api/user/me`, { headers });
        if (!profileRes.ok) throw new Error('Failed to load profile');
        const profileData: UserProfile = await profileRes.json();
        setProfile(profileData);

        // Fetch public profile data (stats + ratings) using the username
        try {
          const publicRes = await fetch(
            `${env.apiBaseUrl}/api/players/profile/${encodeURIComponent(profileData.username)}`,
          );
          if (publicRes.ok) {
            setPublicData(await publicRes.json());
          }
        } catch { /* non-critical */ }
      } catch {
        setProfileError(true);
      }
    })();

    userPreferencesService.loadFromServer().then(p => setPrefs(p));
  }, []);

  const puzzleStats = prefs?.puzzleSolved !== undefined && prefs.puzzleSolved > 0
    ? prefs
    : null;

  const displayName = user?.username || user?.email || 'Chess Player';
  const stats = publicData?.stats;
  const ratings = publicData?.ratings;
  const sortedRatings = ratings
    ? TIME_CONTROL_ORDER.filter(tc => ratings[tc]).map(tc => ({ tc, ...ratings[tc] }))
    : [];

  return (
    <>
      <Helmet>
        <title>My Profile - Chess Playbook</title>
        <meta name="description" content="View your Chess Playbook profile, puzzle statistics, and game history." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-6">

          {/* Identity card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Initials name={displayName} />
                </div>
                <div className="min-w-0">
                  <h1 className="font-playfair text-2xl font-bold truncate">{displayName}</h1>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                  {profile && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Member since {formatDate(profile.createdAt)}
                    </p>
                  )}
                  {profileError && (
                    <p className="text-xs text-muted-foreground mt-0.5">Member since --</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/*
            Puzzle training, and the way through to the record.

            The profile answers "what have I done here", and until now it
            answered it for games only — a player's puzzle solving, which for
            most of this site's traffic is the larger half, had no mention.
          */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Puzzle Training</CardTitle>
                <Link to="/puzzles/progress" className="text-xs text-link hover:underline">
                  View your training record
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Where you stand in tactics, middlegame and endgame — and what you
                have not trained yet.
              </p>
            </CardContent>
          </Card>

          {/* Game stats */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Game Statistics</CardTitle>
                {stats && stats.totalGames > 0 && (
                  <Link
                    to="/game-history"
                    className="text-xs text-link hover:underline"
                  >
                    View all games
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {stats && stats.totalGames > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Stat label="Games Played" value={stats.totalGames.toLocaleString()} />
                    <Stat label="Win Rate" value={`${stats.winRate}%`} />
                    <Stat label="Wins" value={stats.wins.toLocaleString()} />
                    <Stat label="Draws / Losses" value={`${stats.draws} / ${stats.losses}`} />
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                    <div
                      className="bg-win transition-all"
                      style={{ width: `${(stats.wins / stats.totalGames) * 100}%` }}
                    />
                    <div
                      className="bg-muted-foreground transition-all"
                      style={{ width: `${(stats.draws / stats.totalGames) * 100}%` }}
                    />
                    <div
                      className="bg-loss transition-all"
                      style={{ width: `${(stats.losses / stats.totalGames) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No games played yet.{' '}
                  <Link to="/play-online" className="text-link hover:underline">Play a game</Link> to see your stats.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ratings */}
          {sortedRatings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {sortedRatings.map(r => (
                    <div key={r.tc} className="space-y-1">
                      <p className="text-2xl font-bold">
                        {r.rating}
                        {r.provisional && <span className="text-base text-muted-foreground">?</span>}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {r.tc} ({r.gamesPlayed} games)
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Puzzle stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Puzzle Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {puzzleStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Stat
                    label="Puzzle Rating"
                    value={(puzzleStats.puzzleRating ?? 1200).toLocaleString()}
                  />
                  <Stat
                    label="Puzzles Solved"
                    value={(puzzleStats.puzzleSolved ?? 0).toLocaleString()}
                  />
                  <Stat
                    label="Accuracy"
                    value={accuracy(puzzleStats.puzzleSolved ?? 0, puzzleStats.puzzleFailed ?? 0)}
                  />
                  <Stat
                    label="Best Streak"
                    value={(puzzleStats.puzzleBestStreak ?? 0).toString()}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No puzzle activity yet.{' '}
                  <Link to="/puzzles" className="text-link hover:underline">Solve some puzzles</Link> to track your progress.
                </p>
              )}
            </CardContent>
          </Card>

          {/*
            The account-deletion control, last on the page and visually set
            apart. The privacy policy promises this right; until 2026-08-04 it
            existed only as an email to a person.
          */}
          {profile?.username && <DeleteAccountCard username={profile.username} />}

        </main>
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
