import type { ReactNode } from 'react';

export interface WorkspaceCardProps {
  title?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  fill?: boolean;
}

/**
 * Neutral owner of the card grammar established by the Puzzles workspace.
 * The heading always stays above the body with its own separation. `fill`
 * centres only the body in the remaining height; it never turns the card into
 * an internal scroller or collapses the heading into its content.
 */
export function WorkspaceCard({
  title, icon, aside, children, className = '', testId, fill = false,
}: WorkspaceCardProps) {
  return (
    <div
      data-testid={testId}
      className={`rounded-lg surface-card p-2.5 ${fill ? 'flex flex-col' : ''} ${className}`}
    >
      {(title || aside) && (
        <div className="mb-3 flex items-baseline justify-between gap-2">
          {title && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {icon}
              {title}
            </span>
          )}
          {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
        </div>
      )}
      {fill ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center">{children}</div>
      ) : children}
    </div>
  );
}

export default WorkspaceCard;
