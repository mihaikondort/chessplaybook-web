import { useCallback, useEffect, useState } from 'react';
import { usePuzzleSession } from './usePuzzleSession';
import {
  fetchSelectionOptions,
  type SelectionOption,
  type SessionArea,
  type SessionSelection,
} from '../services/PuzzleSessionApi';
import type { PuzzleDraw } from './usePuzzleBoard';

/**
 * The run card's state, on the rebuilt page.
 *
 * `usePuzzleSession` already owns what a run IS - the server's row, its
 * progress, how it ends. What it does not own is the choice a player makes
 * BEFORE one exists, and the old page kept that inside `SessionSetup` itself.
 * It cannot live there any more: the card is a renderer now, and the page needs
 * the chosen axes to build its next draw with. So the choice lives here, beside
 * the run it turns into.
 *
 * THE OPTIONS ARE FETCHED AT PAGE LOAD, NOT ON A CLICK (owner, 2026-08-06:
 * *"the Set up a run card has a delay until the controls on it appear"*).
 * Measured at 319ms on the old page, and worse than a blank card: it rendered a
 * one-chip fallback and then swapped to four, so the card visibly changed its
 * mind. Collapsing a block moves WHEN its data is fetched, not just where it
 * sits - and the same is true of moving one into a component.
 */
export function usePuzzleRun(initialSelection: SessionSelection | null = null) {
  const { session, loading, start, end, refresh, reload } = usePuzzleSession();
  const [options, setOptions] = useState<SelectionOption[] | undefined>();
  const [areas, setAreas] = useState<readonly string[] | undefined>();
  /* A link can pick the mode (`?run=missed`, #108); otherwise the default. */
  const [selection, setSelection] = useState<SessionSelection>(initialSelection ?? 'adaptive');
  const [area, setArea] = useState<SessionArea | null>(null);
  const [total, setTotal] = useState(10);
  const [starting, setStarting] = useState(false);

  /*
    A FAILED LOAD IS RETRIED, A FEW TIMES, THEN LEFT (C6, D27).

    Left undefined on failure, the card keeps its skeleton list and both pickers
    stay disabled - until a reload, which nothing tells the player to do. v2
    recovered by accident: its card fetched again when it mounted. Three retries
    at 1s, 3s and 9s cover a blip without hammering a rate limit the page shares
    with everything else. Still no error shown: one about a run nobody started is
    noise.
  */
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const RETRY_MS = [1000, 3000, 9000];
    const load = (attempt: number) => {
      fetchSelectionOptions()
        .then(res => { if (!alive) return; setOptions(res.selections); setAreas(res.areas); })
        .catch(() => {
          if (!alive || attempt >= RETRY_MS.length) return;
          timer = setTimeout(() => load(attempt + 1), RETRY_MS[attempt]);
        });
    };
    load(0);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, []);

  const running = session != null && session.status === 'active';
  const ended = session != null && session.status !== 'active';

  const startRun = useCallback(async (
    input: { total: number; selection: SessionSelection; area: SessionArea | null },
    rated: boolean,
  ) => {
    setStarting(true);
    /* `rated` is the SETTINGS card's switch, read at the moment the run starts.
       There is one control for it and it is not this card. */
    await start({ ...input, rated });
    setStarting(false);
  }, [start]);

  /*
    A RUN'S AXES GOVERN WHAT IS SERVED, or they are decoration (D4b) - and only
    while it is ACTIVE: a finished run must not keep steering the puzzles someone
    is solving freely afterwards.

    `sessionId` rides along because the attempt belongs to the run that SERVED
    the puzzle, not to whatever is active when it resolves.
  */
  const draw: PuzzleDraw | null = running && session
    ? { selection: session.selection, area: session.area ?? undefined, sessionId: session.id }
    : null;

  return {
    session, loading, running, ended, starting,
    options, areas,
    selection, setSelection, area, setArea, total, setTotal,
    startRun, stopRun: end, refresh, reload,
    draw,
  };
}

export default usePuzzleRun;
