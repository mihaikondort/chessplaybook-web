/**
 * GuestBadge — inline, non-blocking badge shown to anonymous users.
 *
 * Looks like part of the UI (not a prompt or modal). Users who notice
 * it and want to act can click through to sign in. Zero friction.
 */
import { Link, useLocation } from 'react-router-dom';
import { Cloud, Hand } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';

const BADGE_TEXT: Record<string, string> = {
  // "sessions" as well as "devices" (owner, 2026-08-04): a guest loses their
  // progress by closing the tab, not only by switching machines, and the
  // single-device solver \u2014 the majority \u2014 read the old line as not applying to
  // them.
  // Two sentences, never an em dash (owner rule for UI copy, 2026-08-13).
  puzzles: 'Playing as guest. Sign in to save progress across sessions and devices.',
  'play-online': 'Playing as guest. Sign in to track your rating.',
  analysis: 'Guest session. Sign in to keep your analysis history.',
  'game-history': 'Saved on this device only. Sign in to access it anywhere.',
};

interface GuestBadgeProps {
  context: 'puzzles' | 'play-online' | 'analysis' | 'game-history';
  /** Inside a Workspace card: sized in `em`, from the card's type, like the rest of the card. */
  inCard?: boolean;
}

export function GuestBadge({ context, inCard = false }: GuestBadgeProps) {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show for authenticated users
  if (user) return null;

  // Any value means "this browser has linked an account before" — it holds the
  // anonymous id that was claimed rather than `true` since 2026-08-05, because
  // a single boolean stopped later guest identities from ever being linked.
  const hasAccount = typeof localStorage !== 'undefined'
    && !!localStorage.getItem('cp_account_linked');
  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <Link
      to={`/login?returnTo=${returnTo}`}
      className={`block bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors group ${inCard ? 'rounded-[0.5em] px-[0.75em] py-[0.5em] text-[0.86em]' : 'rounded-lg px-3 py-2.5 text-xs'}`}
    >
      <div className={`flex items-start ${inCard ? 'gap-[0.5em]' : 'gap-2'}`}>
        {hasAccount ? (
          <Hand className={`${inCard ? 'w-[1em] h-[1em] mt-[0.2em]' : 'w-3.5 h-3.5 mt-0.5'} text-muted-foreground/70 shrink-0`} />
        ) : (
          <Cloud className={`${inCard ? 'w-[1em] h-[1em] mt-[0.2em]' : 'w-3.5 h-3.5 mt-0.5'} text-muted-foreground/70 shrink-0`} />
        )}
        <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors leading-relaxed">
          {hasAccount
            ? 'Welcome back! Sign in to sync your stats'
            : BADGE_TEXT[context]}
        </span>
      </div>
    </Link>
  );
}
