/**
 * Country flags as inline SVG. Flag emoji are not drawn on Windows (it shows the
 * letters "IN"), so a flag the site needs is drawn here. Only the countries the
 * site uses: India and Uzbekistan (the 2026 World Championship).
 *
 * 3:2 for both, as the cards need one shape; Uzbekistan's own flag is 2:1, so
 * its stripes are kept in proportion and the emblem scaled to fit.
 */

export type FlagCode = 'IN' | 'UZ';

const NAMES: Record<FlagCode, string> = { IN: 'India', UZ: 'Uzbekistan' };

function India() {
  return (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.67" fill="#FF9933" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </>
  );
}

/** Blue, white and green with red lines; a white crescent and 12 stars (3, 4, 5). */
function Uzbekistan() {
  const stars: [number, number][] = [];
  // Rows of 3, 4 and 5 from the top, right-aligned, right of the crescent.
  [[1.4, 3], [3.0, 4], [4.6, 5]].forEach(([y, n]) => {
    for (let i = 0; i < n; i++) stars.push([15 - i * 1.5, y]);
  });
  return (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.4" fill="#0099B5" />
      <rect y="13.6" width="30" height="6.4" fill="#1EB53A" />
      <rect y="6.4" width="30" height="0.4" fill="#CE1126" />
      <rect y="13.2" width="30" height="0.4" fill="#CE1126" />
      <circle cx="5.4" cy="3.2" r="2.4" fill="#fff" />
      <circle cx="6.3" cy="3.2" r="2.1" fill="#0099B5" />
      {stars.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#fff" />)}
    </>
  );
}

export function CountryFlag({ code, className }: { code: FlagCode; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" role="img" aria-label={NAMES[code]} className={className} preserveAspectRatio="none">
      {code === 'IN' ? <India /> : <Uzbekistan />}
    </svg>
  );
}
