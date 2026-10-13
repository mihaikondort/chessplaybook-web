import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChrome } from '@/app/SiteShell';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { usePuzzleBoard } from '../hooks/usePuzzleBoard';
import { PuzzleLiveCard } from './PuzzleLiveCard';
import { PuzzleSettingsCard } from './PuzzleSettingsCard';
import { PuzzleAppearanceCard } from './PuzzleAppearanceCard';
import { PuzzleStandingsCard } from './PuzzleStandingsCard';
import { PuzzleAnalysisCard } from './PuzzleAnalysisCard';
import { PuzzleRunSetupCard } from './PuzzleRunSetupCard';
import { usePuzzleSettings } from '../hooks/usePuzzleSettings';
import { usePuzzleRecord } from '../hooks/usePuzzleRecord';
import { usePuzzleRun } from '../hooks/usePuzzleRun';
import { resolveLinkedFilters } from '../lib/linkedFilters';
import { usePlan } from '../hooks/usePlan';
import { usePlanOffer } from '../hooks/usePlanOffer';
import { PuzzlePlanCard } from './PuzzlePlanCard';
import type { PlanItem } from '../services/PlanApi';
import { logGA4Event } from '@/services/analytics';
import { StatGrid } from './TrainerUI';
import { Workspace, type WorkspaceMode } from '@/components/workspace/Workspace';
import { slot, footSlot } from '@/components/workspace/slots';
import { isRatingProvisional } from '../lib/provisionalRating';
import SeoHead from '@/components/SeoHead';
import RouteHeading from '@/components/RouteHeading';
import { CheckCircle2, Clock, History, Minimize2, PieChart, TrendingUp, XCircle, Zap } from 'lucide-react';

/**
 * THE PUZZLE TRAINER (`/puzzles`, v3), ON THE WORKSPACE.
 *
 * This component owns the trainer's state and wiring: the board and its draw,
 * the settings, the run, the plan, the record, auto-advance and focus mode.
 * It owns NO geometry. Since layout redesign C5b (2026-10-08) every size on the
 * page is the shared `Workspace`'s CSS (`src/components/workspace/`, spec
 * §3-§6): the board, the control strip, the two lanes, the card shares, each
 * card's type and the spacing inside it (`cardTypes.ts`, from declared content
 * heights). C5c deleted what used to do that here: a row observer, one observer
 * per card, and the constants they were tuned from, all of which the owner had
 * settled by measurement on 2026-08-15/16 and the Workspace now carries as
 * tokens (the strip's 6.54%, the 2 : 2 : 1 shares, v3's page air).
 *
 * The name is historical: this began as the empty layout milestone of
 * 2026-08-15 and became the page. `/dev/puzzles-layout` serves it too.
 */

export default function TrainerLayoutSkeleton() {
  /*
    THE BOARD IS REAL FROM HERE ON (2026-08-15). The geometry is unchanged and
    frozen; what was an empty box now holds the same board, the same control
    strip and the same rules the trainer already had. `useBoardTheme` is mounted
    HERE because `ChessBoard` writes `--cg-*` and decides how a board looks, and
    /puzzles never mounted it - which is the 08-07 bug where a signed-in player's
    cross-device theme never reached this page.
  */
  const [attemptRecordedFor, setAttemptRecordedFor] = useState<string | null>(null);
  /*
    THE SETTINGS AND THE RUN ARE READ BEFORE THE BOARD, because they are what the
    board's next draw asks for. A run's axes govern what is served or they are
    decoration (D4b), and the settings card's own filter governs it when there is
    no run - which is the precedence the old page uses and the reason its filter
    controls are not just a picture.
  */
  const settings = usePuzzleSettings();
  const run = usePuzzleRun();
  /*
    A LINK THAT NAMES A FILTER WINS OVER THE REMEMBERED ONE (C9).

    "Train this" on the record page is that page's whole purpose: it has just
    told the player their endgames are behind, and the click has to land on
    endgames. The new page read only saved settings, so every one of those links
    was decorative - it would have served whatever the last session pinned.

    READ ONCE, at mount, and never written back: arriving with `?area=endgame`
    must not pin the trainer to endgames for ever. Same rule as the old page's,
    and it uses the same function so the two cannot drift.
  */
  /*
    THE LINK IS READ AT MOUNT; THE SAVED THEME IS READ EVERY TIME.

    Both were resolved together here, once, which made two things wrong at once.
    The saved theme was frozen at the value it held on the very first render - so
    changing the theme in Strength & themes updated the card and never reached a
    draw, and on a slow preference load it froze an empty string. And because
    `resolveLinkedFilters` falls back to the saved theme, a player who had simply
    SAVED one arrived with `draw.theme` set, which is what the daily puzzle skips
    on. A saved preference would have suppressed the daily puzzle for ever, where
    the old page skips it only for a filter that arrived in the URL
    (PuzzleTrainer.tsx:1147).

    So this holds the URL's answer only. The saved theme is applied at the draw,
    live, and `fromLink` is what the daily rule asks about.

    STATE, NOT A MEMO, BECAUSE THE PLAYER CAN SET IT ASIDE (C6, D27). As a memo
    the link was permanent for the visit: "Clear the filter" cleared one draw and
    the linked theme came back on the next, and the theme picker showed the
    saved theme while the linked one was being served. The picker now shows what
    is served, choosing a theme in it replaces the link, and clearing clears it.
    `fromLink` stays as it arrived: it answers how the visit STARTED.
  */
  const [linked, setLinked] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = resolveLinkedFilters(params, '');
    return { ...fromUrl, fromLink: Boolean(fromUrl.theme || fromUrl.area) };
  });
  const puzzle = usePuzzleBoard({
    attemptRecordedFor,
    /* Only a filter that arrived in the URL skips the daily puzzle. */
    arrivedWithFilter: linked.fromLink,
    draw: run.draw ?? {
      /* Free solving: `adaptive` in auto mode, so the window is derived from the
         player's own attempt log server-side rather than from a streak counter
         that resets on every page load. A pinned preset beats a derived window,
         so the two are never sent together. */
      selection: settings.filterMode === 'auto' ? 'adaptive' : undefined,
      minRating: settings.filterMode === 'auto' ? undefined : settings.ratingRange.min,
      maxRating: settings.filterMode === 'auto' ? undefined : settings.ratingRange.max,
      /* The linked theme beats the saved one, and the saved one is read HERE so
         a change in Strength & themes reaches the next draw. The linked AREA has
         no picker at all, so a link is the only way it is ever set. */
      theme: linked.theme || settings.theme || undefined,
      area: linked.area || undefined,
    },
  });
  const { currentTheme, changeTheme } = useBoardTheme();
  /*
    FOCUS MODE HIDES THE RECORD COLUMN, which is what gives the board the room.
    Hidden, not unmounted: the column holds fetched state, and unmounting would
    re-read the record every time the mode is toggled. The row observer sees the
    width change and the board is recomputed from it, so no number here needs to
    know the mode exists.
  */
  const [focusMode, setFocusMode] = useState(false);
  /*
    FOCUS MODE IS COLUMNS-ONLY (owner, 2026-10-08, restoring v1's rule; spec
    *Focus mode*). Stacked, the board already has the window's width, and hiding
    the nav there buys nothing. The mode is the Workspace's answer, read from its
    container query; null until it has reported, which happens before paint.
    Leaving columns while focused leaves focus mode, as v1 did - not logged as a
    toggle, because nobody toggled it.
  */
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode | null>(null);
  /* Offered only where focus itself stays in columns: on a near-square window
     the nav's height is what tips it into stacked (`focusHolds`). */
  const canFocus = workspaceMode?.mode === 'columns' && workspaceMode.focusHolds;
  useEffect(() => {
    if (workspaceMode?.mode === 'stacked') setFocusMode(false);
  }, [workspaceMode]);
  /*
    FOCUS MODE HIDES THE SHELL, AND ASKS THE SHELL TO DO IT (#55).

    This used to be `{!focusMode && <Navigation />}` - a page deciding whether the
    site's chrome existed. The chrome is mounted once now, above every route, so
    the page states its intent and the shell acts on it. The setter restores it on
    unmount, so leaving focus mode by navigating away cannot hide the nav on the
    page after it.
  */
  const { setChromeHidden } = useChrome();
  useEffect(() => {
    setChromeHidden(focusMode);
    return () => setChromeHidden(false);
  }, [focusMode, setChromeHidden]);

  /* Escape leaves the mode. A full-screen state with only a mouse target is a
     trap for anyone driving the page from a keyboard. */
  /*
    BOTH EXITS ARE INSTRUMENTED, not just the toggle in the card.

    `PuzzleAppearanceCard` logs its own switch, so entering was counted and two
    of the three ways OUT were not - which makes exits undercount entries and
    the feature look stickier than it is. Same rule the old page follows: the
    mode is covered at all three call sites, because a zero has to be readable.
  */
  const leaveFocus = useCallback(() => {
    setFocusMode(false);
    logGA4Event({ name: 'focus_mode_toggled', params: { enabled: false, surface: 'puzzles' } });
  }, []);
  useEffect(() => {
    if (!focusMode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') leaveFocus(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, leaveFocus]);
  /*
    A RUN'S OWN `rated` WINS while it is the run that served this puzzle, and
    the server enforces the same thing on the attempt - the page follows it so
    the two cannot disagree in front of the player.
  */
  const record = usePuzzleRecord(puzzle.puzzleState, {
    rated: puzzle.servedRunId && puzzle.servedRunId === run.session?.id
      ? run.session.rated
      : settings.rated,
    sessionId: puzzle.servedRunId,
    onResultRecorded: run.refresh,
    /* A puzzle restored from a previous visit whose attempt the server already
       has. Without it the rating moves twice for one solve. */
    alreadyReportedFor: puzzle.restoredReportedFor,
    /* And one restored already over is not counted into this sitting's record
       or announced to GA4 a second time. */
    restoredResolvedFor: puzzle.restoredResolvedFor,
    /* And a restored puzzle of any kind has no honest solve duration. */
    durationUnreliable: puzzle.restoredPuzzleId != null
      && puzzle.restoredPuzzleId === puzzle.puzzleState.puzzle?.id,
    /*
      THE ANTI-GRIND RULE, WHICH THE NEW PAGE WAS NOT APPLYING AT ALL.

      A pinned band more than 200 points from the player's own rating freezes the
      attempt - solving 800s at 1600 must not move a rating. The hook already
      took a `bandIsFarFromRating` flag and the page never passed one, so every
      such attempt was written RATED where the old page writes it frozen.

      The BAND is passed rather than the verdict, because the rating it is
      compared against lives inside this hook. Two owners of one number is how
      the displayed rating came to disagree with the server's on 08-05.
    */
    ratingBand: settings.filterMode === 'manual' ? settings.ratingRange : null,
  });
  /*
    WHAT THE LIVE REGION SAYS (B4), restored to what v1 said (C6, D27).

    The rating change is appended to the outcome rather than announced on its
    own: it arrives 100-300ms later, and two announcements for one event is the
    noise that makes people switch a live region off. The board hook cannot do
    this - the rating lives in the record - and its note that "this page does not
    report results yet" stopped being true when the page began reporting them.

    The two notices v1 announced through their own status blocks are spoken here
    too, since this is the card's only live region. Nothing matched outranks the
    outcome, because the board still shows the last puzzle, already resolved.
    Offline is spoken when the offline puzzle arrives, then outcomes as usual.
  */
  const ratingNote = record.lastSolveFrozen ? ' Practice mode.'
    : record.ratingDelta !== null
      ? ` ${record.ratingDelta >= 0 ? '+' : ''}${record.ratingDelta.toFixed(0)} rating.`
      : '';
  const outcome = puzzle.puzzleState.status === 'correct' || puzzle.puzzleState.status === 'failed'
    ? `${puzzle.announcement}${ratingNote}`
    : puzzle.announcement;
  const announcement = puzzle.filterFoundNothing
    ? 'Nothing matched that filter. The board still has your last puzzle.'
    : puzzle.serverUnreachable && !outcome
      ? 'Cannot reach the server. These are offline practice puzzles, so nothing here is scored.'
      : outcome;
  /*
    THE RESUME PAYLOAD MUST KNOW THE ATTEMPT WAS SCORED, or coming back to a
    resolved puzzle reports it a second time and moves the rating twice for one
    solve. Promised in the commit that added resume; paid here, in the commit
    that added reporting.
  */
  useEffect(() => { setAttemptRecordedFor(record.attemptRecordedFor); }, [record.attemptRecordedFor]);

  /*
    STARTING A RUN DRAWS ITS FIRST PUZZLE (owner, 2026-08-05, after driving the
    old page: pressing Start run and then having to press New Puzzle to actually
    begin reads as a broken start).

    Only on the transition INTO a run. Ending one leaves the board alone, because
    the player is then solving freely and nothing has been asked of them. The
    provenance rule is untouched - the run does not CLAIM the position that was
    already up, it serves one of its own.
  */
  const runId = run.running ? run.session?.id ?? null : null;
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!runId || startedRef.current === runId) return;
    startedRef.current = runId;
    /*
      UNLESS THE PUZZLE ON SCREEN IS ALREADY THIS RUN'S (Codex, 2026-08-16).

      A run is not only STARTED here - it is also DISCOVERED, because the session
      lookup is asynchronous and resolves after mount. So a player who reloads
      mid-run comes back to the puzzle they were working, this effect sees the
      run appear, and draws a new one over the top of it. Their position is gone
      and the attempt they were part-way through is abandoned.

      `servedRunId` is exactly the question to ask: it is the run that served the
      puzzle on the board, restored from the resume payload. When it matches,
      this run already has a puzzle up and there is nothing to draw.
    */
    if (puzzle.servedRunId === runId) return;
    void puzzle.nextPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  /* The attempt for the puzzle ON THE BOARD is already scored. */
  const attemptRecorded = record.attemptRecordedFor != null
    && record.attemptRecordedFor === puzzle.puzzleState.puzzle?.id;
  /*
    THE RUN STAYS ON SCREEN THROUGH THE ATTEMPT THAT ENDED IT. `status` flips to
    ended the moment the last attempt is recorded - which B1 does on the first
    wrong move - so without this the card would drop back to a chooser under a
    player still working the final puzzle. It acknowledges itself when that
    puzzle is RESOLVED.
  */
  /*
    A STOPPED RUN REPORTS ITSELF IMMEDIATELY; A COMPLETED ONE WAITS FOR THE
    PUZZLE THAT ENDED IT.

    The delay exists for one case: a run whose LAST attempt has landed while the
    player is still working that position - B1 records on the first wrong move,
    so the run is over server-side before it is over for them. Keying the whole
    thing on `attemptRecorded && resolved` also swallowed the other case, and the
    probe caught it: press Stop run on a puzzle you have not touched and the card
    said nothing at all. No "Run stopped", no count, no line - the player asks for
    the run to end and the page acknowledges nothing.

    An abandoned run has nothing to wait for. They pressed the button.
  */
  const stoppedByHand = run.session?.status === 'abandoned';
  const runOnScreen = run.running
    || (run.ended && !stoppedByHand && attemptRecorded && !puzzle.isResolved);
  const runFinished = run.ended
    && (stoppedByHand || (attemptRecorded && puzzle.isResolved));

  /*
    THE PAGE OWNS THE PLAN, not the card.

    Two things need it: the card that shows what today asks for, and the RUN
    card, which has to know whether the run it is describing belongs to a plan.
    Two `usePlan()` calls would be two lookups and two answers to one question.
  */
  /* The one offer, shown in the plan card's no-plan state (C6, owner). */
  const planOffer = usePlanOffer();
  const plan = usePlan({
    activeSessionId: run.running ? run.session?.id ?? null : null,
    /* A plan day is started through the PLAN's endpoint, so the run card finds
       out the same way it does after a reload: by asking. Without this a player
       who pressed Start this session had a run on the server and a chooser on
       screen. */
    onSessionStarted: run.reload,
  });

  /*
    Is the run on screen a plan session? Answered from the plan's own items,
    because the link IS `plan_items.session_id` - the session row knows nothing
    about plans, by design.
  */
  const planItemForRun = run.running && run.session
    ? plan.plan?.items.find(i => i.sessionId === run.session!.id) ?? null
    : null;

  /*
    AUTO-START NEXT, and every clause is a rule the owner set after testing
    Lichess's version (2026-08-06). The toggle has been on the settings card
    since the card was built and drove nothing at all, which is the same defect
    as the filters: a control that renders and does not act.

    ONLY ON A SOLVE. Not on a reveal - *"after asking to view the solution it
    doesn't continue automatically, you need to press"* - and not on a failure,
    because a wrong move does not end a puzzle here: it settles the score and
    hands the position straight back, so the player still has to find the move.
    So it checks `status === 'correct'` rather than reusing `isResolved`, which
    is `correct || solution`.

    IT CAN BE CANCELLED, and that is the clause the feature is not worth shipping
    without. The real cost of auto-advance is losing the moment right after a
    solve, which is often the most instructive one on the board. Any deliberate
    act during the wait calls it off and hands the button back.

    NOT AT THE END OF A RUN. A finished run stops at "Run complete"; sliding on
    into free solving would erase the boundary the run card exists to draw.

    NOT ON A RESTORED SOLVE. Coming back to a puzzle already solved would
    advance off it before it could be read, and the resume exists precisely so
    that line is still there. A REF, not state: the puzzle id goes null -> id on
    the mount that performs the restore, so a state flag keyed on the id is
    cleared a tick after being set.
  */
  const AUTO_ADVANCE_MS = 1200;
  const [autoAdvanceCancelled, setAutoAdvanceCancelled] = useState(false);
  const resumedResolvedIdRef = useRef<string | null>(null);
  useEffect(() => { setAutoAdvanceCancelled(false); }, [puzzle.puzzleState.puzzle?.id]);
  /* Captured before anything can advance: the first status this page ever sees
     for a puzzle is `correct` only when the puzzle was restored solved. */
  const firstStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const id = puzzle.puzzleState.puzzle?.id ?? null;
    if (!id || firstStatusRef.current === id) return;
    firstStatusRef.current = id;
    if (puzzle.puzzleState.status === 'correct') resumedResolvedIdRef.current = id;
  }, [puzzle.puzzleState.puzzle?.id, puzzle.puzzleState.status]);

  const autoAdvanceArmed = settings.autoAdvance
    && !autoAdvanceCancelled
    && puzzle.puzzleState.status === 'correct'
    && resumedResolvedIdRef.current !== puzzle.puzzleState.puzzle?.id
    && !runFinished
    && !puzzle.loading;

  useEffect(() => {
    if (!autoAdvanceArmed) return;
    const cancel = () => setAutoAdvanceCancelled(true);
    /* `pointerdown` and `keydown`, not `mousemove`: a cursor that happens to be
       over the board is not an intention, and cancelling on it would make the
       feature fail for anyone who solves with the mouse still on the piece they
       just moved. */
    window.addEventListener('pointerdown', cancel);
    window.addEventListener('keydown', cancel);
    const timer = window.setTimeout(() => { void puzzle.nextPuzzle(); }, AUTO_ADVANCE_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceArmed]);

  const startPlanSession = useCallback(async (item: PlanItem) => {
    if (!await plan.start(item.id)) return;
    logGA4Event({
      name: 'plan_session_started',
      params: { area: item.area, total: item.total, kind: item.kind, surface: 'card' },
    });
  }, [plan]);


  /*
    ON THE WORKSPACE (layout redesign C5b, 2026-10-08).

    The page renders the shared `Workspace`: the board and its control strip in
    the centre, the live card, run setup and plan link in the activity lane with
    the analysis band as its foot, and the settings, the two record cards and the
    standings in the context lane with the appearance band as its foot. Every
    size is CSS (spec §3-§6): the board, the strip, the lanes, the card shares,
    the type and the spacing inside each card. Nothing here measures anything,
    which is what the geometry this replaced did with one observer for the row
    and one per card.

    Shares are the plan's (C5): v3's approved 231 : 252 : 101 is 2 : 2 : 1 in
    the `1 | 2 | 3` vocabulary, and the four record cards are equal. Focus mode
    is the Workspace's: the context lane goes and only the live card survives
    in the activity lane, with its foot, which is v3's own focus behaviour
    (owner, 2026-08-10, restored 2026-10-01).
  */
  const boardLabel = puzzle.puzzleState.puzzle && puzzle.puzzleState.status === 'playing'
    ? `Puzzle board. ${puzzle.puzzleState.puzzle.prompt || 'Find the best move'}`
    : 'Puzzle board';

  return (
    /*
      `display: contents`: the page keeps its `main` landmark without adding a
      box between the page region and the Workspace, which fills the region.
    */
    <main className="contents">
      {/*
        THE SAME TWO TAGS THE CURRENT PAGE RENDERS, and they are not optional on
        a public route. `SeoHead` is the only thing that emits this route's
        title, description, canonical and Open Graph tags; `RouteHeading` is the
        page's only `<h1>`, `sr-only` because nothing may sit above the board
        (PRD 5.2). Both read `src/config/route-meta.json`.
      */}
      <SeoHead routeKey="puzzles" />
      <div className="sr-only"><RouteHeading routeKey="puzzles" /></div>

      {/*
        THE WAY OUT, AND IT CANNOT LIVE IN THE LANE THE MODE HIDES (2026-08-15:
        *"the focus button doesn't work"*). The toggle is in the context lane's
        foot, which focus mode removes, so the exit is a fixed control with the
        shortcut named on it.
      */}
      {focusMode && (
        <button
          type="button"
          onClick={leaveFocus}
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
          /*
            The wheel listener lives on this wrapper, so scrolling anywhere over
            the board steps the solved line. Coordinates are hidden under 480px
            by a container query on this slot (`index.css`): chessground draws
            them INSIDE the squares, so on a small board the file letters print
            over the back-rank pieces (2026-08-14). The board's size is CSS now,
            so the rule cannot be a prop.
          */
          <div
            ref={puzzle.attachWheel}
            data-skeleton-card="board"
            className="w-full"
            role="group"
            aria-label={boardLabel}
          >
            <ChessBoard
              fen={puzzle.displayedFen}
              orientation={puzzle.displayedOrientation}
              dests={puzzle.boardDests}
              turnColor={puzzle.displayedTurnColor}
              movableColor={puzzle.isResolved ? 'both' : puzzle.puzzleState.movableColor}
              lastMove={puzzle.displayedLastMove}
              check={puzzle.displayedCheck}
              onMove={puzzle.onBoardMove}
              themeId={currentTheme.id}
            />
          </div>
        }
        toolbar={
          /*
            Navigation is ALWAYS SHOWN and usable only on a resolved attempt
            (PZ-043 A): mid-attempt, stepping back is an undo, which is what B1
            exists to prevent. History is enabled while EXPLORING too, because
            Back is the only way out of a "what if". The Workspace's toolbar slot
            stretches the bar to its row (2026-10-06).
          */
          <BoardControls
            historyDisabled={!puzzle.canReview && !puzzle.exploreAt}
            onFlip={puzzle.onFlip}
            onStart={() => puzzle.stepTo(0)}
            onBack={puzzle.onBack}
            onForward={() => puzzle.stepTo((puzzle.reviewIndex ?? puzzle.navCeiling) + 1)}
            onReset={puzzle.onReset}
          />
        }
        activity={{
          title: 'Puzzle',
          cards: [
            slot('live', 'puzzleLive', (
              <PuzzleLiveCard
                status={puzzle.puzzleState.status}
                message={puzzle.puzzleState.message}
                rating={puzzle.puzzleState.puzzle?.rating}
                isDailyPuzzle={puzzle.isDaily}
                prompt={puzzle.puzzleState.puzzle?.prompt}
                exploring={Boolean(puzzle.exploreAt)}
                isMidSolve={puzzle.isMidSolve}
                announcement={announcement}
                /* "Next Puzzle" inside a run, "New Puzzle" outside one. */
                sessionId={run.running ? run.session?.id ?? null : null}
                /*
                  Shown only once the run is OVER and only when the server could
                  measure it. Both numbers are the server's, derived from the
                  attempt log; the client counts nothing here.
                */
                runOutcome={runFinished
                  && run.session?.progress.performanceRating != null
                  && run.session?.progress.realizedScore != null
                  ? {
                    rating: run.session.progress.performanceRating,
                    realized: run.session.progress.realizedScore,
                    /* The attempts the figure is OVER, which is not always the
                       run's length: an unrated attempt is left out of both. */
                    total: run.session.progress.scoredAttempts,
                  }
                  : null}
                filterFoundNothing={puzzle.filterFoundNothing}
                serverUnreachable={puzzle.serverUnreachable}
                /*
                  Cleared AND redrawn in one act, with the cleared values passed
                  explicitly: this closure still holds the old filter.

                  THE THEME AND THE AREA, NOT THE STRENGTH (C6, D27). What found
                  nothing is the filter; a pinned band is the player's own choice
                  and v1 kept it. `nextPuzzle` lays these over the current draw,
                  so the band rides along untouched. The link goes too, or the
                  next draw would bring it straight back.
                */
                onClearFilter={() => {
                  setLinked(l => ({ ...l, theme: '', area: '' }));
                  settings.setTheme('');
                  void puzzle.nextPuzzle({ theme: undefined, area: undefined });
                }}
                loading={puzzle.loading}
                onNextPuzzle={puzzle.nextPuzzle}
                onShowSolution={puzzle.puzzleActions.showSolution}
              />
            ), 2, true),
            slot('run-setup', 'puzzleRunSetup', (
              <PuzzleRunSetupCard
                options={run.options}
                areas={run.areas}
                selection={run.selection}
                onSelectionChange={run.setSelection}
                area={run.area}
                onAreaChange={run.setArea}
                total={run.total}
                onTotalChange={run.setTotal}
                running={runOnScreen}
                finished={runFinished}
                /* Stopped and completed are different sentences - see the card. */
                runStatus={run.session?.status}
                runSelection={run.session?.selection}
                runArea={run.session?.area ?? null}
                runTotal={run.session?.total}
                runRated={run.session?.rated}
                completed={run.session?.progress.completed ?? 0}
                /* The counter is pinned to the puzzle on screen. */
                puzzleId={puzzle.puzzleState.puzzle?.id ?? null}
                attemptRecorded={attemptRecorded}
                /* No number over a puzzle the run never served. */
                servedByRun={runOnScreen && puzzle.servedRunId === run.session?.id}
                busy={run.starting}
                loading={run.loading}
                onStart={input => run.startRun(input, settings.rated)}
                onStop={run.stopRun}
                /* A plan day says so, in the title and in the way out (D13). A
                   review day is mixed. */
                planArea={planItemForRun
                  ? (planItemForRun.kind === 'review' ? 'mixed' : planItemForRun.area)
                  : null}
              />
            ), 2),
            slot('plan-link', 'puzzlePlan', (
              <PuzzlePlanCard
                plan={plan.plan}
                activeItem={plan.activeItem}
                nextItem={plan.nextItem}
                nextDayTotal={plan.nextDayTotal}
                loading={plan.loading}
                busy={plan.busy}
                error={plan.error}
                /*
                  A RUN IN PROGRESS BLOCKS A PLAN DAY, and the card says so rather
                  than letting the server refuse after the click. What blocks is a
                  run belonging to something else, which is the server's 409.
                */
                blockedReason={run.running && planItemForRun == null
                  ? 'Finish or stop your current run first'
                  : null}
                onStart={startPlanSession}
                offer={planOffer.offer}
                onOfferShown={planOffer.onShown}
                onOfferAccept={planOffer.onAccept}
                onOfferDismiss={planOffer.onDismiss}
              />
            ), 1),
          ],
          /*
            THE ANALYSIS BAND IS GATED ON `isResolved` AND NOTHING ELSE. `failed`
            is transient, so anything keyed on "not playing" would run the engine
            for a fraction of a second on every wrong move (B1). The engine
            follows the board; the link opens the position the solver was given,
            `linePly[1]` (owner, 2026-08-10).
          */
          foot: footSlot('analysis', (
            <PuzzleAnalysisCard
              enabled={puzzle.isResolved}
              fen={puzzle.displayedFen}
              linkFen={puzzle.linePly?.[1]?.fen}
              orientation={puzzle.displayedOrientation}
            />
          )),
        }}
        context={{
          title: 'Your record',
          cards: [
            slot('settings', 'puzzleSettings', (
              <PuzzleSettingsCard
                rated={settings.rated}
                onRatedChange={settings.setRated}
                autoAdvance={settings.autoAdvance}
                onAutoAdvanceChange={settings.setAutoAdvance}
                /* The theme being SERVED, which a link can set; picking one
                   replaces the link (C6, D27). */
                theme={linked.theme || settings.theme}
                onThemeChange={(theme) => {
                  setLinked(l => ({ ...l, theme: '' }));
                  settings.setTheme(theme);
                }}
                filterMode={settings.filterMode}
                onFilterModeChange={settings.setFilterMode}
                ratingRange={settings.ratingRange}
                onRatingRangeChange={settings.setRatingRange}
                bandIsFarFromRating={record.bandIsFarFromRating}
              />
            )),
            /*
              THE TWO RECORD CARDS, with production's own stats, order and marks
              (owner, 2026-08-06). `null` renders a dash and never `0`: *we do not
              know yet* and *you scored nothing* are different sentences.
            */
            slot('record-session', 'puzzleRecord', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <Clock className="w-[1em] h-[1em]" />
                  This session
                </span>
                <div className="card-body">
                  <StatGrid
                    columns={2}
                    stats={[
                      { label: 'Solved', value: record.stats.solved, icon: <CheckCircle2 className="w-[1em] h-[1em] text-success" /> },
                      { label: 'Missed', value: record.stats.failed, icon: <XCircle className="w-[1em] h-[1em] text-destructive" /> },
                      { label: 'Streak', value: record.stats.streak, icon: <Zap className="w-[1em] h-[1em] text-muted-foreground" /> },
                      {
                        label: 'Accuracy',
                        icon: <PieChart className="w-[1em] h-[1em] text-muted-foreground" />,
                        value: record.stats.solved + record.stats.failed > 0
                          ? `${Math.round((record.stats.solved / (record.stats.solved + record.stats.failed)) * 100)}%`
                          : null,
                      },
                    ]}
                  />
                </div>
              </>
            )),
            slot('record-overall', 'puzzleRecord', (
              <>
                <span className="card-label inline-flex items-center gap-[0.35em]">
                  <History className="w-[1em] h-[1em]" />
                  Overall
                </span>
                <div className="card-body">
                  <StatGrid
                    columns={2}
                    stats={[
                      { label: 'Solved', value: record.progress.totalSolved, icon: <CheckCircle2 className="w-[1em] h-[1em] text-success" /> },
                      {
                        label: 'Rating',
                        value: record.progress.estimatedRating,
                        icon: <TrendingUp className="w-[1em] h-[1em] text-muted-foreground" />,
                        /* `est.` while the record is too thin to claim a rating,
                           `practice` when the last attempt was frozen (Codex,
                           2026-08-16). The delta slot costs no height. */
                        delta: isRatingProvisional(record.progress) ? 'est.'
                          : record.lastSolveFrozen ? 'practice'
                            : record.ratingDelta !== null ? `${record.ratingDelta > 0 ? '+' : ''}${record.ratingDelta}` : null,
                      },
                      /* 'Streak', not 'Best': the same measure as the session
                         card's over a different window. */
                      { label: 'Streak', value: record.progress.bestStreak, icon: <Zap className="w-[1em] h-[1em] text-muted-foreground" /> },
                      {
                        label: 'Accuracy',
                        icon: <PieChart className="w-[1em] h-[1em] text-muted-foreground" />,
                        value: record.progress.totalSolved + record.progress.totalFailed > 0
                          ? `${Math.round((record.progress.totalSolved / (record.progress.totalSolved + record.progress.totalFailed)) * 100)}%`
                          : null,
                      },
                    ]}
                  />
                </div>
              </>
            )),
            slot('standings', 'puzzleStandings', <PuzzleStandingsCard />),
          ],
          foot: footSlot('theme-focus', (
            <PuzzleAppearanceCard
              currentThemeId={currentTheme.id}
              onThemeChange={changeTheme}
              focusMode={focusMode}
              /* Columns only (owner, 2026-10-08): no toggle when stacked. */
              onToggleFocusMode={canFocus ? () => setFocusMode(f => !f) : undefined}
            />
          )),
        }}
      />
    </main>
  );
}
