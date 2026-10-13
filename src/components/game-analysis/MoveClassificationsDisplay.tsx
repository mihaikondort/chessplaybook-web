/**
 * Move Classifications Display — per-player breakdown of move quality.
 *
 * Shows brilliant/best/excellent/good/inaccuracy/mistake/blunder counts
 * for both White and Black in a compact two-column layout.
 */
import type { MoveClassificationCounts } from '@/services/GameAnalysisService';

interface MoveClassificationsDisplayProps {
  whiteCounts: MoveClassificationCounts;
  blackCounts: MoveClassificationCounts;
  whiteAccuracy: number;
  blackAccuracy: number;
}

interface CategoryInfo {
  key: keyof MoveClassificationCounts;
  label: string;
  icon: string;
  symbol: string;
  colorClass: string;
  bgClass: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'brilliant',       label: 'Brilliant',       icon: '!!', symbol: '!!',  colorClass: 'text-move-brilliant',    bgClass: 'bg-move-brilliant' },
  { key: 'best',            label: 'Best',            icon: '★',  symbol: '!',   colorClass: 'text-move-best',         bgClass: 'bg-move-best' },
  { key: 'excellent',       label: 'Excellent',       icon: '!',  symbol: '',    colorClass: 'text-move-excellent',    bgClass: 'bg-move-excellent' },
  { key: 'good',            label: 'Good',            icon: '👍', symbol: '',    colorClass: 'text-move-good',         bgClass: 'bg-move-good' },
  { key: 'inaccuracy',      label: 'Inaccuracy',      icon: '?!', symbol: '?!',  colorClass: 'text-move-inaccuracy',   bgClass: 'bg-move-inaccuracy' },
  { key: 'mistake',         label: 'Mistake',         icon: '?',  symbol: '?',   colorClass: 'text-move-mistake',      bgClass: 'bg-move-mistake' },
  { key: 'blunder',         label: 'Blunder',         icon: '??', symbol: '??',  colorClass: 'text-move-blunder',      bgClass: 'bg-move-blunder' },
  { key: 'severe_blunder',  label: 'Severe Blunder',  icon: '??', symbol: '???', colorClass: 'text-move-severe-blunder', bgClass: 'bg-move-severe-blunder' },
];

export const MoveClassificationsDisplay = ({
  whiteCounts,
  blackCounts,
  whiteAccuracy,
  blackAccuracy,
}: MoveClassificationsDisplayProps) => {
  return (
    <div className="space-y-3">
      {/* Accuracy header */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-board-ink-light border border-muted-foreground" />
          <span className="font-medium">{whiteAccuracy.toFixed(1)}%</span>
        </div>
        <span className="text-xs text-muted-foreground font-medium">Accuracy</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{blackAccuracy.toFixed(1)}%</span>
          <div className="w-3 h-3 rounded-full bg-board-ink-dark border border-muted-foreground" />
        </div>
      </div>

      {/* Classification rows */}
      <div className="space-y-1">
        {CATEGORIES.map(cat => {
          const wCount = whiteCounts[cat.key];
          const bCount = blackCounts[cat.key];

          return (
            <div key={cat.key} className="flex items-center text-xs h-6">
              <span className={`w-8 text-right font-mono ${cat.colorClass}`}>
                {wCount}
              </span>
              <span className="flex-1 flex items-center justify-center">
                <span className="inline-flex items-center gap-1.5 w-[110px]">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-background flex-shrink-0 ${cat.bgClass}`}>
                    {cat.icon}
                  </span>
                  <span className={cat.colorClass}>{cat.label}</span>
                </span>
              </span>
              <span className={`w-8 text-left font-mono ${cat.colorClass}`}>
                {bCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
