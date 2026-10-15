/**
 * The whole plan, before anything is saved (A2 of the plan-page work).
 *
 * Extracted from `PlanPanel` verbatim. It exists because PRD E6 requires the
 * plan be shown IN FULL before the account is mentioned — a player who declines
 * keeps a working trainer; they lose the plan, not the product. That is also
 * why A4 does not leave a compressed copy behind in the card: a truncated
 * preview would fail the requirement while looking like it met it.
 */
import { buildPlanCalendarFromItems } from '../../lib/planCalendar';
import type { GeneratedPlan, PlanItem } from '../../services/PlanApi';
import { PlanCalendar } from './PlanCalendar';
import { AREA_LABEL, dayLabel } from './planFormat';

export interface PlanPreviewProps {
  preview: GeneratedPlan;
  onCommit: () => void;
  /** Back to the three questions, keeping what was answered. */
  onChange: () => void;
  busy?: boolean;
  error?: string | null;
  /** See `PlanSetup.boxed` — the page draws its own container. */
  boxed?: boolean;
}

export function PlanPreview({
  preview, onCommit, onChange, busy = false, error = null, boxed = true,
}: PlanPreviewProps) {
  const s = preview.summary;
  const items: PlanItem[] = preview.items.map((item, index) => ({
    ...item,
    id: `preview-${index}`,
    kind: item.kind ?? 'training',
    sessionId: null,
    status: 'pending',
  }));
  const calendar = buildPlanCalendarFromItems(items, preview.startsOn, preview.endsOn);
  return (
    <div
      className={boxed ? 'surface-card rounded-lg p-3 text-sm' : 'text-sm'}
      data-testid="plan-preview"
    >
      <p className="font-medium text-foreground">
        {s.sessions} sessions over {s.weeks} weeks — {s.positions} positions
      </p>
      {/*
        Both numbers, because a session count alone makes the reader multiply
        and a ramped plan would make them multiply WRONG. Volume and coverage
        only: there is deliberately no "you will reach X".
      */}
      <p className="mt-1 text-xs text-muted-foreground">
        {s.ramped
          ? `Starting at ${s.firstSessionPositions} positions and building to ${s.positionsPerSession}`
          : `${s.positionsPerSession} positions a session`}
        {' · '}
        {AREA_LABEL.tactics} {s.byArea.tactics} · {AREA_LABEL.middlegame} {s.byArea.middlegame} · {AREA_LABEL.endgame} {s.byArea.endgame}
      </p>
      {s.reviewOn && (
        <p className="mt-1 text-xs text-muted-foreground">
          Ends {dayLabel(s.reviewOn)} with a final review of {s.reviewPositions} positions
          across all three areas — unrated, so you can see what changed without
          risking anything.
        </p>
      )}
      {/*
        THE REASON IS A SENTENCE, and the sentences are Codex's (owner,
        2026-08-06: "'Weighted toward middlegame — we have too little to go on
        there' … it's not clear what it means").

        The old clauses were notes to ourselves. "We have too little to go on
        there" does not say who "we" are, what "there" is, or what follows from
        it — and the reader's question is not what we know, it is why their
        plan looks like this.

        `not_enough_evidence` says OVERALL, which is the owner's call and is
        stated here because I first wrote it the other way: "you have not
        solved enough MIDDLEGAME puzzles". The field is per-area, but the
        sentence the player needs is not about the field. Someone who has just
        arrived and solved a handful is not being told a fact about middlegames
        — they are being told why the plan cannot yet aim at anything, and the
        honest version of that is about their record as a whole.

        `player_asked` had no clause at all, so it printed a bare "Weighted
        toward middlegame" with no reason — the one case where the reason is
        the most interesting thing, because it was the player's own doing.
        `PlanApi` did not even carry the value; see the type.
      */}
      {s.emphasis && (
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="text-foreground">
            Weighted toward {AREA_LABEL[s.emphasis].toLowerCase()}.
          </span>{' '}
          {s.emphasisReason === 'never_trained'
            && 'You have no record in this area yet, so the plan gives it a first look.'}
          {s.emphasisReason === 'stale'
            && 'You have not trained this area for over two weeks.'}
          {s.emphasisReason === 'below_expectation'
            && 'Your results here are below expectation for puzzles this hard.'}
          {s.emphasisReason === 'least_recent'
            && 'This is the area you trained longest ago.'}
          {s.emphasisReason === 'player_asked'
            && 'You asked for more practice in this area.'}
        </p>
      )}

      <div className="mt-3">
        <PlanCalendar
          weeks={calendar}
          activeItem={null}
          nextItem={null}
          busy={busy}
          onStart={() => undefined}
          readOnly
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCommit}
          disabled={busy}
          className="flex-1 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Start this training plan
        </button>
        <button
          type="button"
          onClick={onChange}
          className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
        >
          Change it
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default PlanPreview;
