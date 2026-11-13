/**
 * The gradient every gold icon strokes or fills with (`.v2-gold-icon` in index.css). Rendered once per page
 * that uses gold icons; zero-sized and hidden from assistive technology.
 */
export function GoldGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="v2-gold-grad" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--gold-top))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--gold-bottom))' }} />
        </linearGradient>
        {/* For filled icons of any viewBox (the trophy is 576x512): the gradient follows each shape. */}
        <linearGradient id="v2-gold-grad-bb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--gold-top))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--gold-bottom))' }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
