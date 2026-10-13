import { ExplanationDialog } from '@/components/game-analysis/ExplanationDialog';
import { BookOpen, Crown, Cpu, User } from 'lucide-react';
import { logGA4Event } from '@/services/analytics';
import type { StructuredExplanation } from '@/types/positionExplanation';
import type { AnswerVerdict } from '../services/ChampionChallengeApi';

interface MoveAnalysisProps {
  champion: string;
  verdict: AnswerVerdict;
  isLast: boolean;
  onNext: () => void;
}

/**
 * Shown after the user commits a move: what they played vs what the champion
 * played vs the engine's best, plus the baked coaching.
 *
 * Every string here comes from the server — the quality label, the coach's
 * line and the coaching card. This component adds no chess text of its own.
 */

/** Quality bands are server-owned; the frontend only maps them to colour. */
const QUALITY_CLASS: Record<string, string> = {
  excellent: 'text-move-excellent',
  great: 'text-move-great',
  good: 'text-move-good',
  inaccuracy: 'text-move-inaccuracy',
  mistake: 'text-move-mistake',
  blunder: 'text-move-blunder',
};

function qualityLabel(quality: string): string {
  return quality.charAt(0).toUpperCase() + quality.slice(1);
}

function formatCp(cp: number): string {
  if (Math.abs(cp) >= 10000) return cp > 0 ? '#' : '-#';
  const pawns = cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

/*
  IN THE WORKSPACE'S LIVE CARD (layout redesign D4b): its body, in the card's
  grammar (`em`, `.card-row`, `.card-btn`), with the two actions at the card's
  foot. The card draws the "Move review" title.
*/
export function MoveAnalysis({ champion, verdict, isLast, onNext }: MoveAnalysisProps) {
  return (
    <div className="card-body">
      <section aria-label="Move result" className="flex flex-col" style={{ gap: 'var(--card-air)' }}>
        <span className="flex items-baseline justify-between gap-[0.6em]">
          <span className={`text-[1.3em] font-bold leading-tight ${QUALITY_CLASS[verdict.quality] ?? 'text-foreground'}`}>
            {qualityLabel(verdict.quality)}
          </span>
          <span className="truncate text-[0.86em] text-muted-foreground">
            {verdict.score} / 100
            {verdict.centipawnLoss > 0 && ` · −${(verdict.centipawnLoss / 100).toFixed(2)} pawns`}
          </span>
        </span>
        <p className="line-clamp-3 text-[0.92em] text-foreground">{verdict.encouragement}</p>
      </section>

      <ul className="divide-y divide-border rounded-[0.5em] border border-border/60 bg-muted/20 px-[0.6em] text-[0.92em]" aria-label="Move comparison">
        <li className="card-row py-[0.35em]">
          <User className="shrink-0" aria-hidden />
          <span>You played</span>
          <span className="font-semibold text-foreground">{verdict.userMove}</span>
          <span className="ml-auto">{formatCp(verdict.userEvalCp)}</span>
        </li>
        <li className="card-row py-[0.35em]">
          <Crown className="shrink-0 text-link" aria-hidden />
          <span className="truncate">{champion} played</span>
          <span className="font-semibold text-foreground">{verdict.championMove}</span>
          <span className="ml-auto">{formatCp(verdict.championEvalCp)}</span>
        </li>
        {verdict.bestMove !== verdict.championMove && (
          <li className="card-row py-[0.35em]">
            <Cpu className="shrink-0" aria-hidden />
            <span>Best</span>
            <span className="font-semibold text-foreground">{verdict.bestMove}</span>
            <span className="ml-auto">{formatCp(verdict.bestEvalCp)}</span>
          </li>
        )}
      </ul>

      <div className="mt-auto flex flex-col" style={{ gap: 'calc(var(--card-air) * 2)' }}>
        {/* The coaching describes the position as it stood BEFORE the move, while
            the board now shows the move played: the dialog's title says so. It
            opens in a dialog because a Workspace card cannot hold it (owner,
            2026-10-08, D0); the verdict and the comparison above stay here. */}
        <ExplanationDialog
          structured={verdict.feedback as StructuredExplanation}
          title="The position you solved"
          description="As it stood before your move."
          onOpen={() => logGA4Event({ name: 'champion_challenge_explanation_opened', params: { champion, quality: verdict.quality } })}
          trigger={(
            <button type="button" className="card-btn w-full text-[0.92em]">
              <BookOpen aria-hidden />
              Explain this position
            </button>
          )}
        />
        <button type="button" className="card-btn card-btn-primary w-full" onClick={onNext}>
          {isLast ? 'See results' : 'Next position'}
        </button>
      </div>
    </div>
  );
}
