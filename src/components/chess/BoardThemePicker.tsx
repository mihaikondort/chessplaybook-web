import { boardThemes } from '@/config/boardThemes';

/**
 * The six-swatch board-theme grid.
 *
 * Extracted from `PlayOnline` (PZ-043 D1) so the puzzle trainer's left footer
 * card and Play Online's board-settings popover are the same control rather
 * than two that drift. **The GRID was extracted, not the panel**: Play Online's
 * popover also carries a sound toggle, and the puzzles page has no sounds.
 *
 * It owns no preference and no storage. The caller passes the current id and
 * receives the chosen one, because the two pages persist through different
 * paths and a component that reached for `localStorage` itself would become a
 * fourth theme resolver on a page that already has three (see D0).
 */
export interface BoardThemePickerProps {
  currentThemeId: string;
  onSelect: (themeId: string) => void;
  /** Called after a selection, so a popover can close itself. */
  onAfterSelect?: () => void;
}

export function BoardThemePicker({
  currentThemeId,
  onSelect,
  onAfterSelect,
}: BoardThemePickerProps) {
  return (
    /*
      A radiogroup, not a list of buttons. These are six mutually exclusive
      values of one setting, which is what `radio` means — and it is what gives
      a screen-reader user arrow-key movement through the swatches and an
      announcement of which one is chosen. Six unlabelled buttons announce as
      six unrelated actions.
    */
    <div role="radiogroup" aria-label="Board theme" className="grid grid-cols-3 gap-2">
      {boardThemes.map(theme => {
        const selected = currentThemeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => { onSelect(theme.id); onAfterSelect?.(); }}
            title={theme.name}
            className={
              'flex flex-col items-center gap-0.5 rounded p-1 transition-all ' +
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
              (selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50')
            }
          >
            {/*
              The swatch is the light/dark pair, which is the only part of a
              theme visible at this size. `aria-hidden` because the accessible
              name comes from the label below and the `title` above; announcing
              two coloured divs would add nothing.
            */}
            <span aria-hidden className="flex h-6 w-full overflow-hidden rounded">
              <span className="flex-1" style={{ backgroundColor: theme.colors.lightSquare }} />
              <span className="flex-1" style={{ backgroundColor: theme.colors.darkSquare }} />
            </span>
            {/*
              First word only — "Blue", not "Blue (cool gray)". The full name is
              the accessible name and the tooltip; this is a caption under a
              24px swatch in a 3-column grid.
            */}
            <span className="text-[9px] leading-none text-muted-foreground">
              {theme.name.split(' ')[0]}
            </span>
            <span className="sr-only">{theme.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default BoardThemePicker;
