import { useCallback, useEffect, useRef, useState } from 'react';
import {
  trainingApi, OpeningsApiError, type TrainingScope, type TrainingSession, type TrainingState,
} from '../services/openingsApi';
import type { TrainingReport } from './useTrainingWalk';
import { logGA4Event } from '@/services/analytics';

const NO_LINE: string[] = [];

/**
 * Training sessions and progress (opening trainer E5; Q16; owner rulings 2026-11-11).
 *
 * - Start begins a session in the chosen scope; Resume continues the open one (paused, or left when a tab closed)
 *   from its saved line, in a new session.
 * - Every move is saved as it is played; a line played to its end is saved, and the server says whether it was
 *   clean (trained). Pause keeps the line in progress; Stop drops it.
 * - Reset clears the repertoire's progress.
 * Guests save under their anonymous id, as puzzle progress does (the soft account rule).
 */
export function useTrainingSession(repertoireId: string, active: boolean, from: string[] = NO_LINE) {
  const [state, setState] = useState<TrainingState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [scope, setScope] = useState<TrainingScope>('main');
  const [busy, setBusy] = useState(false);
  /** A save that failed: said once on the card, never blocking the board. */
  const [saveError, setSaveError] = useState<string | null>(null);
  /** The session just ended by Pause or Stop: the moment to offer sign-in to a guest (soft accounts). */
  const [justEnded, setJustEnded] = useState<'paused' | 'stopped' | null>(null);
  const sessionRef = useRef<TrainingSession | null>(null);
  sessionRef.current = session;

  const load = useCallback((signal?: AbortSignal) => {
    setLoadError(false);
    return trainingApi.state(repertoireId, signal)
      .then((s) => {
        setState(s);
        setScope(s.open?.scope ?? s.lastScope ?? 'main');
      })
      .catch(() => { if (!signal?.aborted) setLoadError(true); });
  }, [repertoireId]);

  useEffect(() => {
    // Another repertoire, or leaving training: what was running here is left open on the server (Resume finds it).
    setSession(null);
    setState(null);
    setJustEnded(null);
    setSaveError(null);
    if (!active) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [repertoireId, active, load]);

  const failed = (e: unknown) => {
    setSaveError(
      e instanceof OpeningsApiError && e.status === 409 && /book was updated/.test(e.message)
        ? 'The opening book was updated. Start a new session.'
        : 'Your progress could not be saved. Check the connection.',
    );
  };

  const begin = useCallback(async (resume: boolean) => {
    setBusy(true);
    setSaveError(null);
    setJustEnded(null);
    try {
      const s = await trainingApi.start(repertoireId, scope, resume, from);
      logGA4Event({ name: 'opening_session_started', params: { repertoire: repertoireId, scope: s.scope, resumed: resume, from_position: from.length > 0 } });
      setSession(s);
      setState((st) => (st ? { ...st, open: s, lastScope: s.scope } : st));
      if (resume) setScope(s.scope);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }, [repertoireId, scope, from]);

  const end = useCallback(async (how: 'paused' | 'stopped', line: string[]) => {
    const s = sessionRef.current;
    if (!s) return;
    setBusy(true);
    try {
      const ended = await trainingApi.end(s.id, how, how === 'paused' ? line : undefined);
      setSession(null);
      setState((st) => (st ? { ...st, open: how === 'paused' ? ended : null } : st));
      setJustEnded(how);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }, []);

  /** Reset the whole repertoire, or only the lines through the position trained from (E7). */
  const reset = useCallback(async () => {
    setBusy(true);
    try {
      await trainingApi.reset(repertoireId, from);
      if (from.length) {
        // The part's lines stop counting; the count of lines played is re-read from the server.
        await load();
      } else {
        setState((st) => (st ? { ...st, cleanPaths: [], linesPlayed: 0 } : st));
      }
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  }, [repertoireId, from, load]);

  /** E6: one of our moves, saved as it is played. */
  const recordMove = useCallback((r: TrainingReport) => {
    const s = sessionRef.current;
    if (!s) return;
    trainingApi.move(s.id, r).then(() => setSaveError(null)).catch(failed);
  }, []);

  /** A line played to its end; the server's answer is whether it is trained. */
  const recordLine = useCallback(async (line: string[], lineId: string): Promise<boolean | null> => {
    const s = sessionRef.current;
    if (!s) return null;
    try {
      const { clean } = await trainingApi.line(s.id, lineId, line);
      logGA4Event({ name: 'opening_line_finished', params: { repertoire: repertoireId, trained: clean } });
      const path = line.join(' ');
      setState((st) => (st ? {
        ...st,
        linesPlayed: st.linesPlayed + 1,
        cleanPaths: clean && !st.cleanPaths.includes(path) ? [...st.cleanPaths, path] : st.cleanPaths,
      } : st));
      return clean;
    } catch (e) {
      failed(e);
      return null;
    }
  }, [repertoireId]);

  return {
    state,
    loadError,
    retry: () => load(),
    session,
    /** The open session to resume (paused, or left open), when none is running. */
    resumable: !session && state?.open ? state.open : null,
    scope,
    setScope,
    busy,
    saveError,
    justEnded,
    start: () => begin(false),
    resume: () => begin(true),
    pause: (line: string[]) => end('paused', line),
    stop: () => end('stopped', []),
    reset,
    recordMove,
    recordLine,
  };
}
