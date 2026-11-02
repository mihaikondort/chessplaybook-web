import { useEffect, useRef, useState } from 'react';
import { BarChart3, Lightbulb } from 'lucide-react';
import { useGameReview } from '@/components/game-analysis/useGameReview';
import { GameReportDialog } from '@/components/game-analysis/GameReportDialog';
import { ExplanationOverlay } from '@/components/game-analysis/ExplanationOverlay';
import type { GamePly } from '@/lib/game/gameModel';
import { pliesBefore } from '@/lib/game/moveSpeech';

const INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

/** The board as every game starts, whatever the move counters say. */
function isInitialPosition(fen: string): boolean {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ') === INITIAL;
}
import type { ChessGame } from '@/types/chess';

/**
 * Game report and Explain position, as a row of two buttons (layout redesign
 * E4b-2). The report opens in a dialog; the explanation opens over the lane,
 * beside the board (owner, 2026-11-03).
 *
 * Its own component so a page without them (the live viewer) never runs
 * `useGameReview` at all: the hook keeps a report in session storage by game and
 * clears it when handed no game, which would wipe `/analysis`'s.
 *
 * The report counts plies played (0 is the start); the board's index counts from -1.
 *
 * NO REPORT FOR A GAME FROM A SET POSITION (owner, 2026-10-12, D36). The report
 * replays the moves from the initial position, in the browser and on the server, so
 * a game imported from a `[FEN]` could only fail. Explain position reads the board's
 * position alone and stays, taking the whole row.
 */
export function GameReviewActions({
  fen, startFen, plies, ply, onGoTo, metadata, gameResult,
}: {
  fen: string;
  /** Where the game starts: the initial position, or a `[FEN]` tag's. */
  startFen: string;
  plies: GamePly[];
  /** The board's ply index: -1 is the starting position. */
  ply: number;
  /** Go to a board ply index. */
  onGoTo: (ply: number) => void;
  metadata: ChessGame;
  gameResult: 'white' | 'black' | 'draw';
}) {
  const review = useGameReview({
    currentFen: fen,
    moves: plies.map(p => p.uci),
    gameResult,
    metadata,
    moveIndex: ply + 1,
  });
  const [reportOpen, setReportOpen] = useState(false);
  /* Asked for and not yet ready: open the report the moment it is. */
  const [reportWanted, setReportWanted] = useState(false);
  useEffect(() => {
    if (reportWanted && review.reportButtonState === 'ready') { setReportOpen(true); setReportWanted(false); }
    if (reportWanted && review.reportError) setReportWanted(false);
  }, [reportWanted, review.reportButtonState, review.reportError]);
  const onReport = () => {
    if (review.reportButtonState === 'ready') { setReportOpen(true); return; }
    if (review.reportButtonState === 'analyzing') return;
    setReportWanted(true);
    void review.handleGameReport();
  };
  const canReport = isInitialPosition(startFen);
  const firstPly = pliesBefore(startFen);
  /* "5... Bg7" for a board ply index. */
  const moveLabel = (p: number) =>
    `${Math.floor((firstPly + p) / 2) + 1}${(firstPly + p) % 2 === 0 ? '.' : '...'} ${plies[p]?.san ?? ''}`;

  /*
    THE EXPLANATION SITS BESIDE THE BOARD (owner, 2026-11-03), so the board stays
    usable while it is open. It describes the ply it was asked for; the review
    hook clears it whenever the board moves, so stepping away shows a notice
    instead, and stepping back fetches it again from the hook's cache, with no
    new engine run. `null` is closed.
  */
  const [explainedPly, setExplainedPly] = useState<number | null>(null);
  const explainRef = useRef<HTMLButtonElement>(null);
  /* A ref, not a dependency: the hook's callback changes on every render (its
     `moves` is a new array each time), which would start a fetch per render. */
  const explainNow = useRef(review.handleExplainPosition);
  explainNow.current = review.handleExplainPosition;
  useEffect(() => {
    if (explainedPly !== null && ply === explainedPly) void explainNow.current();
  }, [explainedPly, ply]);
  const reportLabel = review.reportButtonState === 'analyzing'
    ? (review.reportProgress ? `Analyzing ${review.reportProgress.current}/${review.reportProgress.total}` : 'Analyzing…')
    : review.reportError ? 'Try the report again' : 'Game report';

  return (
    <>
      <div className={`grid ${canReport ? 'grid-cols-2' : 'grid-cols-1'}`} style={{ gap: 'calc(var(--card-air) * 2)' }}>
        {canReport && <button
          type="button"
          onClick={onReport}
          disabled={plies.length === 0}
          aria-busy={review.reportButtonState === 'analyzing' || undefined}
          title={review.reportError ?? undefined}
          className="card-btn w-full justify-center gap-[0.35em] disabled:opacity-50"
        >
          <BarChart3 className="shrink-0" aria-hidden />
          <span className="truncate">{reportLabel}</span>
        </button>}
        {/* Not at the starting position (owner, 2026-10-10): no move has been
            played, so there is nothing to explain yet. */}
        <button
          ref={explainRef}
          type="button"
          disabled={ply < 0}
          onClick={() => setExplainedPly(ply)}
          className="card-btn w-full justify-center gap-[0.35em] disabled:opacity-50"
        >
          <Lightbulb className="shrink-0" aria-hidden />
          <span className="truncate">Explain position</span>
        </button>
      </div>
      <ExplanationOverlay
        open={explainedPly !== null}
        onClose={() => setExplainedPly(null)}
        returnFocusTo={explainRef}
        structured={review.positionExplanation?.structured ?? null}
        loading={review.explanationLoading}
        error={review.explanationError}
        title="Explain position"
        description={explainedPly === null ? undefined : `After ${moveLabel(explainedPly)}.`}
        notice={explainedPly !== null && ply !== explainedPly ? (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>The board is no longer on {moveLabel(explainedPly)}.</p>
            {ply >= 0 && (
              <button type="button" onClick={() => setExplainedPly(ply)} className="card-btn w-full justify-center gap-[0.35em]">
                <Lightbulb className="shrink-0" aria-hidden />
                <span className="truncate">Explain this position</span>
              </button>
            )}
          </div>
        ) : undefined}
      />
      <GameReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        analysis={review.gameAnalysis}
        summary={review.gameSummary}
        moveIndex={ply + 1}
        onMoveClick={(index) => onGoTo(index - 1)}
      />
    </>
  );
}
