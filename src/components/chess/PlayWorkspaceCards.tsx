import type { ReactNode } from 'react';

/*
  A PLAYER, IN THE WORKSPACE CARD GRAMMAR (layout redesign D1/D2a). Shared by
  /play and /play-online, which render it inside a `slot(...)`.

  It was `PlayWorkspacePlayerCard`, a surface of its own with fixed Tailwind
  sizes; inside a Workspace card that drew a card in a card and could not scale
  with the card's type. Everything is in `em` now, and the clock - the one figure
  that reads larger - is passed in, so each page keeps its own clock state.
*/
/*
  TITLE AND RATING ARE THEIR OWN PROPS (layout redesign E3), on the name row the way
  the Lichess viewer's player bar shows them: "GM Carlsen 2830". The game viewers pass
  them from the PGN headers; `/play` and `/play-online` keep their rating in `detail`
  as before, so nothing on those pages moved.
*/
export function PlayerCard({ icon, label, name, title, rating, detail, status, clock }: {
  icon: ReactNode;
  label: string;
  name: string;
  /** A chess title from the PGN, e.g. "GM". */
  title?: string;
  /** A rating from the PGN (`WhiteElo`), shown after the name. */
  rating?: number;
  detail: string;
  /** A short state beside the detail, e.g. "Thinking…". */
  status?: string;
  clock?: ReactNode;
}) {
  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]" aria-label={label}>
        {icon}
        {label}
      </span>
      <div className="card-body">
        <span className="card-row">
          {title && <span className="shrink-0 font-semibold text-link">{title}</span>}
          <span className="truncate font-semibold text-foreground">{name}</span>
          {rating !== undefined && <span className="shrink-0 tabular-nums">{rating}</span>}
        </span>
        <span className="card-row text-[0.86em]">
          <span className="truncate">{detail}</span>
          {status && <span className="ml-auto shrink-0 text-link">{status}</span>}
        </span>
        {clock && <div className="mt-auto">{clock}</div>}
      </div>
    </>
  );
}

/** The clock's classes on a player card: borderless, left-aligned, in `em`. */
export const PLAYER_CLOCK_CLASS = 'w-full bg-transparent px-0 py-0 text-left text-[1.6em] leading-tight text-foreground shadow-none';
