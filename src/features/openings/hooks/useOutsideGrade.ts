import { useEffect, useState } from 'react';
import { analysisService } from '@/services/AnalysisService';
import type { AnalysisResult } from '@/types/analysis';

/**
 * Opening trainer E3: the browser engine's grade of a move outside the book (F7: playable, an inaccuracy or a
 * mistake). The one calculation the product does in the browser (owner, 2026-11-05).
 *
 * Two compact searches (the analysis card's mode and the site's one engine): the position before the move, and the
 * position after it. Measured at E3 on 42 random non-book moves from the starters: 0.3 s per search (the compact
 * mode's time) agrees with a 3 s reference on 40, and is never two grades off; 1 s does no better.
 *
 * The compact mode has no "done" signal (results refine in place), so a search counts as finished when no new
 * result for its position arrives for QUIET_MS, or at TIMEOUT_MS. The training analysis card is off meanwhile, so
 * the engine is the grader's.
 *
 * The thresholds are game review's (GameAnalysisService), so the site has one scale: an inaccuracy from 50 centipawns
 * or 7% of winning chances lost, a mistake from 150 or 18%; less is playable.
 */

export type OutsideGrade = 'playable' | 'inaccuracy' | 'mistake';

const QUIET_MS = 450;
const TIMEOUT_MS = 5000;
const winPct = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);

/** "+0.35" -> 35, "M3" -> 3000, "-M2" -> -3000 (White's view, as the engine card reports it). */
function centipawns(evaluation: string): number | null {
  const e = evaluation.trim();
  if (/^-?M\d+$/.test(e)) return e.startsWith('-') ? -3000 : 3000;
  const n = Number(e);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function searchOnce(fen: string): Promise<number | null> {
  return new Promise((resolve) => {
    let last: AnalysisResult | null = null;
    let quiet: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      off();
      clearTimeout(timeout);
      if (quiet) clearTimeout(quiet);
      if (!last) return resolve(null);
      if (last.evaluation === 'TERMINAL') {
        // Mate or stalemate on the board after the move: the terminal text says which.
        return resolve(/mate/i.test(last.principalVariation) && !/stalemate/i.test(last.principalVariation) ? (fen.split(' ')[1] === 'w' ? -3000 : 3000) : 0);
      }
      resolve(centipawns(last.evaluation));
    };
    const off = analysisService.subscribeCompact((r) => {
      if (!r || r.fen !== fen || r.evaluation === 'ERROR') return;
      last = r;
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(finish, QUIET_MS);
    });
    const timeout = setTimeout(finish, TIMEOUT_MS);
    void analysisService.requestCompactAnalysis(fen);
  });
}

/** Grade the move from `before` to `after` for the side that played it; null while it runs or when it cannot. */
export function useOutsideGrade(before: string | null, after: string | null) {
  const [grade, setGrade] = useState<OutsideGrade | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setGrade(null);
    setFailed(false);
    if (!before || !after) return;
    let cancelled = false;
    (async () => {
      const mover = before.split(' ')[1] === 'w' ? 1 : -1;
      const b = await searchOnce(before);
      if (cancelled) return;
      const a = await searchOnce(after);
      if (cancelled) return;
      if (b === null || a === null) { setFailed(true); return; }
      const bestForMover = b * mover;
      const afterForMover = a * mover;
      const cp = bestForMover - afterForMover;
      const w = winPct(bestForMover) - winPct(afterForMover);
      setGrade(cp >= 150 || w >= 18 ? 'mistake' : cp >= 50 || w >= 7 ? 'inaccuracy' : 'playable');
    })();
    return () => { cancelled = true; analysisService.stopCompactAnalysis(); };
  }, [before, after]);
  return { grade, failed };
}
