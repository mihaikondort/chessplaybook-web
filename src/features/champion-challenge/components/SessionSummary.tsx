import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Cloud, Crown, Gauge, Medal, Sparkles, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { StatGrid } from '@/features/puzzles/components/TrainerUI';
import { useAuth } from '@/features/auth/AuthContext';
import type { SessionSummary as SessionSummaryData } from '../services/ChampionChallengeApi';

interface SessionSummaryProps {
  champion: string;
  summary: SessionSummaryData;
  /** Unseen positions left for this identity, from the server. */
  remaining: number | null;
  onRestart: () => void;
  onExit: () => void;
}

/** Display order and colour for the server's quality bands. */
const QUALITY_ORDER = ['excellent', 'great', 'good', 'inaccuracy', 'mistake', 'blunder'] as const;

const QUALITY_BAR: Record<string, string> = {
  excellent: 'bg-move-excellent',
  great: 'bg-move-great',
  good: 'bg-move-good',
  inaccuracy: 'bg-move-inaccuracy',
  mistake: 'bg-move-mistake',
  blunder: 'bg-move-blunder',
};

function label(quality: string): string {
  return quality.charAt(0).toUpperCase() + quality.slice(1);
}

/**
 * Sign-in prompt for guests (F5).
 *
 * The summary is the moment the soft-account policy points at: the player has
 * just produced results worth keeping, so the reason to sign in is concrete
 * rather than a generic gate. It stays inline and skippable — "Play again" and
 * "Pick another champion" both work without an account, and nothing above is
 * hidden behind it.
 *
 * Signing in carries the history across: AuthContext runs linkAnonymousData()
 * on authentication, which rewrites this identity's challenge sessions and
 * answers onto the account.
 */
function GuestPrompt({ champion }: { champion: string }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user) return null;

  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <Link
      to={`/login?returnTo=${returnTo}`}
      className="block rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 hover:bg-muted/60 transition-colors group"
    >
      <div className="flex items-start gap-2">
        <Cloud className="w-3.5 h-3.5 mt-0.5 text-muted-foreground/70 shrink-0" />
        <span className="text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
          Playing as guest. Sign in to keep this result and pick up where you
          left off in {champion}'s positions.
        </span>
      </div>
    </Link>
  );
}

export function SessionSummary({
  champion, summary, remaining, onRestart, onExit,
}: SessionSummaryProps) {
  const max = Math.max(1, ...QUALITY_ORDER.map((q) => summary.moveQuality[q] ?? 0));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-2 pb-6 sm:px-4">
      <WorkspaceCard title="Challenge complete" icon={<Trophy className="h-3.5 w-3.5 text-link" aria-hidden />}>
        <p className="text-sm text-foreground">
          {summary.positions} positions from {champion}'s games.
        </p>
      </WorkspaceCard>

      <WorkspaceCard title="Results" icon={<Medal className="h-3.5 w-3.5" aria-hidden />}>
        <StatGrid
          stats={[
            { label: 'Score', value: summary.totalScore, icon: <Sparkles className="h-3.5 w-3.5 text-link" aria-hidden /> },
            { label: 'Champion moves', value: `${summary.championMatches}/${summary.positions}`, icon: <Crown className="h-3.5 w-3.5" aria-hidden /> },
            { label: 'Best moves', value: `${summary.bestMoveMatches}/${summary.positions}`, icon: <Target className="h-3.5 w-3.5" aria-hidden /> },
          ]}
        />
      </WorkspaceCard>

      <WorkspaceCard title="Move quality" icon={<BarChart3 className="h-3.5 w-3.5" aria-hidden />}>
        <div className="space-y-2">
        {QUALITY_ORDER.map((quality) => {
          const count = summary.moveQuality[quality] ?? 0;
          return (
            <div key={quality} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted-foreground">{label(quality)}</span>
              <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full rounded ${QUALITY_BAR[quality]}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-foreground">{count}</span>
            </div>
          );
        })}
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Your training" icon={<Gauge className="h-3.5 w-3.5" aria-hidden />}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Average loss versus the best move: {(summary.averageCentipawnLoss / 100).toFixed(2)} pawns.
            {remaining !== null && remaining > 0 && (
              <> {remaining} more {champion} positions you haven't seen.</>
            )}
          </p>
          <GuestPrompt champion={champion} />
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Continue">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onRestart}>Play again</Button>
          <Button variant="outline" className="flex-1" onClick={onExit}>Pick another champion</Button>
        </div>
      </WorkspaceCard>
    </div>
  );
}
