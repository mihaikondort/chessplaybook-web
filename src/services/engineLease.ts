/**
 * The cross-tab Stockfish lease.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * `AnalysisService` is a module singleton, and a module singleton is per
 * BROWSING CONTEXT. Two tabs on this site are two modules, two singletons and
 * two `new Worker(...)` calls — so the "one Stockfish" rule of §0.3a of the
 * PZ-043 plan is true within a tab and was never true across them. That was
 * tolerable while exactly one page ran an engine; the compact card on
 * `/puzzles` makes a second engine-bearing surface, and a player with the
 * trainer open and `/analysis` open in the next tab pays for two ~7MB WASM
 * downloads and two searches competing for the same cores.
 *
 * ── WHY IT SITS UNDER `initialize()` AND NOT UNDER THE COMPACT CARD ───────
 *
 * Scoping it to the compact path was considered and rejected during C0: it
 * would coordinate puzzles-tab against puzzles-tab and miss puzzles-against-
 * `/analysis`, which is the case the rule is actually about. The lease belongs
 * at the one place in the codebase that constructs an engine worker.
 *
 * ── NEWEST WINS, AND THE LOSER IS TOLD ────────────────────────────────────
 *
 * A queueing lock is the wrong shape here. The tab you are LOOKING AT is the
 * one that should be analysing, and a tab that waits politely behind a
 * forgotten background tab shows a dead panel with no explanation — which
 * reads as a broken engine, not as a saving. So a new claim STEALS, the
 * previous holder is notified through `onLost`, and it stops and terminates.
 *
 * `steal: true` is a real Web Locks option: it grants immediately and the
 * previous holder's lock promise settles, which is what `onLost` rides on.
 *
 * ── WHEN THE API IS ABSENT ────────────────────────────────────────────────
 *
 * `navigator.locks` is unavailable in insecure contexts and in a few older
 * browsers. There is no localStorage fallback here ON PURPOSE: a storage-based
 * lease has no release-on-crash, so a tab that is force-quit holds the engine
 * hostage for every future tab, and the failure is invisible and permanent.
 * Degrading to today's behaviour — one worker per tab, exactly as shipped —
 * is strictly better than a lease that can wedge the feature.
 */

/** One name for the whole site; the resource being leased is "an engine worker". */
const LEASE_NAME = 'chessplaybook-stockfish';

interface LeaseState {
  /** Resolves the held lock's promise, which is how we release it. */
  release: (() => void) | null;
  /** Called when another tab steals the lease out from under us. */
  onLost: (() => void) | null;
  /** Called when the engine becomes free again after such a loss. */
  onAvailable: (() => void) | null;
  held: boolean;
  /** Identifies the current queued waiter, so a stale one cannot fire. */
  waitToken: object | null;
}

const state: LeaseState = {
  release: null, onLost: null, onAvailable: null, held: false, waitToken: null,
};

/**
 * Wait — WITHOUT stealing — until whoever holds the engine gives it up.
 *
 * This is what lets a tab correct itself while it is still in the background.
 * A steal says *"I want it now"*; an ordinary request says *"tell me when it is
 * free"*, and it is granted the moment the holder releases — which includes the
 * holder's tab being CLOSED, because Web Locks releases on unload. So the tab
 * that lost the engine learns the other tab has gone without anyone touching
 * it, and can stop claiming that analysis is running somewhere else.
 *
 * WE TAKE THE LOCK RATHER THAN PEEKING AT IT. `navigator.locks.query()` could
 * report the holder, but only by polling — there is no event — and a poll is
 * both a timer nobody needs and a race. Being granted the lock IS the
 * notification, and it leaves this tab as the rightful next owner.
 *
 * The token guards against a stale grant: if this tab has re-claimed by
 * stealing in the meantime, or another loss has started a newer wait, the
 * older waiter must not resurrect state it no longer describes.
 */
function waitForRelease(): void {
  if (!isEngineLeaseSupported()) return;

  const token = {};
  state.waitToken = token;

  navigator.locks
    .request(LEASE_NAME, () =>
      new Promise<void>((resolveHeld) => {
        if (state.waitToken !== token) {
          // Superseded while queued — release immediately and stay out of it.
          resolveHeld();
          return;
        }
        state.waitToken = null;
        state.release = resolveHeld;
        state.held = true;
        const available = state.onAvailable;
        available?.();
      }),
    )
    .catch(() => {
      /*
        Stolen again — and the two ways to arrive here need telling apart.

        STILL QUEUED: the waiter never got the lock, so there is no state to
        unwind. Drop the token and stop.

        ALREADY GRANTED: this tab was the holder, and a third tab has just taken
        it. That is a genuine LOSS and must go through the same unwind as any
        other, or `held` stays true while another tab owns the lock — and the
        next `claimEngineLease()` would take the `state.held` fast path and
        build a worker anyway. TWO ENGINES, which is the one thing this file
        exists to prevent. Found by an independent review on 2026-08-10; the
        original code only cleared the token, which on the granted path is
        already null, so it did nothing at all.
      */
      if (state.waitToken === token) {
        state.waitToken = null;
        return;
      }
      surrender();
    });
}

/**
 * Unwind a loss: stop believing we hold the engine, tell the owner, and get
 * back in the queue.
 *
 * Shared by both loss paths — the active claim being stolen, and a waiter being
 * stolen after it was granted — because they differ only in how the lock was
 * acquired, not in what losing it means.
 */
function surrender(): void {
  if (!state.held) return;
  state.held = false;
  state.release = null;
  const lost = state.onLost;
  state.onLost = null;
  lost?.();
  waitForRelease();
}

/** Web Locks is absent in insecure contexts — see the header. */
export function isEngineLeaseSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';
}

/**
 * Claim the engine for this tab, stealing it from any other tab that holds it.
 *
 * Resolves `true` once this tab owns the engine (or once we know the lease
 * cannot be arbitrated at all, which is treated as ownership — see the header).
 * `onLost` fires exactly once, and only if another tab later steals it; it does
 * NOT fire on our own `releaseEngineLease()`, because a caller that released
 * deliberately does not need telling.
 */
export async function claimEngineLease(
  onLost: () => void,
  onAvailable?: () => void,
): Promise<boolean> {
  if (!isEngineLeaseSupported()) {
    state.held = true;
    state.onLost = null;
    return true;
  }

  // Re-claiming from the tab that already holds it is a no-op apart from
  // refreshing the callback. Stealing from ourselves would fire our own
  // `onLost` and tear down the very worker we are about to use.
  if (state.held) {
    state.onLost = onLost;
    state.onAvailable = onAvailable ?? null;
    return true;
  }

  // A claim supersedes any queued waiter — we are taking it now, not waiting.
  state.waitToken = null;
  state.onLost = onLost;
  state.onAvailable = onAvailable ?? null;

  return new Promise<boolean>((granted) => {
    /*
      The lock is held for as long as this callback's promise is pending, so
      the promise IS the lease and `release` is its resolver. `steal: true`
      makes the grant immediate rather than queued.
    */
    navigator.locks
      .request(LEASE_NAME, { steal: true }, () =>
        new Promise<void>((resolveHeld) => {
          state.release = resolveHeld;
          state.held = true;
          granted(true);
        }),
      )
      /*
        Two ways to arrive here, and they must be told apart.

        A steal by ANOTHER tab makes this promise REJECT (`AbortError`) while
        we still believe we hold the lease — that is the loss `onLost` exists
        for. Our own `releaseEngineLease()` resolves it, and by then `held` is
        already false, so the same landing site does nothing.
      */
      // Stolen by another tab. `surrender` unwinds, reports the loss, and
      // queues for the engine coming back, so this tab can correct itself when
      // the thief closes — without waiting to be looked at again.
      .catch(surrender);
  });
}

/** Give the engine up deliberately. Does not fire `onLost` — see above. */
export function releaseEngineLease(): void {
  if (!state.held) return;
  state.held = false;
  state.onLost = null;
  state.onAvailable = null;
  state.waitToken = null;
  const release = state.release;
  state.release = null;
  release?.();
}

/** Does this tab currently own the engine? */
export function holdsEngineLease(): boolean {
  return state.held;
}
