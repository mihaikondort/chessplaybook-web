import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { GuestBadge } from '@/components/GuestBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthContext';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';
import { getAnonymousId } from '@/hooks/useAnonymousId';
import env from '@/config/env';
import { ChevronLeft, ChevronRight, Download, Copy, Check, Filter } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GameSummary {
  id: string;
  white: { userId: string; username: string; rating: number };
  black: { userId: string; username: string; rating: number };
  result: string;
  endReason: string;
  timeControl: { initial: number; increment: number; category: string };
  rated: boolean;
  playedAt: string;
  durationMs: number | null;
  movesUci: string;
  pgn?: string;
}

interface GamesResponse {
  games: GameSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTimeControl(tc: { initial: number; increment: number }): string {
  const min = tc.initial / 60;
  return min >= 1 ? `${min}+${tc.increment}` : `${tc.initial}s+${tc.increment}`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function moveCount(uci: string): number {
  if (!uci) return 0;
  return Math.ceil(uci.trim().split(/\s+/).length / 2);
}

function isFederatedId(name: string): boolean {
  return /^(Google|Facebook|SignInWithApple)_/.test(name);
}

function displayUsername(name: string): string {
  if (isFederatedId(name)) return 'Anonymous';
  return name;
}

type ResultForUser = 'win' | 'loss' | 'draw';

function getResultForUser(game: GameSummary, userId: string): ResultForUser {
  if (game.result === '1/2-1/2') return 'draw';
  const isWhite = game.white.userId === userId;
  const whiteWon = game.result === '1-0';
  return (isWhite === whiteWon) ? 'win' : 'loss';
}

function resultBadge(result: ResultForUser) {
  const cls = {
    win: 'bg-win/15 text-win',
    loss: 'bg-loss/15 text-loss',
    draw: 'bg-muted/50 text-muted-foreground',
  }[result];
  const label = { win: 'W', loss: 'L', draw: 'D' }[result];
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}

const REASON_LABELS: Record<string, string> = {
  checkmate: 'Checkmate',
  resignation: 'Resignation',
  timeout: 'Time',
  stalemate: 'Stalemate',
  insufficient_material: 'Insufficient',
  fifty_move: '50-move',
  repetition: 'Repetition',
  draw_agreement: 'Agreement',
  abandonment: 'Abandoned',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GameHistory() {
  const { user } = useAuth();
  const userId = user?.userId ?? `anon:${getAnonymousId()}`;

  const [games, setGames] = useState<GameSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeControl, setTimeControl] = useState('');
  const [result, setResult] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // PGN copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGames = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const headers = await getRequestHeaders();
      const params = new URLSearchParams({
        userId,
        page: String(pageNum),
        limit: '20',
      });
      if (timeControl) params.set('timeControl', timeControl);
      if (result) params.set('result', result);

      const res = await fetch(`${env.apiBaseUrl}/api/online-games?${params}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: GamesResponse = await res.json();
      setGames(data.games);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId, timeControl, result]);

  useEffect(() => { fetchGames(1); }, [fetchGames]);

  const handlePgnDownload = async (gameId: string) => {
    try {
      const res = await fetch(`${env.apiBaseUrl}/api/online-games/${gameId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.pgn) return;
      const blob = new Blob([data.pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-${gameId.slice(0, 8)}.pgn`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handlePgnCopy = async (gameId: string) => {
    try {
      const res = await fetch(`${env.apiBaseUrl}/api/online-games/${gameId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.pgn) return;
      await navigator.clipboard.writeText(data.pgn);
      setCopiedId(gameId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const handleBatchExport = async () => {
    if (!userId) return;
    try {
      const headers = await getRequestHeaders();
      // Fetch all games (up to 1000)
      const params = new URLSearchParams({ userId, page: '1', limit: '50' });
      if (timeControl) params.set('timeControl', timeControl);
      if (result) params.set('result', result);

      let allPgns: string[] = [];
      let currentPage = 1;
      let totalPages = 1;

      while (currentPage <= totalPages && currentPage <= 20) {
        params.set('page', String(currentPage));
        const res = await fetch(`${env.apiBaseUrl}/api/online-games?${params}`, { headers });
        if (!res.ok) break;
        const data: GamesResponse = await res.json();
        totalPages = data.pages;

        // Fetch PGN for each game
        const pgns = await Promise.all(
          data.games.map(async (g) => {
            const r = await fetch(`${env.apiBaseUrl}/api/online-games/${g.id}`);
            if (!r.ok) return null;
            const d = await r.json();
            return d.pgn as string | null;
          }),
        );
        allPgns = allPgns.concat(pgns.filter((p): p is string => !!p));
        currentPage++;
      }

      if (allPgns.length === 0) return;
      const blob = new Blob([allPgns.join('\n\n')], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-games.pgn';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <>
      <Helmet>
        <title>Game History - Chess Playbook</title>
        <meta name="description" content="View your past online chess games, filter by result and time control, and download PGN." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>


      <div className="min-h-screen bg-background pt-6 pb-12">
        <div className="max-w-4xl mx-auto px-4">

          <div className="mb-4">
            <GuestBadge context="game-history" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="font-playfair text-2xl font-bold">Game History</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(f => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  showFilters || timeControl || result
                    ? 'border-primary bg-primary/10 text-link'
                    : 'border-border hover:bg-accent/50 text-muted-foreground'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
                {(timeControl || result) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
              {total > 0 && (
                <button
                  onClick={handleBatchExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent/50 text-sm text-muted-foreground transition-all"
                  title="Download all games as PGN"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export All
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <Card className="mb-4">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Time Control</label>
                    <select
                      value={timeControl}
                      onChange={e => { setTimeControl(e.target.value); setPage(1); }}
                      className="block w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="">All</option>
                      <option value="bullet">Bullet</option>
                      <option value="blitz">Blitz</option>
                      <option value="rapid">Rapid</option>
                      <option value="classical">Classical</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Result</label>
                    <select
                      value={result}
                      onChange={e => { setResult(e.target.value); setPage(1); }}
                      className="block w-32 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="">All</option>
                      <option value="win">Wins</option>
                      <option value="loss">Losses</option>
                      <option value="draw">Draws</option>
                    </select>
                  </div>
                  {(timeControl || result) && (
                    <div className="flex items-end">
                      <button
                        onClick={() => { setTimeControl(''); setResult(''); }}
                        className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-muted-foreground mb-4">
              {total === 0 ? 'No games found.' : `${total} game${total !== 1 ? 's' : ''}`}
              {(timeControl || result) && ' (filtered)'}
            </p>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Game list */}
          {!loading && games.length > 0 && (
            <div className="space-y-2">
              {games.map(game => {
                const userResult = getResultForUser(game, userId);
                const isWhite = game.white.userId === userId;
                const opponent = isWhite ? game.black : game.white;
                const playerRating = isWhite ? game.white.rating : game.black.rating;

                return (
                  <Card key={game.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {/* Result badge */}
                        {resultBadge(userResult)}

                        {/* Game info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              vs{' '}
                              {isFederatedId(opponent.username) ? (
                                <span className="text-muted-foreground">Anonymous</span>
                              ) : (
                                <Link
                                  to={`/player/${opponent.username}`}
                                  className="hover:text-link transition-colors"
                                >
                                  {opponent.username}
                                </Link>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({opponent.rating})
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                              {game.timeControl.category}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeControl(game.timeControl)}
                            </span>
                            {game.rated && (
                              <span className="text-xs text-muted-foreground">Rated</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{formatDate(game.playedAt)}</span>
                            <span>{formatTime(game.playedAt)}</span>
                            <span>{REASON_LABELS[game.endReason] ?? game.endReason}</span>
                            <span>{moveCount(game.movesUci)} moves</span>
                            <span>{formatDuration(game.durationMs)}</span>
                            <span className="hidden sm:inline">
                              Playing as {isWhite ? 'White' : 'Black'} ({playerRating})
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handlePgnCopy(game.id)}
                            title="Copy PGN"
                            className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedId === game.id
                              ? <Check className="h-3.5 w-3.5 text-success" />
                              : <Copy className="h-3.5 w-3.5" />
                            }
                          </button>
                          <button
                            onClick={() => handlePgnDownload(game.id)}
                            title="Download PGN"
                            className="p-1.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && games.length === 0 && total === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground">No games yet.</p>
              <Link
                to="/play-online"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Play a game
              </Link>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchGames(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-border hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => fetchGames(page + 1)}
                disabled={page >= pages}
                className="p-2 rounded-lg border border-border hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </div>

    </>
  );
}
