import { ChevronDown, CircleHelp } from 'lucide-react';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';

/** Each point's text exactly as it follows its bold lead, leading space or comma included. */
const POINTS = [
  {
    lead: 'This is not a puzzle.',
    rest: ' There is usually no forced win and no combination to spot. Some positions hide a decisive blow. Most ask for a good, patient move.',
  },
  {
    lead: 'Every legal move is scored',
    rest: ", not just the champion's. A sound move you chose yourself still scores well. Missing the champion's move is not the same as playing badly.",
  },
  {
    lead: 'You get the reasoning',
    rest: ' for the position after each move. It shows what matters and what the champion was playing for.',
  },
];

function Content({ columns }: { columns: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You get a position a World Champion actually faced, and play the move you
        would choose. Then you see what they played, and why.
      </p>

      <ol className={columns ? 'grid grid-cols-3 gap-5 text-sm' : 'space-y-3 text-sm'}>
        {POINTS.map((point, i) => (
          <li key={point.lead} className="flex gap-3">
            <span className="text-link font-semibold shrink-0">{i + 1}</span>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">{point.lead}</span>
              {point.rest}
            </p>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
        We pick positions where the champion's move is genuinely strong and there is a real
        choice to make. No position is forced or already decided.
      </p>
    </div>
  );
}

/**
 * Expectation-setting for the picker page.
 *
 * Users arriving from the puzzle trainer expect a tactic with one winning
 * answer. Champion Challenge is the opposite: real game positions where a
 * knockout blow is the exception, and a quiet improving move is the norm. If
 * that isn't said plainly up front, a good positional move that isn't the
 * champion's reads as a failure.
 *
 * This is product copy, not chess commentary — the coaching prose still comes
 * from the backend explain pipeline.
 *
 * WHERE IT SITS (#68, owner, 2026-10-13): a full-width strip under Challenge
 * Setup, its three points side by side, from 768px up. It used to be a 360px
 * side column that ended 827px above the champion grid at every desktop
 * width. Below 768px it is one collapsed row in the same place: open, the
 * card is ~450px and would push the first champion down a screen; at the
 * bottom, as before, it sat after all 18 cards (y=2805 on a 390x844 phone).
 */
export function HowItWorks() {
  const icon = <CircleHelp className="h-3.5 w-3.5" aria-hidden />;
  return (
    <>
      <WorkspaceCard title="How it works" icon={icon} className="hidden md:block" testId="how-it-works">
        <Content columns />
      </WorkspaceCard>

      <details className="group rounded-lg surface-card p-2.5 md:hidden" data-testid="how-it-works-compact">
        <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {icon}
            How it works
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
        </summary>
        <div className="mt-3">
          <Content columns={false} />
        </div>
      </details>
    </>
  );
}
