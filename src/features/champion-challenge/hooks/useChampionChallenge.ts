/**
 * Champion Challenge session hook — server-backed.
 *
 * The server owns the session: it deals positions, scores moves and writes the
 * coaching. This hook holds only what is on screen plus the challenge id, which
 * is the one thing LocalStorage still carries so a reload can resume.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startSession, resumeSession, submitMove, fetchSummary,
  ChallengeApiError,
  type PublicPosition, type AnswerVerdict, type SessionSummary, type SessionLength,
} from '../services/ChampionChallengeApi';

export const DEFAULT_SESSION_LENGTH: SessionLength = 10;

const STORAGE_PREFIX = 'cpb_champion_challenge_';

function storageKey(champion: string): string {
  return `${STORAGE_PREFIX}${champion}`;
}

function rememberSession(champion: string, challengeId: string): void {
  try {
    localStorage.setItem(storageKey(champion), challengeId);
  } catch {
    // Private mode / quota — the session still runs, it just won't resume.
  }
}

function recallSession(champion: string): string | null {
  try {
    return localStorage.getItem(storageKey(champion));
  } catch {
    return null;
  }
}

function forgetSession(champion: string): void {
  try {
    localStorage.removeItem(storageKey(champion));
  } catch {
    /* ignore */
  }
}

export interface UseChampionChallenge {
  loading: boolean;
  /** A move is in flight — the board stays frozen until the verdict lands. */
  submitting: boolean;
  error: string | null;
  challengeId: string;
  total: number;
  /** 0-based index of the position on screen. */
  index: number;
  current: PublicPosition | null;
  /** Verdict for the position on screen, once answered. */
  currentVerdict: AnswerVerdict | null;
  finished: boolean;
  summary: SessionSummary | null;
  /** Unseen positions left for this identity, from the server. */
  remaining: number | null;
  submit: (san: string) => void;
  next: () => void;
  restart: () => void;
}

export function useChampionChallenge(
  champion: string,
  length: SessionLength = DEFAULT_SESSION_LENGTH,
): UseChampionChallenge {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [challengeId, setChallengeId] = useState('');
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<PublicPosition | null>(null);
  const [currentVerdict, setCurrentVerdict] = useState<AnswerVerdict | null>(null);
  const [finished, setFinished] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  /** The position dealt with the last verdict, held until the user advances. */
  const pendingNext = useRef<PublicPosition | null>(null);
  /** Bumped by restart() to force a fresh session. */
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCurrentVerdict(null);
    setSummary(null);
    pendingNext.current = null;

    const load = async () => {
      const saved = generation === 0 ? recallSession(champion) : null;

      if (saved) {
        try {
          const state = await resumeSession(saved);
          if (cancelled) return;
          setChallengeId(state.challengeId);
          setTotal(state.total);
          setIndex(state.index);
          setCurrent(state.position);
          setFinished(Boolean(state.finished));
          setLoading(false);
          return;
        } catch {
          // Session gone (expired, other device, server reset) — start fresh.
          forgetSession(champion);
        }
      }

      const state = await startSession(champion, length);
      if (cancelled) return;
      rememberSession(champion, state.challengeId);
      setChallengeId(state.challengeId);
      setTotal(state.total);
      setIndex(0);
      setCurrent(state.position);
      setRemaining(state.remaining ?? null);
      setFinished(false);
      setLoading(false);
    };

    load().catch((err: unknown) => {
      if (cancelled) return;
      setError(
        err instanceof ChallengeApiError
          ? err.message
          : 'Could not reach the challenge server. Please try again.',
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [champion, length, generation]);

  // The summary is a separate server call, made once the session completes.
  useEffect(() => {
    if (!finished || !challengeId || summary) return;
    let cancelled = false;
    fetchSummary(challengeId)
      .then((result) => {
        if (cancelled) return;
        setSummary(result.summary);
        setRemaining(result.remaining);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your results.');
      });
    return () => {
      cancelled = true;
    };
  }, [finished, challengeId, summary]);

  const submit = useCallback(
    (san: string) => {
      if (!challengeId || submitting || currentVerdict) return;
      setSubmitting(true);
      submitMove(challengeId, san)
        .then((result) => {
          setCurrentVerdict(result.verdict);
          pendingNext.current = result.next;
          // `finished` is applied on advance, so the last verdict stays visible.
          setSubmitting(false);
        })
        .catch((err: unknown) => {
          setSubmitting(false);
          if (err instanceof ChallengeApiError && err.status === 400) {
            setError('That move was not accepted. Please try another.');
            return;
          }
          // The daily quota (429) carries its own explanation, and "try again"
          // would be a lie — nothing the player does now will get through.
          if (err instanceof ChallengeApiError && err.status === 429) {
            setError(err.message);
            return;
          }
          setError('Could not submit your move. Please try again.');
        });
    },
    [challengeId, submitting, currentVerdict],
  );

  const next = useCallback(() => {
    if (!currentVerdict) return;
    const upcoming = pendingNext.current;
    setCurrentVerdict(null);
    setError(null);
    if (upcoming) {
      setCurrent(upcoming);
      setIndex((i) => i + 1);
      pendingNext.current = null;
    } else {
      setFinished(true);
    }
  }, [currentVerdict]);

  const restart = useCallback(() => {
    forgetSession(champion);
    setGeneration((g) => g + 1);
  }, [champion]);

  return {
    loading,
    submitting,
    error,
    challengeId,
    total,
    index,
    current,
    currentVerdict,
    finished,
    summary,
    remaining,
    submit,
    next,
    restart,
  };
}
