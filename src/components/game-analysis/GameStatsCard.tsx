/**
 * Game Stats Card — the main container for game analysis results.
 *
 * Shows: eval graph (top), accuracy + classifications (middle), game rating (bottom).
 * Can be overlaid by the Position Explanation when "Explain Position" is clicked.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScrollText } from 'lucide-react';
import { EvalGraph } from './EvalGraph';
import { MoveClassificationsDisplay } from './MoveClassificationsDisplay';
import { GameRatingDisplay } from './GameRatingDisplay';
import type { FullGameAnalysis } from '@/services/GameAnalysisService';
import type { GameSummaryResult } from './useGameReview';
import { Link } from 'react-router-dom';

/** Render CTA text with the move number as a clickable link */
function renderCtaWithClickableMove(
  cta: string,
  moveIndex: number,
  onMoveClick: (idx: number) => void,
): React.ReactNode {
  // Find "move N" in the CTA text and make it clickable
  const moveNum = Math.floor(moveIndex / 2) + 1;
  const pattern = `move ${moveNum}`;
  const idx = cta.toLowerCase().indexOf(pattern);
  if (idx === -1) return cta;

  const before = cta.slice(0, idx);
  const match = cta.slice(idx, idx + pattern.length);
  const after = cta.slice(idx + pattern.length);

  return (
    <>
      {before}
      <button
        onClick={() => onMoveClick(moveIndex)}
        className="text-link hover:underline font-medium cursor-pointer"
      >
        {match}
      </button>
      {after}
    </>
  );
}

interface GameStatsCardProps {
  analysis: FullGameAnalysis;
  currentMoveIndex: number;
  onMoveClick?: (moveIndex: number) => void;
  // Game summary overlay (F1)
  gameSummary?: GameSummaryResult | null;
  onShowSummary?: () => void;
  onBackToStats?: () => void;
  className?: string;
}

export const GameStatsCard = ({
  analysis,
  currentMoveIndex,
  onMoveClick,
  gameSummary,
  onShowSummary,
  onBackToStats,
  className = '',
}: GameStatsCardProps) => {
  // Game summary overlay (F1) — shows at initial position or when explicitly triggered
  if (gameSummary) {
    return (
      <Card className={`${className} overflow-hidden`}>
        <CardContent className="p-3 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ScrollText className="h-4 w-4" />
              Game Summary
            </div>
            {onBackToStats && (
              <Button variant="ghost" size="sm" onClick={onBackToStats} className="gap-1 text-xs h-6 px-2">
                <ArrowLeft className="h-3 w-3" />
                Back to Analysis
              </Button>
            )}
          </div>

          {/* Summary text — scrollable middle section */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 text-sm leading-relaxed">
            {gameSummary.summary.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}

            {gameSummary.championLink && gameSummary.championLink.championName && (
              <div className="pt-1">
                <Link
                  to={gameSummary.championLink.url}
                  className="text-xs text-link hover:underline"
                >
                  Study {gameSummary.championLink.championName}'s best games to improve your play in this opening
                </Link>
              </div>
            )}
          </div>

          {/* Bottom section — CTA with clickable move reference */}
          <div className="flex-shrink-0 pt-3 border-t border-border space-y-2">
            {gameSummary.cta && (
              <p className="text-xs text-muted-foreground text-center">
                {gameSummary.criticalMoveIndex !== null && onMoveClick
                  ? renderCtaWithClickableMove(gameSummary.cta, gameSummary.criticalMoveIndex, onMoveClick)
                  : gameSummary.cta}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normal stats view
  return (
    <Card className={`${className}`}>
      <CardContent style={{ padding: '24px 8px 8px' }}>
        {/* Game Rating — overall score */}
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">Game Rating</div>
          <div className={`text-2xl font-bold leading-none ${analysis.gameRating.overall >= 90 ? 'text-move-best' : analysis.gameRating.overall >= 80 ? 'text-move-excellent' : analysis.gameRating.overall >= 70 ? 'text-move-inaccuracy' : analysis.gameRating.overall >= 60 ? 'text-move-mistake' : 'text-move-blunder'}`}>
            {analysis.gameRating.overall.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground leading-none mt-0.5">{analysis.gameRating.label}</div>
        </div>

        {/* Eval Graph */}
        <EvalGraph
          evals={analysis.evalGraph}
          currentMoveIndex={currentMoveIndex}
          classifiedMoves={analysis.classifiedMoves}
          onMoveClick={onMoveClick}
          height={250}
          className="-mt-10"
        />

        {/* Accuracy + Move Classifications */}
        <div className="-mt-6">
          <MoveClassificationsDisplay
            whiteCounts={analysis.whiteCounts}
            blackCounts={analysis.blackCounts}
            whiteAccuracy={analysis.whiteAccuracy}
            blackAccuracy={analysis.blackAccuracy}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 my-2" />

        {/* Phase breakdown */}
        <GameRatingDisplay rating={analysis.gameRating} phasesOnly />
      </CardContent>
    </Card>
  );
};
