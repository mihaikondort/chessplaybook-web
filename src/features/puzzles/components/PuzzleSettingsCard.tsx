import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, FastForward, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { Toggle } from './TrainerUI';
import { RATING_PRESETS } from '../hooks/usePuzzleSettings';
import { ThemeListbox } from './ThemeListbox';

/**
 * PUZZLE SETTINGS — the same three rows, the same icons, the same order as
 * production: Rated, Auto next, Pick puzzles.
 *
 * THE LABELS ARE SHORT BECAUSE THE LANE IS (owner, 2026-10-06/07). "Auto-start
 * next" (7.12em) and "Strength & themes" (8.73em) wrapped between 1100 and 1279
 * wide, where the lane is a fixed 208px and the type at its largest: the rows
 * have 5.66em and 7.34em there, and the wrapped row pushed the card's last line
 * out of the card (34px at 1100x900). "Auto next" is 4.52em and "Pick puzzles"
 * 5.94em. The panel it opens is headed "Theme" and "Strength", so the label
 * says what you do there rather than naming the setting a third way. The
 * panel itself keeps its name, "Strength and themes".
 *
 * ONE DEVIATION, AND IT IS FORCED BY THE FROZEN CARD. On the current page
 * "Strength & themes" expands INSIDE the card and the card grows to hold a theme
 * select and six band buttons. Here a card is a fixed share of its column and may
 * never be resized by its content, so an inline expansion would be clipped.
 *
 * It opens as a PORTALLED popover instead. There is precedent in this codebase
 * and it is the same reasoning: the board-appearance popover was portalled on
 * 2026-08-10 because its slot clips, and `z-index` was tried first and did
 * nothing — it orders painting, it does not escape a clipping ancestor.
 *
 * Anchored to the row rather than to the card, and positioned on measurement
 * rather than with a fixed offset, because the card's height moves with the
 * viewport and a hardcoded offset is right at exactly one size.
 */
export interface PuzzleSettingsCardProps {
  rated: boolean;
  onRatedChange: (v: boolean) => void;
  autoAdvance: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
  theme: string;
  onThemeChange: (v: string) => void;
  filterMode: 'auto' | 'manual';
  onFilterModeChange: (v: 'auto' | 'manual') => void;
  ratingRange: { min: number; max: number };
  onRatingRangeChange: (v: { min: number; max: number }) => void;
  /** True when the chosen band is far enough from the player's rating to freeze it. */
  bandIsFarFromRating?: boolean;
}

export function PuzzleSettingsCard({
  rated, onRatedChange,
  autoAdvance, onAutoAdvanceChange,
  theme, onThemeChange,
  filterMode, onFilterModeChange,
  ratingRange, onRatingRangeChange,
  bandIsFarFromRating = false,
}: PuzzleSettingsCardProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchor({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 240) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  /* Close on an outside click or Escape — a popover with no way out is a trap,
     and this one covers the cards beside it. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const bandLabel = filterMode === 'auto'
    ? 'matched to your record'
    : RATING_PRESETS.find(p => p.min === ratingRange.min && p.max === ratingRange.max)?.label
      ?? `${ratingRange.min}–${ratingRange.max}`;

  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]">
        <SlidersHorizontal className="w-[1em] h-[1em]" />
        Puzzle settings
      </span>
      <div className="card-body">
        <Toggle
          icon={<TrendingUp className="w-[1em] h-[1em]" />}
          checked={rated}
          onChange={onRatedChange}
          label="Rated"
          testId="rated-toggle"
          hintLines={1}
        />
        <Toggle
          icon={<FastForward className="w-[1em] h-[1em]" />}
          checked={autoAdvance}
          onChange={onAutoAdvanceChange}
          label="Auto next"
          testId="auto-advance-toggle"
          hintLines={1}
        />
        {/* The same row grammar as the two above and as `StandingLink`: mark,
            label, control. */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          data-testid="strength-themes"
          className="w-full text-left flex items-center gap-[calc(var(--card-w,208px)*0.04)] py-[0.16em] text-[length:var(--card-type,14px)] text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="w-[1em] h-[1em] shrink-0" />
          <span>Pick puzzles</span>
          {open
            ? <ChevronUp className="ml-auto w-[1em] h-[1em]" />
            : <ChevronDown className="ml-auto w-[1em] h-[1em]" />}
        </button>
      </div>

      {open && anchor && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Strength and themes"
          data-testid="strength-themes-popover"
          style={{ position: 'fixed', left: anchor.left, top: anchor.top, width: anchor.width, zIndex: 60 }}
          className="rounded-lg surface-card p-3 space-y-3 text-sm shadow-lg"
        >
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Theme</span>
            {/*
              A LIST OF OUR OWN, NOT THE PLATFORM'S (owner, 2026-08-15, showing
              the board-theme picker on production: *"the drop down looks like in
              the screenshot"*).

              A native `select` popup is drawn by the OS outside the page, so it
              can never take the page's surface, its gold selection or its type -
              `color-scheme: dark` got it as far as dark, and no further. The
              board-theme picker beside it has always been a real listbox, which
              is why THAT one looks like the site.

              Same treatment as the band chips below and as that picker:
              `surface-card` for the panel, `border-primary bg-primary/10
              text-link` for the chosen row. One selection convention on the
              page rather than three.

              KEYBOARD AND SCREEN READER ARE THE COST of leaving the native
              control, so they are paid explicitly: `role=listbox` with
              `aria-selected`, arrow keys, Home/End, Enter/Space to choose,
              Escape to close, and focus returning to the trigger.
            */}
            <ThemeListbox
              value={theme}
              onChange={onThemeChange}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-2">
              Strength · {bandLabel}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onFilterModeChange('auto')}
                className={`text-xs py-1.5 px-2.5 rounded border transition-all ${
                  filterMode === 'auto'
                    ? 'border-primary bg-primary/10 text-link'
                    : 'border-border hover:bg-accent/50'}`}
              >
                Auto
              </button>
              {RATING_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onFilterModeChange('manual');
                    onRatingRangeChange({ min: preset.min, max: preset.max });
                  }}
                  className={`text-xs py-1.5 px-2.5 rounded border transition-all ${
                    filterMode === 'manual'
                      && ratingRange.min === preset.min
                      && ratingRange.max === preset.max
                      ? 'border-primary bg-primary/10 text-link'
                      : 'border-border hover:bg-accent/50'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {/*
              This line belongs to the BAND, not to the Rated switch. It was under
              the toggle once and moved on 2026-08-06: being far from your rating
              is a consequence of the band you picked, and it lived beside Rated
              only because that is where a line happened to exist.
            */}
            {bandIsFarFromRating && (
              <p className="mt-2 text-xs text-muted-foreground">
                This band is far from your rating, so these solves will not move it.
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default PuzzleSettingsCard;
