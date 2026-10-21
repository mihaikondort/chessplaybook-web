import { useEffect, useRef } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { PositionExplanationCard } from '@/components/game-analysis/PositionExplanationCard';
import type { StructuredExplanation } from '@/types/positionExplanation';
import type { PuzzleExplanation } from '../services/PuzzleService';
import { Action } from './TrainerUI';

/**
 * The puzzle's explanation, drawn over the activity lane (owner, 2026-10-21).
 *
 * BESIDE THE BOARD, NEVER OVER IT. The owner's reason is the feature: *"you read
 * the explanations, you look at the board and your mind remembers some patterns
 * associated with a description"*. A centred dialog dims the board, so the text
 * opens over the lane instead (`WorkspaceLane.overlay`), the board and its move
 * buttons stay in reach, and the board is put back on the position the
 * explanation describes when the panel opens.
 *
 * THE ACTIVITY LANE, NOT THE CONTEXT LANE: the context lane is 176-240px wide,
 * about 30 characters a line, and focus mode hides it; the activity lane is
 * 224-416px and survives focus mode.
 *
 * Opened only on a resolved puzzle: the explanation names the solution.
 */
export function PuzzleExplanationPanel({
  explanation, onClose, onNextPuzzle, nextLabel, loading,
}: {
  /** `null` while it is being fetched. */
  explanation: PuzzleExplanation | null;
  onClose: () => void;
  onNextPuzzle: () => void;
  nextLabel: string;
  /** A next puzzle is on its way. */
  loading: boolean;
}) {
  /* Focus moves into the panel when it opens, so a keyboard reader lands on it
     rather than on the covered card that opened it. */
  const closeRef = useRef<HTMLButtonElement>(null);
  /* `preventScroll`: on a phone held sideways the panel is below the board, and
     focusing it would scroll the board away the moment it was put back on the
     position the text describes. */
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  const structured = explanation?.status === 'ready'
    ? explanation.structured as StructuredExplanation
    : null;
  const error = explanation?.status === 'pending'
    ? 'The explanation for this puzzle is not ready yet.'
    : explanation?.status === 'unavailable'
      ? 'The explanation could not be loaded. Close this and try again.'
      : null;

  return (
    <div className="flex min-h-full flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Explanation</h3>
          <p className="text-xs text-muted-foreground">The board shows the puzzle's starting position.</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close the explanation"
          className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/*
        `shrink-0`: the card's box clips (`overflow-hidden`), which lets a flex
        column squeeze it, and then it scrolls inside itself under its fixed
        verdict. At 800x600 that left no room for any text at all. Unshrunk, it
        takes its full height and the PANEL scrolls, as one.
      */}
      <PositionExplanationCard
        structured={structured}
        loading={explanation === null}
        error={error}
        className="shrink-0 border-border/60 bg-background/30 shadow-none"
      />

      {/* Pinned to the panel's bottom edge, so moving on never needs a scroll
          to the end of a long explanation. */}
      <div className="sticky bottom-0 -mx-3 -mb-3 mt-auto bg-card p-3 pt-2">
        <Action
          tier="primary"
          onClick={onNextPuzzle}
          disabled={loading}
          icon={<ChevronRight className="w-[1em] h-[1em]" />}
        >
          {nextLabel}
        </Action>
      </div>
    </div>
  );
}

export default PuzzleExplanationPanel;
