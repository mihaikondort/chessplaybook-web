/**
 * Analysis Page — analyze any chess game
 *
 * Three ways to load a game:
 * 1. Post-game review: navigated from PlayOnline with PGN in route state
 * 2. PGN import: paste PGN text or upload a PGN file
 * 3. Free analysis: set up a position (future)
 *
 * Once a PGN is loaded, renders the same `GameViewerWorkspace` the champion and live
 * viewers use (layout redesign E6).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GameViewerWorkspace, sideResult } from '@/components/game-viewer/GameViewerWorkspace';
import { useLiveAnalysisBoard } from '@/components/analysis/useLiveAnalysisBoard';
import { EngineAnalysisCard } from '@/components/analysis/EngineAnalysisCard';
import { Upload, FileText, History, ChevronRight, Crown, Minimize2 } from 'lucide-react';
import { Chess } from 'chess.js';
import { useAuth } from '@/features/auth/AuthContext';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';
import { GuestBadge } from '@/components/GuestBadge';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import env from '@/config/env';
import SeoHead from '@/components/SeoHead';
import { readPositionDeepLink } from '@/lib/positionDeepLink';
import { Workspace, WorkspaceList, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { useChrome } from '@/app/SiteShell';
import { PuzzleAppearanceCard } from '@/features/puzzles/components/PuzzleAppearanceCard';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/** What a game's headers say about it; the PGN's own tags fill whatever is not passed. */
interface GameMetadata {
  event?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
  result?: string;
  eco?: string;
  opening?: string;
}

interface RouteState {
  pgn?: string;
  metadata?: GameMetadata;
  source?: string;  // 'play-online' shows "Back to Play Online" button
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Extract metadata from PGN headers */
function extractMetadataFromPgn(pgn: string): GameMetadata {
  const get = (tag: string) => {
    const match = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
    // "?" is PGN for "not known".
    const value = match?.[1];
    return value && value !== '?' ? value : undefined;
  };
  return {
    event: get('Event'),
    date: get('Date'),
    round: get('Round'),
    white: get('White'),
    black: get('Black'),
    result: get('Result'),
    eco: get('ECO'),
    opening: get('Opening'),
  };
}

/** "2026.10.12" stays; "????.??.??" reads nothing. */
function readableDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const parts = date.split('.').filter(p => p && !p.includes('?'));
  return parts.length ? parts.join('.') : undefined;
}

/** Validate PGN by trying to parse it */
function validatePgn(pgn: string): { valid: boolean; error?: string } {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);
    if (chess.history().length === 0) {
      return { valid: false, error: 'PGN contains no moves' };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Invalid PGN format' };
  }
}

/** Extract first game from multi-game PGN */
function extractFirstGame(pgn: string): string {
  // A new game starts with [Event after a result line (1-0, 0-1, 1/2-1/2, *)
  const lines = pgn.split('\n');
  const result: string[] = [];
  let foundMoves = false;
  let foundResult = false;

  for (const line of lines) {
    if (foundResult && line.trim().startsWith('[Event')) break;
    result.push(line);
    if (!foundMoves && line.trim() && !line.trim().startsWith('[')) foundMoves = true;
    if (foundMoves && /\b(1-0|0-1|1\/2-1\/2|\*)\s*$/.test(line.trim())) foundResult = true;
  }

  return result.join('\n').trim();
}

/** Detect if input is a Lichess game URL (not a PGN that mentions lichess) */
function parseLichessUrl(input: string): string | null {
  const trimmed = input.trim();
  // Only match if the input looks like a URL (starts with http or lichess.org), not a PGN
  if (trimmed.startsWith('[') || trimmed.startsWith('1.')) return null;
  const match = trimmed.match(/lichess\.org\/(?:game\/export\/)?([a-zA-Z0-9]{8,12})(?:\/.*)?$/);
  return match ? match[1] : null;
}

/** Detect if input is a Chess.com game URL (not a PGN that contains a chess.com link) */
function parseChessComUrl(input: string): { id: string; type: 'live' | 'daily' } | null {
  const trimmed = input.trim();
  // Only match if the input looks like a URL, not a PGN with a [Link] header
  if (trimmed.startsWith('[') || trimmed.startsWith('1.')) return null;
  const match = trimmed.match(/chess\.com\/game\/(live|daily)\/(\d+)/);
  return match ? { id: match[2], type: match[1] as 'live' | 'daily' } : null;
}

/** Fetch PGN from a Lichess game URL */
async function fetchLichessPgn(gameId: string): Promise<string> {
  const response = await fetch(`https://lichess.org/game/export/${gameId}`, {
    headers: { 'Accept': 'application/x-chess-pgn' },
  });
  if (!response.ok) throw new Error(`Lichess game not found (${response.status})`);
  return response.text();
}

/**
 * Fetch PGN for a Chess.com game, via our own backend.
 *
 * Not called directly from the browser, and it cannot be: Chess.com's public
 * API has no per-game endpoint (`/pub/game/{type}/{id}` answers 404), and the
 * `www.chess.com/callback/...` route that does return the game sends no CORS
 * headers, so the browser discards the response. Both failures surfaced to the
 * visitor as "Failed to fetch". The backend fetches it server-side instead.
 *
 * Lichess is still fetched directly — it serves the export with
 * `access-control-allow-origin: *`, so proxying it would add a hop for nothing.
 */
async function fetchChessComPgn(gameId: string, type: 'live' | 'daily'): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/api/import/chesscom/${type}/${gameId}`);
  } catch {
    throw new Error('Could not reach the import service. Try pasting the PGN directly.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Chess.com game not found. Try copying the PGN directly from Chess.com and pasting it here.');
  }
  const data = await response.json();
  if (!data?.pgn) {
    throw new Error('That Chess.com game has no PGN available.');
  }
  return data.pgn;
}


// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

const Analysis = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as RouteState | null;
  const { currentTheme, changeTheme } = useBoardTheme();
  const linkedPosition = readPositionDeepLink(location.search);

  /*
    THE WORKSPACE SIZES EVERYTHING (layout redesign D3b). The board budget
    (`LIVE_BOARD_PAGE_CHROME`, the 648/520/400 tiers), `useNavTotal` and
    `layoutMode` are gone: the board and the lanes are CSS from the layout
    tokens, as on /puzzles and /play. That also retires #76: this page needed
    ~860px for three columns because its columns were its own.

    FOCUS MODE IS COLUMNS-ONLY and offered only where focus itself stays columns
    (owner, 2026-10-08): the Workspace reports its mode, and stacking leaves it.
  */
  const [focusMode, setFocusMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => {
    if (workspaceMode?.mode === 'stacked') setFocusMode(false);
  }, [workspaceMode]);
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focusMode);
    return () => setChromeHidden(false);
  }, [focusMode, setChromeHidden]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);
  // Mode: 'live' = interactive board, 'review' = imported game PGN viewer
  const [mode, setMode] = useState<'live' | 'review'>('live');
  const [liveFen, setLiveFen] = useState(
    linkedPosition.value?.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  );

  // Anti-cheat: disable live analysis during active online games
  const [hasActiveGame, setHasActiveGame] = useState(false);
  const activeGameCheckRef = useRef(false);

  const checkActiveGame = useCallback(async () => {
    try {
      const headers = await getRequestHeaders();
      const res = await fetch(`${env.apiBaseUrl}/api/online-games/active`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHasActiveGame(!!data.hasActiveGame);
      }
    } catch { /* ignore */ }
  }, []);

  // Check on mount + on window focus + every 30s
  useEffect(() => {
    if (!activeGameCheckRef.current) {
      activeGameCheckRef.current = true;
      checkActiveGame();
    }
    const interval = setInterval(checkActiveGame, 30000);
    const onFocus = () => checkActiveGame();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [checkActiveGame]);

  // Restore from sessionStorage on mount (survives refresh)
  const [pgn, setPgn] = useState<string | null>(() => {
    try { return sessionStorage.getItem('analysis_pgn'); } catch { return null; }
  });
  const [metadata, setMetadata] = useState<GameMetadata | undefined>(() => {
    try {
      const stored = sessionStorage.getItem('analysis_metadata');
      return stored ? JSON.parse(stored) : undefined;
    } catch { return undefined; }
  });
  const [source, setSource] = useState<string | undefined>(() => {
    try { return sessionStorage.getItem('analysis_source') || undefined; } catch { return undefined; }
  });
  const { user } = useAuth();

  // If we have a restored PGN, start in review mode
  useEffect(() => {
    if (pgn) setMode('review');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // My Games state
  interface RecentGame {
    id: string;
    white: { userId: string; username: string; rating: number };
    black: { userId: string; username: string; rating: number };
    result: string;
    timeControl: { initial: number; increment: number; category: string };
    playedAt: string;
    pgn?: string;
  }
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);

  // No auto-load — user clicks "My Recent Games" to expand

  // Persist pgn/metadata/source to sessionStorage
  useEffect(() => {
    try {
      if (pgn) {
        sessionStorage.setItem('analysis_pgn', pgn);
        sessionStorage.setItem('analysis_metadata', JSON.stringify(metadata ?? null));
        if (source) sessionStorage.setItem('analysis_source', source);
        else sessionStorage.removeItem('analysis_source');
      } else {
        sessionStorage.removeItem('analysis_pgn');
        sessionStorage.removeItem('analysis_metadata');
        sessionStorage.removeItem('analysis_source');
        sessionStorage.removeItem('analysis_gameReport');
      }
    } catch { /* storage full or unavailable — ignore */ }
  }, [pgn, metadata, source]);

  // Import panel state
  const [pgnInput, setPgnInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Load game from route state (post-game review)
  useEffect(() => {
    if (routeState?.pgn) {
      setPgn(routeState.pgn);
      setMetadata(routeState.metadata);
      setSource(routeState.source);
      setMode('review');
      // Clear route state so refresh doesn't reload
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Reset to import panel when "Import Game" nav button is clicked
  useEffect(() => {
    if ((location.state as any)?.reset) {
      setPgn(null);
      setMetadata(undefined);
      setSource(undefined);
      setPgnInput('');
      setImportError(null);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Loading state for URL fetching
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // Fetch recent on-site games
  const loadRecentGames = async () => {
    if (!user || gamesLoaded) return;
    setLoadingGames(true);
    try {
      const headers = await getRequestHeaders();
      const userId = (user as any).userId || (user as any).sub || '';
      const response = await fetch(
        `${env.apiBaseUrl}/api/online-games?userId=${userId}&limit=10&page=1`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        setRecentGames(data.games || []);
      }
    } catch { /* ignore */ }
    setLoadingGames(false);
    setGamesLoaded(true);
  };

  // Select a game from My Games — fetch full game with PGN
  const handleSelectGame = async (game: RecentGame) => {
    setFetchingUrl(true);
    setImportError(null);
    try {
      const headers = await getRequestHeaders();
      const response = await fetch(
        `${env.apiBaseUrl}/api/online-games/${game.id}`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        const gamePgn = data.pgn || data.game?.pgn;
        if (gamePgn) {
          const firstGame = extractFirstGame(gamePgn);
          loadPgnAndReview(firstGame, extractMetadataFromPgn(firstGame));
        } else {
          setImportError('Game has no PGN data');
        }
      } else {
        setImportError('Failed to load game');
      }
    } catch {
      setImportError('Failed to load game');
    } finally {
      setFetchingUrl(false);
    }
  };

  // Handle PGN paste/import — smart detection of URLs vs raw PGN
  const handleLoadPgn = async () => {
    const trimmed = pgnInput.trim();
    if (!trimmed) {
      setImportError('Please paste a PGN or game link');
      return;
    }

    // Detect Lichess game URL
    const lichessId = parseLichessUrl(trimmed);
    if (lichessId) {
      setFetchingUrl(true);
      setImportError(null);
      try {
        const fetchedPgn = await fetchLichessPgn(lichessId);
        const firstGame = extractFirstGame(fetchedPgn);
        const validation = validatePgn(firstGame);
        if (!validation.valid) {
          setImportError(validation.error || 'Failed to parse Lichess game');
          return;
        }
        loadPgnAndReview(firstGame, extractMetadataFromPgn(firstGame));
      } catch (err: any) {
        setImportError(err.message || 'Failed to fetch game from Lichess');
      } finally {
        setFetchingUrl(false);
      }
      return;
    }

    // Detect Chess.com game URL
    const chessComGame = parseChessComUrl(trimmed);
    if (chessComGame) {
      setFetchingUrl(true);
      setImportError(null);
      try {
        const fetchedPgn = await fetchChessComPgn(chessComGame.id, chessComGame.type);
        const firstGame = extractFirstGame(fetchedPgn);
        const validation = validatePgn(firstGame);
        if (!validation.valid) {
          setImportError(validation.error || 'Failed to parse Chess.com game');
          return;
        }
        loadPgnAndReview(firstGame, extractMetadataFromPgn(firstGame));
      } catch (err: any) {
        setImportError(err.message || 'Failed to fetch game from Chess.com');
      } finally {
        setFetchingUrl(false);
      }
      return;
    }

    // Raw PGN — extract first game if multiple
    const firstGame = extractFirstGame(trimmed);
    const validation = validatePgn(firstGame);
    if (!validation.valid) {
      setImportError(validation.error || 'Invalid PGN');
      return;
    }
    setImportError(null);
    loadPgnAndReview(firstGame, extractMetadataFromPgn(firstGame));
    setSource(undefined);
  };

  // Handle PGN file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const firstGame = extractFirstGame(text);
      const validation = validatePgn(firstGame);
      if (!validation.valid) {
        setImportError(validation.error || 'Invalid PGN file');
        return;
      }
      setImportError(null);
      loadPgnAndReview(firstGame, extractMetadataFromPgn(firstGame));
      setSource(undefined);
    };
    reader.readAsText(file);
  };

  // Switch back to live board
  const handleBackToLive = () => {
    setMode('live');
  };

  // Helper: load a PGN and switch to review mode
  const loadPgnAndReview = (newPgn: string, newMetadata?: GameMetadata) => {
    setPgn(newPgn);
    setMetadata(newMetadata);
    setMode('review');
  };

  /* The headers passed with the game win; the PGN's own tags fill the rest. */
  const reviewMeta: GameMetadata = pgn ? extractMetadataFromPgn(pgn) : {};
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (value) reviewMeta[key as keyof GameMetadata] = value;
    }
  }

  const liveBoard = useLiveAnalysisBoard({
    disabled: hasActiveGame,
    initialFen: linkedPosition.value?.fen,
    initialOrientation: linkedPosition.value?.orientation,
    onPositionChange: setLiveFen,
  });

  return (
    <>
      <SeoHead routeKey="analysis">
        {/* Open Graph */}

        {/* Twitter */}
      </SeoHead>

      {mode === 'review' && pgn ? (
        /*
          REVIEW MODE IS THE SHARED VIEWER PAGE (layout redesign E6): the board, the
          moves over the analysis band, Game report and Explain position in dialogs,
          as on a champion game. Go to leads back to the live board, where the import
          card is. Keyed by the PGN, so another game starts at its first position.
        */
        <GameViewerWorkspace
          key={pgn}
          pgn={pgn}
          info={{
            headline: reviewMeta.event || 'Imported game',
            lines: [
              [readableDate(reviewMeta.date), reviewMeta.round && `Round ${reviewMeta.round}`].filter(Boolean).join(' · '),
              [reviewMeta.eco, reviewMeta.opening].filter(Boolean).join(' · '),
            ],
            status: reviewMeta.result || '*',
          }}
          players={{
            white: { name: reviewMeta.white || 'White', detail: sideResult('white', reviewMeta.result) },
            black: { name: reviewMeta.black || 'Black', detail: sideResult('black', reviewMeta.result) },
          }}
          goTo={[
            { label: 'Analysis board', onClick: handleBackToLive, direction: 'back' as const },
            ...(source === 'play-online' ? [{ label: 'Play Online', to: '/play-online', direction: 'back' as const }] : []),
          ]}
          initialPly="start"
          review={{
            gameResult: reviewMeta.result === '1-0' ? 'white' : reviewMeta.result === '0-1' ? 'black' : 'draw',
            metadata: {
              playerName: '', white: reviewMeta.white || '', black: reviewMeta.black || '', result: reviewMeta.result || '',
              event: reviewMeta.event || '', site: '', date: reviewMeta.date || '', eco: reviewMeta.eco, opening: reviewMeta.opening,
            },
          }}
          analyticsSurface="analysis"
          boardLabel={`Chess board, ${reviewMeta.white || 'White'} against ${reviewMeta.black || 'Black'}`}
        />
      ) : (
        <>
          {/* The toggle lives in the context lane's foot, which focus mode
              removes, so the exit is a fixed control with the shortcut on it. */}
          {focusMode && (
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              className="surface-card fixed right-4 top-4 z-50 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Minimize2 className="h-4 w-4" aria-hidden />
              Leave focus mode
              <kbd className="rounded border border-border px-1 text-[10px] text-muted-foreground">Esc</kbd>
            </button>
          )}
          <Workspace
            focus={focusMode}
            onModeChange={setWorkspaceMode}
            board={
              <div data-skeleton-card="board" className="w-full" role="group" aria-label="Analysis board">
                {liveBoard.board}
              </div>
            }
            toolbar={liveBoard.toolbar}
            activity={{
              title: 'Engine',
              cards: [
                /* The engine card, kept in focus mode. A linked position that
                   could not be read is said here, beside what it affects. */
                slot('analysis-engine', 'analysisEngine', (
                  <EngineAnalysisCard fen={liveFen} notice={linkedPosition.error} />
                ), 1, true),
              ],
            }}
            context={{
              title: 'Import',
              cards: [
                slot('analysis-import', 'analysisImport', (
                  <ImportCard
                    pgnInput={pgnInput}
                    setPgnInput={setPgnInput}
                    importError={importError}
                    setImportError={setImportError}
                    fetchingUrl={fetchingUrl}
                    handleLoadPgn={handleLoadPgn}
                    handleFileUpload={handleFileUpload}
                    user={user}
                    loadRecentGames={loadRecentGames}
                    loadingGames={loadingGames}
                    gamesLoaded={gamesLoaded}
                    recentGames={recentGames}
                    handleSelectGame={handleSelectGame}
                    navigate={navigate}
                  />
                )),
              ],
              foot: footSlot('theme-focus', (
                <PuzzleAppearanceCard currentThemeId={currentTheme.id} onThemeChange={changeTheme} analyticsSurface="analysis" focusMode={focusMode} onToggleFocusMode={canFocus ? () => setFocusMode(value => !value) : undefined} />
              )),
            }}
          />
        </>
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Import card — loading a game, in the context lane
// ═══════════════════════════════════════════════════════════════════════════

/*
  The old panel was collapsible and sized in rem. A Workspace card has a fixed
  size and its text in `em` (layout redesign D3b), so it is always open; D3a
  measured it at 253px against a 332px lane at the smallest size. The recent
  games list (signed in) is the card's one scroller, a `WorkspaceList`.
*/
function ImportCard({
  pgnInput, setPgnInput, importError, setImportError,
  fetchingUrl, handleLoadPgn, handleFileUpload,
  user, loadRecentGames, loadingGames, gamesLoaded, recentGames, handleSelectGame,
  navigate,
}: any) {
  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]">
        <FileText className="text-link" aria-hidden />
        Import Game
      </span>
      <div className="card-body">
        {user && (
          <>
            <button type="button" onClick={loadRecentGames} className="card-btn w-full text-[0.92em]">
              <History aria-hidden />
              {loadingGames ? 'Loading…' : 'My Recent Games'}
            </button>
            {gamesLoaded && recentGames.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col">
                <WorkspaceList label="Recent games">
                  {recentGames.map((game: any) => {
                    const date = game.playedAt ? new Date(game.playedAt) : null;
                    const dateStr = date && !isNaN(date.getTime())
                      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : '';
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => handleSelectGame(game)}
                        className="flex w-full items-center justify-between gap-[0.4em] border-b border-border/50 px-[0.4em] py-[0.3em] text-left last:border-b-0 hover:bg-accent/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[0.86em] font-medium text-foreground">
                            {game.white?.username || '?'} vs {game.black?.username || '?'}
                          </span>
                          <span className="block text-[0.75em] text-muted-foreground">
                            {game.result}{dateStr ? ` · ${dateStr}` : ''}
                          </span>
                        </span>
                        <ChevronRight className="shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    );
                  })}
                </WorkspaceList>
              </div>
            )}
          </>
        )}

        <button type="button" onClick={() => navigate('/champions')} className="card-btn w-full text-[0.92em]">
          <Crown aria-hidden />
          Champions Games
        </button>

        <textarea
          value={pgnInput}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setPgnInput(e.target.value); setImportError(null); }}
          placeholder="Paste PGN or game link..."
          aria-label="PGN or game link"
          className="w-full shrink-0 resize-none rounded-[0.4em] border border-border bg-background p-[0.5em] font-mono text-[0.86em] placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
          /* No scroll bar in a card (contract §4, owner): a long paste shows its
             last lines, and the box still keeps the caret in view while typing. */
          style={{ height: '4.6em', overflow: 'hidden' }}
        />

        {importError && (
          <span role="alert" className="line-clamp-2 text-[0.86em] text-destructive">{importError}</span>
        )}

        <div className="flex shrink-0 gap-[0.4em]">
          <button type="button" onClick={handleLoadPgn} disabled={fetchingUrl} className="card-btn min-w-0 flex-1 whitespace-nowrap text-[0.92em] disabled:opacity-50">
            {fetchingUrl ? 'Fetching…' : <><FileText aria-hidden /> Load Game</>}
          </button>
          <label className="card-btn shrink-0 cursor-pointer whitespace-nowrap px-[0.7em] text-[0.92em]">
            <input type="file" accept=".pgn,.txt" onChange={handleFileUpload} className="hidden" />
            <Upload aria-hidden /> Upload
          </label>
        </div>

        <GuestBadge context="analysis" inCard />
      </div>
    </>
  );
}

export default Analysis;
