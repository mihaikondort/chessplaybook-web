/**
 * The engine card on `/analysis` (layout redesign D3b), content for a
 * `WorkspaceCard` of type `analysisEngine`.
 *
 * OWNER, 2026-10-09 (D3a): the evaluation is one large number in the card's
 * title row, then the engine lines; no "Winning chances" bar and no evaluation
 * box. Those two were 192px of a ~465px card, and a lane at 800x600 gives the
 * card 340-400. The selector offers ONLY AS MANY LINES AS FIT the card.
 *
 * HOW "FIT" IS DECIDED WITHOUT MEASURING CONTENT. Each line has a slot of a
 * fixed height (two text rows, clamped), and the lines block takes whatever
 * height the card's other rows leave. So how many slots fit is a property of the
 * CARD's height, read from the block's own box, never from what the engine
 * printed. A saved count larger than what fits shows what fits.
 *
 * The engine state is `useEngineAnalysis`, the same copy `GameAnalysis` runs.
 */
import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { useEngineAnalysis } from './useEngineAnalysis';

/* A line's slot, in the card's em: two rows of 0.92em text at 1.4 leading. */
const SLOT_EM = 2 * 0.92 * 1.4;
/* The gap between slots, in em. */
const SLOT_GAP_EM = 0.35;

function useSlotsThatFit(block: HTMLElement | null) {
  const [fit, setFit] = useState(3);
  useEffect(() => {
    if (!block) return;
    const read = () => {
      const em = parseFloat(getComputedStyle(block).fontSize) || 16;
      const slot = SLOT_EM * em;
      const gap = SLOT_GAP_EM * em;
      setFit(Math.max(1, Math.min(3, Math.floor((block.clientHeight + gap + 0.5) / (slot + gap)))));
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(block);
    return () => observer.disconnect();
  }, [block]);
  return fit;
}

export function EngineAnalysisCard({ fen, notice }: { fen: string; notice?: string | null }) {
  const {
    result, isEnabled, isAnalyzing, isWaiting, pvCount,
    evaluation, isHeldElsewhere, isError, isPositive, isMate, setPvCount,
  } = useEngineAnalysis(fen, { singleLineOnNarrowWindows: false });
  const [block, setBlock] = useState<HTMLDivElement | null>(null);
  const fit = useSlotsThatFit(block);
  const shown = Math.min(pvCount, fit);

  const errorText = isHeldElsewhere
    ? 'Analysis moved to another tab. Switch back here to resume.'
    : evaluation === 'TIMEOUT'
      ? 'Analysis timed out.'
      : 'Analysis error. Turn it off and on again.';

  return (
    <div className="card-body">
      <span className="card-row">
        <Cpu className="shrink-0 text-link" aria-hidden />
        <span className="truncate font-semibold text-foreground">Engine</span>
        <span className="ml-auto flex shrink-0 items-center gap-[0.35em]">
          {isEnabled && (isAnalyzing || isWaiting) && (
            <span className="h-[0.45em] w-[0.45em] animate-pulse rounded-full bg-primary" aria-hidden />
          )}
          <span
            className={`text-[1.5em] font-bold leading-none tabular-nums ${!isEnabled || isWaiting ? 'text-muted-foreground' : 'text-foreground'}`}
            aria-label={isMate && !isError ? `${isPositive ? 'White' : 'Black'} mates, ${evaluation}` : `Evaluation ${evaluation}`}
          >
            {!isEnabled ? 'Off' : isError ? '?' : evaluation}
          </span>
        </span>
      </span>

      <span className="card-row justify-between text-[0.86em]">
        <span className="truncate">{isMate && isEnabled && !isError ? (isPositive ? 'White mates' : 'Black mates') : 'Engine lines'}</span>
        <span className="flex shrink-0 items-center gap-[0.15em] rounded-[0.35em] bg-muted p-[0.15em]" role="group" aria-label="Number of engine lines">
          {[0, 1, 2, 3].filter(count => count <= fit).map(count => (
            <button
              key={count}
              type="button"
              onClick={() => setPvCount(count)}
              aria-pressed={count === 0 ? !isEnabled || pvCount === 0 : isEnabled && shown === count}
              title={count === 0 ? 'Analysis off' : `${count} line${count > 1 ? 's' : ''}`}
              className={`min-w-[1.7em] rounded-[0.25em] px-[0.35em] py-[0.1em] font-medium tabular-nums transition-colors ${
                (count === 0 ? !isEnabled || pvCount === 0 : isEnabled && shown === count)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-control hover:text-foreground'
              }`}
            >
              {count === 0 ? 'Off' : count}
            </button>
          ))}
        </span>
      </span>

      {(notice || (isError && result)) && (
        <span role="alert" className="line-clamp-2 text-[0.86em] text-warning">{notice || errorText}</span>
      )}

      {/* At least one slot: the card always holds a line, and a measurement with
          the air at zero (which stops the body growing) still counts one. */}
      <div ref={setBlock} className="flex flex-1 flex-col overflow-hidden" style={{ gap: `${SLOT_GAP_EM}em`, minHeight: `${SLOT_EM}em` }}>
        {!isEnabled ? (
          <span className="text-[0.92em] text-muted-foreground">Analysis is off.</span>
        ) : (
          Array.from({ length: shown }).map((_, index) => {
            const line = result?.lines?.find(l => l.multipv === index + 1);
            const lineIsPositive = line && (line.evaluation.startsWith('+') || (line.evaluation.startsWith('M') && !line.evaluation.startsWith('M-')));
            return (
              <div key={index} className="shrink-0 overflow-hidden rounded-[0.35em] bg-muted px-[0.45em]" style={{ height: `${SLOT_EM}em` }}>
                <p className="line-clamp-2 break-words font-mono text-[0.92em] leading-[1.4]">
                  {line ? (
                    <>
                      <span className={`mr-[0.5em] font-bold ${lineIsPositive ? 'text-win' : 'text-loss'}`}>{line.evaluation}</span>
                      <span className="text-foreground">{line.moves || 'No moves available'}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{isWaiting && index === 0 ? 'Starting the engine…' : 'Calculating…'}</span>
                  )}
                </p>
              </div>
            );
          })
        )}
      </div>

      <span className="card-row justify-between text-[0.8em]">
        <span>Depth {isEnabled ? (result?.depth ?? '-') : '-'}</span>
        {isEnabled && result?.nodes ? <span>{(result.nodes / 1000000).toFixed(1)}M nodes</span> : null}
      </span>
    </div>
  );
}
