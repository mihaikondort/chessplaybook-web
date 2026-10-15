import { useRef } from 'react';
import { Flag, ListChecks, Play } from 'lucide-react';
import type { SelectionOption, SessionArea, SessionSelection } from '../services/PuzzleSessionApi';
import { CardListbox, LABEL_INSET_X } from './CardListbox';
import { patternName } from '../services/trainingRecord';

/**
 * SET UP A RUN, on the rebuilt page.
 *
 * WRITTEN FROM `SessionSetup`, NOT EXTRACTED FROM IT (owner, 2026-08-15: *"take
 * one card at a time and look at the old code, figure out how it was filled with
 * content, what other code exists for what the card does and create new code
 * starting from the old one that does the exact same thing"*). Every rule below
 * is the old card's, and the reasoning travels with each one; what changes is
 * that the card is a fixed share of a column instead of a box its content sizes,
 * so every size here is a ratio of `--card-type` rather than a Tailwind step.
 *
 * THE RULES IT KEEPS, each of them a defect that shipped once:
 *
 *   - THE CARD NEVER CHANGES SHAPE. Starting a run adds nothing and removes
 *     nothing: the chips report the run and go inert, the progress sits in the
 *     empty right half of the Length row - space that already existed - and the
 *     button changes LABEL. Every previous home for the run's progress was a
 *     block that came and went, and a block that comes and goes moves something.
 *   - MODES COME FROM THE SERVER. A mode we cannot serve is shown, disabled and
 *     says why; a client with its own list would offer a control the server
 *     refuses. The skeleton is the real list marked unavailable, so the first
 *     paint has the card's full geometry and the response turns modes on rather
 *     than conjuring them.
 *   - WEAK SPOTS PICKS THE AREA, so naming one as well is a contradiction the
 *     server refuses outright. The scope chips go inert in that mode rather than
 *     letting a player set something they will be refused for.
 *   - RATED IS NOT SET HERE. It is one switch, in the settings card, and this
 *     card takes whatever it says at the moment a run starts. A second control
 *     for one setting is the duplication the panel keeps growing back.
 */

export const SESSION_LENGTHS = [5, 10, 20] as const;

/** Client-side wording. The server answers what exists, never what to call it. */
export const SELECTION_LABEL: Record<string, string> = {
  adaptive: 'Your level',
  random: 'Mixed',
  /* #110: the mode picks what needs attention (untried, neglected, or below
     expectation by the evidence rule), which is rarely a diagnosed weakness. */
  weak_areas: 'Needs attention',
  failed_review: 'Missed before',
};

export const AREA_LABEL: Record<string, string> = {
  tactics: 'Tactics',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

interface ChipProps {
  children: React.ReactNode;
  selected: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}

/**
 * ONE CHIP, AND ITS SIZE IS THE CARD'S.
 *
 * Production draws these at 12px in a 240px column and at 12px in a 416px one,
 * because they are Tailwind steps. Here the type is `0.86 x --card-type` - the
 * same ratio the card's title uses - so a narrow column gets smaller chips
 * instead of chips that wrap the row to a second line and take the height the
 * Length row and the button are holding.
 */
function Chip({ children, selected, disabled = false, title, onClick }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      /*
        `leading-none` (owner, 2026-08-16: *"they sit in boxes that take up too
        much vertical space for nothing"*).

        Measured at 788x467: a chip was 17.2px tall to show 8.6px of text - 11.6
        of it line-height, 3.6 padding, 2 border. The line-height was the card's
        body rhythm, 1.35, inherited by a control that holds ONE word and can
        never wrap. That is 3px per chip of space doing nothing, three rows of
        chips in each column, and this card is the one that runs out of height.
      */
      className={`inline-flex items-center whitespace-nowrap rounded-[0.35em] border leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border text-muted-foreground hover:text-foreground'
      }`}
      style={{
        fontSize: 'calc(var(--card-type) * 0.86)',
        /* 0.12 vertically, was 0.18. Horizontal is untouched: width is not what
           is scarce, and a chip needs its horizontal inset to read as a control
           rather than as a word with a line round it. */
        padding: 'calc(var(--card-type) * 0.12) calc(var(--card-type) * 0.42)',
      }}
    >
      {children}
    </button>
  );
}

export interface PuzzleRunSetupCardProps {
  /** What the server says exists. Empty until it answers. */
  options?: SelectionOption[];
  areas?: readonly string[];
  /** The chosen axes, owned by the page so a run can be started from them. */
  selection: SessionSelection;
  onSelectionChange: (value: SessionSelection) => void;
  area: SessionArea | null;
  onAreaChange: (value: SessionArea | null) => void;
  total: number;
  onTotalChange: (value: number) => void;
  /** A run is under way, and these describe it. */
  running?: boolean;
  finished?: boolean;
  /**
   * HOW the run on screen ended, which is not the same question as whether it
   * ended (owner, 2026-08-16, after pressing Stop run two positions into a
   * ten-position plan day: *"it wrongly shows run completed 10 out of ten"*).
   *
   * `ended` covers `completed` AND `abandoned`, so a stopped run took the
   * finished branch, and that branch printed `${total} of ${total}` from the
   * run's LENGTH rather than from its progress. Two independent errors in one
   * line: the wrong verb and a count that was never read.
   *
   * The server only ever marks a run `completed` when the attempts reach its
   * total, so `completed` is the one case where "N of N" is a true sentence.
   */
  runStatus?: 'active' | 'completed' | 'abandoned';
  runSelection?: SessionSelection;
  runArea?: SessionArea | null;
  /**
   * The pattern a "Missed before" run is limited to, from a Patterns row's
   * Replay link (#109), and the running run's own. Shown IN "Where from", so
   * the card gains no row: "Fork only" is where the puzzles come from.
   */
  theme?: string | null;
  onThemeClear?: () => void;
  runTheme?: string | null;
  runTotal?: number;
  runRated?: boolean;
  /** Recorded attempts in the run. The count is the server's. */
  completed?: number;
  /**
   * THE PUZZLE ON SCREEN, AND WHETHER ITS ATTEMPT IS ALREADY SCORED.
   *
   * The counter is pinned to the PUZZLE, not to the attempt log (owner,
   * 2026-08-16: *"the puzzle number in the run card should not be updated until
   * you pressed the new puzzle button, otherwise is very confusing, it is
   * updating right after solving a puzzle but before the one the number
   * indicates has started"*).
   *
   * `completed` is a COUNT of recorded attempts and it is not wrong - it answers
   * *how many attempts exist*. The row asks a different question, *which puzzle
   * is this*, and the two diverge the instant an attempt lands: B1 records on
   * the first wrong move, and a solve records while the solved board is still up.
   * So the row announced the next puzzle while the player was still looking at
   * this one.
   *
   * The old card carries the same two props for the same reason - the owner
   * reported this once before, on 2026-08-06, and the rebuilt card dropped the
   * mechanism when it dropped the props.
   */
  puzzleId?: string | null;
  attemptRecorded?: boolean;
  /** False while the position on screen was drawn before the run started. */
  servedByRun?: boolean;
  /** A plan day, which is what the way out has to name. */
  planArea?: string | null;
  busy?: boolean;
  loading?: boolean;
  onStart: (input: { total: number; selection: SessionSelection; area: SessionArea | null }) => void;
  onStop?: () => void;
}

export function PuzzleRunSetupCard({
  options, areas,
  selection, onSelectionChange, area, onAreaChange, total, onTotalChange,
  running = false, finished = false, runStatus,
  runSelection, runArea, runTheme = null, theme = null, onThemeClear, runTotal, runRated,
  completed = 0, puzzleId = null, attemptRecorded = false,
  servedByRun = true, planArea = null,
  busy = false, loading = false, onStart, onStop,
}: PuzzleRunSetupCardProps) {
  /*
    THE FULL GEOMETRY FROM THE FIRST PAINT. The fallback is the real list of
    modes marked unavailable, not a single chip that grows to four - a control
    that changes what it CONTAINS reads as the page correcting itself, and a
    player who looked during that moment saw a product with one option.
  */
  const selections = options?.length
    ? options
    : Object.keys(SELECTION_LABEL).map(id => ({ id, available: false }));
  const shownAreas = areas?.length ? areas : Object.keys(AREA_LABEL);
  const awaitingOptions = !options?.length;

  const areaChosenForYou = selection === 'weak_areas';
  /* While a run is going the controls REPORT it rather than offering to change
     it: a control that does neither what it says nor nothing is the worst of the
     three. A FINISHED run locks nothing - the next one is theirs to choose. */
  const locked = running || loading;
  const shownSelection = running && runSelection ? runSelection : selection;
  const shownArea = running ? (runArea ?? null) : area;
  /* The pattern limit applies to "Missed before" only, as the server does. */
  const shownTheme = running ? runTheme : (shownSelection === 'failed_review' ? theme : null);
  const THEME_VALUE = 'pattern';
  const shownTotal = running && runTotal ? runTotal : total;
  /*
    AND THE ENDED RUN'S OWN LENGTH, not the picker's.

    `shownTotal` deliberately falls back to the picker once a run is over - the
    chips are the player's again at that moment. But the sentence ABOUT the run
    that just ended must use the run's own number, or a player who stops a
    5-position day with the picker sitting at 20 is told about a run of 20 that
    never existed. It read "10 of 10" partly by coincidence: the default picker
    length is 10.
  */
  const endedTotal = runTotal ?? shownTotal;
  /*
    A COMPLETED RUN HAS EXACTLY ITS OWN LENGTH IN IT, by the server's own
    definition - `advanceSession` is what marks a run `completed`, and it does so
    when the attempt count REACHES the total. So the count for that state is not
    a number to read from a response that may not have arrived yet.

    Owner, 2026-08-16: *"I had the impression I saw the text with the rating
    performance being 2480 before the run actually finished, after the 4th puzzle
    out of 5"*. Checked against the data first, and the server was right - every
    completed run in the database has exactly `total` attempts, none has ever
    completed early. What they saw was this card saying "4 of 5" beside a
    performance figure computed from five: the run's progress is re-read after
    each attempt, and when that response lands after the LAST one, the client is
    holding a count one behind while the status is already `completed`.

    An abandoned run keeps the real count, because there it is the whole point.
  */
  const endedCompleted = runStatus === 'completed' ? endedTotal : completed;

  /*
    THE COUNT THIS ROW SHOWS IS PINNED TO THE PUZZLE ON SCREEN.

    Written during RENDER on purpose: this is a value derived from props, and an
    effect would paint the wrong number for one frame - the flicker this whole
    panel exists to prevent.

    The `!attemptRecorded` branch is not belt and braces. The run is re-read from
    the server after an attempt lands, and that response can arrive AFTER the
    next puzzle is already on screen; without it the stale count would be frozen
    for the whole of the next puzzle. Once THIS puzzle's attempt is recorded, no
    further increase can belong to it, so the value stops moving until the
    puzzle does.
  */
  const pinned = useRef({ id: puzzleId, shown: completed });
  if (pinned.current.id !== puzzleId) {
    pinned.current = { id: puzzleId, shown: completed };
  } else if (!attemptRecorded && completed !== pinned.current.shown) {
    pinned.current.shown = completed;
  }
  const shownCompleted = pinned.current.shown;

  /* Never "11 of 10" on the last attempt of a finished run. */
  const position = Math.min(shownCompleted + 1, shownTotal);

  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]">
        <ListChecks />
        {/* A plan day says so in the TITLE, not in a line of its own: a label
            that exists in one state only is a block that comes and goes. */}
        {planArea ? 'Training plan session' : running ? 'Your run' : 'Set up a run'}
      </span>
      <div className="card-body">
        {/* TWO COLUMNS. Stacked, each group wraps to two rows and the card is
            the one thing in the column that cannot afford them. */}
        {/*
          TWO PICKERS, NOT ELEVEN CHIPS (owner, 2026-08-18: *"replace the 'What
          to train' and 'Where from' with proper dropdown list pickers... what we
          have now is improper, occupies too much space and is error prone when
          rendered upon different resolutions"*).

          THEY WERE RIGHT ABOUT THE RESOLUTIONS AND THE REASON IS STRUCTURAL.
          Measured on production first: the same eleven chips wrapped to THREE
          rows at 1280x800, FOUR at 1920x947 and SIX at 1024x768, taking 40-45%
          of the card at every size. This card declares a fixed `rows` count and
          divides its height by it to get its type, so a control whose real line
          count moves with the WIDTH makes that divisor a guess - the chips were
          fighting the rule the card is sized by. Two triggers are two rows at
          every resolution.

          EVERY RULE THE CHIPS CARRIED IS CARRIED HERE. Modes still come from the
          server and an unavailable one is still SHOWN, disabled, with its
          reason - a client with its own list would offer what the server
          refuses. Weak spots still picks the area, so the scope picker goes
          inert in that mode rather than letting a player set something they will
          be refused for. And a run still locks both rather than hiding them: the
          card reports the run it is running.
        */}
        <div className="grid grid-cols-2" style={{ columnGap: 'calc(var(--card-type) * 0.5)', rowGap: 'calc(var(--card-air) * 3)' }}>
          <div className="min-w-0" style={{ display: 'grid', gap: 'var(--card-air)' }}>
            <span className="card-row" id="run-what-label" style={{ fontSize: 'calc(var(--card-type) * 0.86)', paddingLeft: LABEL_INSET_X }}>
              What to train
            </span>
            <CardListbox<SessionSelection>
              id="run-selection"
              label="What to train"
              value={shownSelection}
              /*
                `awaitingOptions` TOO, which the chips did not need.

                The modes come from the server, and until they land every one is
                the disabled placeholder. As chips that reads correctly - four
                greyed controls, the card's full geometry, nothing to click. As a
                dropdown it is a live trigger that opens a list where NOTHING can
                be chosen, which is worse than a control that says it is not
                ready yet. The area picker beside it has always guarded on this;
                this one was left behind when the chips were replaced.
              */
              disabled={locked || awaitingOptions}
              options={selections.map(option => ({
                value: option.id as SessionSelection,
                label: SELECTION_LABEL[option.id] ?? option.id,
                disabled: !option.available,
                reason: option.available ? undefined : 'Not available yet',
              }))}
              onChange={onSelectionChange}
            />
          </div>

          <div className="min-w-0" style={{ display: 'grid', gap: 'var(--card-air)' }}>
            <span className="card-row" style={{ fontSize: 'calc(var(--card-type) * 0.86)', paddingLeft: LABEL_INSET_X }}>
              Where from
            </span>
            {/* `areaChosenForYou` is Weak spots having already picked it. The
                control says so IN ITS VALUE rather than vanishing, because a
                setting that disappears reads as one you imagined. It claimed to
                say so through `title`, which the trigger never set, so a locked
                picker read "All areas", which is false (C6, D27). Once the run
                is going, the run's own area is shown: the server's actual pick. */}
            <CardListbox<string | null>
              id="run-area"
              label="Where from"
              value={shownTheme ? THEME_VALUE : areaChosenForYou && !running ? null : shownArea}
              disabled={areaChosenForYou || locked || awaitingOptions}
              options={[
                ...(shownTheme ? [{ value: THEME_VALUE, label: `${patternName(shownTheme)} only` }] : []),
                { value: null, label: areaChosenForYou && !running ? 'Chosen for you' : 'All areas' },
                ...shownAreas.map(a => ({
                  value: a as SessionArea,
                  label: AREA_LABEL[a] ?? a,
                })),
              ]}
              onChange={value => {
                if (value === THEME_VALUE) return;
                // Choosing an area drops the pattern limit: one scope at a time.
                onThemeClear?.();
                onAreaChange(value as SessionArea | null);
              }}
            />
          </div>
        </div>
        {/*
          LENGTH IS THE THIRD SETTING, AND NOW LOOKS LIKE ONE (owner, 2026-08-16:
          *"the length picker looks orphan"*, *"it needs some re-organization"*,
          *"there is unused space"*).

          It was the only control on the card written as an inline row - a label
          and its chips on one line - while the two above it are a label ABOVE
          their chips. So it read as a leftover rather than as the third of three
          settings, and the difference in shape put it in a band of its own with
          dead space above it.

          Same grammar as its siblings now: a label, then the chips under it. The
          card gains a row of real content where it had a gap, which is the
          `unused space` complaint and the `orphan` one answered by the same
          change rather than by two.

          THE RUN'S PROGRESS STAYS IN THE LABEL ROW, which is what keeps this
          free: that row has a label at one end and nothing at the other, exactly
          as the old inline row did (owner, 2026-08-06, pointing at the empty
          half of it). It costs no height, which was the entire point then and
          still is.
        */}
        {/*
          THE SLACK IS SPLIT, not parked above the button (owner, 2026-08-16:
          *"the How many puzzles group to be placed just a tiny bit lower on the
          card, there is too much unused space until the button"*).

          `mt-auto` here AND on the button below is what does it: two auto
          margins in a flex column share the free space equally, so the gap above
          this group and the gap above the button are the same. Before, only the
          button had one, which took every spare pixel and left one wide band in
          the middle of the card.

          It is a distribution rather than a fixed offset - the card's height
          changes with the column, and a hardcoded margin would be right at one
          viewport only.
        */}
        {/*
          EQUAL SLACK ABOVE EACH GROUP (owner, 2026-08-18: *"can we have the same
          vertical distance between 'What to train', 'How many puzzles' and the
          Start run button?"*, then *"these should be like a rule, so they work on
          all resolutions"*).

          It was 3:1, which was the owner's own request on 2026-08-16 when the
          card was mostly chips and had a wide empty band to push around. The
          chips are two pickers now and the card is nearly full, so there is no
          band left to distribute and the asymmetry only reads as one gap being
          wrong. Equal WEIGHTS are what make the gaps equal by construction, at
          every height, rather than a margin that is right at one viewport.

          A DECLARED WEIGHT, NOT `grow`. `grow` takes whatever the card has
          spare, which is how a roomy card ended up with one wide empty band here
          and no rhythm anywhere else. Paid from the same budget as every other
          gap on the card - see `Box`, which reads `data-card-spacer` and keeps
          the weight out of the content height.
        */}
        <div data-card-spacer="2" style={{ height: 'calc(var(--card-air) * 4)' }} aria-hidden />
        {/*
          THE CARD'S OWN GAP, WHICH SHRINKS ONLY WHEN IT HAS TO (owner,
          2026-08-16: *"there is still vertical space between 'How many puzzles'
          and the 5,10,20 below, can we decrease that just a bit more? these
          changes should only happen when the height of the card and/or entire
          space is not enough, not for all resolutions"*).

          It was a flat `0.4 x type`, then a flat `0.15`, and a flat anything is
          the thing being complained about: the roomy card loses spacing it could
          afford and the cramped one keeps spacing it cannot. `--card-row-gap` is
          the number the card already derives FROM ITS OWN SLACK - `0.35 x type`
          wherever the rows fit, collapsing towards 1px when they do not - so
          this row now tightens exactly when the card is short and is left alone
          everywhere else.

          A label and the control it names are one thing, so it takes the card's
          row gap rather than a wider one of its own.
        */}
        <div style={{ display: 'grid', gap: 'var(--card-air)' }}>
          <div className="flex items-center" style={{ gap: 'calc(var(--card-type) * 0.3)' }}>
            {/*
              "How many puzzles", not "Length" (owner, 2026-08-16: *"the Length
              label maybe should be improved with some text like 'How many
              puzzles should the run contain?'"*).

              They are right that it was the odd one out. Its two siblings are
              question fragments - "What to train", "Where from" - and this was a
              bare noun, so it read as a property of the card rather than as the
              third thing being asked.

              NOT the full sentence, and not for space: measured, even "How many
              puzzles should the run contain?" fits one line at every viewport
              including a 376px phone card. It is the register - a full question
              among two fragments is as much an odd one out as the noun was.
            */}
            {/* The same rule as its two siblings above - see `LABEL_INSET_X`.
                Measured before it was applied here, this label sat 5.2px left of
                its chips at 800x600 and 8.6px at 1920x947, so the misalignment
                also GREW with the screen. */}
            <span className="text-muted-foreground" style={{ fontSize: 'calc(var(--card-type) * 0.86)', paddingLeft: LABEL_INSET_X }}>
              How many puzzles
            </span>
            {(running || finished) && (
            <div
              className="ml-auto flex min-w-0 items-center"
              style={{ gap: 'calc(var(--card-air) * 2)' }}
              data-testid="run-progress"
            >
              {/* `truncate` so a longer label shortens rather than wrapping this
                  row to two lines, which is the same defect in miniature. */}
              <span className="truncate text-foreground" style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}>
                {finished
                  /*
                    THE COUNT IS THE RUN'S PROGRESS, AND THE VERB IS ITS OUTCOME.
                    A stopped run says how far it got; only a run the server
                    marked `completed` can honestly say "N of N", because that is
                    the only way it reaches that status.
                  */
                  ? runStatus === 'abandoned'
                    ? `Run stopped, ${completed} of ${endedTotal}`
                    : `Run complete, ${endedCompleted} of ${endedTotal}`
                  : servedByRun
                    // "· practice" only when it is NOT rated: rated is what a run
                    // is unless someone chose otherwise, and stating the default
                    // every time would make the exception invisible.
                    ? `${position} of ${shownTotal}${runRated === false ? ' · practice' : ''}`
                    /* No number over a puzzle the run never served. */
                    : `Run of ${shownTotal}`}
              </span>
              {(servedByRun || finished) && (
                <div
                  className="overflow-hidden rounded-full bg-muted"
                  style={{ height: 'calc(var(--card-type) * 0.11)', width: 'calc(var(--card-type) * 1.15)' }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={finished ? endedTotal : shownTotal}
                  aria-valuenow={finished ? endedCompleted : shownCompleted}
                  aria-label={`${finished ? endedCompleted : shownCompleted} of ${
                    finished ? endedTotal : shownTotal} puzzles done`}
                >
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    /* The track shows how far the run actually got, in both
                       outcomes. It used to jump to 100% the moment a run ended,
                       which drew a full bar over a run that was stopped at 2. */
                    /* The track moves with the NUMBER beside it, or the row
                       would say "puzzle 1" over a bar already showing one done.
                       A finished run uses the real count: there is no next
                       puzzle to wait for. */
                    style={{ width: `${(finished ? endedTotal : shownTotal) > 0
                      ? ((finished ? endedCompleted : shownCompleted) / (finished ? endedTotal : shownTotal)) * 100
                      : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}
          </div>
          {/* The chips, under their label, exactly as the two groups above. */}
          <div
              className="flex flex-wrap"
              /* Horizontal separates two chips, vertical separates rows: the
                 same split as the chip lists above. */
              style={{ columnGap: 'calc(var(--card-type) * 0.3)', rowGap: 'calc(var(--card-air) * 2)' }}
            >
            {SESSION_LENGTHS.map(n => (
              <Chip key={n} selected={shownTotal === n} disabled={locked} onClick={() => onTotalChange(n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>

        {/*
          ONE BUTTON, TWO LABELS, and it stays OUTLINE in both. A filled Stop
          would be the loudest thing on the page, and stopping a run is neither
          the primary action nor a dangerous one.
        */}
        {/*
          WEIGHTED SPACERS, NOT TWO EQUAL AUTO MARGINS (owner, 2026-08-16: *"the
          How many puzzles group to be placed just a tiny bit lower"*, then *"the
          button can be moved just a tiny bit higher, so this way we fill in that
          space"*).

          Two `mt-auto`s split the free space evenly and gave 20px above the
          length group and 21 above the button, which is the balanced answer and
          not the asked-for one. 3:1 puts most of the slack above the length
          group - pushing it down - and leaves the button close under it.

          A RATIO, not a margin. The card's height changes with the column, so a
          fixed offset would be right at one viewport and wrong at every other.
        */}
        {/* The same weight as the one above it - see that note. */}
        <div data-card-spacer="2" style={{ height: 'calc(var(--card-air) * 4)' }} aria-hidden />
        <div style={{ display: 'grid', gap: 'calc(var(--card-air) * 2)' }}>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => (running && !finished
            ? onStop?.()
            // The area is dropped when the mode picks it: sending both is the
            // contradiction the server refuses.
            : onStart({ total, selection, area: areaChosenForYou ? null : area }))}
          /*
            LOUDER THAN AN OUTLINE, QUIETER THAN THE PRIMARY (owner, 2026-08-16:
            *"the Start run button needs to be made a little bit more visible,
            maybe not like the New Puzzle button but more than it is now"*).

            It was a bare outline on the card's own background, which made the
            one commitment on this card the quietest control on it. Two filled
            primaries was the previous mistake in the other direction - the owner
            reported it on 2026-08-06 as *"the two yellow buttons have different
            sizes"*, and the answer then was identical geometry, different weight.

            This is the card's OWN vocabulary rather than a third treatment: a
            selected chip is `border-primary` over `bg-primary/10`, and the button
            now wears the same pair at full width. It reads as chosen rather than
            as available, which is what it is - and it cannot be mistaken for New
            Puzzle, which is solid.
          */
          className="card-btn w-full border border-primary/60 bg-primary/10 font-medium text-foreground hover:bg-primary/20 disabled:opacity-50"
        >
          {running && !finished ? <Flag /> : <Play />}
          {running && !finished ? (planArea ? 'Stop this session' : 'Stop run') : 'Start run'}
        </button>
        {/*
          WHAT A RUN IS, SAID WHERE THE DECISION IS MADE (owner, 2026-08-16: *"I
          don't think people understand now what a run means"*, and *"make room
          for the CTA text below the button"*).

          The card has used the word "run" in its title, its button and its
          progress line without ever saying what one is. This is the moment it
          matters - directly under the control that starts one - and the space is
          the slack the card already had, so nothing moved to make room.

          THE RATING BELONGS TO THE RUN, and the first version did not say so
          (owner, 2026-08-16: *"the current text might be interpreted as getting a
          user rating in general, not for the completed run"*). "A performance
          rating at the end" reads as something happening to YOUR rating, which
          is the one thing it is not - a run's performance is a fact about the
          run and does not touch the player's rating at all. "IT gets" ties it to
          the run, which is the whole distinction.

          ONE SENTENCE (owner: *"I'm trying to have one sentence instead of
          two"*), and it does not promise a PLACE. The owner's drafts were *"do a
          puzzles run and get on the leaderboard"* and *"get a performance rating
          that will rank against others"*; a run that goes badly gets a rating and
          no place, so "see how it ranks" is what is true whether they finish
          first or four-hundredth. Same rule that killed the earlier standing
          copy: never name an outcome the server may not deliver.

          A grammar correction travelled with it. A rating does not "rank against
          others" - it is what you are ranked BY - so the subject had slipped.

          IT SHIPS WITH THE RUNS BOARD. The rankings page ranks solves today, so
          the second sentence becomes true the day that board exists and must not
          reach production before it.

          HIDDEN WHILE A RUN IS GOING: it explains a decision that has already
          been made, and the card's own progress is the useful thing then.
        */}
        {!running && (
          <span
            /* `leading-tight` for the same reason the chips lost their leading:
               this is the only line on the card that WRAPS, so the card's 1.35
               body rhythm is paid twice here and nowhere else. It is the last
               3px between this card and fitting at 788x467. */
            className="text-center leading-tight text-muted-foreground"
            style={{ fontSize: 'calc(var(--card-type) * 0.86)' }}
          >
            Complete a run and see how its performance rating ranks against others.
          </span>
        )}
        </div>
      </div>
    </>
  );
}

export default PuzzleRunSetupCard;
