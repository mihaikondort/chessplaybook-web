/**
 * THE `/puzzles` CARDS ON THE WORKSPACE FIXTURE (layout redesign C5a). DEV-only:
 * rendered by `/dev/workspace?puzzles=1`, which is gated behind
 * `import.meta.env.DEV` and tree-shaken from production.
 *
 * The REAL card components with static props, in the lanes and shares C5b gives
 * them: activity live, run setup, plan at 2, 2, 1 with the analysis band as its
 * foot; context settings, two record cards and standings with the appearance
 * band as its foot. It exists so the card rhythm (D22) is checked against real
 * content, not sample strings.
 *
 * Each component sits in a `display: contents` wrapper carrying v3's
 * `data-skeleton-card`, so its children stay direct children of the card's
 * content box (the rhythm's flex column) and v3's card-scoped rules still reach
 * them. C5b moves those rules onto the Workspace.
 */
import { CheckCircle2, Clock, History, PieChart, TrendingUp, XCircle, Zap } from 'lucide-react';
import type { WorkspaceLane } from '@/components/workspace/Workspace';
import { PuzzleLiveCard } from './PuzzleLiveCard';
import { PuzzleRunSetupCard } from './PuzzleRunSetupCard';
import { PuzzlePlanCard } from './PuzzlePlanCard';
import { PuzzleSettingsCard } from './PuzzleSettingsCard';
import { PuzzleStandingsCard } from './PuzzleStandingsCard';
import { PuzzleAppearanceCard } from './PuzzleAppearanceCard';
import { PuzzleAnalysisCard } from './PuzzleAnalysisCard';
import { StatGrid } from './TrainerUI';
import { slot, footSlot } from '@/components/workspace/slots';

const noop = () => {};

const icon = 'w-[1em] h-[1em]';

export interface PuzzlesFixtureControls {
  themeId: string;
  onThemeChange: (id: string) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  fen: string;
}

/* The two lanes only: the fixture PAGE renders the Workspace itself, because
   only a Workspace-group route may (pageKind.test). */
export function puzzlesFixtureLanes(c: PuzzlesFixtureControls): { activity: WorkspaceLane; context: WorkspaceLane } {
  return {
      activity: {
        title: 'Puzzle',
        cards: [
          slot('live', 'puzzleLive', <>
            <PuzzleLiveCard
              status="playing"
              message=""
              rating={1540}
              prompt="White to move: find the winning continuation"
              exploring={false}
              isMidSolve={false}
              loading={false}
              onNextPuzzle={noop}
              onShowSolution={noop}
            />
          </>, 2, true),
          slot('run-setup', 'puzzleRunSetup', <>
            <PuzzleRunSetupCard
              options={[{ id: 'adaptive', available: true }, { id: 'weak_areas', available: true }, { id: 'failed_review', available: true }]}
              areas={['tactics', 'middlegame', 'endgame']}
              selection="adaptive"
              onSelectionChange={noop}
              area={null}
              onAreaChange={noop}
              total={10}
              onTotalChange={noop}
              onStart={noop}
            />
          </>, 2),
          slot('plan-link', 'puzzlePlan', <>
            <PuzzlePlanCard plan={null} activeItem={null} nextItem={null} nextDayTotal={0} onStart={noop} />
          </>, 1),
        ],
        /* Unresolved, as on the page before a puzzle ends: the engine is off. */
        foot: footSlot('analysis', <PuzzleAnalysisCard enabled={false} fen={c.fen} orientation="white" />),
      },
      context: {
        title: 'Your record',
        cards: [
          slot('settings', 'puzzleSettings', <>
            <PuzzleSettingsCard
              rated
              onRatedChange={noop}
              autoAdvance={false}
              onAutoAdvanceChange={noop}
              theme=""
              onThemeChange={noop}
              filterMode="auto"
              onFilterModeChange={noop}
              ratingRange={{ min: 1000, max: 2000 }}
              onRatingRangeChange={noop}
            />
          </>, 1),
          slot('record-session', 'puzzleRecord', <>
            <span className="card-label inline-flex items-center gap-[0.35em]"><Clock className={icon} />This session</span>
            <div className="card-body">
              <StatGrid columns={2} stats={[
                { label: 'Solved', value: 12, icon: <CheckCircle2 className={`${icon} text-success`} /> },
                { label: 'Missed', value: 3, icon: <XCircle className={`${icon} text-destructive`} /> },
                { label: 'Streak', value: 4, icon: <Zap className={`${icon} text-muted-foreground`} /> },
                { label: 'Accuracy', value: '80%', icon: <PieChart className={`${icon} text-muted-foreground`} /> },
              ]} />
            </div>
          </>, 1),
          slot('record-overall', 'puzzleRecord', <>
            <span className="card-label inline-flex items-center gap-[0.35em]"><History className={icon} />Overall</span>
            <div className="card-body">
              <StatGrid columns={2} stats={[
                { label: 'Solved', value: 338, icon: <CheckCircle2 className={`${icon} text-success`} /> },
                { label: 'Rating', value: 1540, delta: '+8', icon: <TrendingUp className={`${icon} text-muted-foreground`} /> },
                { label: 'Streak', value: 9, icon: <Zap className={`${icon} text-muted-foreground`} /> },
                { label: 'Accuracy', value: '71%', icon: <PieChart className={`${icon} text-muted-foreground`} /> },
              ]} />
            </div>
          </>, 1),
          slot('standings', 'puzzleStandings', <>
            <PuzzleStandingsCard />
          </>, 1),
        ],
        foot: footSlot('theme-focus', (
          <PuzzleAppearanceCard
            currentThemeId={c.themeId}
            onThemeChange={c.onThemeChange}
            focusMode={c.focusMode}
            onToggleFocusMode={c.onToggleFocusMode}
          />
        )),
      },
  };
}
