import type { ReactNode } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import type { StructuredExplanation } from '@/types/positionExplanation';
import { PositionExplanationCard } from './PositionExplanationCard';

/**
 * A position's explanation, opened in a dialog from a control on a card
 * (layout redesign D4a).
 *
 * A Workspace card has a fixed size and holds no scroll bar, and an explanation
 * runs to six sections, so it cannot live inside one. The owner's call for
 * Champion Challenge (2026-10-08, D0): the verdict and the move comparison stay
 * in the card, the explanation opens here. Built to be reused by the viewers in
 * Phase E, which is why it takes the trigger rather than drawing one.
 *
 * The dialog itself may scroll: it is not a lane.
 */
export function ExplanationDialog({
  structured, title, description, trigger, onOpen, loading, error,
}: {
  structured: StructuredExplanation | null;
  /** While the explanation is being fetched (the champion viewer fetches on open, E4b-2). */
  loading?: boolean;
  /** Why it could not be fetched, in words for the reader. */
  error?: string | null;
  title: string;
  description?: string;
  /** The control that opens it, rendered as is (`DialogTrigger asChild`). */
  trigger: ReactNode;
  /** Called each time it opens, for measurement. */
  onOpen?: () => void;
}) {
  return (
    <Dialog onOpenChange={(open) => { if (open) onOpen?.(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <PositionExplanationCard
          structured={structured}
          loading={loading}
          error={error}
          className="border-border/60 bg-background/30 shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}
