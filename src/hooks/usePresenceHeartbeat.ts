import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { normalizeRouteGroup, sendPresenceHeartbeat } from '@/services/presence';
import { isPrerendering, onPrerenderActivated } from '@/services/prerender';

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Below this, a trailing heartbeat is not worth a request: it could credit at most
 * a second or two, and without it a visitor flicking between tabs would fire two
 * heartbeats per switch. Deliberately far under HEARTBEAT_INTERVAL_MS, since the
 * whole point is to capture visits shorter than one tick.
 */
const MIN_TRAILING_GAP_MS = 2_000;

export function usePresenceHeartbeat(): void {
  const { pathname } = useLocation();
  const routeGroup = normalizeRouteGroup(pathname);
  // Must outlive the effect: the effect is keyed on routeGroup and re-runs on every
  // route-group change, so a ref local to it would forget when the last send was.
  const lastSentAt = useRef(0);

  useEffect(() => {
    const send = () => {
      /*
        A page the browser rendered on spec is not a visit. Under Speculation Rules
        the prerendered document reports visibilityState 'visible', so the check
        below does NOT cover this: the heartbeat would go out for a page nobody has
        seen, and a discarded prerender is indistinguishable from a real visitor who
        arrived and left within seconds.
      */
      if (isPrerendering()) return;
      lastSentAt.current = Date.now();
      void sendPresenceHeartbeat(routeGroup);
    };
    const sendIfVisible = () => {
      if (document.visibilityState === 'visible') send();
    };

    /**
     * Credit the trailing interval.
     *
     * Active time is credited RETROACTIVELY — the server adds the gap since a
     * visitor's previous heartbeat when the next one arrives. Without a send on the
     * way out, the final interval of every visit is simply never counted, and a
     * visit shorter than one tick records exactly ZERO seconds while still counting
     * as a visitor. That also silently suppressed the puzzle audience: puzzle
     * visitors are counted as `puzzles_active_seconds > 0`, so a 20-second solve
     * that ended in a close was not a puzzle visitor at all.
     *
     * `pagehide` covers leaving the page (and fires on mobile where `beforeunload`
     * does not); `visibilitychange -> hidden` covers a tab switch or the phone being
     * backgrounded. The request already sets `keepalive`, so it survives unload.
     */
    const sendTrailing = () => {
      // Nothing to credit for a page that was never shown.
      if (isPrerendering()) return;
      if (Date.now() - lastSentAt.current < MIN_TRAILING_GAP_MS) return;
      send();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') send();
      else sendTrailing();
    };

    send();
    // If this document IS a prerender, `send()` above did nothing. Count it the
    // moment it is actually shown, rather than waiting up to 30s for the next tick.
    const stopWaitingForActivation = onPrerenderActivated(send);
    const interval = window.setInterval(sendIfVisible, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', sendTrailing);

    return () => {
      window.clearInterval(interval);
      stopWaitingForActivation();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', sendTrailing);
    };
  }, [routeGroup]);
}
