/**
 * A bounded run, from the client's side (TRAINING_SYSTEM D3).
 *
 * WHAT IT OWNS: whether there is a run, what its progress is, and how it ends.
 * It owns none of the solving — the trainer does that, exactly as it does with
 * no session at all.
 *
 * THE RELOAD IS THE POINT. On mount it asks the server what is active rather
 * than reading local state, because that is the whole reason sessions are
 * server-side: a run has to survive a refresh, a second tab and a phone picked
 * up an hour later. There is deliberately no localStorage copy — a second
 * source of truth for the same run is how "3 of 10" and "5 of 10" end up on
 * two screens at once.
 *
 * PROGRESS IS RE-READ, NEVER INCREMENTED HERE. The server counts attempts; a
 * client-side `completed + 1` would be a third place the same number lives and
 * would drift the moment a result POST failed after writing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { logGA4Event } from '@/services/analytics';
import {
  endSession as apiEnd,
  fetchActiveSession,
  fetchSession,
  startSession as apiStart,
  SessionApiError,
  type PuzzleSession,
  type StartSessionInput,
} from '../services/PuzzleSessionApi';

export interface PuzzleSessionState {
  session: PuzzleSession | null;
  /** True until the first "is anything active?" answer arrives. */
  loading: boolean;
  error: string | null;
  /** Starting a run. Resolves to null when the request failed. */
  start: (input: StartSessionInput) => Promise<PuzzleSession | null>;
  /** Abandon the current run. */
  end: () => Promise<void>;
  /** Re-read progress from the server — called after each recorded attempt. */
  refresh: () => Promise<void>;
  /** Leave a finished run's summary without starting another. */
  dismiss: () => void;
  /**
   * Re-read whatever run is active, whoever started it.
   *
   * The plan panel starts sessions through its own endpoint, so the trainer
   * finds out the same way it does after a reload: by asking. Without this, a
   * player who pressed "Start this session" got a run on the server and the
   * setup card on screen, and had to reload to see their own session.
   */
  reload: () => Promise<void>;
}

/**
 * How long a run took, in ms, from the server's own two timestamps.
 *
 * Deliberately NOT measured on the client. A run survives a reload, a second
 * tab and a phone picked up an hour later — which is the entire reason sessions
 * are server-side — so a clock started when this hook mounted would measure the
 * tab, not the run.
 *
 * SQLite writes `datetime('now')`, which is UTC with no zone marker, and
 * `new Date()` reads a bare timestamp as LOCAL time. Both strings get the same
 * treatment, so the difference is right even though neither instant is; the `Z`
 * is appended anyway rather than relying on that, because the day someone
 * formats one of these as a time is the day it silently shifts by the offset.
 *
 * Returns 0 rather than a negative or a NaN for anything unparseable — a
 * duration that cannot be computed is not evidence of an instant run, and a
 * NaN parameter is dropped by GA4 without saying so.
 */
function elapsedMs(createdAt: string, endedAt: string | null): number {
  const utc = (s: string) => (/[Zz]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s.replace(' ', 'T')}Z`);
  const start = Date.parse(utc(createdAt));
  const end = endedAt ? Date.parse(utc(endedAt)) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function usePuzzleSession(): PuzzleSessionState {
  const [session, setSession] = useState<PuzzleSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards a setState after unmount, and stops a slow refresh from resurrecting
  // a run the player has already dismissed.
  const alive = useRef(true);
  /*
    Runs whose ending has already been reported (E8a).

    `refresh` runs after every recorded attempt and `end` can be pressed twice
    on a slow connection, so without this the last attempt of a run could emit
    `completed` more than once and the count would exceed the number of runs
    that exist. Keyed by session id rather than a boolean because a player
    finishes one run and starts another in the same mount.
  */
  const reportedEnd = useRef(new Set<string>());

  useEffect(() => {
    alive.current = true;
    fetchActiveSession()
      .then(active => { if (alive.current) setSession(active); })
      .catch(() => {
        /*
          A failed lookup means "we do not know", not "there is no run". It is
          left silent: the player who has no session — which is almost everyone,
          almost always — must not be shown an error about a feature they never
          asked for.
        */
      })
      .finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; };
  }, []);

  const start = useCallback(async (input: StartSessionInput) => {
    setError(null);
    try {
      const started = await apiStart(input);
      if (alive.current) setSession(started);
      /*
        Fired here and NOT in the 409 branch below. Adopting a run that already
        existed is not starting one, and counting it as a start would put every
        reload into the denominator of "how many runs get finished".
      */
      logGA4Event({
        name: 'puzzle_session_started',
        params: {
          selection: started.selection,
          area: started.area ?? 'all',
          total: started.total,
          rated: started.rated,
        },
      });
      return started;
    } catch (err) {
      /*
        409 means a run is already active and the server hands it back. Adopting
        it is the honest answer to "start a run": the player has one, and the
        alternative is an error message about a session they cannot see.
      */
      if (err instanceof SessionApiError && err.status === 409 && err.active) {
        if (alive.current) setSession(err.active);
        return err.active;
      }
      if (alive.current) setError(err instanceof Error ? err.message : 'Could not start the run');
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const current = session;
    if (!current) return;
    try {
      const fresh = await fetchSession(current.id);
      // Only adopt it if the run is still the one on screen — a refresh that
      // lands after the player abandoned would otherwise put it back.
      if (alive.current) setSession(prev => (prev && prev.id === fresh.id ? fresh : prev));
      /*
        A run completes SERVER-SIDE, when the attempt count reaches its length —
        `advanceSession` does it, and as of E8a it is the only thing that can.
        So the honest moment to report a completion is when the server's status
        says so, not when the page decides the run looks finished.

        Reported even if the session on screen has moved on: the run really did
        complete, and dropping the event because the player was quick would
        under-count exactly the outcome this is here to measure.
      */
      if (fresh.status === 'completed' && !reportedEnd.current.has(fresh.id)) {
        reportedEnd.current.add(fresh.id);
        logGA4Event({
          name: 'puzzle_session_completed',
          params: {
            selection: fresh.selection,
            area: fresh.area ?? 'all',
            total: fresh.total,
            solved: fresh.progress.solved,
            rated: fresh.rated,
            ms_duration: elapsedMs(fresh.createdAt, fresh.endedAt),
          },
        });
      }
    } catch {
      // Progress is a display; failing to re-read it must never interrupt
      // solving. The next attempt re-reads anyway.
    }
  }, [session]);

  const end = useCallback(async () => {
    const current = session;
    if (!current) return;
    try {
      const ended = await apiEnd(current.id, 'abandoned');
      if (alive.current) setSession(ended);
      /*
        How far they got is the whole value of this event. "Runs get abandoned"
        is not actionable; "runs get abandoned at 2 of 20, and 20s are the ones
        it happens to" tells us the length is wrong.
      */
      if (!reportedEnd.current.has(ended.id)) {
        reportedEnd.current.add(ended.id);
        logGA4Event({
          name: 'puzzle_session_abandoned',
          params: {
            selection: ended.selection,
            area: ended.area ?? 'all',
            total: ended.total,
            completed: ended.progress.completed,
            solved: ended.progress.solved,
            rated: ended.rated,
          },
        });
      }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'Could not end the run');
    }
  }, [session]);

  const dismiss = useCallback(() => setSession(null), []);

  const reload = useCallback(async () => {
    try {
      const active = await fetchActiveSession();
      if (alive.current) setSession(active);
    } catch {
      // Same rule as the mount lookup: "we do not know" is not an error worth
      // showing to someone who may have no run at all.
    }
  }, []);

  return { session, loading, error, start, end, refresh, dismiss, reload };
}
