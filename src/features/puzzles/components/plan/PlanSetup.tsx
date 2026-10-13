/**
 * The three questions that build a plan (A2 of the plan-page work).
 *
 * Extracted from `PlanPanel` unchanged, except for one thing that was a real
 * defect: `Row` was declared INSIDE the render. React sees a new component type
 * on every render, so it unmounted and remounted all three rows on every
 * keystroke of state — losing focus and any transient DOM state each time. It is
 * hoisted to module scope here, which is the whole fix.
 *
 * PRD §6.4.0: the questions are about the player's life, not their chess.
 */
import { Minus, Plus } from 'lucide-react';
import {
  FREQUENCIES, LENGTHS, DURATIONS,
  MIN_POSITIONS, MAX_POSITIONS, POSITIONS_STEP,
} from './planFormat';

/**
 * How long a session is — three shortcuts and a stepper, always both (owner,
 * 2026-08-06: "the number of positions in a session has only 3 choices, 15, 25
 * and 40. We need to add also the possibility for the user to add some other
 * lengths… maybe multiple of 5 or something similar").
 *
 * The server has accepted any integer from 5 to 60 since E3. The three chips
 * were an artificial narrowing on the client alone, which is the worst kind:
 * nothing was refusing 30, we simply never offered it.
 *
 * ONE CONTROL, NO MODES. The obvious build is a fourth "Other" chip that reveals
 * an input — a second state, a way in and a way out, and a value that lives in
 * two places. Here the stepper always shows the current number whatever set it,
 * so a chip and the stepper are two ways to move ONE value. When that value is
 * not one of the three, no chip is lit, which is exactly true.
 *
 * The chips stay because most people want one of them, and reaching 40 from 25
 * by pressing a stepper three times is a worse answer to the common case.
 */
function PositionsRow({ value, onPick }: { value: number; onPick: (n: number) => void }) {
  const step = (delta: number) => onPick(
    Math.min(MAX_POSITIONS, Math.max(MIN_POSITIONS, value + delta)),
  );
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      {/* "Positions", never "length" — the word reads as minutes. */}
      <span className="text-xs text-muted-foreground">Positions a session</span>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {LENGTHS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              aria-pressed={value === n}
              className={`px-2 py-1 rounded-md border text-xs ${
                value === n
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => step(-POSITIONS_STEP)}
          disabled={value <= MIN_POSITIONS}
          aria-label={`Fewer positions, ${POSITIONS_STEP} at a time`}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="w-3 h-3" />
        </button>
        {/*
          `aria-live="polite"` and a `role` the stepper can be read against: the
          buttons say what they do, and this says what happened. Without it a
          screen-reader user presses "fewer" and is told nothing.
        */}
        <span
          className="min-w-[3ch] text-center text-sm font-medium text-foreground tabular-nums"
          role="status"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => step(POSITIONS_STEP)}
          disabled={value >= MAX_POSITIONS}
          aria-label={`More positions, ${POSITIONS_STEP} at a time`}
          className="w-7 h-7 rounded-md border border-border text-muted-foreground hover:text-foreground inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function Row({ label, values, value, onPick, suffix = '' }: {
  label: string; values: readonly number[]; value: number;
  onPick: (n: number) => void; suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {values.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            aria-pressed={value === n}
            className={`px-2 py-1 rounded-md border text-xs ${
              value === n
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {n}{suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface PlanSetupProps {
  sessionsPerWeek: number;
  positionsPerSession: number;
  weeks: number;
  onSessionsPerWeek: (n: number) => void;
  onPositionsPerSession: (n: number) => void;
  onWeeks: (n: number) => void;
  onGenerate: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string | null;
  /**
   * Whether to draw its own card.
   *
   * When it does, it wears `.surface-card` — the same surface as every other
   * card on the page. It used to draw `border border-border bg-card`, which is
   * the PRE-2026-08-07 treatment: a visible outline and no elevation, so it
   * read flat beside the shadowed cards around it. That bordered look is the
   * one the owner rejected during the surface pass, where it "read as
   * wireframe".
   *
   * `rounded-lg` deliberately stays a separate utility rather than moving into
   * `.surface-card` — folding radius in made two guards select 3 nodes instead
   * of 7 and report a layout regression that did not exist.
   *
   * The rule this still serves: nothing nests. `boxed={false}` is for callers
   * that already draw the container.
   */
  boxed?: boolean;
}

export function PlanSetup({
  sessionsPerWeek, positionsPerSession, weeks,
  onSessionsPerWeek, onPositionsPerSession, onWeeks,
  onGenerate, onCancel, busy = false, error = null, boxed = true,
}: PlanSetupProps) {
  return (
    <div
      className={boxed ? 'surface-card w-full max-w-xl rounded-lg p-4 text-sm' : 'text-sm'}
      data-testid="plan-config"
    >
      <p className="font-medium text-foreground">Build a training plan</p>
      <Row label="Sessions a week" values={FREQUENCIES} value={sessionsPerWeek} onPick={onSessionsPerWeek} />
      <PositionsRow value={positionsPerSession} onPick={onPositionsPerSession} />
      <Row label="Weeks" values={DURATIONS} value={weeks} onPick={onWeeks} />
      {/*
        THE TWO CONTROLS SIT RIGHT (owner, 2026-08-06: "lets have the buttons on
        the right hand side, is that possible?").

        They were a full-width pair filling the card, which read as the card's own
        primary actions — the same weight as Start run one card above. Ranged
        right and sized to their labels they read as what they are: the end of a
        short form. `order-2` on the confirm puts Cancel to its LEFT without
        reordering the source, so the confirm stays first for a screen reader and
        for keyboard order — the visual order is the one that changed, and only it.
      */}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="order-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Show me the plan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default PlanSetup;
