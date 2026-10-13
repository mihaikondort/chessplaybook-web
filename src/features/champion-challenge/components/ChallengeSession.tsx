import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpDown, Compass, Crown, Gauge, Minimize2, Swords } from 'lucide-react';
import { Workspace, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { useChrome } from '@/app/SiteShell';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { PuzzleAppearanceCard } from '@/features/puzzles/components/PuzzleAppearanceCard';
import { Button } from '@/components/ui/button';
import { logGA4Event } from '@/services/analytics';
import type { Player } from '@/types/chess';
import { useChampionChallenge } from '../hooks/useChampionChallenge';
import type { SessionLength } from '../services/ChampionChallengeApi';
import { ChallengeBoard } from './ChallengeBoard';
import { MoveAnalysis } from './MoveAnalysis';
import { SessionSummary } from './SessionSummary';

interface ChallengeSessionProps {
  champion: string;
  length: SessionLength;
  player?: Player;
  onExit: () => void;
}

/*
  A STATE WITHOUT A BOARD (loading, an error, the summary) is a plain block in
  the page region, which is a Workspace region since D4b: locked to the window,
  so it scrolls itself when the block is taller. (The picker, which shared this
  route until #68, is a Document page at `/champion-challenge` now.)
*/
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl px-2 pt-2 sm:px-4">
      <WorkspaceCard title={title}>{children}</WorkspaceCard>
    </div>
  );
}

/**
 * Runs one challenge session end to end: position → user move → analysis →
 * next → summary.
 *
 * The server deals the positions, scores the moves and writes the coaching;
 * this component decides only what is on screen.
 *
 * ON THE WORKSPACE (layout redesign D4b). The tier widths, the board and panel
 * chrome, `useBoardSize`, `useAvailableHeight`, `useNavTotal` and `layoutMode`
 * are gone: the board and the lanes are CSS from the layout tokens, as on the
 * other board pages. Focus mode is columns-only and keeps the live card.
 */
export function ChallengeSession({ champion, length, player, onExit }: ChallengeSessionProps) {
  const {
    loading, submitting, error, challengeId, total, index, current, currentVerdict,
    finished, summary, remaining, submit, next, restart,
  } = useChampionChallenge(champion, length);
  const { currentTheme, changeTheme } = useBoardTheme();

  /*
    THE FLIP IS THE SESSION'S, not the board's: its control is in the toolbar,
    a different slot. A new position re-orients to the side to move: a flip is
    per position, not a sticky preference, or the next position could open from
    behind.
  */
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); }, [current?.fen]);

  const [focusMode, setFocusMode] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => {
    if (workspaceMode?.mode === 'stacked') setFocusMode(false);
  }, [workspaceMode]);
  const { setChromeHidden } = useChrome();
  const showsBoard = !loading && !finished && Boolean(current);
  useEffect(() => {
    setChromeHidden(focusMode && showsBoard);
    return () => setChromeHidden(false);
  }, [focusMode, showsBoard, setChromeHidden]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focusMode) setFocusMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode]);

  // GA4 (C4): one start per dealt session, one completion per finished session.
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!challengeId || startedRef.current === challengeId) return;
    startedRef.current = challengeId;
    logGA4Event({
      name: 'champion_challenge_started',
      params: { champion, challenge_id: challengeId },
    });
  }, [challengeId, champion]);

  const completedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!finished || !summary || !challengeId || completedRef.current === challengeId) return;
    completedRef.current = challengeId;
    logGA4Event({
      name: 'champion_challenge_completed',
      params: {
        champion,
        challenge_id: challengeId,
        positions: summary.positions,
        score: summary.totalScore,
      },
    });
  }, [finished, summary, challengeId, champion]);

  if (loading) {
    return (
      <Panel title="Loading challenge">
        <div className="flex min-h-28 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" aria-hidden />
          Loading {champion}'s positions…
        </div>
      </Panel>
    );
  }

  // A failure with nothing on screen is fatal; a failure mid-session (a
  // rejected move, say) is shown inline below so the session survives it.
  if (error && !current && !finished) {
    return (
      <Panel title="Challenge unavailable">
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">{error}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={restart}>Try again</Button>
            <Button variant="outline" className="flex-1" onClick={onExit}>
              Pick another champion
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  if (finished) {
    if (!summary) {
      if (error) {
        return (
          <Panel title="Results unavailable">
            <div className="space-y-3">
              <p className="text-sm text-destructive" role="alert">{error}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={restart}>Play again</Button>
                <Button variant="outline" className="flex-1" onClick={onExit}>
                  Pick another champion
                </Button>
              </div>
            </div>
          </Panel>
        );
      }
      return (
        <Panel title="Preparing your results">
          <p className="min-h-20 text-sm text-muted-foreground" role="status">
            Working out your results…
          </p>
        </Panel>
      );
    }
    return (
      <SessionSummary
        champion={champion}
        summary={summary}
        remaining={remaining}
        onRestart={restart}
        onExit={onExit}
      />
    );
  }

  if (!current) {
    return (
      <Panel title="No positions available">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">No positions available for {champion}.</p>
          <Button variant="outline" className="w-full" onClick={onExit}>
            Pick another champion
          </Button>
        </div>
      </Panel>
    );
  }

  const whiteToMove = current.sideToMove === 'white';
  const toMove = whiteToMove ? 'White' : 'Black';
  const answered = index + (currentVerdict ? 1 : 0);

  return (
    <>
      {/* The toggle lives in the context lane's foot, which focus mode removes,
          so the exit is a fixed control with the shortcut named on it. */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="surface-card fixed right-4 top-4 z-50 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minimize2 className="h-4 w-4" aria-hidden />
          Leave focus mode
          <kbd className="rounded border border-border px-1 text-[10px] text-muted-foreground">Esc</kbd>
        </button>
      )}
      <Workspace
        focus={focusMode}
        onModeChange={setWorkspaceMode}
        board={
          <div data-skeleton-card="board" className="w-full" role="group" aria-label={`Position from ${champion}'s games`}>
            <ChallengeBoard
              fen={current.fen}
              onMove={submit}
              playedMove={currentVerdict?.userMove}
              frozen={submitting}
              flipped={flipped}
            />
          </div>
        }
        toolbar={
          /*
            WHO IS TO MOVE, AND FLIP (owner, 2026-10-09). The challenge has no
            history to navigate, so the band holds the one control it has at a
            normal size, beside the fact the solver needs first; a lone Flip
            stretched across the board would read as a submit button.

            Its type is the lanes' base (`.workspace-lane` in workspace.css),
            the same expression, so the band reads at the size of the cards
            beside it; the toolbar is not inside a lane and would otherwise
            inherit the page's 16px.
          */
          <div
            className="surface-card flex h-full w-full items-center justify-between gap-[0.8em] rounded-lg px-[0.8em]"
            style={{ fontSize: 'clamp(12px, 2.07cqh, 18px)' }}
            data-challenge-toolbar
          >
            <span className="flex min-w-0 items-center gap-[0.5em]">
              <span
                className={`h-[0.75em] w-[0.75em] shrink-0 rounded-full border border-border ${whiteToMove ? 'bg-board-ink-light' : 'bg-board-ink-dark'}`}
                aria-hidden
              />
              <span className="truncate font-medium text-foreground">{toMove} to move</span>
            </span>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              title="Flip board"
              aria-label="Flip board"
              className="inline-flex h-[70%] min-h-8 shrink-0 items-center justify-center rounded-md bg-muted/50 px-[0.9em] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUpDown className="h-[1.15em] w-[1.15em]" aria-hidden />
            </button>
          </div>
        }
        activity={{
          title: 'Your answer',
          cards: [
            /* The card the solver works with, kept in focus mode. */
            slot('challenge-live', 'challengeLive', currentVerdict ? (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Swords className="text-link" aria-hidden />
                  Move review
                </span>
                <MoveAnalysis
                  champion={champion}
                  verdict={currentVerdict}
                  isLast={index === total - 1}
                  onNext={next}
                />
              </>
            ) : (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Swords className="text-link" aria-hidden />
                  Your move
                </span>
                <div className="card-body">
                  <p className="font-medium text-foreground">
                    {toMove} to move. What would {champion} play?
                  </p>
                  <p className="text-[0.92em] text-muted-foreground">
                    Not every position hides a tactic. Most call for a good, patient move.
                    Play what you think is best.
                  </p>
                  {submitting && (
                    <p className="text-[0.92em] text-muted-foreground" role="status">
                      Checking your move…
                    </p>
                  )}
                  {error && <p className="text-[0.92em] text-destructive">{error}</p>}
                  <button type="button" onClick={onExit} className="card-btn mt-auto w-full text-[0.92em]">
                    Leave challenge
                  </button>
                </div>
              </>
            ), 1, true),
          ],
        }}
        context={{
          title: 'Challenge details',
          cards: [
            slot('challenge-champion', 'challengeChampion', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Crown className="text-link" aria-hidden />
                  Champion
                </span>
                <div className="card-body">
                  <span className="flex min-w-0 items-center gap-[0.6em]">
                    {player && (
                      <img
                        src={`/${player.imagePath}`}
                        alt={player.fullName}
                        className="h-[3.2em] w-[3.2em] shrink-0 rounded-full"
                        width={112}
                        height={112}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-semibold leading-tight text-foreground">
                        {player?.fullName ?? champion}
                      </span>
                      {player && (
                        <span className="block truncate text-[0.86em] text-muted-foreground">
                          {player.championshipYears.replace('World Champion ', '')}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              </>
            )),
            slot('challenge-progress', 'challengeProgress', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Swords aria-hidden />
                  This challenge
                </span>
                <div className="card-body items-center justify-center text-center">
                  <span className="card-value tabular-nums">
                    {answered}<span className="text-[0.6em] font-normal text-muted-foreground">/{total}</span>
                  </span>
                  <span className="text-[0.86em] text-muted-foreground">Positions answered</span>
                </div>
              </>
            )),
            slot('challenge-position', 'challengePosition', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Gauge aria-hidden />
                  This position
                </span>
                <div className="card-body">
                  {/* The position's number lived in "This challenge"'s title and
                      wrapped it at 240px with 18px type (D4b); it is this
                      position's fact, so it sits here. */}
                  <span className="card-row justify-between">
                    <span>Position</span>
                    <span className="font-medium tabular-nums text-foreground">{index + 1} of {total}</span>
                  </span>
                  <span className="card-row justify-between">
                    <span>Difficulty</span>
                    <span className="font-medium capitalize text-foreground">{current.difficulty}</span>
                  </span>
                </div>
              </>
            )),
            slot('challenge-go-to', 'playGoTo', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Compass aria-hidden />
                  Go to
                </span>
                <div className="card-body" style={{ gap: 0 }}>
                  <button type="button" onClick={onExit} className="card-row w-full py-[0.16em] text-left hover:text-foreground">
                    <span>Pick another champion</span>
                  </button>
                </div>
              </>
            )),
          ],
          foot: footSlot('theme-focus', (
            <PuzzleAppearanceCard currentThemeId={currentTheme.id} onThemeChange={changeTheme} analyticsSurface="champion_challenge" focusMode={focusMode} onToggleFocusMode={canFocus ? () => setFocusMode(value => !value) : undefined} />
          )),
        }}
      />
    </>
  );
}
