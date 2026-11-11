/**
 * The match as Lichess's broadcast reports it: each game's round id and start
 * time (from the round list) and the score (from every game's result, one PGN
 * request for the whole broadcast).
 *
 * Before `LICHESS_TOURNAMENT_ID` is set this returns `no-broadcast` and makes no
 * request: the pages show the schedule alone. It polls only while a game is in
 * progress or inside its live window, every 20 seconds; otherwise it reads once.
 */

import { useEffect, useState } from 'react';
import { lichessBroadcastService } from '@/services/LichessBroadcastService';
import { lichessTournamentService } from '@/services/LichessTournamentService';
import {
  LICHESS_TOURNAMENT_ID,
  SCHEDULED_GAMES,
  calendarState,
  readBroadcastTags,
  scoreMatch,
  type MatchScore,
} from './match';

export interface BroadcastRound {
  roundId: string;
  startsAt: Date | null;
}

export interface MatchBroadcast {
  status: 'no-broadcast' | 'loading' | 'ready' | 'error';
  /** Game number -> its Lichess round. */
  rounds: Map<number, BroadcastRound>;
  score: MatchScore | null;
}

const POLL_MS = 20_000;

/** "Game 7" -> 7. Lichess named 2024's rounds this way. */
export function gameNumberFromRoundName(name: string): number | null {
  const m = /\bgame\s*(\d{1,2})\b/i.exec(name) ?? /^\s*(?:round\s*)?(\d{1,2})\s*$/i.exec(name);
  return m ? Number(m[1]) : null;
}

/** Start of a game: Lichess's round time when known, else the expected 15:00 CET. */
export function startOf(game: number, rounds: Map<number, BroadcastRound>): Date {
  return rounds.get(game)?.startsAt ?? SCHEDULED_GAMES[game - 1].startsAt;
}

/**
 * DEV ONLY: `?broadcast=<lichess tournament id>` points the pages at another
 * broadcast (kept for the tab in sessionStorage), so the hub and the game pages
 * can be tried on a real broadcast before this one exists. Stripped from
 * production builds by the `import.meta.env.DEV` guard.
 */
function devBroadcastOverride(): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('broadcast');
    if (fromUrl) sessionStorage.setItem('wcc-broadcast', fromUrl);
    return fromUrl ?? sessionStorage.getItem('wcc-broadcast');
  } catch {
    return null;
  }
}

export function useMatchBroadcast(tournamentId: string | null = devBroadcastOverride() ?? LICHESS_TOURNAMENT_ID): MatchBroadcast {
  const [state, setState] = useState<MatchBroadcast>(() => ({
    status: tournamentId ? 'loading' : 'no-broadcast',
    rounds: new Map(),
    score: null,
  }));

  useEffect(() => {
    if (!tournamentId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const [info, pgn] = await Promise.all([
          lichessTournamentService.fetchTournamentInfo(tournamentId),
          lichessBroadcastService.fetchTournamentPGN(tournamentId),
        ]);
        if (stopped) return;
        const rounds = new Map<number, BroadcastRound>();
        for (const r of info?.rounds ?? []) {
          const n = gameNumberFromRoundName(r.name);
          if (n && !rounds.has(n)) rounds.set(n, { roundId: r.id, startsAt: r.startsAt ? new Date(r.startsAt) : null });
        }
        const score = scoreMatch(readBroadcastTags(pgn));
        // A game in the PGN carries its round id too: fill any the list missed.
        for (const g of score.games.values()) {
          if (g.roundId && !rounds.has(g.game)) rounds.set(g.game, { roundId: g.roundId, startsAt: null });
        }
        setState({ status: 'ready', rounds, score });

        const playing = [...score.games.values()].some((g) => g.result === 'playing');
        const last = score.winner?.afterGame;
        const { liveNow } = calendarState(new Date(), (g) => startOf(g, rounds), last);
        if (playing || liveNow) timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[useMatchBroadcast]', err);
        if (stopped) return;
        setState((s) => (s.status === 'ready' ? s : { ...s, status: 'error' }));
        // A failed read during a game is retried; outside one it is not worth it.
        if (calendarState(new Date()).liveNow) timer = setTimeout(load, POLL_MS * 3);
      }
    };

    load();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [tournamentId]);

  return state;
}
