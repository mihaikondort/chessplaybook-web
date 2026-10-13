import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { PlayerCard, PLAYER_CLOCK_CLASS } from '@/components/chess/PlayWorkspaceCards';
import { Workspace, WorkspaceList, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { useAnchoredPopover } from '@/components/workspace/useAnchoredPopover';
import { useChrome } from '@/app/SiteShell';
import SeoHead from '@/components/SeoHead';
import RouteHeading from '@/components/RouteHeading';
import { useBoardStepInput } from '@/components/chess/useBoardStepInput';
import { GameMoveList } from '@/components/chess/GameMoveList';
import { GuestBadge } from '@/components/GuestBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { ChessClock } from '../components/ChessClock';
import { PuzzleAppearanceCard } from '@/features/puzzles/components/PuzzleAppearanceCard';
import { PuzzleAnalysisCard } from '@/features/puzzles/components/PuzzleAnalysisCard';
import { useOnlineGame } from '../hooks/useOnlineGame';
import type { SavedEndedGame } from '../hooks/useOnlineGame';
import env from '@/config/env';
import type { GameEndPayload } from '../protocol';
import { getAuthHeader } from '@/features/auth/utils/getAuthToken';
import {
  X, ChevronRight, ChevronDown, Link2, Copy, Check, Minimize2,
  CircleUserRound, Radio, Swords, Trophy, Wifi, WifiOff,
} from 'lucide-react';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { parseSan } from 'chessops/san';
import { makeUci } from 'chessops/util';
import { positionFromFen, applyMove, isPromotion, toUci } from '@/components/chess/chessLogic';
import type { ChessPosition } from '@/components/chess/chessLogic';
import type { Key } from '@lichess-org/chessground/types';
import { logGA4Event } from '@/services/analytics';
import { soundService } from '@/services/SoundService';

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

const SESSION_KEY = 'chessplaybook_last_game';

interface SavedSession {
  game: SavedEndedGame;
  presetName: string;
  rated: boolean;
}

function loadSavedSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch { return null; }
}

function clearSavedSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Time control presets
// ---------------------------------------------------------------------------

interface Preset {
  name: string;
  initial: number;
  increment: number;
  category: string;
}

const PRESETS: Preset[] = [
  { name: '1+0',   initial: 60,   increment: 0,  category: 'Bullet' },
  { name: '2+1',   initial: 120,  increment: 1,  category: 'Bullet' },
  { name: '3+0',   initial: 180,  increment: 0,  category: 'Blitz' },
  { name: '3+2',   initial: 180,  increment: 2,  category: 'Blitz' },
  { name: '5+0',   initial: 300,  increment: 0,  category: 'Blitz' },
  { name: '5+3',   initial: 300,  increment: 3,  category: 'Blitz' },
  { name: '10+0',  initial: 600,  increment: 0,  category: 'Rapid' },
  { name: '15+10', initial: 900,  increment: 10, category: 'Rapid' },
];

const CATEGORIES = ['Bullet', 'Blitz', 'Rapid'];

/*
  The time control and rated choice (D2b). The settings card is declared at its
  collapsed height, and the choices opened INSIDE it overflowed the card by
  12-16px at 800x600 and 788x467, so they open in a panel from the card, as the
  engine level does on `/play`.
*/
function TimeControlPicker({ preset, onPreset, rated, onRated }: {
  preset: Preset;
  onPreset: (preset: Preset) => void;
  rated: boolean;
  onRated: (rated: boolean) => void;
}) {
  const { open, setOpen, triggerRef, panelRef, style, room } = useAnchoredPopover();
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(current => !current)} className="flex w-full items-center justify-between gap-[0.4em] rounded-[0.4em] text-left hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={open} aria-haspopup="dialog" aria-label="Change time control">
        <span className="flex min-w-0 flex-col">
          <span className="text-[1.3em] font-bold tabular-nums leading-tight text-foreground">{preset.name}</span>
          <span className="truncate text-[0.86em] text-muted-foreground">{preset.category} · {rated ? 'Rated' : 'Casual'}</span>
        </span>
        <ChevronDown className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && createPortal(
        <div ref={panelRef} role="dialog" aria-label="Time control" className="fixed z-[100] flex flex-col gap-3 overflow-y-auto rounded-lg border border-border bg-card p-3 text-sm shadow-2xl thin-scroll" style={{ ...style, maxHeight: room }}>
          {CATEGORIES.map(category => (
            <div key={category}>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{category}</div>
              <div className="grid grid-cols-4 gap-1">
                {PRESETS.filter(option => option.category === category).map(option => (
                  <button
                    key={option.name}
                    type="button"
                    aria-pressed={preset.name === option.name}
                    onClick={() => {
                      onPreset(option);
                      setOpen(false);
                    }}
                    className={`min-w-[3.25rem] rounded border px-2 py-1 font-medium tabular-nums ${preset.name === option.name ? 'border-primary bg-primary/10 text-link' : 'border-border hover:bg-accent/50'}`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onRated(!rated)} aria-pressed={rated} className="flex w-full items-center justify-between rounded border border-border px-2 py-1.5 hover:bg-accent/50">
            Rated game <span className="font-semibold text-link">{rated ? 'On' : 'Off'}</span>
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatResult(payload: GameEndPayload, playerColor: 'white' | 'black') {
  const { result, reason } = payload;
  const detailMap: Record<string, string> = {
    checkmate: 'by checkmate', resignation: 'by resignation', timeout: 'on time',
    stalemate: 'by stalemate', insufficient_material: 'by insufficient material',
    fifty_move: 'by the 50-move rule', repetition: 'by threefold repetition',
    draw_agreement: 'by agreement', abandonment: 'by abandonment',
  };
  const detail = detailMap[reason] ?? '';
  if (result === '1/2-1/2') return { headline: 'Draw', detail };
  const whiteWon = result === '1-0';
  const youWon = (playerColor === 'white') === whiteWon;
  return { headline: youWon ? 'You win!' : 'You lose', detail };
}

function loadRatedPref(): boolean {
  try {
    const v = localStorage.getItem('lastRatedPreference');
    return v !== null ? JSON.parse(v) : true;
  } catch { return true; }
}

// ---------------------------------------------------------------------------
// Challenge info
// ---------------------------------------------------------------------------

interface ChallengeInfo {
  challengeId: string;
  creatorUsername: string;
  timeControl: { initial: number; increment: number };
  rated: boolean;
}

// ---------------------------------------------------------------------------
// Position history for replay navigation
// ---------------------------------------------------------------------------

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * How long to search before ALSO offering the computer game. Long enough that a
 * real opponent usually arrives first once the pool exists, short enough that a
 * visitor from a paid click has not yet decided to leave. The seek is not
 * cancelled when this fires.
 */
const SEEK_FALLBACK_MS = 20_000;

/**
 * How long the socket may stay down before the page offers a way out. Well
 * short of `useWebSocket`'s ~143s path to `connectionState === 'failed'` — that
 * terminal state is far too late to be a visitor's first escape route.
 */
const CONNECT_STALL_MS = 12_000;


/**
 * The offer shown alongside a still-running search, and on a failed connection.
 * One component for both call sites so the wording cannot drift; `variant` only
 * changes the chrome, since the overlay sits on a blurred board and the sidebar
 * inside a bordered card.
 */
function SeekFallback({
  variant,
  onPlayComputer,
  reason = 'No one is available right now.',
}: {
  variant: 'overlay' | 'sidebar';
  onPlayComputer: () => void;
  reason?: string;
}) {
  return (
    <div
      className={
        variant === 'overlay'
          ? 'mt-1 flex flex-col items-center gap-1.5 px-4 text-center'
          : 'mt-1 flex flex-col items-center gap-1.5 text-center'
      }
    >
      <p className="text-xs text-muted-foreground">{reason}</p>
      <button
        onClick={onPlayComputer}
        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
      >
        Play the computer instead
      </button>
    </div>
  );
}

interface HistoryEntry {
  fen: string;
  lastMove: Key[] | undefined;
  turnColor: 'white' | 'black';
  isCheck: boolean;
}

function buildFenHistory(sanMoves: string[]): HistoryEntry[] {
  let pos = positionFromFen(STARTING_FEN);
  if (!pos) return [];
  const history: HistoryEntry[] = [
    { fen: STARTING_FEN, lastMove: undefined, turnColor: pos.turnColor, isCheck: pos.isCheck },
  ];
  for (const san of sanMoves) {
    const move = parseSan(pos.chess, san);
    if (!move) break;
    const uci = makeUci(move);
    const newPos = applyMove(pos, uci);
    if (!newPos) break;
    history.push({
      fen: newPos.fen,
      lastMove: [uci.slice(0, 2), uci.slice(2, 4)] as Key[],
      turnColor: newPos.turnColor,
      isCheck: newPos.isCheck,
    });
    pos = newPos;
  }
  return history;
}

// ===========================================================================
// Component
// ===========================================================================

export function PlayOnline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Session restore.
  //
  // An invitation link wins over a restored finished game. The invite panel
  // only renders in the idle lobby, so restoring a saved 'ended' game would
  // hide the invitation completely and show the friend a summary of somebody
  // else's last game instead — the same "clicked the link, nothing happened"
  // the transition guard below fixes, just via a different route.
  const savedSession = useMemo(
    () => (searchParams.has('challenge') ? null : loadSavedSession()),
    [], // eslint-disable-line react-hooks/exhaustive-deps -- mount-only decision
  );

  // Game hook
  const [gameState, actions] = useOnlineGame(savedSession?.game ?? null);

  // Settings state — persisted
  const [selectedPreset, setSelectedPreset] = useState<Preset>(() => {
    if (savedSession?.presetName) {
      const match = PRESETS.find(p => p.name === savedSession.presetName);
      if (match) return match;
    }
    const saved = localStorage.getItem('lastTimeControl');
    return PRESETS.find(p => p.name === saved) ?? PRESETS[6]; // 10+0 default
  });
  const [rated, setRated] = useState(() => savedSession?.rated ?? loadRatedPref());

  // Sidebar UI state
  const [friendExpanded, setFriendExpanded] = useState(searchParams.get('setup') === 'friend');
  const [challengeLinkCopied, setChallengeLinkCopied] = useState(false);
  const challengeCopyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [challengeColor, setChallengeColor] = useState<'white' | 'black' | 'random'>('random');
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengeInfo | 'loading' | 'not_found' | null>(null);

  // Board UI state
  const [focusMode, setFocusMode] = useState(false);
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundService.enabled);
  const [resultDismissed, setResultDismissed] = useState(false);
  const resultDismissTimerRef = useRef<ReturnType<typeof setTimeout>>();
  /*
    THE WORKSPACE SIZES EVERYTHING (layout redesign D2a), as on /puzzles and
    /play: no tier widths, no board chrome, no `useBoardSize`, `useNavTotal` or
    `layoutMode`. Focus mode is columns-only and offered only where focus itself
    stays columns (owner, 2026-10-08); stacking leaves it.
  */
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => {
    if (workspaceMode?.mode === 'stacked') setFocusMode(false);
  }, [workspaceMode]);
  /* Focus mode asks the shell to hide the nav, and gives it back on unmount. */
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focusMode);
    return () => setChromeHidden(false);
  }, [focusMode, setChromeHidden]);

  // Game state destructured
  const {
    isConnected, connectionState, phase,
    fen, dests, turnColor, movableColor, lastMove, isCheck,
    sanMoves, playerColor, opponent,
    whiteMs, blackMs,
    drawOfferedByOpponent, drawOfferStatus, gameResult, opponentDisconnected,
    challengeId, lastError,
  } = gameState;

  const isInGame = phase === 'playing' || phase === 'ended';
  const isIdle = phase === 'lobby';
  const isGameOver = phase === 'ended';

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Nav re-click while on page: return to idle if not in active game
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (phase !== 'playing') {
      clearSavedSession();
      actions.returnToLobby();
      if (searchParams.has('challenge')) setSearchParams({});
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced reconnect banner
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  useEffect(() => {
    if (isConnected) { setShowReconnectBanner(false); return; }
    const t = setTimeout(() => setShowReconnectBanner(true), 1500);
    return () => clearTimeout(t);
  }, [isConnected]);

  /**
   * Unmatched-seek escalation.
   *
   * The matchmaking pool is young, so an empty queue is the EXPECTED case
   * early on, not an edge case (audit 2026-07-31,
   * G1). Before this, seeking was an unbounded spinner with only a Cancel
   * button: a visitor who clicked the page's primary CTA and found nobody
   * waited, gave up and left — worse than a dead end, because they engaged
   * first. After SEEK_FALLBACK_MS the search KEEPS RUNNING and we additionally
   * offer the computer game, so an empty pool produces a game rather than an
   * exit.
   *
   * The event is the point as much as the UI: `online_seek_unmatched` is how we
   * find out whether the pool is filling, which is the question G1 asked and
   * this feature is the instrument for.
   */
  /**
   * "Not connected for a while", which is NOT the same as `connectionState ===
   * 'failed'`.
   *
   * Gating the escape hatch on `failed` was the first attempt and it was wrong:
   * `useWebSocket` retries 12 times on a 1/2/4/8/16s backoff, so `failed` is
   * ~143 seconds away. A visitor from a paid click on a network that blocks the
   * socket would have watched "Reconnecting..." for over two minutes before
   * being offered anything. Found by driving the page with the socket blocked,
   * not by reading the code.
   *
   * So this fires on elapsed time instead, and the reconnect attempts continue
   * underneath — if the socket comes back, `isConnected` clears this and the
   * normal CTA returns.
   */
  /**
   * True from the moment the visitor clicks Accept until that attempt resolves.
   *
   * Without it, ANY server error would hide the Accept button, and the server
   * emits ALREADY_IN_GAME from the seek and challenge-create paths too — so a
   * stale error from an unrelated action could suppress a perfectly valid
   * invitation. The error is only the invitation's problem if the invitation is
   * what we just tried.
   */
  const [acceptPending, setAcceptPending] = useState(false);

  const [connectionStalled, setConnectionStalled] = useState(false);
  useEffect(() => {
    // 'replaced' is not a network problem — the socket moved to another device
    // or tab on purpose. Offering "can't reach the game server from this
    // network" there would be actively wrong, so leave that state alone; it
    // renders its own explanation with a "play here instead" action.
    if (isConnected || connectionState === 'replaced') { setConnectionStalled(false); return; }
    const t = setTimeout(() => setConnectionStalled(true), CONNECT_STALL_MS);
    return () => clearTimeout(t);
  }, [isConnected, connectionState]);

  const [seekUnmatched, setSeekUnmatched] = useState(false);
  useEffect(() => {
    if (phase !== 'seeking') { setSeekUnmatched(false); return; }
    const t = setTimeout(() => {
      setSeekUnmatched(true);
      logGA4Event({
        name: 'online_seek_unmatched',
        params: {
          seconds: SEEK_FALLBACK_MS / 1000,
          time_control: selectedPreset.name,
          rated,
        },
      });
    }, SEEK_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [phase, selectedPreset.name, rated]);

  // Active game check on mount (reconnection)
  const [checkingActiveGame, setCheckingActiveGame] = useState(false);
  const activeGameCheckedRef = useRef(false);
  const stopCheckingActiveGame = useCallback(() => setCheckingActiveGame(false), []);

  useEffect(() => {
    if (activeGameCheckedRef.current || savedSession) return;
    activeGameCheckedRef.current = true;
    getAuthHeader()
      .then(headers => fetch(`${env.apiBaseUrl}/api/online-games/active`, { headers }))
      .then(r => (r.ok ? r.json() : null))
      .then((data: { hasActiveGame: boolean } | null) => {
        if (data?.hasActiveGame) setCheckingActiveGame(true);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'lobby') stopCheckingActiveGame();
  }, [phase, stopCheckingActiveGame]);

  const activeGameFallbackRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!isConnected || !checkingActiveGame) return;
    activeGameFallbackRef.current = setTimeout(stopCheckingActiveGame, 1000);
    return () => clearTimeout(activeGameFallbackRef.current);
  }, [isConnected, checkingActiveGame, stopCheckingActiveGame]);

  // ESC exits focus mode
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      logGA4Event({ name: 'focus_mode_toggled', params: { enabled: false, surface: 'play_online' } });
      setFocusMode(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focusMode]);


  // Position navigation (review mode)
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [reviewPosition, setReviewPosition] = useState<{
    position: ChessPosition;
    lastMove: Key[];
  } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [drawOfferSent, setDrawOfferSent] = useState(false);
  const drawOfferSentTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fenHistory = useMemo(() => buildFenHistory(sanMoves), [sanMoves]);

  useEffect(() => {
    if (sanMoves.length === 0) {
      setViewPly(null);
      setReviewPosition(null);
    }
  }, [sanMoves.length]);

  useEffect(() => {
    setConfirmResign(false);
    setConfirmDraw(false);
    setDrawOfferSent(false);
    clearTimeout(drawOfferSentTimerRef.current);
    if (phase !== 'ended') setReviewPosition(null);
  }, [phase]);

  useEffect(() => () => clearTimeout(challengeCopyTimerRef.current), []);
  useEffect(() => () => clearTimeout(drawOfferSentTimerRef.current), []);

  useEffect(() => {
    if (drawOfferStatus !== 'sent') {
      if (drawOfferStatus === 'error') setDrawOfferSent(false);
      return;
    }
    setDrawOfferSent(true);
    clearTimeout(drawOfferSentTimerRef.current);
    drawOfferSentTimerRef.current = setTimeout(() => setDrawOfferSent(false), 2500);
  }, [drawOfferStatus]);

  useEffect(() => {
    clearTimeout(resultDismissTimerRef.current);
    if (phase !== 'ended' || !gameResult) return;
    setResultDismissed(false);
    resultDismissTimerRef.current = setTimeout(() => setResultDismissed(true), 2000);
    return () => clearTimeout(resultDismissTimerRef.current);
  }, [phase, gameResult]);

  /*
    Arrow keys and wheel-to-step through the game, in a game only. The keys no longer
    step the board while the reader types in a field (they did until Eg, the D28
    class), and a wheel movement too small to step no longer scrolls the page.
  */
  const attachWheel = useBoardStepInput({
    enabled: isInGame && fenHistory.length > 1,
    onBack: () => {
      setReviewPosition(null);
      setViewPly(current => {
        const ply = current !== null ? Math.min(current, fenHistory.length - 1) : fenHistory.length - 1;
        return Math.max(0, ply - 1);
      });
    },
    onForward: () => {
      setReviewPosition(null);
      setViewPly(current => {
        if (current === null) return null;
        const next = current + 1;
        return next >= fenHistory.length - 1 ? null : next;
      });
    },
  });

  const currentPly = viewPly !== null ? Math.min(viewPly, fenHistory.length - 1) : fenHistory.length - 1;
  const isAtLatest = viewPly === null || viewPly >= fenHistory.length - 1;
  const histEntry = !isAtLatest ? (fenHistory[currentPly] ?? null) : null;
  // The move list shows and sets the VIEWED move, as the step buttons do (D30). Only in a
  // game, where those buttons are enabled too.
  const jumpToMove = isInGame && fenHistory.length > 1
    ? (moveIndex: number) => {
        setReviewPosition(null);
        const ply = moveIndex + 1;
        setViewPly(ply >= fenHistory.length - 1 ? null : ply);
      }
    : undefined;

  // Persist settings when they change
  useEffect(() => {
    localStorage.setItem('lastTimeControl', selectedPreset.name);
  }, [selectedPreset.name]);
  useEffect(() => {
    localStorage.setItem('lastRatedPreference', JSON.stringify(rated));
  }, [rated]);

  // Challenge URL handling
  const urlChallengeId = searchParams.get('challenge');
  useEffect(() => {
    if (!urlChallengeId) return;
    setFriendExpanded(true);
    setAcceptPending(false); // a new invitation is not answerable for the old one's failure
    setIncomingChallenge('loading');
    fetch(`${env.apiBaseUrl}/api/challenges/${urlChallengeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setIncomingChallenge('not_found'); return; }
        setIncomingChallenge({
          challengeId: data.challengeId,
          creatorUsername: data.creatorUsername,
          timeControl: data.timeControl,
          rated: data.rated,
        });
      })
      .catch(() => setIncomingChallenge('not_found'));
  }, [urlChallengeId]);

  // Clear a consumed invitation once the game starts, or once the player goes
  // back to the lobby from a finished game.
  //
  // Only on a phase TRANSITION. This effect also runs on mount, where `phase`
  // is already 'lobby' — so without the guard it stripped `?challenge=` and
  // nulled the invitation the instant an invited friend opened the link, before
  // the fetch above could even resolve. The friend saw an ordinary lobby and
  // the invite was unusable.
  const prevPhaseRef = useRef<typeof phase | null>(null);
  useEffect(() => {
    const previousPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (previousPhase === null) return; // mount: no transition happened
    if (phase === 'playing' || phase === 'lobby') {
      if (searchParams.has('challenge')) setSearchParams({});
      setIncomingChallenge(null);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save finished game to sessionStorage
  useEffect(() => {
    if (phase !== 'ended' || !gameResult || !opponent) return;
    const session: SavedSession = {
      game: { fen, sanMoves, playerColor, opponent, whiteMs, blackMs, gameResult },
      presetName: selectedPreset.name,
      rated,
    };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const opponentMs = opponentColor === 'white' ? whiteMs : blackMs;
  const playerMs = playerColor === 'white' ? whiteMs : blackMs;
  const activeClockSide = isGameOver ? null : turnColor;
  const challengeUrl = challengeId
    ? `${window.location.origin}/play-online?challenge=${challengeId}`
    : null;

  // Board display: after a game, the finished or selected historical position
  // becomes an analysis sandbox. Moves made there are local only and never go
  // back through the online-game socket.
  const reviewBaseFen = isInGame
    ? (histEntry ? histEntry.fen : fen)
    : STARTING_FEN;
  const reviewBasePosition = useMemo(
    () => (isGameOver ? positionFromFen(reviewBaseFen) : null),
    [isGameOver, reviewBaseFen],
  );
  const activeReviewPosition = reviewPosition?.position ?? reviewBasePosition;
  const boardFen = reviewPosition?.position.fen ?? reviewBaseFen;
  const naturalOrientation = isInGame ? playerColor : 'white';
  const boardOrientation = boardFlipped
    ? (naturalOrientation === 'white' ? 'black' : 'white')
    : naturalOrientation;
  const boardDests = isGameOver
    ? activeReviewPosition?.dests
    : (isInGame && !histEntry ? dests : undefined);
  const boardTurnColor = isGameOver && activeReviewPosition
    ? activeReviewPosition.turnColor
    : isInGame
    ? (histEntry ? histEntry.turnColor : turnColor)
    : 'white';
  const boardMovableColor = isGameOver
    ? activeReviewPosition?.turnColor
    : (isInGame && !histEntry ? movableColor : undefined);
  const boardLastMove = reviewPosition
    ? reviewPosition.lastMove
    : isInGame
    ? (histEntry ? histEntry.lastMove : lastMove)
    : undefined;
  const boardCheck = reviewPosition
    ? (reviewPosition.position.isCheck ? reviewPosition.position.turnColor : undefined)
    : isInGame
    ? (histEntry
        ? (histEntry.isCheck ? histEntry.turnColor : undefined)
        : (isCheck ? turnColor : undefined))
    : undefined;
  const handleReviewMove = useCallback((orig: Key, dest: Key) => {
    if (!isGameOver) return;
    const position = reviewPosition?.position ?? reviewBasePosition;
    if (!position) return;
    const promotion = isPromotion(position, orig, dest) ? 'q' : undefined;
    const next = applyMove(position, toUci(orig, dest, promotion));
    if (!next) return;
    setReviewPosition({ position: next, lastMove: [orig, dest] });
  }, [isGameOver, reviewPosition, reviewBasePosition]);
  const boardOnMove = isGameOver
    ? handleReviewMove
    : (isInGame && !histEntry ? actions.onMove : undefined);

  const { currentTheme, changeTheme } = useBoardTheme();

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Leave for the computer game. Cancels the seek first — leaving a live seek
   * in the queue after the player has gone would pair a real opponent against
   * an empty chair, which is the one thing worse for pool-building than an
   * empty pool.
   */
  const goPlayComputer = () => {
    logGA4Event({
      name: 'online_seek_fallback_taken',
      params: { time_control: selectedPreset.name, from_phase: phase },
    });
    if (phase === 'seeking') actions.cancelSeek();
    navigate('/play');
  };

  /**
   * The moment a visitor actually asks for a game.
   *
   * Until 2026-08-02 nothing was recorded here, so the most basic question about
   * this page — do people who land on it press the button? — had no answer in
   * GA4 or in the server logs. `online_seek_unmatched` fires 20s later and only
   * for those who wait that long, which cannot distinguish "nobody pressed Play"
   * from "everybody pressed Play and found an empty pool". This event is the
   * denominator for both of those.
   */
  const handleQuickPlay = () => {
    logGA4Event({
      name: 'online_seek_started',
      params: {
        time_control: selectedPreset.name,
        rated,
        connection_state: connectionState,
      },
    });
    actions.seek(
      { initial: selectedPreset.initial, increment: selectedPreset.increment },
      rated,
    );
  };

  const handleNewGame = () => {
    setResultDismissed(false);
    clearSavedSession();
    actions.newGame(
      { initial: selectedPreset.initial, increment: selectedPreset.increment },
      rated,
    );
  };

  const handlePostGameChallenge = () => {
    clearSavedSession();
    actions.returnToLobby();
    setFriendExpanded(true);
  };

  const handleCopyChallengeLink = async () => {
    if (!challengeUrl) return;
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setChallengeLinkCopied(true);
      clearTimeout(challengeCopyTimerRef.current);
      challengeCopyTimerRef.current = setTimeout(() => setChallengeLinkCopied(false), 2000);
    } catch {
      setChallengeLinkCopied(false);
    }
  };

  const handleConfirmDrawOffer = () => {
    actions.offerDraw();
    setConfirmDraw(false);
  };

  const leaveFocusMode = () => {
    logGA4Event({ name: 'focus_mode_toggled', params: { enabled: false, surface: 'play_online' } });
    setFocusMode(false);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  /* The two other ways to play, offered in the lobby and again when a game ends. */
  const otherWays = (onFriend: () => void) => (
    <div className="grid grid-cols-2" style={{ gap: 'calc(var(--card-air) * 2)' }}>
      <button type="button" onClick={onFriend} className="card-btn px-[0.5em] text-[0.86em] text-muted-foreground hover:text-foreground">
        <span className="truncate">Challenge a friend</span>
      </button>
      <button type="button" onClick={() => navigate('/play')} className="card-btn px-[0.5em] text-[0.86em] text-muted-foreground hover:text-foreground">
        <span className="truncate">Play computer</span>
      </button>
    </div>
  );
  const spinner = <div className="mx-auto h-[2.2em] w-[2.2em] animate-spin rounded-full border-[0.25em] border-primary border-t-transparent" />;

  return (
    <main className="contents">
      {/* Both read `src/config/route-meta.json`; the `<h1>` is `sr-only` because
          nothing may sit above the board (PRD 5.2). */}
      <SeoHead routeKey="play-online" />
      <div className="sr-only"><RouteHeading routeKey="play-online" /></div>

      {/* The toggle lives in the context lane's foot, which focus mode removes,
          so the exit is a fixed control with the shortcut named on it. */}
      {focusMode && (
        <button
          type="button"
          onClick={leaveFocusMode}
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
          /* The wheel step-through listens on the board. */
          <div ref={attachWheel} data-skeleton-card="board" className="relative w-full" role="group" aria-label="Online chess board">
            <ChessBoard
              fen={boardFen}
              orientation={boardOrientation}
              dests={boardDests}
              turnColor={boardTurnColor}
              movableColor={boardMovableColor}
              lastMove={boardLastMove}
              check={boardCheck}
              onMove={boardOnMove}
              themeId={currentTheme.id}
              dragDistance={7}
              autoDragDistance={false}
            />
            {isGameOver && gameResult && !resultDismissed && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-sm bg-[hsl(var(--overlay)/0.6)]">
                <div className="surface-card relative rounded-xl px-8 py-5 text-center shadow-2xl">
                  <button type="button" onClick={() => setResultDismissed(true)} className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground" aria-label="Dismiss result"><X className="h-5 w-5" /></button>
                  <div className="mt-1 text-2xl font-bold">{formatResult(gameResult, playerColor).headline}</div>
                  <div className="mt-2 text-sm capitalize text-muted-foreground">{formatResult(gameResult, playerColor).detail}</div>
                </div>
              </div>
            )}
          </div>
        }
        toolbar={
          <BoardControls
            historyDisabled={!isInGame || fenHistory.length <= 1}
            onStart={() => { setReviewPosition(null); setViewPly(0); }}
            onBack={() => { setReviewPosition(null); setViewPly(current => {
              const ply = current !== null ? Math.min(current, fenHistory.length - 1) : fenHistory.length - 1;
              return Math.max(0, ply - 1);
            }); }}
            onForward={() => { setReviewPosition(null); setViewPly(current => {
              if (current === null) return null;
              const next = current + 1;
              return next >= fenHistory.length - 1 ? null : next;
            }); }}
            onReset={() => { setReviewPosition(null); setViewPly(null); }}
            onFlip={() => setBoardFlipped(value => !value)}
          />
        }
        activity={{
          title: 'Game',
          cards: [
            /*
              THE GAME CARD, KEPT IN FOCUS MODE. Its phase changes what it holds
              but never its size: the move list takes the height that is left and
              scrolls inside a `WorkspaceList`, the one scroller a card may hold.
              D2a moves this card as it is; whether each phase's content fits the
              smallest card is measured in D2b.
            */
            slot('online-live', 'onlineLive', (
              <div className="card-body" aria-label="Online game workspace">
                <span className="card-row">
                  {isInGame ? <Radio className="shrink-0 text-link" aria-hidden /> : <Swords className="shrink-0 text-link" aria-hidden />}
                  <span className="truncate font-semibold text-foreground">
                    {phase === 'playing' ? 'Live game' : phase === 'ended' ? 'Game review' : phase === 'seeking' ? 'Finding a game' : phase === 'challenging' ? 'Friend challenge' : 'Play online'}
                  </span>
                  <span className={`ml-auto inline-flex shrink-0 items-center gap-[0.3em] text-[0.8em] ${isConnected ? 'text-live' : 'text-warning'}`}>
                    {isConnected ? <Wifi /> : <WifiOff />}
                    {isConnected ? 'Connected' : connectionState === 'failed' ? 'Offline' : 'Reconnecting'}
                  </span>
                </span>
                <span className="card-row text-[0.86em]">{selectedPreset.name} · {rated ? 'Rated' : 'Casual'}</span>

                {phase === 'lobby' && (
                  <>
                    {connectionStalled && <SeekFallback variant="sidebar" onPlayComputer={goPlayComputer} reason="Can't reach the game server from this network." />}
                    {urlChallengeId && incomingChallenge && (
                      <div className="rounded-[0.5em] border border-primary/30 bg-primary/5 p-[0.6em] text-[0.92em]">
                        {incomingChallenge === 'loading' && <div className="text-muted-foreground">Loading challenge…</div>}
                        {incomingChallenge === 'not_found' && (
                          <div className="flex flex-col items-center gap-[0.4em] text-center">
                            <div className="font-medium">Challenge not found or expired.</div>
                            <button type="button" onClick={() => { setSearchParams({}); setIncomingChallenge(null); }} className="text-[0.86em] text-muted-foreground underline">Dismiss</button>
                          </div>
                        )}
                        {incomingChallenge !== 'loading' && incomingChallenge !== 'not_found' && acceptPending && lastError && ['CHALLENGE_NOT_FOUND', 'CHALLENGE_EXPIRED', 'ALREADY_IN_GAME', 'CANNOT_ACCEPT_OWN_CHALLENGE'].includes(lastError.code) && (
                          <div className="flex flex-col items-center gap-[0.4em] text-center">
                            <div className="font-medium">{lastError.message}</div>
                            <button type="button" onClick={() => { setSearchParams({}); setIncomingChallenge(null); }} className="text-[0.86em] text-muted-foreground underline">Dismiss</button>
                          </div>
                        )}
                        {incomingChallenge !== 'loading' && incomingChallenge !== 'not_found' && !(acceptPending && lastError && ['CHALLENGE_NOT_FOUND', 'CHALLENGE_EXPIRED', 'ALREADY_IN_GAME', 'CANNOT_ACCEPT_OWN_CHALLENGE'].includes(lastError.code)) && (
                          <div className="flex flex-col gap-[0.4em]">
                            <div><span className="font-semibold text-link">{incomingChallenge.creatorUsername}</span> challenges you</div>
                            <div className="text-[0.86em] text-muted-foreground">
                              {incomingChallenge.timeControl.initial >= 60 ? `${incomingChallenge.timeControl.initial / 60}+${incomingChallenge.timeControl.increment}` : `${incomingChallenge.timeControl.initial}s+${incomingChallenge.timeControl.increment}`}
                              {' · '}{incomingChallenge.rated ? 'Rated' : 'Casual'}
                            </div>
                            <button type="button" onClick={() => { setAcceptPending(true); actions.acceptChallenge(incomingChallenge.challengeId); }} disabled={!isConnected} className="card-btn card-btn-primary w-full disabled:opacity-50">Accept challenge</button>
                          </div>
                        )}
                      </div>
                    )}
                    {friendExpanded && (
                      <div className="flex flex-col rounded-[0.5em] border border-border bg-accent/20 p-[0.6em]" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                        <div className="text-[0.92em] font-medium text-foreground">Challenge a friend</div>
                        <div className="grid grid-cols-3" style={{ gap: 'var(--card-air)' }}>
                          {(['white', 'random', 'black'] as const).map(color => <button key={color} type="button" onClick={() => setChallengeColor(color)} aria-pressed={challengeColor === color} className={`rounded-[0.3em] border px-[0.4em] py-[0.2em] text-[0.86em] capitalize ${challengeColor === color ? 'border-primary bg-primary/10 text-link' : 'border-border'}`}>{color}</button>)}
                        </div>
                        <button type="button" onClick={() => actions.createChallenge({ initial: selectedPreset.initial, increment: selectedPreset.increment }, rated, challengeColor)} disabled={!isConnected} className="card-btn card-btn-primary w-full disabled:opacity-50">Create challenge link</button>
                      </div>
                    )}
                    <div className="mt-auto flex flex-col" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                      <button type="button" onClick={handleQuickPlay} disabled={!isConnected} className="card-btn card-btn-primary w-full hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                        New game
                      </button>
                      {otherWays(() => setFriendExpanded(open => !open))}
                      <GuestBadge context="play-online" inCard />
                    </div>
                  </>
                )}

                {phase === 'seeking' && (
                  <div className="my-auto flex flex-col items-center text-center" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                    {spinner}
                    {/* The second line went on 2026-08-22 (issue #27): it told
                        the reader the board was ready, which they can see, and
                        that they could cancel, which the button below it says. */}
                    <div className="font-semibold text-foreground">Searching for an opponent…</div>
                    {seekUnmatched && <SeekFallback variant="sidebar" onPlayComputer={goPlayComputer} />}
                    <button type="button" onClick={actions.cancelSeek} className="card-btn px-[1em] text-[0.92em]">Cancel search</button>
                  </div>
                )}

                {phase === 'challenging' && (
                  <div className="my-auto flex flex-col items-center text-center" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                    {spinner}
                    <div className="font-semibold text-foreground">Waiting for your friend…</div>
                    {challengeUrl && (
                      <div className="flex w-full items-center gap-[0.4em] rounded-[0.4em] border border-border bg-muted/30 p-[0.4em]">
                        <span className="min-w-0 flex-1 truncate text-left font-mono text-[0.8em] text-muted-foreground">{challengeUrl}</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={handleCopyChallengeLink}
                            className={`rounded p-[0.3em] transition-all duration-200 hover:bg-accent/50 ${challengeLinkCopied ? 'scale-110 bg-success/15 text-success' : ''}`}
                            aria-label={challengeLinkCopied ? 'Challenge link copied' : 'Copy challenge link'}
                          >
                            {challengeLinkCopied ? <Check /> : <Copy />}
                          </button>
                          {challengeLinkCopied && (
                            <div role="status" aria-live="polite" className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-lg animate-in fade-in zoom-in-95">
                              Link copied
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <button type="button" onClick={actions.cancelChallenge} className="card-btn px-[1em] text-[0.92em]">Cancel challenge</button>
                  </div>
                )}

                {isInGame && (
                  <>
                    {(showReconnectBanner || opponentDisconnected || connectionState === 'replaced' || connectionState === 'failed') && (
                      <div className="flex flex-col gap-[0.4em] rounded-[0.5em] border border-warning/30 bg-warning/10 p-[0.6em] text-[0.92em] text-warning">
                        <div>{connectionState === 'replaced' ? 'This game is open on another device or tab.' : connectionState === 'failed' ? 'The game server is unreachable.' : opponentDisconnected ? 'Opponent disconnected. Their clock continues.' : 'Reconnecting to your game…'}</div>
                        {connectionState === 'replaced' && phase === 'playing' && (
                          <button type="button" onClick={actions.retryConnection} className="self-start rounded border border-warning/40 px-[0.6em] py-[0.25em] text-[0.86em] font-medium hover:bg-warning/10">Play here instead</button>
                        )}
                        {connectionState === 'failed' && phase === 'playing' && (
                          <div className="flex gap-[0.4em]">
                            <button type="button" onClick={actions.retryConnection} className="rounded border border-warning/40 px-[0.6em] py-[0.25em] text-[0.86em] font-medium hover:bg-warning/10">Retry connection</button>
                            <button type="button" onClick={actions.returnToLobby} className="rounded bg-primary px-[0.6em] py-[0.25em] text-[0.86em] font-medium text-primary-foreground">Return to lobby</button>
                          </div>
                        )}
                      </div>
                    )}
                    {drawOfferedByOpponent && phase === 'playing' && (
                      <div className="flex flex-col gap-[0.4em] rounded-[0.5em] border border-primary/30 bg-primary/5 p-[0.6em]">
                        <div className="text-[0.92em] font-medium text-foreground">Opponent offers a draw</div>
                        <div className="grid grid-cols-2" style={{ gap: 'var(--card-air)' }}>
                          <button type="button" onClick={actions.acceptDraw} className="card-btn card-btn-primary">Accept</button>
                          <button type="button" onClick={actions.declineDraw} className="card-btn">Decline</button>
                        </div>
                      </div>
                    )}
                    <span className="card-row justify-between text-[0.8em] uppercase tracking-wide">
                      <span>Moves</span>
                      {/* No "Move N" label (owner, 2026-10-10): the list marks the move shown. */}
                    </span>
                    <div className="flex min-h-0 flex-1 flex-col">
                      <WorkspaceList label="Moves">
                        <GameMoveList moves={sanMoves} currentMoveIndex={currentPly - 1} onMoveClick={jumpToMove} scrolls={false} className="text-[0.92em]" />
                      </WorkspaceList>
                    </div>
                  </>
                )}

                {phase === 'playing' && (
                  <div className="flex flex-col" style={{ gap: 'var(--card-air)' }}>
                    {drawOfferStatus === 'error' && lastError?.code.startsWith('DRAW_OFFER') && (
                      <p role="alert" className="text-center text-[0.8em] text-destructive">{lastError.message}</p>
                    )}
                    {confirmDraw ? (
                      <>
                        <p className="text-center text-[0.8em] text-muted-foreground">Offer your opponent a draw?</p>
                        <div className="grid grid-cols-2" style={{ gap: 'var(--card-air)' }}>
                          <button type="button" onClick={handleConfirmDrawOffer} className="card-btn card-btn-primary">Confirm offer</button>
                          <button type="button" onClick={() => setConfirmDraw(false)} className="card-btn">Cancel</button>
                        </div>
                      </>
                    ) : confirmResign ? (
                      <div className="grid grid-cols-2" style={{ gap: 'var(--card-air)' }}>
                        <button type="button" onClick={() => { setConfirmResign(false); actions.resign(); }} className="card-btn bg-destructive text-destructive-foreground" style={{ background: 'hsl(var(--destructive))' }}>Resign</button>
                        <button type="button" onClick={() => setConfirmResign(false)} className="card-btn">Cancel</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2" style={{ gap: 'var(--card-air)' }}>
                        <button type="button" onClick={() => setConfirmDraw(true)} disabled={drawOfferSent || drawOfferStatus === 'pending'} className={`card-btn border px-[0.4em] text-[0.92em] transition-all ${drawOfferSent ? 'border-success/40 text-success' : 'border-border'}`} style={{ background: drawOfferSent ? 'hsl(var(--success) / 0.1)' : 'transparent' }}>
                          {drawOfferSent && <Check aria-hidden />}
                          <span className="truncate">{drawOfferSent ? 'Draw offer sent' : drawOfferStatus === 'pending' ? 'Sending…' : 'Offer draw'}</span>
                        </button>
                        <button type="button" onClick={() => setConfirmResign(true)} className="card-btn border border-destructive/50 text-[0.92em] text-destructive" style={{ background: 'transparent' }}>Resign</button>
                      </div>
                    )}
                  </div>
                )}
                {phase === 'ended' && (
                  <div className="flex flex-col" style={{ gap: 'calc(var(--card-air) * 2)' }}>
                    <button type="button" onClick={handleNewGame} className="card-btn card-btn-primary w-full">New game</button>
                    {otherWays(handlePostGameChallenge)}
                  </div>
                )}
              </div>
            ), 1, true),
          ],
          foot: footSlot('analysis', (
            <PuzzleAnalysisCard enabled={isGameOver} fen={boardFen} linkFen={fen} orientation={boardOrientation} surface="play_online" />
          )),
        }}
        context={{
          title: 'Game setup',
          cards: [
            slot('online-settings', 'onlineSettings', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Swords className="text-link" aria-hidden />
                  Game settings
                </span>
                <div className="card-body">
                  <TimeControlPicker preset={selectedPreset} onPreset={setSelectedPreset} rated={rated} onRated={setRated} />
                  {phase === 'seeking' ? (
                    <button type="button" onClick={actions.cancelSeek} className="card-btn mt-auto w-full text-[0.92em]">Cancel search</button>
                  ) : null}
                </div>
              </>
            ), 2),
            slot('online-opponent', 'playPlayer', (
              <PlayerCard
                icon={<CircleUserRound aria-hidden />}
                label="Opponent"
                name={opponent?.username ?? (phase === 'seeking' ? 'Finding opponent…' : 'Waiting for opponent')}
                detail={opponent ? `Rating ${opponent.rating}` : `${selectedPreset.category} pairing`}
                clock={<ChessClock timeMs={isInGame ? opponentMs : selectedPreset.initial * 1000} isActive={activeClockSide === opponentColor} isGameOver={!isInGame || isGameOver} className={PLAYER_CLOCK_CLASS} />}
              />
            )),
            slot('online-you', 'playPlayer', (
              <PlayerCard
                icon={<Trophy aria-hidden />}
                label="You"
                name={user?.username ?? 'Guest player'}
                detail={user ? (rated ? 'Rated game' : 'Casual game') : 'Sign in to track your rating'}
                clock={<ChessClock timeMs={isInGame ? playerMs : selectedPreset.initial * 1000} isActive={activeClockSide === playerColor} isGameOver={!isInGame || isGameOver} className={PLAYER_CLOCK_CLASS} />}
              />
            )),
            slot('online-go-to', 'playGoTo', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Link2 aria-hidden />
                  Go to
                </span>
                <div className="card-body" style={{ gap: 0 }}>
                  <button type="button" onClick={() => navigate('/game-history')} className="card-row w-full py-[0.16em] text-left hover:text-foreground">
                    <span>Game history</span>
                    <ChevronRight className="ml-auto shrink-0" />
                  </button>
                </div>
              </>
            )),
          ],
          foot: footSlot('theme-focus', (
            <PuzzleAppearanceCard
              currentThemeId={currentTheme.id}
              onThemeChange={changeTheme}
              analyticsSurface="play_online"
              focusMode={focusMode}
              onToggleFocusMode={canFocus ? () => setFocusMode(value => !value) : undefined}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(soundService.toggleEnabled())}
            />
          )),
        }}
      />
    </main>
  );
}

export default PlayOnline;
