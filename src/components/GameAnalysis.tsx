/**
 * Game Analysis Component
 *
 * Displays real-time chess position analysis from Stockfish engine.
 * Shows evaluation score and principal variation (best moves).
 */

import { Card, CardContent } from '@/components/ui/card';
import type { BoardTheme } from '@/config/boardThemes';
import { EvaluationBar } from '@/components/analysis';
import { useEngineAnalysis } from '@/components/analysis/useEngineAnalysis';

interface GameAnalysisProps {
  fen: string; // Current position to analyze
  boardTheme: BoardTheme; // Current board theme for color matching
  isMobile?: boolean; // Compact layout for mobile
}

export const GameAnalysis = ({ fen, boardTheme, isMobile = false }: GameAnalysisProps) => {
  /* The engine state lives in `useEngineAnalysis` (D3b), shared with /analysis's Workspace card. */
  const {
    result, isEnabled, isAnalyzing, isWaiting, pvCount,
    evaluation, isHeldElsewhere, isError, isPositive, isMate,
    setPvCount: handlePvCountChange, toggle: handleToggle,
  } = useEngineAnalysis(fen);

  // Render toggle button JSX
  const renderToggleButton = () => (
    <button
      onClick={handleToggle}
      className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
        isEnabled
          ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
          : 'bg-secondary hover:bg-control text-muted-foreground'
      }`}
      title={isEnabled ? 'Disable analysis (save battery)' : 'Enable analysis'}
    >
      <span className="text-base">
        {isEnabled ? '⚡' : '🔋'}
      </span>
    </button>
  );

  const lightSquare = boardTheme.colors.lightSquare;
  const darkSquare = boardTheme.colors.darkSquare;
  const evalTextColor = isPositive ? 'text-board-ink-dark' : 'text-board-ink-light';
  const mateTextColor = isPositive ? 'text-board-ink-dark-muted' : 'text-board-ink-light-muted';

  return (
    <Card className="bg-card border-border relative flex-1 flex flex-col">
      {renderToggleButton()}
      <CardContent className={isMobile ? "py-2 px-3" : "pt-6 space-y-4 flex-1"}>
        {/* WDL Evaluation Bar - Hidden on mobile */}
        {!isMobile && (
          <EvaluationBar
            wdl={result?.wdl ?? { win: 500, draw: 500, loss: 0 }}
            evaluation={evaluation}
          />
        )}

        {/* Evaluation Score - Hidden on mobile */}
        {!isMobile && (
          <div
            className={`border-2 rounded-lg p-4 text-center relative ${isWaiting ? 'opacity-40' : ''}`}
            style={{
              backgroundColor: isPositive ? lightSquare : darkSquare,
              borderColor: isPositive ? lightSquare : darkSquare,
              borderWidth: '2px'
            }}
          >
            {(isAnalyzing || isWaiting) && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
            )}
            <div className={`text-xs uppercase tracking-wide mb-1 ${evalTextColor} opacity-70`}>
              Evaluation
            </div>
            <div className={`text-3xl font-bold ${evalTextColor} ${isAnalyzing ? 'opacity-60' : ''}`}>
              {isError ? '⚠️' : evaluation}
            </div>
            {isMate && !isError && (
              <div className={`text-xs mt-1 ${mateTextColor}`}>
                {isPositive ? 'White mates' : 'Black mates'}
              </div>
            )}
          </div>
        )}

        {/* Error banner (inside the card, not a separate card) */}
        {isError && result && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-center">
            <div className="text-xs text-warning">
              {isHeldElsewhere
                ? 'Analysis moved to another tab — switch back here to resume'
                : evaluation === 'TIMEOUT'
                  ? 'Analysis timed out'
                  : 'Analysis error — try toggling off/on'}
            </div>
          </div>
        )}

        {/* Disabled message (inside the card) */}
        {!isEnabled && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-sm">Analysis disabled</div>
              <div className="text-xs text-muted-foreground mt-1">Click toggle to enable</div>
            </div>
          </div>
        )}

        {/* Principal Variation Lines — show when enabled (even if loading) */}
        {isEnabled && (
          <div>
            {!isMobile && (
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Engine Line{pvCount > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                  {[0, 1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => handlePvCountChange(count)}
                      className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                        pvCount === count
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-control'
                      }`}
                      title={count === 0 ? 'Analysis OFF' : `${count} line${count > 1 ? 's' : ''}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div
              className={isMobile ? "bg-muted rounded-lg p-2 min-h-[60px]" : "bg-muted rounded-lg p-3"}
              style={!isMobile ? {
                height: pvCount === 1 ? '120px' : pvCount === 2 ? '200px' : '280px'
              } : undefined}
            >
              <div className="space-y-2">
                {result?.lines && result.lines.length > 0 ? (
                  <>
                    {Array.from({ length: pvCount }).map((_, index) => {
                      const lineNumber = index + 1;
                      const line = result.lines.find(l => l.multipv === lineNumber);

                      if (line) {
                        const lineIsPositive = line.evaluation.startsWith('+') ||
                          (line.evaluation.startsWith('M') && !line.evaluation.startsWith('M-'));
                        const lineEvalColor = lineIsPositive ? 'text-win' : 'text-loss';

                        return (
                          <div key={lineNumber} className="text-sm font-mono break-words flex">
                            <span className={`${lineEvalColor} font-bold mr-2 flex-shrink-0`}>
                              {line.evaluation}
                            </span>
                            <span className="text-foreground">
                              {line.moves || 'No moves available'}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={lineNumber} className="text-sm font-mono break-words flex">
                            <span className="text-muted-foreground font-bold mr-2 flex-shrink-0">...</span>
                            <span className="text-muted-foreground">Calculating...</span>
                          </div>
                        );
                      }
                    })}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground font-mono">
                    {isWaiting ? 'Initializing engine...' : (result?.principalVariation || '')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Metadata - Hidden on mobile */}
        {!isMobile && isEnabled && (
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <div>Depth: {result?.depth ?? '-'}</div>
            {result?.nodes && (
              <div>
                {(result.nodes / 1000000).toFixed(1)}M nodes
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
