import type { CSSProperties, ReactNode } from 'react';

/**
 * A round player portrait with an optional flag badge on its lower right: the
 * World Championship game pages' player cards and the match hub's score card.
 * The size comes from the caller (`style`), so a card can tie it to its own type
 * and width, and the badge is a share of it.
 */
export function PlayerPortrait({ src, flag, style, className = '' }: {
  src: string;
  flag?: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={style}>
      <img src={src} alt="" className="h-full w-full rounded-full" />
      {flag && (
        <span className="absolute bottom-[4%] right-[-2%] flex overflow-hidden rounded-[2px] shadow-[0_0_0_2px_hsl(var(--card))]" style={{ width: '34%', height: '23%' }}>
          {flag}
        </span>
      )}
    </span>
  );
}
