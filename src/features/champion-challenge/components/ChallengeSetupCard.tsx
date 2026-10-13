import { ListChecks } from 'lucide-react';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { SESSION_LENGTHS, type SessionLength } from '../services/ChampionChallengeApi';

interface ChallengeSetupCardProps {
  length: SessionLength;
  onLengthChange: (length: SessionLength) => void;
}

export function ChallengeSetupCard({ length, onLengthChange }: ChallengeSetupCardProps) {
  return (
    <WorkspaceCard
      title="Challenge setup"
      icon={<ListChecks className="h-3.5 w-3.5" aria-hidden />}
      className="mb-3"
      testId="challenge-setup"
    >
      <p className="mb-3 max-w-2xl text-sm text-muted-foreground">
        Step into a World Champion&apos;s shoes, choose your move, then compare it with
        the champion&apos;s decision and reasoning.
      </p>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Positions per session">
        <span className="mr-1 text-xs text-muted-foreground">Length</span>
        {SESSION_LENGTHS.map(option => {
          const selected = option === length;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onLengthChange(option)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </WorkspaceCard>
  );
}
