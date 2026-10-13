import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/**
 * A picker that can live inside a card the page refuses to let grow.
 *
 * Owner, 2026-08-18, on the run card's two chip groups: *"replace the 'What to
 * train' and 'Where from' with proper dropdown list pickers... what we have now
 * is improper, occupies too much space and is error prone when rendered upon
 * different resolutions"*.
 *
 * THE CHIPS WERE FIGHTING THE SIZING RULE, which is the part worth recording.
 * Measured on production before this was written, the same eleven chips rendered
 * on THREE rows at 1280x800, FOUR at 1920x947 and SIX at 1024x768, taking 40-45%
 * of the card at every size alike. The card declares a fixed `rows` count and
 * derives its type by dividing by it, so a control whose real line count swings
 * with the width makes that divisor a guess. Two triggers are two rows at every
 * resolution, which removes the variance rather than merely shrinking it.
 *
 * WHY THIS IS NOT `ThemeListbox`. That one is the same idea and its popup is
 * `absolute top-full`, which works because the appearance card is
 * `overflow-visible`. Every `Box` on this page is `overflow-hidden` ON PURPOSE -
 * a card must never spill past its own edge - so an absolutely positioned list
 * inside the run card is CLIPPED by the card, and a clipped list is also
 * un-hit-testable. This project has paid for that once already (2026-08-10: a
 * popover that rendered perfectly and swallowed every click; `z-index` was tried
 * first and did nothing, because it orders painting, it does not escape a
 * clipping ancestor). So the list is PORTALLED to the body and positioned
 * `fixed` against the trigger's own rectangle.
 *
 * ITS TYPE IS THE CARD'S. The trigger inherits `--card-type` because it sits in
 * the card; the portalled list cannot, since it is a child of `<body>`, so the
 * measured value is carried across explicitly. Without that the list would
 * render at the root size and read as a control from another page - the same
 * complaint that retired the native `select` here on 2026-08-15.
 *
 * THE KEYBOARD IS PAID FOR, not lost: `role=listbox`/`role=option` with
 * `aria-selected`, arrow keys, Home and End, Enter or Space to choose, Escape to
 * close, and focus returned to the trigger. A custom control that cannot be
 * driven from a keyboard is a regression however well it matches a screenshot.
 */

/**
 * A GROUP'S LABEL LINES UP WITH ITS CONTROL'S TEXT, not with the control's box
 * (owner, 2026-08-18: *"can we align vertically the 'What to train' with the
 * value below? same for 'Where from'"*, then *"these should be like a rule, so
 * they work on all resolutions"*).
 *
 * The label sat at the card's own edge while the value inside the trigger was
 * pushed in by the trigger's padding and its 1px border, so the two read as a
 * step rather than as a column. It is stated ONCE, here, and the trigger's
 * padding and the label's inset are the same expression - which is what makes it
 * hold at every resolution rather than at the one it was eyeballed on. Change
 * the padding and every label follows.
 *
 * It lives in THIS file, the lower-level one, so the card can import it without
 * the two modules importing each other.
 */
export const CONTROL_INSET_X = 'calc(var(--card-type) * 0.42)';
export const LABEL_INSET_X = `calc(${CONTROL_INSET_X} + 1px)`;

export interface ListboxOption<T> {
  value: T;
  label: string;
  /** Refused by the server, or contradicted by another choice. Says why. */
  disabled?: boolean;
  reason?: string;
}

export function CardListbox<T extends string | null>({
  label, value, options, onChange, disabled = false, id,
}: {
  /** The visible name of the setting. Also the list's accessible name. */
  label: string;
  value: T;
  options: ReadonlyArray<ListboxOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ left: number; top: number; width: number; type: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /*
    A TRIGGER MAY NEVER NAME A VALUE THAT IS NOT THE ONE SELECTED.

    This read `?? options[0]`, which is the worst possible fallback: if `value`
    is not in the list - a mode the server stopped offering, say, while the
    picker still holds it - the trigger would print the FIRST option's label
    while `onStart` submitted the real one. The player would read "Mixed" and
    start a run of something else, with nothing on screen disagreeing.

    Falling back to the raw value keeps the control honest: unfamiliar, which is
    what an unknown value is, rather than confidently wrong. `options[0]` is
    still what an EMPTY list resolves to, because then there is nothing to lie
    about.
  */
  const current = options.find(o => o.value === value)
    ?? (options.length ? { value, label: String(value ?? '') } : undefined);
  const enabledIndexes = options.map((o, i) => (o.disabled ? -1 : i)).filter(i => i >= 0);

  /*
    WHERE THE LIST GOES, MEASURED FROM THE TRIGGER.

    `fixed` rather than `absolute` because the list is a child of `<body>` and
    must not be offset by any scrolled ancestor. It opens downward and FLIPS UP
    when the space below cannot hold it - on this page the run card sits low in
    a column that fills the window, so downward is not always available, and a
    list rendered off-screen is the same defect as one that is clipped.
  */
  const place = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const type = parseFloat(getComputedStyle(t).fontSize) || 14;
    /* A row is one line plus its padding; the cap is what the list scrolls
       inside, and it is generous because these lists are short. */
    const rowH = type * 2.1;
    const wanted = Math.min(options.length * rowH + type * 0.6, type * 16);
    const below = window.innerHeight - r.bottom - 8;
    const flip = below < wanted && r.top > below;
    setBox({
      left: r.left,
      top: flip ? Math.max(8, r.top - wanted - 4) : r.bottom + 4,
      width: r.width,
      type,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    /* `true` so an ancestor scrolling moves the list with its trigger. A list
       left behind by its own control is worse than no list. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const i = options.findIndex(o => o.value === value);
    setActive(i >= 0 && !options[i].disabled ? i : (enabledIndexes[0] ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

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

  const close = (focus = true) => {
    setOpen(false);
    if (focus) triggerRef.current?.focus();
  };

  const choose = (v: T) => {
    onChange(v);
    close();
  };

  /* Arrowing SKIPS a disabled option rather than landing on it and refusing: an
     unavailable mode is shown so the player knows it exists, which is not a
     reason to make them press past it. */
  const step = (dir: 1 | -1) => {
    if (!enabledIndexes.length) return;
    const at = enabledIndexes.indexOf(active);
    const next = at === -1
      ? enabledIndexes[0]
      : enabledIndexes[(at + dir + enabledIndexes.length) % enabledIndexes.length];
    setActive(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(enabledIndexes[0] ?? 0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(enabledIndexes[enabledIndexes.length - 1] ?? 0); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const o = options[active];
      if (o && !o.disabled) choose(o.value);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        /* WITHOUT THIS, ARROWING IS SILENT. Focus stays on the trigger while the
           list is open - which is what a listbox does - so the active option is
           announced only if the trigger points at it. `ThemeListbox` has carried
           this since it was written; this control shipped its first version
           without it, and the highlight moving on screen is exactly the kind of
           thing that looks correct while telling a screen reader nothing. */
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onKeyDown}
        /*
          THE TRIGGER IS A ROW, NOT A CHIP. It states the current value the way
          the settings card states a switch's - the page's own row grammar - so
          the two cards read as one system. Every size is a ratio of
          `--card-type`, which is the card's rule for everything in it.
        */
        className={
          'flex w-full min-w-0 items-center rounded border text-left transition-colors ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
          (disabled
            ? 'border-border text-muted-foreground opacity-60 cursor-not-allowed'
            : 'border-border text-foreground hover:bg-accent/40')
        }
        style={{
          fontSize: 'calc(var(--card-type) * 0.86)',
          padding: `calc(var(--card-type) * 0.16) ${CONTROL_INSET_X}`,
          gap: 'calc(var(--card-type) * 0.3)',
        }}
      >
        <span className="min-w-0 truncate">{current?.label ?? ''}</span>
        <ChevronDown
          aria-hidden
          className={`ml-auto shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          style={{ width: '1em', height: '1em' }}
        />
      </button>

      {open && box && createPortal(
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          data-testid={`listbox-${id}`}
          className="fixed z-50 overflow-y-auto thin-scroll rounded-lg surface-card shadow-lg"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            maxHeight: box.type * 16,
            /* The card's type, carried across the portal by hand - see the note
               at the top of this file. */
            fontSize: box.type,
            padding: '0.2em',
          }}
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <button
                key={String(o.value)}
                id={`${id}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={o.disabled || undefined}
                disabled={o.disabled}
                title={o.reason}
                data-active={i === active}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => !o.disabled && choose(o.value)}
                className={
                  'flex w-full items-center rounded border text-left transition-colors ' +
                  (o.disabled
                    ? 'border-transparent text-muted-foreground opacity-50 cursor-not-allowed'
                    : selected
                      ? 'border-primary bg-primary/10 text-link'
                      : i === active
                        ? 'border-transparent bg-accent/40 text-foreground'
                        : 'border-transparent text-muted-foreground')
                }
                style={{
                  fontSize: '0.86em',
                  padding: '0.16em 0.42em',
                  gap: '0.3em',
                }}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {selected && <Check aria-hidden className="ml-auto shrink-0" style={{ width: '0.9em', height: '0.9em' }} />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
