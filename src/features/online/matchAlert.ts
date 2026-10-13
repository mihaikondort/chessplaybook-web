/**
 * Summon a player back to the tab when a match is offered while they are not
 * looking at it.
 *
 * Why this exists
 * ---------------
 * The match handshake used to accept only when `document.visibilityState ===
 * 'visible'`, on the reasoning that a backgrounded tab means a player who is not
 * watching. In a pool this thin that reasoning inverts: a search runs for tens
 * of minutes, nobody stares at a tab for that long, and the guard fires on
 * exactly the people who want a game most.
 *
 * Measured on production 2026-08-02 — the single genuine pairing opportunity in
 * six hours: an opponent connected, was offered the match, **accepted**, and the
 * offer timed out because this side never answered while its socket was open.
 * They cancelled 1.5s later and left. The pool was not empty at that moment; the
 * visibility check ate the one match in it.
 *
 * So the tab now accepts and *calls the player back* instead of declining on
 * their behalf. Three cues, weakest to strongest, because none is reliable
 * alone: a title change (always works), a short tone (blocked without prior
 * interaction — but pressing Play is prior interaction), and a system
 * notification (needs permission, which is only ever requested at the moment it
 * is obviously useful, never on page load).
 *
 * Everything here is best-effort by construction: every call is wrapped, and a
 * failure to alert must never prevent the accept that gets the game started.
 */

const ALERT_TITLE = 'Opponent found — your move!';

let originalTitle: string | null = null;
// Typed as `number` and cast at the assignment: this project pulls in Node
// types, so TS resolves the Node overload of setInterval (Timeout) even for
// `window.setInterval`, which returns a number at runtime in the browser.
let flashTimer: number | null = null;

/** Short rising two-tone chime via WebAudio — no asset to load or cache. */
function playChime(): void {
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    for (const [i, freq] of [660, 880].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Short envelope rather than a raw square edge, which clicks.
      gain.gain.setValueAtTime(0.0001, now + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.16);
    }
    // Release the hardware once the sound is done; leaking contexts eventually
    // exhausts the browser's limit and later chimes fail silently.
    window.setTimeout(() => void ctx.close().catch(() => {}), 700);
  } catch {
    /* audio unavailable or blocked — the other two cues still fire */
  }
}

/** Flash the tab title until the player comes back. */
function startTitleFlash(): void {
  try {
    if (flashTimer !== null) return;
    originalTitle = document.title;
    // Set it NOW, before starting the interval. `setInterval` does not fire
    // until one full period has elapsed, so an alert that only changed the
    // title on the first tick showed nothing at all whenever the match
    // committed inside 900ms — which is the common case, since both sides
    // usually answer immediately. Caught by a production probe that could
    // never observe the flash.
    document.title = ALERT_TITLE;
    let on = true;
    flashTimer = window.setInterval(() => {
      document.title = on ? (originalTitle ?? ALERT_TITLE) : ALERT_TITLE;
      on = !on;
    }, 900) as unknown as number;
  } catch {
    /* no-op */
  }
}

export function stopMatchAlert(): void {
  try {
    if (flashTimer !== null) {
      window.clearInterval(flashTimer);
      flashTimer = null;
    }
    if (originalTitle !== null) {
      document.title = originalTitle;
      originalTitle = null;
    }
  } catch {
    /* no-op */
  }
}

function showNotification(): void {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(ALERT_TITLE, {
      body: 'Your game is starting on Chess Playbook.',
      icon: '/chess-queen-icon.png',
      tag: 'chessplaybook-match', // collapse, never stack
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* no-op */
      }
    };
  } catch {
    /* no-op */
  }
}

/**
 * Ask for notification permission at the one moment it is self-evidently
 * useful — the player has just started searching for an opponent and is about
 * to leave the tab. Never called on page load: an unexplained permission prompt
 * on arrival is the pattern users reflexively deny, and a denial is sticky.
 */
export function requestMatchNotificationPermission(): void {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return; // already granted or denied
    void Notification.requestPermission().catch(() => {});
  } catch {
    /* no-op */
  }
}

/**
 * Called when a match is offered while the tab is not being looked at.
 *
 * Self-cancelling: the alert exists to bring the player back, so the moment
 * they are back it has done its job and must stop on its own. Relying only on
 * `game_start` to clear it would leave a tab flashing "Opponent found" after a
 * match that then failed to commit — an alert that lies is worse than none.
 */
export function alertMatchFound(): void {
  startTitleFlash();
  playChime();
  showNotification();

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      stopMatchAlert();
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
  document.addEventListener('visibilitychange', onVisible);
}
