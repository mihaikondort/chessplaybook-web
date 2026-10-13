/**
 * Game Rating Display — shows composite score with phase breakdown.
 */
import type { GameRating } from '@/services/GameAnalysisService';

interface GameRatingDisplayProps {
  rating: GameRating;
  phasesOnly?: boolean;
}

function ratingColor(score: number): string {
  if (score >= 95) return 'text-move-best';
  if (score >= 85) return 'text-move-excellent';
  if (score >= 75) return 'text-move-inaccuracy';
  if (score >= 65) return 'text-move-mistake';
  return 'text-move-blunder';
}

function phaseBar(score: number, maxWidth: number = 100): { width: string; color: string } {
  const pct = Math.min(100, Math.max(0, score));
  return {
    width: `${(pct / 100) * maxWidth}%`,
    color: score >= 90 ? 'bg-move-best' : score >= 80 ? 'bg-move-excellent' : score >= 70 ? 'bg-move-inaccuracy' : 'bg-move-mistake',
  };
}

export const GameRatingDisplay = ({ rating, phasesOnly = false }: GameRatingDisplayProps) => {
  const phases = [
    { label: 'Opening', score: rating.opening },
    { label: 'Middlegame', score: rating.middlegame },
    { label: 'Endgame', score: rating.endgame },
  ].filter(p => p.score > 0);

  return (
    <div className="space-y-3">
      {/* Overall score */}
      {!phasesOnly && (
        <div className="text-center">
          <div className={`text-2xl font-bold ${ratingColor(rating.overall)}`}>
            {rating.overall.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">{rating.label}</div>
        </div>
      )}

      {/* Phase breakdown */}
      <div className="space-y-2">
        {phases.map(phase => {
          const bar = phaseBar(phase.score);
          return (
            <div key={phase.label} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-muted-foreground">{phase.label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden flex">
                <div className={`h-full ${bar.color}`} style={{ width: bar.width }} />
                <div className="h-full bg-move-blunder flex-1" />
              </div>
              <span className="w-10 text-right font-mono">{phase.score.toFixed(0)}</span>
            </div>
          );
        })}
      </div>

      {/* Bonus breakdown (small) */}
      {(rating.phaseBonus > 0 || rating.resultBonus > 0) && (
        <div className="flex justify-center gap-3 text-[10px] text-muted-foreground">
          {rating.phaseBonus > 0 && <span>Phase +{rating.phaseBonus}</span>}
          {rating.resultBonus > 0 && <span>Result +{rating.resultBonus}</span>}
        </div>
      )}
    </div>
  );
};
