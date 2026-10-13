import React from 'react';
import { cn } from '@/lib/utils';

interface EvaluationBarProps {
  wdl?: {
    win: number;   // 0-1000 (permille)
    draw: number;  // 0-1000 (permille)
    loss: number;  // 0-1000 (permille)
  };
  evaluation: string; // Fallback display (e.g., "+2.50", "M3")
  className?: string;
}

/**
 * Evaluation Bar Component
 *
 * Displays chess position evaluation using WDL (Win-Draw-Loss) probabilities
 * from Stockfish engine. Shows winning chances for white, draw probability,
 * and winning chances for black as a visual horizontal bar.
 *
 * Falls back to showing centipawn evaluation if WDL data is unavailable.
 */
export function EvaluationBar({ wdl, evaluation, className }: EvaluationBarProps) {
  // Convert permille (parts per thousand) to percentage
  const winPct = wdl ? (wdl.win / 10).toFixed(1) : null;
  const drawPct = wdl ? (wdl.draw / 10).toFixed(1) : null;
  const lossPct = wdl ? (wdl.loss / 10).toFixed(1) : null;

  // Determine if position is winning for white/black
  const isMate = evaluation.startsWith('M');
  const isWhiteWinning = wdl ? wdl.win > 500 : evaluation.startsWith('+');
  const isBlackWinning = wdl ? wdl.loss > 500 : evaluation.startsWith('-') && !isMate;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Winning Chances</span>
      </div>

      {/* WDL Bar */}
      {wdl ? (
        <>
          <div className="flex h-8 w-full overflow-hidden rounded border border-border">
            {/* White winning section */}
            <div
              className="flex items-center justify-center bg-primary text-primary-foreground text-xs font-medium transition-all duration-300 ease-in-out"
              style={{ width: `${winPct}%` }}
              title={`White winning chance: ${winPct}%`}
            >
              {parseFloat(winPct!) > 5 && `${winPct}%`}
            </div>

            {/* Draw section */}
            <div
              className="flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium transition-all duration-300 ease-in-out"
              style={{ width: `${drawPct}%` }}
              title={`Draw chance: ${drawPct}%`}
            >
              {parseFloat(drawPct!) > 10 && `${drawPct}%`}
            </div>

            {/* Black winning section */}
            <div
              className="flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium transition-all duration-300 ease-in-out"
              style={{ width: `${lossPct}%` }}
              title={`Black winning chance: ${lossPct}%`}
            >
              {parseFloat(lossPct!) > 5 && `${lossPct}%`}
            </div>
          </div>

          {/* Labels with exact percentages */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-link font-medium">White: {winPct}%</span>
            <span>Draw: {drawPct}%</span>
            <span className="text-destructive font-medium">Black: {lossPct}%</span>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground italic opacity-30">
          &nbsp;
        </div>
      )}
    </div>
  );
}
