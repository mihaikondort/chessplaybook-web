import type { ReactNode } from 'react';
import { PlayerPortrait } from './PlayerPortrait';

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
export function PlayerCard({ icon, label, name, title, rating, detail, status, clock, portrait, flag }: {
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
  /** A round portrait left of the rows (the World Championship pages). */
  portrait?: string;
  /** A flag, drawn as a badge on the portrait's lower right (it takes no width from the text). */
  flag?: ReactNode;
}) {
  const rows = (
    <>
        {/* With a portrait the name is the card's headline, so it is larger. */}
        <span className={portrait ? 'card-row gap-[0.35em]' : 'card-row'} style={portrait ? { fontSize: 'min(1.2em, 8.8cqw)' } : undefined}>
          {title && <span className="shrink-0 font-semibold text-link">{title}</span>}
          <span className="truncate font-semibold text-foreground" data-player-name>{name}</span>
          {rating !== undefined && !portrait && <span className="shrink-0 tabular-nums">{rating}</span>}
        </span>
        <span className={portrait ? 'card-row' : 'card-row text-[0.86em]'} style={portrait ? { fontSize: 'min(0.95em, 6.5cqw)' } : undefined}>
          <span className="truncate">{portrait && rating !== undefined ? <><span className="tabular-nums">{rating}</span> · {detail}</> : detail}</span>
          {status && <span className="ml-auto shrink-0 text-link">{status}</span>}
        </span>
        {clock && <div className="mt-auto">{clock}</div>}
    </>
  );
  return (
    <>
      <span className="card-label inline-flex items-center gap-[0.35em]" aria-label={label}>
        {icon}
        {label}
      </span>
      {portrait ? (
        /* Pulled up by the title gap, so the photo sits halfway between the label and
           the card's foot (it sat 37px under the label and 22px over the foot). */
        <div className="flex min-h-0 flex-1 items-center gap-[0.7em]" style={{ marginTop: 'calc(-1 * var(--card-title-gap, 0px))' }}>
          {/* The card is a size container. The type grows with the window's height while
              the lane's width stops growing, so the photo and the name are capped by the
              card's width too (a fixed 5em cut "Sindarov" at 1920x980), and the photo by
              its height (800x600). */}
          <PlayerPortrait src={portrait} flag={flag} style={{ width: PORTRAIT_SIZE, height: PORTRAIT_SIZE }} />
          {/* .card-body is a utility, so its own justify-content beats a class here. */}
          <div className="card-body min-w-0 self-stretch" style={{ justifyContent: 'center' }}>{rows}</div>
        </div>
      ) : (
        <div className="card-body">{rows}</div>
      )}
    </>
  );
}

const PORTRAIT_SIZE = 'min(4.8em, 35cqw, 58cqh)';

/** The clock's classes on a player card: borderless, left-aligned, in `em`. */
export const PLAYER_CLOCK_CLASS = 'w-full bg-transparent px-0 py-0 text-left text-[1.6em] leading-tight text-foreground shadow-none';
