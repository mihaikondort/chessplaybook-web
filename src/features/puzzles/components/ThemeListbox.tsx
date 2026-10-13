import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PUZZLE_THEMES } from '../hooks/usePuzzleSettings';

/**
 * The theme chooser, wearing the page's own colours.
 *
 * Owner, 2026-08-15, having first reported the native list *"looks like from
 * another movie"* and then sent the board-theme picker from production: *"the
 * drop down looks like in the screenshot"*.
 *
 * A native `select` popup is drawn by the OS OUTSIDE the page, so it can never
 * take our surface, our gold selection or our type. `color-scheme: dark` got it
 * as far as dark and no further — the highlight stayed the system's. The
 * board-theme picker the owner pointed at has always been a real listbox, which
 * is exactly why that one looks like the site and this one did not.
 *
 * SELECTION IS THE PAGE'S EXISTING CONVENTION: `border-primary bg-primary/10
 * text-link`, the same as the band chips beside it and the same as that
 * picker. One selection language on the page rather than three.
 *
 * THE KEYBOARD AND THE SCREEN READER ARE THE COST OF LEAVING THE NATIVE CONTROL,
 * so they are paid rather than lost: `role=listbox`/`role=option` with
 * `aria-selected`, arrow keys, Home and End, Enter or Space to choose, Escape to
 * close, and focus returned to the trigger on close. A custom control that
 * cannot be driven from a keyboard is a regression however well it matches a
 * screenshot.
 */
export function ThemeListbox({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = PUZZLE_THEMES.find(t => t.value === value) ?? PUZZLE_THEMES[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, PUZZLE_THEMES.findIndex(t => t.value === value)));
  }, [open, value]);

  /* Keep the highlighted row in view when arrowing through 18 themes. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, PUZZLE_THEMES.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Home') { e.preventDefault(); setActive(0); return; }
    if (e.key === 'End') { e.preventDefault(); setActive(PUZZLE_THEMES.length - 1); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(PUZZLE_THEMES[active].value); }
  };

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Theme"
        data-testid="theme-trigger"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/60 transition-colors"
      >
        <span>{current.label}</span>
        <ChevronDown className={`ml-auto w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Theme"
          aria-activedescendant={`theme-opt-${active}`}
          data-testid="theme-listbox"
          /* `max-h` with its own scroll: eighteen themes will not fit beside a
             card, and this list is already inside a portalled popover. */
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto thin-scroll rounded-lg surface-card p-1 shadow-lg"
        >
          {PUZZLE_THEMES.map((t, i) => {
            const selected = t.value === value;
            return (
              <button
                key={t.value}
                id={`theme-opt-${i}`}
                type="button"
                role="option"
                aria-selected={selected}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(t.value)}
                className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm border transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-link'
                    : i === active
                      ? 'border-transparent bg-accent/40 text-foreground'
                      : 'border-transparent text-muted-foreground'}`}
              >
                <span>{t.label}</span>
                {selected && <Check className="ml-auto w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThemeListbox;
