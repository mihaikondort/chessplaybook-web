import { useEffect, useRef, useState, useCallback } from 'react';
import type { Key, Color, Dests } from '@lichess-org/chessground/types';
import { useAuth } from '@/features/auth/AuthContext';
import { getAuthToken } from '@/features/auth/utils/getAuthToken';
import { getAnonymousId } from '@/hooks/useAnonymousId';
import {
  positionFromFen,
  applyMove,
  toUci,
  uciToSan,
  isPromotion,
} from '@/components/chess/chessLogic';
import type { ChessPosition } from '@/components/chess/chessLogic';
import { useWebSocket } from './useWebSocket';
import { alertMatchFound, stopMatchAlert, requestMatchNotificationPermission } from '../matchAlert';
import type { ConnectionState } from './useWebSocket';
import type { ClientMessage, ServerMessage, GameEndPayload } from '../protocol';
import { soundService } from '@/services/SoundService';

export type GamePhase = 'lobby' | 'seeking' | 'challenging' | 'playing' | 'ended';

/** Snapshot of a finished game persisted to sessionStorage for same-session recall. */
export interface SavedEndedGame {
  fen: string;
  sanMoves: string[];
  playerColor: 'white' | 'black';
  opponent: { username: string; rating: number };
  whiteMs: number;
  blackMs: number;
  gameResult: GameEndPayload;
}

export interface OnlineGameState {
  isConnected: boolean;
  connectionState: ConnectionState;
  phase: GamePhase;
  /**
   * Last error the server sent, or null. Surfaced so the UI can tell the user
   * why an action failed instead of only logging it to the console — an
   * expired challenge used to leave a live-looking Accept button that did
   * nothing when clicked.
   */
  lastError: { code: string; message: string } | null;
  // Board
  fen: string;
  dests: Dests | undefined;
  turnColor: Color;
  movableColor: Color | undefined;
  lastMove: Key[] | undefined;
  isCheck: boolean;
  sanMoves: string[];
  playerColor: Color;
  // Players
  opponent: { username: string; rating: number } | null;
  // Clocks (server-authoritative snapshots updated on each move)
  whiteMs: number;
  blackMs: number;
  // Draw
  drawOfferedByOpponent: boolean;
  drawOfferStatus: 'idle' | 'pending' | 'sent' | 'error';
  // Result
  gameResult: GameEndPayload | null;
  // Opponent connection status
  opponentDisconnected: boolean;
  // Challenge (vs Friend)
  challengeId: string | null;
}

export interface OnlineGameActions {
  retryConnection: () => void;
  seek: (timeControl: { initial: number; increment: number }, rated: boolean) => void;
  cancelSeek: () => void;
  onMove: (orig: Key, dest: Key) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  returnToLobby: () => void;
  newGame: (timeControl: { initial: number; increment: number }, rated: boolean) => void;
  createChallenge: (timeControl: { initial: number; increment: number }, rated: boolean, color?: 'white' | 'black' | 'random') => void;
  cancelChallenge: () => void;
  acceptChallenge: (challengeId: string) => void;
}

export function useOnlineGame(savedGame?: SavedEndedGame | null): [OnlineGameState, OnlineGameActions] {
  const { user } = useAuth();

  // Stable ref to avoid stale closures inside handleMessage
  const userRef = useRef(user);
  userRef.current = user;

  // Pass getAuthToken as a function so useWebSocket fetches a fresh token on
  // every connect attempt (handles expired tokens after long sleep/inactivity).

  // Anti-cheat: count tab switches while a game is active
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && phaseRef.current === 'playing') {
        tabSwitchesRef.current++;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // ---------------------------------------------------------------------------
  // Game state
  // ---------------------------------------------------------------------------

  // Lazy-initialize from a saved game so the component mounts in 'ended' phase
  // with no lobby flash when the user returns within the same session.
  const [phase, setPhase] = useState<GamePhase>(() => savedGame ? 'ended' : 'lobby');
  const [position, setPosition] = useState<ChessPosition | null>(() =>
    savedGame ? positionFromFen(savedGame.fen) : null
  );
  const [sanMoves, setSanMoves] = useState<string[]>(() => savedGame?.sanMoves ?? []);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);
  const [playerColor, setPlayerColor] = useState<Color>(() => savedGame?.playerColor ?? 'white');
  const [opponent, setOpponent] = useState<{ username: string; rating: number } | null>(() =>
    savedGame?.opponent ?? null
  );
  const [whiteMs, setWhiteMs] = useState(() => savedGame?.whiteMs ?? 0);
  const [blackMs, setBlackMs] = useState(() => savedGame?.blackMs ?? 0);
  const [drawOfferedByOpponent, setDrawOfferedByOpponent] = useState(false);
  const [drawOfferStatus, setDrawOfferStatus] = useState<'idle' | 'pending' | 'sent' | 'error'>('idle');
  const [gameResult, setGameResult] = useState<GameEndPayload | null>(() =>
    savedGame?.gameResult ?? null
  );
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  // Stable refs for use inside useCallback without re-creating them
  const gameIdRef = useRef<string | null>(null);
  const positionRef = useRef<ChessPosition | null>(savedGame ? positionFromFen(savedGame.fen) : null);
  const playerColorRef = useRef<Color>(savedGame?.playerColor ?? 'white');

  // Anti-cheat: tab-switch tracking
  const tabSwitchesRef = useRef(0);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  const phaseRef = useRef<GamePhase>('lobby');
  const sendRef = useRef<((msg: ClientMessage) => void) | null>(null);
  phaseRef.current = phase;

  /**
   * The seek the user asked for, retained so it can be re-sent if the server
   * turns out not to hold one.
   *
   * The server restores a parked seek on reconnect, which covers the normal
   * case. This ref covers the one it cannot: a backend restart, which clears
   * the in-memory pool entirely. Together they make seeks durable without
   * persisting them to disk.
   */
  const seekIntentRef = useRef<{ timeControl: { initial: number; increment: number }; rated: boolean } | null>(null);

  // ---------------------------------------------------------------------------
  // Message handler
  // All setState calls are stable — no deps needed on the callback
  // ---------------------------------------------------------------------------

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'seek_ack':
        setPhase('seeking');
        break;

      case 'seek_cancelled':
        seekIntentRef.current = null;
        setPhase('lobby');
        break;

      /**
       * The server's view of whether we are seeking, sent on every connect.
       * It always wins — a spinner that cannot be contradicted is exactly how a
       * player sat "searching" for minutes against an empty pool.
       */
      case 'seek_state': {
        if (msg.payload.seeking) {
          // Server restored a parked seek. Reflect it, don't re-send.
          if (phaseRef.current === 'lobby') setPhase('seeking');
        } else if (phaseRef.current === 'seeking') {
          // We believe we're seeking and the server disagrees — it restarted, or
          // the seek expired. Re-send once; if that fails, seek_ack never
          // arrives and the UI is corrected rather than lying.
          const intent = seekIntentRef.current;
          if (intent) {
            sendRef.current?.({ type: 'seek', payload: { timeControl: intent.timeControl, rated: intent.rated } });
          } else {
            setPhase('lobby');
          }
        }
        break;
      }

      /**
       * A candidate match. Answer immediately to prove this tab is awake.
       *
       * Auto-accepted, deliberately: this is a liveness check, not a consent
       * step. Asking the user to confirm would add a click to the one moment
       * that matters and would fail for exactly the people who are present but
       * not looking at the screen.
       *
       * ACCEPTED EVEN WHEN THE TAB IS HIDDEN, changed 2026-08-02. It used to
       * require `document.visibilityState === 'visible'`, and that cost a real
       * game: a pairing was offered to a live socket here, accepted by the
       * opponent, and timed out because this side stayed silent.
       *
       * The reasoning behind the old gate was that a backgrounded tab means an
       * absent player. In a pool this thin the opposite holds — searches run
       * for tens of minutes and nobody watches a tab that long, so the guard
       * fired on precisely the players who wanted a game most.
       *
       * The handshake does not lose its teeth, because visibility was never
       * what it actually tested. **This handler running at all is the liveness
       * proof.** A phone with its screen off suspends the page: the message
       * queues undelivered and no accept is sent, so the sleeping-phone case
       * the handshake exists for is still caught — by the 8s timeout, exactly
       * as designed. A backgrounded desktop tab does run this handler, and that
       * player is genuinely reachable; they just need calling back, which is
       * what `alertMatchFound` does.
       *
       * The residual risk is a player who left the machine with the tab open:
       * they accept and never arrive. That is a worse trade than it sounds
       * only if matches are plentiful. They are not — and an abandoned game is
       * already handled by the claim timer, whereas a declined match is gone.
       */
      case 'match_offer':
        sendRef.current?.({ type: 'match_accept', payload: { offerId: msg.payload.offerId } });
        if (document.visibilityState !== 'visible') alertMatchFound();
        break;

      case 'seek_expired':
        seekIntentRef.current = null;
        setPhase('lobby');
        setLastError({
          code: 'SEEK_EXPIRED',
          message: 'Your search timed out. Tap Play to search again.',
        });
        break;

      case 'game_start': {
        // A game started, so nothing that failed before it is still relevant.
        setLastError(null);
        // The tab may have been flashing "Opponent found"; the game is here now.
        stopMatchAlert();
        // The seek is consumed — never replay it on a later reconnect.
        seekIntentRef.current = null;
        const { gameId, white, black, timeControl, fen } = msg.payload;
        const myUserId = userRef.current?.userId || `anon:${getAnonymousId()}`;
        const myColor: Color = white.userId === myUserId ? 'white' : 'black';
        const opp = myColor === 'white' ? black : white;

        // Update refs first (read by other callbacks synchronously)
        gameIdRef.current = gameId;
        playerColorRef.current = myColor;

        setPlayerColor(myColor);
        setOpponent({ username: opp.username, rating: opp.rating });

        const initialMs = timeControl.initial * 1000;
        setWhiteMs(initialMs);
        setBlackMs(initialMs);
        setSanMoves([]);
        setLastMove(undefined);
        setDrawOfferedByOpponent(false);
        setGameResult(null);
        setOpponentDisconnected(false);
        setChallengeId(null);
        tabSwitchesRef.current = 0;

        const pos = positionFromFen(fen);
        positionRef.current = pos;
        setPosition(pos);
        setPhase('playing');
        break;
      }

      case 'game_move': {
        const { uci, san, fen, clocks } = msg.payload;
        const pos = positionFromFen(fen);
        positionRef.current = pos;
        setPosition(pos);
        setSanMoves(prev => [...prev, san]);
        setLastMove([uci.slice(0, 2) as Key, uci.slice(2, 4) as Key]);
        setWhiteMs(clocks.whiteMs);
        setBlackMs(clocks.blackMs);
        // A move implicitly declines any pending draw offer
        setDrawOfferedByOpponent(false);
        // Play sound based on SAN notation
        if (san.includes('+') || san.includes('#')) soundService.check();
        else if (san.startsWith('O-O')) soundService.castle();
        else if (san.includes('x')) soundService.capture();
        else soundService.move();
        break;
      }

      case 'game_end': {
        // Report tab-switch count to server for anti-cheat logging
        const endedGameId = gameIdRef.current;
        if (endedGameId) {
          sendRef.current?.({
            type: 'tab_report',
            payload: { gameId: endedGameId, tabSwitches: tabSwitchesRef.current },
          });
        }
        setGameResult(msg.payload);
        setPhase('ended');
        // Play game-end sound
        const { result } = msg.payload;
        const myColor = playerColorRef.current;
        if (result === '1/2-1/2') {
          soundService.gameEnd('draw');
        } else {
          const whiteWon = result === '1-0';
          soundService.gameEnd((myColor === 'white') === whiteWon ? 'win' : 'loss');
        }
        break;
      }

      case 'draw_offered':
        setDrawOfferedByOpponent(true);
        break;

      case 'draw_offer_ack':
        setDrawOfferStatus('sent');
        break;

      case 'draw_declined':
        // Our draw offer was declined — no state change needed (UI handles it)
        break;

      case 'game_state': {
        // Proactively sent by the server after a reconnect.
        // Restores the board, move list, and clocks to their current server state.
        // If gameIdRef is null (missed the original game_start), bootstrap from
        // the enhanced fields (white/black/drawOffer) that the server includes.
        const { gameId, fen, moves, clocks, status, white, black, drawOffer } = msg.payload;

        if (gameIdRef.current === null && white && black) {
          // Recover a missed game_start without resetting live state
          const myUserId = userRef.current?.userId || `anon:${getAnonymousId()}`;
          const myColor: Color = white.userId === myUserId ? 'white' : 'black';
          const opp = myColor === 'white' ? black : white;
          gameIdRef.current = gameId;
          playerColorRef.current = myColor;
          setPlayerColor(myColor);
          setOpponent({ username: opp.username, rating: opp.rating });
          setGameResult(null);
          setOpponentDisconnected(false);
          setChallengeId(null);
          tabSwitchesRef.current = 0;
        } else if (gameId !== gameIdRef.current) {
          break;
        }

        const pos = positionFromFen(fen);
        positionRef.current = pos;
        setPosition(pos);
        setSanMoves(moves);
        setWhiteMs(clocks.whiteMs);
        setBlackMs(clocks.blackMs);

        // Restore draw offer state from server
        if (drawOffer !== undefined) {
          const myColor = playerColorRef.current;
          const opponentColor = myColor === 'white' ? 'black' : 'white';
          setDrawOfferedByOpponent(drawOffer === opponentColor);
        }

        if (status === 'ended') {
          setPhase('ended');
        } else if (status === 'active') {
          setPhase('playing');
        }
        break;
      }

      case 'challenge_created':
        setChallengeId(msg.payload.challengeId);
        setPhase('challenging');
        break;

      case 'challenge_cancelled':
        setChallengeId(null);
        setPhase('lobby');
        break;

      case 'opponent_disconnected':
        setOpponentDisconnected(true);
        break;

      case 'opponent_reconnected':
        setOpponentDisconnected(false);
        break;

      case 'error':
        console.warn('[OnlineGame] Server error:', msg.payload.code, msg.payload.message);
        setLastError({ code: msg.payload.code, message: msg.payload.message });
        if (msg.payload.code === 'DRAW_OFFER_LIMIT') setDrawOfferStatus('error');
        break;

      default:
        break;
    }
  }, []); // no deps — all setters are stable, userRef is a ref

  const { send, isConnected, connectionState, retryNow } = useWebSocket(getAuthToken, handleMessage);
  sendRef.current = send;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const seek = useCallback((
    timeControl: { initial: number; increment: number },
    rated: boolean,
  ) => {
    // Retained so a seek lost to a backend restart can be replayed on reconnect.
    seekIntentRef.current = { timeControl, rated };
    // Asked here and nowhere else: the player has just chosen to wait for an
    // opponent, so being called back is obviously in their interest, and this
    // is a click-initiated moment. Never on page load — an unexplained prompt
    // on arrival is the one users reflexively deny, and a denial is permanent.
    requestMatchNotificationPermission();
    send({ type: 'seek', payload: { timeControl, rated } });
  }, [send]);

  const cancelSeek = useCallback(() => {
    seekIntentRef.current = null;
    stopMatchAlert();
    send({ type: 'seek_cancel' });
  }, [send]);

  const onMove = useCallback((orig: Key, dest: Key) => {
    const gid = gameIdRef.current;
    const pos = positionRef.current;
    if (!gid || !pos || pos.isGameOver) return;

    // Promotion defaults to queen (picker can be added later)
    const promo = isPromotion(pos, orig, dest) ? 'q' : '';
    const uci = toUci(orig, dest, promo);

    const newPos = applyMove(pos, uci);
    if (!newPos) return; // illegal move — chessground shouldn't allow this

    // Optimistic board update — position changes immediately, SANs wait for server
    positionRef.current = newPos;
    setPosition(newPos);
    setLastMove([orig, dest]);

    // Send to server — game_move response will confirm and add SAN
    send({ type: 'move', payload: { gameId: gid, uci, timestamp: Date.now() } });
  }, [send]);

  const resign = useCallback(() => {
    const gid = gameIdRef.current;
    if (gid) send({ type: 'resign', payload: { gameId: gid } });
  }, [send]);

  const offerDraw = useCallback(() => {
    const gid = gameIdRef.current;
    if (!gid || !isConnected) {
      setLastError({ code: 'DRAW_OFFER_DISCONNECTED', message: 'Reconnect before offering a draw' });
      setDrawOfferStatus('error');
      return;
    }
    setLastError(null);
    setDrawOfferStatus('pending');
    send({ type: 'draw_offer', payload: { gameId: gid } });
  }, [isConnected, send]);

  const acceptDraw = useCallback(() => {
    const gid = gameIdRef.current;
    if (gid) send({ type: 'draw_accept', payload: { gameId: gid } });
  }, [send]);

  const declineDraw = useCallback(() => {
    const gid = gameIdRef.current;
    if (gid) send({ type: 'draw_decline', payload: { gameId: gid } });
    setDrawOfferedByOpponent(false);
  }, [send]);

  const createChallenge = useCallback((
    timeControl: { initial: number; increment: number },
    rated: boolean,
    color?: 'white' | 'black' | 'random',
  ) => {
    send({ type: 'challenge_create', payload: { timeControl, rated, color } });
  }, [send]);

  const cancelChallenge = useCallback(() => {
    send({ type: 'challenge_cancel' });
  }, [send]);

  const acceptChallenge = useCallback((challengeId: string) => {
    send({ type: 'challenge_accept', payload: { challengeId } });
  }, [send]);

  const returnToLobby = useCallback(() => {
    gameIdRef.current = null;
    positionRef.current = null;
    setPhase('lobby');
    setPosition(null);
    setSanMoves([]);
    setLastMove(undefined);
    setOpponent(null);
    setWhiteMs(0);
    setBlackMs(0);
    setDrawOfferedByOpponent(false);
    setGameResult(null);
    setOpponentDisconnected(false);
    setChallengeId(null);
  }, []);

  // Resets game state and immediately starts seeking — skips the lobby entirely
  // so the user goes straight from the ended game to the seeking spinner.
  const newGame = useCallback((
    timeControl: { initial: number; increment: number },
    rated: boolean,
  ) => {
    gameIdRef.current = null;
    positionRef.current = null;
    tabSwitchesRef.current = 0;
    setPosition(null);
    setSanMoves([]);
    setLastMove(undefined);
    setOpponent(null);
    setWhiteMs(0);
    setBlackMs(0);
    setDrawOfferedByOpponent(false);
    setGameResult(null);
    setOpponentDisconnected(false);
    setChallengeId(null);
    // Set seeking phase optimistically so the UI transitions immediately
    setPhase('seeking');
    send({ type: 'seek', payload: { timeControl, rated } });
  }, [send]);

  // ---------------------------------------------------------------------------
  // Derived values for ChessBoard
  // ---------------------------------------------------------------------------

  const isOurTurn = position?.turnColor === playerColor;
  const movableColor: Color | undefined =
    phase === 'playing' && isOurTurn ? playerColor : undefined;

  const state: OnlineGameState = {
    isConnected,
    connectionState,
    phase,
    lastError,
    fen: position?.fen ?? 'start',
    dests: position?.dests,
    turnColor: position?.turnColor ?? 'white',
    movableColor,
    lastMove,
    isCheck: position?.isCheck ?? false,
    sanMoves,
    playerColor,
    opponent,
    whiteMs,
    blackMs,
    drawOfferedByOpponent,
    drawOfferStatus,
    gameResult,
    opponentDisconnected,
    challengeId,
  };

  const actions: OnlineGameActions = {
    retryConnection: retryNow,
    seek,
    cancelSeek,
    onMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    returnToLobby,
    newGame,
    createChallenge,
    cancelChallenge,
    acceptChallenge,
  };

  return [state, actions];
}
