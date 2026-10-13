import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/*
  A panel that opens from a control inside a Workspace card.

  A card's size is declared and never grows with its content, so a control
  whose choices do not fit in the card shows them in a panel portalled to
  `document.body` instead (an ancestor that clips would make the panel
  un-clickable, the 2026-08-10 theme popover lesson). This hook owns the
  placement and the ways to close it; the caller renders the panel with
  `position: fixed` and the returned `style`, and caps its height at `room`,
  the space on the side it opened (min'd with its own cap, if it has one).

  The panel opens below the trigger, left-aligned with it and at least as wide
  (exactly as wide with `matchWidth`, which a list of the trigger's own options
  wants).
  When it does not fit below and there is more room above, it opens above.
  Either way it is kept inside the window horizontally.
*/
const GAP = 4;
const EDGE = 8;

export function useAnchoredPopover<T extends HTMLElement = HTMLButtonElement>({ matchWidth = false } = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number; minWidth: number; width?: number }>(
    { left: 0, top: 0, minWidth: 0 },
  );
  const [room, setRoom] = useState(() => (typeof window === 'undefined' ? 0 : window.innerHeight));

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panel = panelRef.current;
    /* `scrollHeight`, not `offsetHeight`: the panel is capped at `room`, and the
       decision needs the height it WANTS. */
    const height = panel?.scrollHeight ?? 0;
    const width = matchWidth ? rect.width : Math.max(panel?.offsetWidth ?? 0, rect.width);
    const below = window.innerHeight - rect.bottom - GAP - EDGE;
    const above = rect.top - GAP - EDGE;
    const up = height > below && above > below;
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE));
    setStyle({
      left,
      top: up ? Math.max(EDGE, rect.top - GAP - height) : rect.bottom + GAP,
      minWidth: rect.width,
      ...(matchWidth ? { width: rect.width } : {}),
    });
    setRoom(up ? above : below);
  }, [matchWidth]);

  /* Placed twice: once to render the panel, once more with its real size. */
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, place]);

  return { open, setOpen, triggerRef, panelRef, style, room };
}
