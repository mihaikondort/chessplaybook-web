/**
 * The trainer's component inventory — six components, one rule each.
 *
 * WHY THIS FILE EXISTS. The panels had four ways of presenting the same kinds of
 * thing with no rule about which applied when: bordered cards, bare centred
 * links, bare text in the gutter, and full-bleed buttons — so a card stopped
 * meaning *these belong together* and became a spacing device, and everything
 * that was not carded read as unfinished. Owner, 2026-08-06: *"can't have some
 * info on cards and some other just thrown there, no card no style no nothing…
 * whatever style and components we chose we need to use the same thing for all
 * not only for some."*
 *
 * So the inventory is the deliverable, and it lives in ONE file on purpose: a
 * system spread across six files is a system nobody can see, and the next
 * person adds a seventh register without noticing.
 *
 * Analysis, with the measurements that produced each rule:
 * docs/Features Development/PUZZLES_TRAINER_PANEL_LAYOUT_ANALYSIS.md
 *
 *   Section         the only container. No second elevation.
 *   StatGrid        one grammar for every number on the page.
 *   StandingLink    one treatment for every way off this page.
 *   LiveStatus      the one argued non-container, and it must EARN that.
 *   Action          three tiers, one filled primary visible per state.
 *   Disclosure      a Section with a header and a body that opens.
 */
import { useId, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Section — the only container
   ────────────────────────────────────────────────────────────────────────── */

/**
 * One border, one radius, one padding, one background. Everywhere.
 *
 * NOTHING IS A SECTION INSIDE A SECTION. That was the structural cause of the
 * two-yellow-buttons complaint: `Start run` sat inside a card, so it was inset
 * by the card's padding and rendered 368x36 while `New Puzzle` at panel level
 * rendered 394x48 — the same primary fill at two nesting depths, which the eye
 * reads as one promise rendered two ways.
 */
export function Section({
  title, icon, aside, children, className = '', testId, fill = false,
}: {
  /** Uppercase label. Omit for a section that is self-evident from its content. */
  title?: string;
  /**
   * A mark before the title (owner, 2026-08-06: "can we have an icon in front
   * of the cards first text similar to what we have on the plan card?").
   *
   * The plan card had one and no other card did, which made it look like a
   * different kind of object — the register problem again, at the level of a
   * heading. One mark per card, one meaning per mark.
   */
  icon?: ReactNode;
  /** Right-aligned companion to the title — a count, a state, a small control. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  /**
   * Stretch to the row and centre the body in the space left over.
   *
   * Owner, 2026-08-06: *"the items are gathered at the top and in the lower
   * part there is free unused space."* Equal-height cards create that space by
   * construction — the card is as tall as the tallest sibling, not as tall as
   * its own content — so the content has to be placed IN it rather than
   * allowed to pile up at the top edge.
   *
   * It does NOT scroll internally. That was tried for the Filters disclosure —
   * whose content outgrows its row — and it was worse than the bug it fixed:
   * the card scrolled, so the Rated switch and the Filters button itself
   * scrolled out of view and there was no way back (owner, 2026-08-06). The
   * panel opens its rows instead; see the identity panel's grid.
   */
  fill?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      /*
        THE RHYTHM TIGHTENS ON A SHORT DESKTOP WINDOW (2026-08-15).

        The column is bound to the board's height, and below about 900px of
        viewport four cards no longer fit in it: at 1366x768 the left column
        needs 576 and has 496, so `Go to` was cut through the middle and
        `Train with a plan` ended mid-sentence. 1366x768 is 5.45% of desktops
        worldwide and 1536x864 is the top row of our own GA4, so this is
        traffic rather than an edge case.

        KEYED ON VIEWPORT HEIGHT, NEVER ON CONTENT. A content floor makes a
        card's height depend on what is in it, so the card resizes when the
        plan loads — 126px at first paint against 82px after — which is the one
        thing this panel exists to prevent (2026-08-14). Every viewport taller
        than 900px renders exactly as before, and the 900 matches the threshold
        the identity grid already switches at rather than inventing a second.
      */
      /*
        THE CARD'S TYPE IS THE CARD'S OWN SIZE (2026-08-15).

        `--card-type` is published by the card box in the rebuilt layout, derived
        from the card's height and rows. Setting the ROOT font-size from it and
        expressing everything below in `em` is what makes one rule govern both:
        the components carry their behaviour unchanged and their sizing comes
        from the box they are dropped into.

        The fallback is 14px, which is the `text-sm` these components have always
        used for a body row — so any caller that does NOT publish the property
        (`/puzzles/plan`, `/puzzles/progress`) keeps today's body size. The
        derived sizes around it move by a pixel or two, because today's numbers
        were chosen by hand rather than as ratios; that is the cost of there
        being one system instead of two.
      */
      className={`rounded-lg surface-card text-[length:var(--card-type,14px)] p-[0.6em] [@media(orientation:landscape)_and_(min-width:760px)_and_(max-height:900px)]:p-[0.45em] ${fill ? 'flex flex-col' : ''} ${className}`}
    >
      {/*
        In `fill` mode the HEADING IS PART OF THE CENTRED GROUP.

        It used to sit at the top while only the body was centred in what was
        left, so the space under the title and the space under the body were
        different numbers — the card was symmetric at its padding and unbalanced
        inside it (owner, 2026-08-06: "inside each card make sure the vertical
        alignment is properly done").

        Centring title and body together makes the whole block one object with
        equal air above and below, which is what "aligned" means for a card that
        is taller than its contents.
      */}
      {/*
        THE TITLE STAYS AT THE TOP, always.

        It was briefly moved into the centred group to balance the space above
        and below the content — and that put it flush against the first row, so
        the heading stopped reading as a heading (owner, 2026-08-06: "you can't
        distinguish the title from the card items"). A label that touches its
        content is not a label.

        A card is a heading followed by its contents. Where the CONTENT sits in
        the leftover space is a separate question, and the answer to it must not
        cost the heading its separation.
      */}
      {(title || aside) && (
        <div className="mb-[calc(var(--card-air,0.175em)*3)] flex items-baseline justify-between gap-[0.4em]">
          {title && (
            <span className="inline-flex items-center gap-[calc(var(--card-w,208px)*0.025)] text-[0.8em] font-medium uppercase tracking-wide text-muted-foreground">
              {icon}
              {title}
            </span>
          )}
          {aside && <span className="text-[0.8em] text-muted-foreground">{aside}</span>}
        </div>
      )}
      {fill ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          {children}
        </div>
      ) : children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   StatGrid — one grammar for every number
   ────────────────────────────────────────────────────────────────────────── */

export interface Stat {
  label: string;
  /** `null` renders an em dash. A null is not a zero — Phase C's rule. */
  value: string | number | null;
  /** A signed change, e.g. `+5`. Rendered quieter than the value. */
  delta?: string | null;
  /**
   * REQUIRED (owner, 2026-08-06: *"they all need to have icons in front of
   * every item"*).
   *
   * It was optional this morning and I removed it, because optional had become
   * *sometimes* — three of four stats marked in one card, none in the next. The
   * owner's answer is the other half of the same rule: every stat has one. It
   * is REQUIRED rather than optional so the inconsistency cannot come back; a
   * new stat without a mark is a type error, not a thing someone notices later.
   */
  icon: ReactNode;
  /*
    Superseded note, kept for the argument it contains (owner, 2026-08-06: "In the first card
    Accuracy doesn't have an icon next to it like the other ones, also the
    Overall card doesn't have icons at all").

    There was one, and it was OPTIONAL PER ITEM — so optional became
    *sometimes*: three of four stats in one card had a mark, none of four in
    the next. That is the governing consistency rule broken one layer down, by
    a component that permitted it. **A prop that may be omitted per item will
    be omitted inconsistently**, so the fix is to remove the option rather than
    to fill it in and rely on the next person noticing.

    Removed rather than made mandatory, because two of the three that existed
    (a tick, a cross) encoded good/bad — which forces a judgement on the other
    stats that has no honest answer. Is 76% accuracy good? Is a rating of 2297?
    The labels already say what each number is.
  */
}

/**
 * Label, value, optional delta — the same shape in every place a number appears.
 *
 * Before this, the same rating rendered three ways in one column (a mobile
 * strip, the Session card, the Overall card) and the two desktop cards used
 * different layouts for the same five numbers: 239px for the card that said
 * LESS, against 126px for the one that said more.
 *
 * `null` renders an em dash and never `0`. *We do not know yet* and *you scored
 * nothing* are different sentences, and this component is where that rule is
 * kept for all of them.
 */
export function StatGrid({ stats, columns = 3, size = 'md' }: {
  stats: Stat[];
  columns?: 2 | 3 | 4;
  size?: 'sm' | 'md';
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  /*
    `text-base`, not `text-lg`. The column is bound to the BOARD's height, and
    at 1280 that is 544px — 127px a card — where a 28px line box for the value
    put two rows plus a heading over the budget and the panel scrolled. One type
    step down is 24px and fits with room; it is still the largest thing in the
    card, which is what the number needs to be.
  */
  // A RATIO OF THE CARD, not a type step. `1.4em` is the skeleton's `card-value`
  // — the number a card exists to show, against `1em` for its rows. The reserved
  // row below is in `em` too, so the reservation scales with the type rather than
  // being a pixel that stops matching it.
  const value = size === 'sm' ? 'text-[1em]' : 'text-[1.15em]';
  /*
    THE VALUE ROW RESERVES ITS HEIGHT (owner, 2026-08-06: "I really don't like
    these things, to have the cards size change after a value updates").

    Every number here can arrive late, change width, or gain a delta — and
    `tabular-nums` fixes the WIDTH of digits but nothing fixes the HEIGHT when a
    value wraps or a second element appears beside it. So the row is reserved
    rather than measured from its content, and the card cannot resize when a
    result lands.

    This is the same rule the live region follows, applied one layer down: a
    container reserves, content swaps inside it. `leading-none` plus an explicit
    min-height means the reservation is a number rather than a side effect of
    whatever font is loaded.
  */
  // Tightened so four equal cards fit the BOARD's height at 1280 (see
  // TrainerLayout): the column is 544px there, i.e. 127px a card.
  const valueRow = size === 'sm' ? 'min-h-[1.1em]' : 'min-h-[1.2em]';
  // Guarded by scripts/verify-card-stability.mjs, which rewrites every value slot
  // to extremes and asserts no card moves. Remove the reservation and it fails.
  return (
    /*
      THE HORIZONTAL GAP COMES FROM THE CARD'S WIDTH, the vertical from its type
      (owner, 2026-08-15: *"calculate spaces between controls based on card
      width"*). A 240px record card and a 416px live card should not put the same
      space between two numbers. `--card-w` is published by the same box that
      publishes `--card-type`; the fallback reproduces today's `gap-x-2`.
    */
    <dl className={`grid ${cols} gap-x-[calc(var(--card-w,208px)*0.04)] gap-y-[0.2em] text-center`}>
      {stats.map(stat => (
        <div key={stat.label}>
          {/*
            The label may not wrap or overflow. `truncate` is the backstop: a
            label that outgrows its column used to spill into its neighbour and
            read as a misalignment, which is exactly how it was reported.
          */}
          {/*
            `truncate` belongs on the LABEL, not on the row.

            It was on the flex container, so it clipped the mark as well as the
            text — the icon rendered half-cut (owner, 2026-08-06: "accuracy icon
            is not completely visible"). The icon also needs `shrink-0`, or a
            long label squeezes it before it truncates itself.
          */}
          <dt className="min-h-[0.8em] text-[0.86em] text-muted-foreground flex items-center justify-center gap-[calc(var(--card-w,208px)*0.02)] w-full">
            <span className="shrink-0 flex items-center">{stat.icon}</span>
            <span className="truncate">{stat.label}</span>
          </dt>
          <dd className={`mt-[var(--card-air,0.175em)] ${valueRow} ${value} font-semibold text-foreground tabular-nums
            flex items-center justify-center gap-[calc(var(--card-w,208px)*0.02)] whitespace-nowrap`}>
            <span>{stat.value ?? '—'}</span>
            {/*
              The delta's slot exists whether or not there is a delta. It
              appears at the moment a rating changes — precisely when the player
              is reading the card — so letting it widen or wrap the row would
              move the thing being read.
            */}
            <span className="text-[0.57em] font-normal text-muted-foreground">{stat.delta}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   StandingLink — one treatment for every way off this page
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Icon, label, chevron. Used for every standing destination.
 *
 * Owner, 2026-08-06, on the two that had no treatment at all: *"Your training
 * record and View Puzzle Rankings look like from another movie."* They were
 * bare 16px centred links floating between bordered cards, while `Puzzle
 * Settings` — the same kind of thing — was a card. Three destinations, two
 * registers, no rule.
 *
 * `emphasis` is the ONE deliberate exception, and it is a product decision
 * rather than a design one (owner, 2026-08-06): *"Plan needs to be loud and
 * first, it's what will keep people on the site and will bring them back."*
 * PRD §6.3 was amended for it. Prominence is allowed; interruption is not —
 * this renders identically whatever the board is doing, and has nothing to
 * dismiss.
 */
export function StandingLink({
  icon, label, hint, emphasis = false, onClick, href, testId,
}: {
  icon?: ReactNode;
  label: string;
  /** One line under the label. Only the emphasised entry earns it. */
  hint?: string;
  emphasis?: boolean;
  onClick?: () => void;
  /** Rendered by the caller when it is a route — keeps this file router-free. */
  href?: ReactNode;
  testId?: string;
}) {
  if (href) return <>{href}</>;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={
        emphasis
          ? 'w-full h-full flex flex-col justify-center text-left rounded-lg surface-card surface-card-promoted p-[0.85em] text-[length:var(--card-type,14px)] hover:bg-accent/40 transition-colors group'
          : 'w-full text-left flex items-center gap-[calc(var(--card-w,208px)*0.04)] py-[0.16em] text-[length:var(--card-type,14px)] text-muted-foreground hover:text-foreground transition-colors'
      }
    >
      <span className="flex items-center gap-[calc(var(--card-w,208px)*0.04)]">
        {icon}
        <span className={emphasis ? 'text-[1em] font-medium text-foreground' : undefined}>
          {label}
        </span>
        <ChevronRight
          /* The mark is a ratio of the type beside it, so it can never be the
             one thing on a small card that stays big. */
          className={`ml-auto shrink-0 ${emphasis ? 'w-[1.15em] h-[1.15em]' : 'w-[1em] h-[1em]'}`}
        />
      </span>
      {hint && <span className="mt-[var(--card-air,0.175em)] block text-[0.8em] text-muted-foreground">{hint}</span>}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   LiveStatus — the one argued non-container
   ────────────────────────────────────────────────────────────────────────── */

/**
 * The panel's voice: whose move it is, where the puzzle came from, what just
 * happened.
 *
 * IT IS THE ONE THING THAT IS NOT A SECTION, and it has to earn that. Owner,
 * 2026-08-06, unprompted: *"there is 'White to move' like an orphan text, then
 * some space, then another orphan comment."* It was uncontained AND small,
 * which reads as unfinished. Uncontained and DOMINANT reads as the page
 * speaking. So the turn line is the largest type in the panel — that is the
 * argument for the exception, and without it the exception is not earned.
 *
 * `boxed` exists because the owner was unsure about the exception, and the
 * honest answer to unsure is a switch rather than a paragraph. Set it and this
 * becomes a Section like everything else, at the cost of the panel having no
 * voice.
 *
 * ONE RESERVED REGION, NOT THREE RESERVED ROWS. Previously the daily label, the
 * turn line and the prompt each reserved their own height — 20 + 48 + 20 = 88px
 * for three siblings that are never all populated — and the empty ones read as
 * gaps. Reserving the container instead costs less and buys a designed empty
 * state. The `sr-only` announcement lives INSIDE here too; it used to be a
 * top-level sibling of the visible blocks, which is a tell that the panel was
 * an assembled list rather than a composition.
 */
/*
  EVERY SENTENCE THAT CAN LAND IN THE HEADLINE, and the slot reserves what the
  LONGEST of them needs at the width it actually has (owner, 2026-08-16: *"look
  at how much empty unused space is between Black to move and the title above and
  the text below, that can be reduced greatly"*).

  It was a flat `min-h-[2.5em]` - two lines, at every width alike - because the
  wrong-move copy wrapped and the primary button must not drop 20px while a
  frustrated solver is reaching for it. That reason is sound and the constant was
  not: measured across four widths, NOTHING wraps at 1524x731, one message wraps
  at 995x686, and four wrap at 788x467. So most of the site was paying for a
  second line nothing could ever put there, and a one-line state sat centred in
  it with 9px of blank above and below.

  Measuring the vocabulary keeps the guarantee and drops the cost: the
  reservation is still the worst case, so no message can push anything, and it is
  the worst case AT THIS WIDTH rather than at the narrowest width that exists.

  THIS LIST MUST HOLD EVERY STRING THE HEADLINE CAN SHOW. One that is missing is
  one that can push the buttons down, which is the defect the reservation exists
  to prevent. They are written where the state is decided - `usePuzzle`,
  `usePuzzleBoard` - and a `LiveStatus` test asserts the two agree.
*/
export const HEADLINE_VOCABULARY = [
  /* usePuzzle.setMessage — every branch */
  'Correct! Puzzle solved.',
  'Correct! Keep going...',
  'Incorrect. Keep trying.',
  'Incorrect. Try again...',
  'Solution shown.',
  'Error loading puzzle position.',
  'Error: invalid setup move.',
  'White to move',
  'Black to move',
  'White to move. Keep going.',
  'Black to move. Keep going.',
  /* PuzzleLiveCard's own branches, which replace `message` */
  'Nothing matched that filter',
  'Trying a variation',
  'Correct so far — keep going',
  'Loading puzzle...',
];

export function LiveStatus({
  chip, headline, detail, announce, boxed = false,
}: {
  /** Provenance — "Daily Puzzle", "Puzzle 3 of 10". Reserved even when absent. */
  chip?: ReactNode;
  /** Whose move, or the result. The largest type in the panel. */
  headline: ReactNode;
  /**
   * The state line: wrong move, correct so far, nothing matched the filter,
   * loading. NOT a place for copy that is true of every puzzle — a line that
   * says nothing costs a row and a competing voice.
   */
  detail?: ReactNode;
  /** Announced politely to assistive tech. Lives here, not as a page sibling. */
  announce?: string;
  boxed?: boolean;
}) {
  const body = (
    <>
      {/* Every reservation in this region is now in `em`, so the three slots
          keep their PROPORTIONS as the card's type changes. Reserving pixels
          against type that scales is how a slot stops matching what goes in it —
          the reservation would hold at 18px while the chip grew past it. */}
      {/* 0.92 — one pixel above production's 12px at the 14px base (owner,
          2026-08-15: *"can we make Difficulty type one unit taller?"*). It has
          climbed 9.2 -> 11.2 -> 11.9 -> 12.9 as the base was corrected and then
          the ratio raised; the reservation above it is in `em`, so the slot grows
          with it and the card's own height is unaffected. */}
      {/*
        TWO LINES RESERVED, not one (Codex review, 2026-08-06).

        The rows this replaced reserved `min-h-[3rem]` — 48px — deliberately:
        the wrong-move copy ("Incorrect — that one is scored.") wraps to two
        lines in this panel, and it is on screen for the 700ms of the
        auto-revert. Collapsing that to a single line meant the primary control
        dropped ~20px at the exact moment a frustrated solver reaches for it,
        which is the defect the original reservation was written for.

        Reserved for the LONGEST transient state, not the common one. The cost
        is a line of empty space in "White to move"; the alternative is a button
        that moves while someone is reaching for it.

        3.25rem, not the 3rem the old rows used: this headline is `text-xl`
        rather than `text-base`, because it has to be the largest type in the
        panel to earn being uncontained. Two lines at 20px/leading-tight is
        50px, and 48px let the control move 2px — measured, which is the only
        way a number like this is ever right.
      */}
      {/*
        `items-center`, not `items-start` (owner, 2026-08-06: "in the live status
        card the vertical alignment is not right yet").

        The row reserves two lines for the wrong-move copy, so with a one-line
        state — "Black to move", which is most of the time — top alignment left
        26px of empty space hanging beneath it and the card read as unbalanced.
        Centred, the single line sits between equal margins and the reservation
        becomes spacing instead of a gap.

        The reservation itself does not change: this is about where the text
        sits inside it, not how tall it is. Nothing moves when the copy wraps.
      */}
      {/*
        The headline sits at `--muted-foreground`, the same token as every other
        piece of text on these cards (owner, 2026-08-07: *"the bright white is a
        bit distracting"*).

        It was `text-foreground` — not a different colour from the stat values,
        but the only thing on its card wearing it, at `text-xl` and semibold. So
        size and weight were doing the work of prominence and brightness was
        being spent on top. 13.39:1 against the card, where the rest of the card
        reads at 7.36 — still far above the 4.5 AA asks for.

        Same argument as the 2026-08-06 pass that took three colours off this
        line and moved the semantic signal to the icon: what a status line means
        is carried by its mark and its position, not by how bright it burns.
      */}
      {/* `1.4em` is the skeleton's `card-value` — the headline is what this card
          exists to say. The two-line reservation is expressed against that same
          type (`2.5em` of a 1.4em line at `leading-tight` is two lines plus the
          2px the 3.25rem note measured), so it stays two lines at every size
          instead of being two lines only at 20px. */}
      {/*
        THE SLOT IS AS TALL AS THE TALLEST SENTENCE IT CAN HOLD, AND NOT A PIXEL
        TALLER - a CSS grid stack, which is the standard answer to this and needs
        no JavaScript at all.

        Every string is laid into the SAME grid cell with `grid-area: 1 / -1`.
        The hidden ones are `invisible`, so they still take part in sizing while
        showing nothing, and the cell ends up the height of whichever one wraps
        furthest AT THIS WIDTH. No measurement, no observer, no constant: it is
        simply correct at every card size, font size and language.

        WHAT IT REPLACES, and why the replacement is not a relaxation: the slot
        was `min-h-[2.5em]`, two lines at every width alike, because the
        wrong-move copy wraps in a narrow card and the primary button must not
        drop 20px while a frustrated solver is reaching for it. That guarantee is
        exactly what a grid stack gives - the reservation is still the worst case
        - but it is the worst case HERE rather than the worst case anywhere.
        Measured: nothing wraps at 1524x731, so the card gets a whole line back,
        while 788x467 keeps its two because there it genuinely needs them.

        Reference: the grid-stack technique, hsablonniere.com and
        aleksandrhovhannisyan.com, both 2023.
      */}
      {/*
        THE SLACK FALLS BELOW THE REGION, NEVER AROUND THE HEADLINE (Codex
        review, 2026-08-16, and the owner had been reporting the symptom of it
        all afternoon).

        The reservation was on the headline alone and centred inside it, so a
        one-line state - which is nearly every state - sat with HALF THE
        RESERVATION ABOVE IT AND HALF BELOW: at 995x686 that is 9.3px of blank
        between the chip and "Black to move" and another 9.3 between it and the
        line under it. Reserving less was the wrong lever. Where the reservation
        sits was the whole defect.

        So the stack wraps the WHOLE status region. The hidden sizer reproduces
        the region's worst case - chip slot, the tallest sentence in the
        vocabulary, detail slot - and the visible content is laid over it at
        `items-start`. The region is exactly as tall as it must be, the three
        rows sit tight against each other, and whatever is left over lands under
        the last line, where it reads as the card breathing before its button
        rather than as a hole in the middle of a sentence.

        WHAT DOES NOT WORK, recorded because two attempts were spent on it:
        `--card-title-gap`. It hangs off `.card-label` and THIS CARD RENDERS
        NONE, so no value of it can ever move anything here.
      */}
      <div className="grid">
        {/*
          BOTH LAYERS CARRY THE SAME GAP, and that is what makes the spacing the
          same at every resolution (owner, 2026-08-16: *"the live card still has
          the title and the next two lines a bit too close one to each other, it
          is not happening on all resolutions"*).

          Nothing separated these three rows. What looked like separation was
          leftover INSIDE the reservation, which exists only when the widest
          sentence in the vocabulary wraps further than the one on screen - so on
          a card wide enough for both to fit on one line there was no leftover
          and the rows sat flush. The spacing was an accident of the sizer.

          One unit between them now, the same unit as every other gap on the
          page. The sizer takes it too, so the reservation still bounds the
          region and the card cannot grow.
        */}
        <div
          aria-hidden
          className="invisible [grid-area:1/-1] flex flex-col"
          style={{ gap: 'calc(var(--card-air) * 2)' }}
        >
          <div className="min-h-[1.3em] text-[0.92em]" />
          <div className="grid text-[1.4em] font-semibold leading-tight">
            {/* EACH SIZER IN THE SAME CELL, never as siblings in one box:
                siblings stack vertically and the reservation becomes the SUM of
                every sentence instead of the tallest. */}
            {/* `1.35em` of indent is the MARK AND ITS GAP. The visible headline
                carries a `1em` icon with a `0.35em` gap, so a sizer without it
                wraps later than the sentence it stands in for. */}
            {HEADLINE_VOCABULARY.map(s => (
              <div key={s} className="[grid-area:1/-1] ps-[1.35em]">{s}</div>
            ))}
          </div>
          <div className="min-h-[1.45em] text-[1em]" />
        </div>
        {/*
          THE RESERVED SPACE IS SHARED BETWEEN THE ROWS, not parked under them
          (owner, 2026-08-16: *"there is vertical space below and above not used,
          we can make it more even"*).

          The reservation is the tallest sentence this slot can hold, so on the
          common one-line states there is space left over inside it. `self-start`
          put ALL of it below the detail line - measured at 788x467, the three
          rows flush at 0px and then a 17.3px hole before the buttons.
          `justify-between` spreads it between them instead, which is what the
          owner asked for and costs nothing: when the copy does wrap there is no
          leftover, the rows sit flush, and the buttons have not moved either way.
        */}
        {/*
          THE GAP IS A MINIMUM AND `justify-between` STILL SPREADS THE REST.
          Dropping `justify-between` for a plain gap was measured and it made
          800x600 WORSE - the reservation leftover there was giving 7.4px between
          the rows and a bare unit gives 0.9. Both are wanted: the gap guarantees
          the rows are never flush at any resolution, and the distribution keeps
          whatever the sizer leaves over shared evenly rather than parked.
        */}
        <div
          className="[grid-area:1/-1] flex flex-col justify-between"
          style={{ gap: 'calc(var(--card-air) * 2)' }}
        >
          <div className="min-h-[1.3em] text-[0.92em] text-muted-foreground">{chip}</div>
          <div className="text-[1.4em] font-semibold text-muted-foreground leading-tight">
            {headline}
          </div>
          <div className="min-h-[1.45em] text-[1em] text-muted-foreground">{detail}</div>
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </>
  );
  if (boxed) return <Section testId="live-status">{body}</Section>;
  /*
    NO `flex-1` HERE, AND THAT WAS TRIED AND REJECTED (owner, 2026-08-16: *"we
    don't move all controls and cluster them together, this is bad UI"*).

    Giving this region the card's leftover pushed the two buttons onto the card's
    bottom edge and opened a band of nothing above them - the controls read as a
    cluster stuck to the floor rather than as part of the card. Handing the
    leftover to ONE place is what does that, whichever place is chosen.

    The card packs from the top with its own rhythm - see `--card-air` - and what
    is left stays at the bottom. That is the 2026-08-06 rule and it survives this
    pass unchanged: centring the body was rejected then, clustering the controls
    is rejected now, and both are the same mistake about where slack belongs.
  */
  return <div data-testid="live-status" className="live-status px-1">{body}</div>;
}

/* ────────────────────────────────────────────────────────────────────────────
   Action — three tiers, one filled primary per state
   ────────────────────────────────────────────────────────────────────────── */

/**
 * EXACTLY ONE FILLED PRIMARY VISIBLE PER STATE.
 *
 * Two full-saturation primaries at once is a two-suns problem; two that are
 * NEARLY the same size turns a hierarchy error into a perceived defect, which
 * is how it was reported: *"the two yellow buttons have different sizes."*
 * `Start run` and `New Puzzle` are the same affordance in two states of the
 * panel, so they take the same slot at the same size — identical, never similar.
 *
 * `tertiary` exists for `Show solution`, which measured 50px — the LARGEST
 * control on the panel, 2px taller than the primary it sat under. The give-up
 * action must stay one click, and must stop outweighing the action above it.
 */
export function Action({
  tier = 'primary', icon, children, onClick, disabled, testId, ariaLabel,
}: {
  tier?: 'primary' | 'secondary' | 'tertiary';
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  ariaLabel?: string;
}) {
  const base = 'trainer-action w-full inline-flex items-center justify-center gap-[calc(var(--card-w,208px)*0.04)] text-[length:var(--card-type,14px)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  /*
    THE PADDING SCALES, THE TOUCH TARGET DOES NOT GO UNDER 44px.

    `py-[0.85em]` reproduces today's `py-3` exactly at the 14px default and grows
    with the card, so the button keeps its proportions. The `min-h-[44px]` under
    it is the same floor the control strip is anchored to (`STRIP_MIN` is 44 plus
    its padding) and the same one the reveal button was raised to on 2026-08-13.

    It is a px number on purpose and it is the only one here: a target you have to
    hit with a thumb is a fact about hands, not about the card it sits in, so it
    cannot be a ratio of anything on the page.
  */
  const tiers = {
    primary: 'py-[0.85em] min-h-[44px] rounded-[0.4em] bg-primary text-primary-foreground hover:bg-primary/90 font-medium',
    secondary: 'py-[0.85em] min-h-[44px] rounded-[0.4em] border border-border text-foreground hover:bg-muted font-medium',
    // A reserved row, so demoting it does not make the panel jump when it hides.
    tertiary: 'min-h-[2.3em] text-muted-foreground hover:text-foreground underline underline-offset-2',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-label={ariaLabel}
      className={`${base} ${tiers[tier]}`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Toggle — a single switch for a binary setting
   ────────────────────────────────────────────────────────────────────────── */

/**
 * One switch, on or off (owner, 2026-08-06, pointing at Lichess).
 *
 * It replaces a two-button group — `[Rated] [Practice]` — which took a whole
 * card to say one bit. Two named buttons cannot be misread, which is why they
 * were chosen, but they cost a row, a heading and an explanatory line for a
 * setting that is on almost all the time.
 *
 * A switch is the honest shape for a binary: the label states what is ON, the
 * track shows whether it is, and there is nothing to compare against. It is a
 * real `role="switch"` rather than a styled div, so assistive tech reads the
 * state rather than a colour.
 *
 * The colour of the track is the only place semantic green appears in the
 * panel. That is deliberate: it says "counting", which is the one thing a
 * solver needs to know at a glance before they move.
 */
export function Toggle({
  checked, onChange, label, hint, testId, disabled = false, hintLines = 2, icon,
}: {
  /**
   * The mark in front of the label (owner, 2026-08-06: "look at the other
   * cards, it's quite a difference").
   *
   * Every other row in this panel opens with one — the stat cells, the standing
   * links, and the "Strength & themes" row in this very card. Two toggles
   * without one read as a different species of thing sitting in the same box.
   * Not optional in practice: `StatGrid` already proved that an optional
   * per-item icon becomes a *sometimes* icon, which is the inconsistency one
   * layer down.
   */
  icon?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Reported AND enforced — a switch that says it is not in charge must not act. */
  disabled?: boolean;
  label: string;
  /** One line under the switch. Reserved, so turning it on moves nothing. */
  hint?: string;
  /**
   * How many lines of hint to RESERVE. Two by default.
   *
   * Two exists because Rated's longest hint — "This band is far from your
   * rating, so these solves will not move it" — wraps at the ~32 characters this
   * card fits. A switch whose hint is always short should not pay for that: the
   * card holds four cards' worth of height between them, and 16px is the
   * difference between a second switch fitting and not.
   */
  hintLines?: 1 | 2;
  testId?: string;
}) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className="flex w-full items-center gap-[calc(var(--card-w,208px)*0.04)] py-[0.16em] text-left text-[length:var(--card-type,14px)] text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed"
      >
        {/*
          THE TRACK USES THE PAGE'S OWN ACCENT (owner, 2026-08-06: the on colour
          "should be changed to something that goes with our page, not the
          blue-ish green-ish colour we have now").

          It was `--success`, a green that belongs to no palette here — the same
          fault as the `text-blue-400` retired from the status line. And the
          page already has a convention for ON: every selected chip in the run
          setup uses `border-primary bg-primary/10`. A switch that means
          "active" should speak that language rather than invent a third hue.

          Measured, not chosen by eye: amber is 9.45:1 against the page where
          the green was 5.34, and the knob reads at 9.45:1 on it.

          THE OFF STATE, and it took two passes (owner: "the off state of the
          switch makes it barely visible, we can still improve on that").

          The first attempt gave it a border and left `bg-muted` — still 1.13:1
          against the card. The real culprit was the KNOB: it is
          `bg-background`, i.e. the page's own colour, so an off switch was a
          dark pill containing an invisible circle. Nothing about the track
          could fix that on its own.

          Measured: the off track is `muted-foreground/60`, which lands at
          3.56:1 against the card and 3.80:1 against the knob — both clear the
          3:1 WCAG asks of a non-text control. Derived from a theme token
          rather than a hand-picked literal, which is the rule `text-blue-400`
          broke.

          ONE knob colour serves both states: dark reads 9.45:1 on the amber
          and 3.80:1 on the off track, where a light knob would have been
          1.76:1 on amber. Checked before choosing rather than after.
        */}
        {/*
          THE SAME ROW AS EVERY OTHER ROW IN THE PANEL (owner, 2026-08-06: "make
          it look similar to the other cards otherwise we will not implement
          this").

          Mark, label, control — which is what `StandingLink` does with a
          chevron, what the "Strength & themes" row does, and what `StatGrid`
          does with a value. This was switch-then-label at `font-medium`, so it
          was both a different order and a heavier weight than anything near it:
          two settings shouting in a card of quiet rows.

          `py-1.5` and `text-sm` are `StandingLink`'s own metrics, so the three
          rows in this card now share one rhythm.
        */}
        <span className="shrink-0 flex items-center text-muted-foreground">{icon}</span>
        <span>{label}</span>
        <span
          aria-hidden="true"
          /* The track is a ratio of its own row's type, so the control and the
             label it belongs to stay in proportion. 1.43em x 2.57em reproduces
             today's 20x36 at the 14px default. */
          className={`relative ml-auto inline-flex h-[1.43em] w-[2.57em] shrink-0 items-center rounded-full border transition-colors ${
            checked
              ? 'bg-primary border-primary'
              : 'bg-muted-foreground/60 border-border'
          }`}
        >
          <span
            className={`inline-block h-[1em] w-[1em] rounded-full bg-background shadow transition-transform ${
              checked ? 'translate-x-[1.29em]' : 'translate-x-[0.14em]'
            }`}
          />
        </span>
      </button>
      {/*
        Reserved rather than conditional: this line changes with the switch, and
        a card that grows the moment you flip something is the defect the whole
        panel was rebuilt to remove.
      */}
      {/*
        INDENTED TO THE LABEL, not to the card's edge (owner, 2026-08-06, on
        seeing two toggles stacked: "this is a very bad implementation").

        The hint used to start at the left edge, under the SWITCH — so with one
        toggle it read as that toggle's line, and with two the card became five
        unrelated lines of small text with nothing saying which belonged to
        which. Aligned under the label it is visibly subordinate to it.

        `pl-[46px]` is the switch (36px) plus its gap (10px), i.e. exactly where
        the label starts. Written as the sum rather than a round number so it
        stays correct if the switch is resized.
      */}
      {/*
        NO HINT, NO LINE, NO RESERVATION (owner, 2026-08-06: "lets not have the
        explanations anymore, the titles themselves are self-explicit, this way
        we gain some space").

        The reservation exists because a hint that CHANGES with the switch would
        otherwise grow the card the moment you flip it. A toggle with no hint in
        any state cannot grow, so there is nothing to reserve — and reserving it
        anyway was 32px of held-open emptiness per switch in a card that has
        four cards' worth of height to share.

        Still reserved when a hint IS given, for the original reason. This is
        the difference between "sometimes present" and "never present".
      */}
      {hint !== undefined && (
        <p className={`mt-[var(--card-air,0.175em)] text-[0.8em] text-muted-foreground ${hintLines === 1 ? 'min-h-[1.45em]' : 'min-h-[2.9em]'}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   Disclosure — a Section with a header and a body that opens
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Not a fourth register: the same Section, in two states.
 *
 * This is what lets 236px of configuration stop sitting between the board and
 * the primary control — which is what put `New Puzzle` at y=1027 against an
 * 844px fold, i.e. below the fold on a phone.
 *
 * IT ALWAYS HAS A TITLE, and that is not decoration. The block this replaces
 * had no heading at all: it opened straight into "What to train", and asked
 * what it was, the owner did not recognise any name for it — *"what is 'run
 * setup'? not sure what you mean by this."* The most expensive block on the
 * page was the one the page never introduced.
 */
export function Disclosure({
  title, summary, open, onToggle, children, testId,
}: {
  title: string;
  /** Shown on the closed row — what this would do, in a few words. */
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testId?: string;
}) {
  const id = useId();
  return (
    <div
      data-testid={testId}
      /*
       * The same surface as `Section` above. It drew `border border-border
       * bg-card` until 2026-08-08 — the pre-08-07 treatment — so a Disclosure
       * rendered FLAT beside the elevated Sections it sits among, inside the
       * one file whose whole purpose is that there is a single presentation
       * register.
       */
      className="rounded-lg surface-card"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center gap-[calc(var(--card-w,208px)*0.04)] p-[0.85em] text-[length:var(--card-type,14px)] text-left hover:bg-accent/40 rounded-lg transition-colors"
      >
        <span className="text-[1em] font-medium text-foreground">{title}</span>
        {summary && !open && (
          <span className="text-[0.8em] text-muted-foreground truncate">{summary}</span>
        )}
        <ChevronDown
          className={`w-[1.15em] h-[1.15em] ml-auto shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div id={id} className="px-[0.85em] pb-[0.85em] text-[length:var(--card-type,14px)]">{children}</div>}
    </div>
  );
}
