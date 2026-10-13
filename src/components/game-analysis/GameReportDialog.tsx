import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { FullGameAnalysis } from '@/services/GameAnalysisService';
import { GameStatsCard } from './GameStatsCard';
import type { GameSummaryResult } from './useGameReview';

/**
 * The Game report, in a dialog (layout redesign E4b-2; owner, E4a).
 *
 * The stats card is 589px tall at every lane width (rating, graph, accuracy and
 * classifications, phases), so it fits a Workspace lane only from about 1280x720 up;
 * a dialog fits every window, and may scroll, being no lane. The summary, when the
 * server wrote one, comes first. A click on the graph or on the summary's move goes
 * to that move and closes the dialog, so the reader lands on the board.
 *
 * `moveIndex` counts plies played (0 is the starting position), as the stats card does.
 */
export function GameReportDialog({
  open, onOpenChange, analysis, summary, moveIndex, onMoveClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: FullGameAnalysis | null;
  summary: GameSummaryResult | null;
  moveIndex: number;
  onMoveClick: (moveIndex: number) => void;
}) {
  const goTo = (index: number) => { onMoveClick(index); onOpenChange(false); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Game report</DialogTitle>
          <DialogDescription>Click the graph to go to that move.</DialogDescription>
        </DialogHeader>
        {summary && analysis && (
          <GameStatsCard
            analysis={analysis}
            currentMoveIndex={moveIndex}
            gameSummary={summary}
            onMoveClick={goTo}
            className="border-border/60 bg-background/30 shadow-none"
          />
        )}
        {analysis && (
          <GameStatsCard
            analysis={analysis}
            currentMoveIndex={moveIndex}
            onMoveClick={goTo}
            className="border-border/60 bg-background/30 shadow-none"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
