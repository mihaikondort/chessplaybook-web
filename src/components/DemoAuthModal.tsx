/**
 * DemoAuthModal — Non-dismissable overlay shown to unauthenticated users
 * on the demo game analysis page.
 *
 * Shows value proposition + sign-up CTA over a dimmed but visible game
 * analysis page (board, commentary, stats).
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, BarChart3, Puzzle, Swords } from 'lucide-react';

interface DemoAuthModalProps {
  /** Original destination to return to after sign-up */
  returnTo: string;
}

export const DemoAuthModal = ({ returnTo }: DemoAuthModalProps) => {
  const navigate = useNavigate();

  const encodedReturn = encodeURIComponent(returnTo);

  return (
    <div className="fixed inset-0 z-50">
      {/* Right side: transparent click blocker so analysis card is visible but not interactive */}
      <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-[350px]" />
      {/* Left side: semi-transparent overlay over the board with modal */}
      <div className="absolute inset-0 lg:right-[350px] bg-[hsl(var(--overlay)/0.25)] flex items-center justify-center p-4">
        <div className="bg-[hsl(var(--overlay)/0.65)] backdrop-blur-[1px] border border-primary/30 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-7 h-7 rounded-md" />
            <h2 className="text-xl font-bold text-foreground">Chess Playbook</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Analyze your games, solve puzzles, and play online — all with AI-powered insights.
            <span className="font-semibold text-link"> 100% free.</span>
          </p>
        </div>

        {/* Features list */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <BarChart3 className="h-4 w-4 text-link flex-shrink-0" />
            <span>Game analysis with position explanations</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Trophy className="h-4 w-4 text-link flex-shrink-0" />
            <span>Game reports with accuracy ratings</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Puzzle className="h-4 w-4 text-link flex-shrink-0" />
            <span>Tactical puzzles to sharpen your skills</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Swords className="h-4 w-4 text-link flex-shrink-0" />
            <span>Play online against other players</span>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-1">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
            onClick={() => navigate(`/signup?returnTo=${encodedReturn}`)}
          >
            Create Free Account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => navigate(`/login?returnTo=${encodedReturn}`)}
              className="text-link hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};
