import { useEffect, useState } from 'react';
import { BarChart3, Lightbulb } from 'lucide-react';
import { useGameReview } from '@/components/game-analysis/useGameReview';
import { GameReportDialog } from '@/components/game-analysis/GameReportDialog';
import { ExplanationDialog } from '@/components/game-analysis/ExplanationDialog';
import type { GamePly } from '@/lib/game/gameModel';
import { pliesBefore } from '@/lib/game/moveSpeech';

const INITIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

/** The board as every game starts, whatever the move counters say. */
function isInitialPosition(fen: string): boolean {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ') === INITIAL;
}
import type { ChessGame } from '@/types/chess';

/**
 * Game report and Explain position, as a row of two buttons and their dialogs
 * (layout redesign E4b-2; owner, E4a: both open in dialogs).
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
        <ExplanationDialog
          structured={review.positionExplanation?.structured ?? null}
          loading={review.explanationLoading}
          error={review.explanationError}
          title="Explain position"
          description={ply < 0 ? undefined : `After ${Math.floor((firstPly + ply) / 2) + 1}${(firstPly + ply) % 2 === 0 ? '.' : '...'} ${plies[ply].san}.`}
          onOpen={() => { void review.handleExplainPosition(); }}
          trigger={(
            /* Not at the starting position (owner, 2026-10-10): no move has been
               played, so there is nothing to explain yet. */
            <button type="button" disabled={ply < 0} className="card-btn w-full justify-center gap-[0.35em] disabled:opacity-50">
              <Lightbulb className="shrink-0" aria-hidden />
              <span className="truncate">Explain position</span>
            </button>
          )}
        />
      </div>
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
