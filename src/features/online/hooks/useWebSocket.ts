import { useEffect, useRef, useState, useCallback } from 'react';
import env from '@/config/env';
import { getAnonymousId } from '@/hooks/useAnonymousId';
import type { ClientMessage, ServerMessage } from '../protocol';

// Reconnection backoff delays in ms: 1s, 2s, 4s, 8s, 16s (then caps)
const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000];

// After this many failed attempts, stop retrying and set state to 'failed'.
// Total elapsed: 1+2+4+8+(8*16) = ~143s ≈ 2.5 minutes before giving up.
const MAX_RECONNECT_ATTEMPTS = 12;

// The server closes a connection with this code when a newer connection takes
// over the same identity. Terminal — reconnecting would start an eviction war.
// Must stay in sync with WS_CLOSE_REPLACED in backend/src/ws/ConnectionManager.ts.
const WS_CLOSE_REPLACED = 4002;

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'replaced';

/**
 * Low-level WebSocket hook.
 *
 * - Connects on mount; fetches a fresh token on every attempt so a long
 *   session or computer sleep never leaves the client stuck with an expired
 *   Cognito token causing a rapid connect → server-close → reconnect loop.
 * - Auto-reconnects on disconnect with exponential backoff.
 * - Reconnects immediately when the browser tab regains focus
 *   (fixes "page refresh connects but waiting doesn't" symptom).
 * - After MAX_RECONNECT_ATTEMPTS, sets connectionState to 'failed' and
 *   stops retrying; caller can invoke retryNow() to reset and try again.
 * - Transparently handles server heartbeat pings (responds with pong).
 * - `onMessage` is stored in a ref so the caller can pass a fresh function
 *   on every render without triggering a reconnect.
 */
export function useWebSocket(
  getToken: () => Promise<string | null>,
  onMessage: (msg: ServerMessage) => void,
): {
  send: (msg: ClientMessage) => void;
  isConnected: boolean;
  connectionState: ConnectionState;
  retryNow: () => void;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const unmountedRef = useRef(false);
  // Set once the server hands this identity to a newer connection. Guards the
  // visibilitychange auto-reconnect below, which would otherwise take the
  // session straight back off the other device and restart the eviction war
  // the moment the user glanced at this tab. Cleared only by an explicit
  // retryNow(), i.e. the user deliberately choosing to play here instead.
  const replacedRef = useRef(false);
  // Stable ref to the connect function so retryNow can call it without
  // being re-created every time the effect re-runs.
  const connectRef = useRef<() => void>(() => {});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  // Always keep the callback ref current — never stale, never triggers reconnect
  onMessageRef.current = onMessage;

  useEffect(() => {
    unmountedRef.current = false;

    // Fetch a fresh token on every connect attempt so an expired Cognito token
    // (after a long sleep) never causes a rapid connect → server-close loop.
    async function connect() {
      if (unmountedRef.current) return;
      replacedRef.current = false;

      let token: string | null;
      try { token = await getToken(); } catch { token = null; }
      if (unmountedRef.current) return;

      // Authenticated users connect with JWT, anonymous users with UUID
      let url: string;
      if (token) {
        url = `${env.wsBaseUrl}/ws?token=${encodeURIComponent(token)}`;
      } else {
        const anonId = getAnonymousId();
        url = `${env.wsBaseUrl}/ws?anonId=${encodeURIComponent(anonId)}`;
      }
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return; }
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        setConnectionState('connected');
      };

      ws.onmessage = ({ data }) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(data as string) as ServerMessage;
        } catch {
          console.warn('[WS] Unparseable message:', data);
          return;
        }
        // Respond to server heartbeat automatically — don't surface to game logic
        if (msg.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        onMessageRef.current(msg);
      };

      ws.onclose = (ev) => {
        if (unmountedRef.current) return;
        // Stale-close guard: if a newer socket already replaced this one,
        // ignore this close event — otherwise it would flip isConnected back
        // to false and kick off a redundant reconnect loop.
        if (wsRef.current !== ws) return;
        setIsConnected(false);
        wsRef.current = null;

        // Auth rejection (4001) is permanent — don't reconnect.
        // This prevents flicker when the backend doesn't support anonymous WS yet.
        if (ev.code === 4001) {
          setConnectionState('failed');
          return;
        }

        // 4002 = the server handed this identity to a newer connection (the
        // same account on another device, or a second tab). Reconnecting would
        // evict that one right back, and the two clients would trade the
        // connection about once a second forever — which is what forfeited
        // games mid-play. Stop here and let the user click Retry to take the
        // session back on this device.
        if (ev.code === WS_CLOSE_REPLACED) {
          replacedRef.current = true;
          setConnectionState('replaced');
          return;
        }

        if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionState('failed');
          return; // stop retrying — user must click Retry
        }

        setConnectionState('reconnecting');
        const delay = RECONNECT_DELAYS[
          Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
        ];
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    }

    // Keep the ref current so retryNow always calls the right version
    connectRef.current = connect;
    connect();

    // When the tab regains focus, attempt to reconnect immediately instead
    // of waiting for the next scheduled backoff timer. This fixes the symptom
    // where "refreshing the page connects instantly but waiting doesn't".
    const onVisibilityChange = () => {
      if (document.hidden || unmountedRef.current || replacedRef.current) return;
      const ws = wsRef.current;
      const notOpen = !ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;
      if (notOpen) {
        clearTimeout(reconnectTimerRef.current);
        reconnectAttemptRef.current = 0;
        setConnectionState('reconnecting');
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      unmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- getToken is a stable import

  const send = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Manual retry: resets the attempt counter and connects immediately.
  // Called when the user clicks the "Retry" button after 'failed'.
  const retryNow = useCallback(() => {
    replacedRef.current = false;
    clearTimeout(reconnectTimerRef.current);
    reconnectAttemptRef.current = 0;
    setConnectionState('reconnecting');
    connectRef.current();
  }, []);

  return { send, isConnected, connectionState, retryNow };
}
