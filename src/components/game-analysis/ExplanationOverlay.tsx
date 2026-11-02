import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLaneOverlay } from '@/components/workspace/Workspace';
import type { StructuredExplanation } from '@/types/positionExplanation';
import { PositionExplanationCard } from './PositionExplanationCard';

/**
 * A position's explanation, drawn over the lane of the card that opened it.
 *
 * BESIDE THE BOARD, NEVER OVER IT (owner, 2026-11-03, as for /puzzles on
 * 2026-10-21): the reader looks at the position while reading about it. A
 * centred dialog covered the board on the champion game pages and in Champion
 * Challenge, so the explanation now takes the lane's overlay
 * (`useLaneOverlay`): the board and its toolbar stay visible and usable.
 *
 * A Workspace card has a fixed size and holds no scroll bar; the overlay is the
 * lane's scroll exception, so the explanation scrolls there, as one.
 */
export function ExplanationOverlay({
  open, onClose, structured, title, description, notice, loading, error, returnFocusTo,
}: {
  open: boolean;
  onClose: () => void;
  structured: StructuredExplanation | null;
  title: string;
  description?: string;
  /** Shown in place of the explanation (the board has moved to another position). */
  notice?: ReactNode;
  /** While the explanation is being fetched. */
  loading?: boolean;
  /** Why it could not be fetched, in words for the reader. */
  error?: string | null;
  /** The control that opened it, focused again on close. */
  returnFocusTo?: RefObject<HTMLElement>;
}) {
  const target = useLaneOverlay(open ? title : null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Focus moves into the panel, so a keyboard reader lands on it rather than on
     the covered card. `preventScroll`: stacked, the panel is below the board,
     and scrolling to it would take the board out of view. */
  useEffect(() => {
    if (!target) return;
    /* Stacked (a phone), the button that opened the panel is below the board, so
       the page is scrolled past it: bring the board back to the top, with the
       panel under it (measured at 390x844: the whole board and ~300px of text). */
    const centre = target.closest('.workspace-canvas')?.querySelector('.workspace-centre');
    if (centre && centre.getBoundingClientRect().top < 0) centre.scrollIntoView({ block: 'start' });
    closeRef.current?.focus({ preventScroll: true });
  }, [target]);

  if (!open || !target) return null;

  const close = () => {
    onClose();
    returnFocusTo?.current?.focus({ preventScroll: true });
  };

  return createPortal(
    <div
      className="flex min-h-full flex-col gap-3 p-3"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close the explanation"
          className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {notice}
      {/* `shrink-0`: unshrunk, the card takes its full height and the overlay
          scrolls as one (the puzzles panel's 800x600 lesson). */}
      {!notice && (
        <PositionExplanationCard
          structured={structured}
          loading={loading}
          error={error}
          className="shrink-0 border-border/60 bg-background/30 shadow-none"
        />
      )}
    </div>,
    target,
  );
}
