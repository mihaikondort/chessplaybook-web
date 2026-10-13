/**
 * THE THEME PREVIEW (layout redesign B2). DEV-only: the route is gated behind
 * `import.meta.env.DEV` in `app/routes.tsx` and tree-shaken from production.
 *
 * Every colour role and every component state, in the dark and light themes
 * side by side, at 1:1, so the owner can judge the light palette on their own
 * screen. Each half sets `data-theme` on its own section; the custom
 * properties resolve per half, so the two are the real themes, not pictures.
 *
 * Contrast ratios are READ FROM THE BROWSER: each sample measures its own
 * computed colour and background, so what is printed is what is drawn.
 *
 * Only token-driven parts can be shown. Real pages still carry about 380 raw
 * colour classes until the B5 sweep, which is why visitors cannot choose the
 * light theme until F3.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COLOR_ROLES, type ColorRole } from '@/design/tokens/color.tokens';
import { useTheme } from '@/design/theme/ThemeProvider';
import type { ThemePreference } from '@/design/theme/theme';

type Theme = 'dark' | 'light';

/* WCAG relative luminance and contrast, from a computed `rgb(...)` string. */
function parseRgb(css: string): [number, number, number, number] | null {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function luminance([r, g, b]: number[]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: number[], b: number[]) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The first opaque background at or above an element. */
function backgroundOf(el: Element | null): number[] | null {
  for (let n = el; n; n = n.parentElement) {
    const c = parseRgb(getComputedStyle(n).backgroundColor);
    if (c && c[3] === 1) return c;
  }
  return null;
}

/**
 * Text measured against whatever it is drawn on. `min` is the WCAG AA
 * threshold: 4.5 for text, 3 for a boundary or large text.
 */
function Measured({ children, className = '', style, min = 4.5, boundary }: {
  children: ReactNode; className?: string; style?: CSSProperties; min?: number;
  /** Measure this element's own background against its parent's, instead of text. */
  boundary?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fg = boundary ? parseRgb(getComputedStyle(el).backgroundColor) : parseRgb(getComputedStyle(el).color);
    const bg = boundary ? backgroundOf(el.parentElement) : backgroundOf(el);
    if (fg && bg) setRatio(contrast(fg, bg));
  });
  const ok = ratio !== null && ratio >= min;
  return (
    <span className="inline-flex items-center gap-2">
      <span ref={ref} className={className} style={style}>{children}</span>
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${ok ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}`}
        title={`WCAG AA needs ${min}:1`}
      >
        {ratio === null ? '…' : `${ratio.toFixed(2)}${ok ? '' : ` < ${min}`}`}
      </span>
    </span>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

const hsl = (role: ColorRole) => `hsl(var(--${role}))`;

/* The background roles and the text that sits on each. */
const PAIRS: [ColorRole, ColorRole][] = [
  ['background', 'foreground'], ['surface', 'surface-foreground'],
  ['surface-elevated', 'surface-elevated-foreground'], ['card', 'card-foreground'],
  ['popover', 'popover-foreground'], ['muted', 'muted-foreground'],
  ['primary', 'primary-foreground'], ['secondary', 'secondary-foreground'],
  ['accent', 'accent-foreground'], ['success', 'success-foreground'],
  ['warning', 'warning-foreground'], ['destructive', 'destructive-foreground'],
  ['control', 'control-foreground'], ['inverse-surface', 'inverse-surface-foreground'],
  ['training-tactics', 'training-tactics-foreground'],
  ['training-middlegame', 'training-middlegame-foreground'],
  ['training-endgame', 'training-endgame-foreground'],
  ['training-review', 'training-review-foreground'],
];

/* Hover is shown by applying each variant's own hover classes statically. */
const BUTTON_HOVER: Record<string, string> = {
  default: 'bg-primary/90 shadow-[var(--glow-golden)]',
  secondary: 'bg-secondary/80',
  outline: 'bg-primary text-primary-foreground',
  ghost: 'bg-accent text-accent-foreground',
  destructive: 'bg-destructive/90',
  link: 'underline',
};
const FOCUS = 'ring-2 ring-ring ring-offset-2 ring-offset-background';

function Pane({ theme }: { theme: Theme }) {
  return (
    <div
      data-theme={theme}
      style={{ colorScheme: theme }}
      className="flex min-w-0 flex-1 flex-col gap-8 bg-background p-6 text-foreground"
    >
      <h2 className="font-playfair text-2xl">{theme === 'dark' ? 'Dark (today)' : 'Light (new)'}</h2>

      <Block title="Page and surfaces">
        <div className="grid grid-cols-2 gap-4">
          <div className="surface-card rounded-lg p-4">
            <div className="font-semibold">Card</div>
            <p className="text-sm text-muted-foreground">The one card surface, `.surface-card`.</p>
          </div>
          <div className="surface-card surface-card-promoted rounded-lg p-4">
            <div className="font-semibold">Promoted card</div>
            <p className="text-sm text-muted-foreground">The training plan's gold edge.</p>
          </div>
          <div className="rounded-lg bg-surface p-4 text-surface-foreground">
            <div className="font-semibold">Surface</div>
            <p className="text-sm text-muted-foreground">A quieter step above the page.</p>
          </div>
          <div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-md">
            <div className="font-semibold">Popover</div>
            <p className="text-sm text-muted-foreground">Menus and dropdowns.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>Card edge against the page: <Measured boundary min={1} className="inline-block h-4 w-8 rounded bg-card">{''}</Measured></span>
          <span>Strong border: <Measured boundary min={3} className="inline-block h-4 w-8 rounded bg-border-strong">{''}</Measured></span>
        </div>
      </Block>

      <Block title="Text">
        <div className="surface-card flex flex-col gap-2 rounded-lg p-4">
          <Measured className="text-xl font-semibold">Find the best move for White</Measured>
          <Measured>Body text on a card. The knight on f5 eyes d6 and h6.</Measured>
          <Measured className="text-sm text-muted-foreground">Muted: solved 16 of 20 this week</Measured>
          <span className="text-sm">
            <Measured className="text-link underline underline-offset-4">A link, in the link role</Measured>
          </span>
          <span className="text-sm">
            <Measured className="text-link">Gold as text, `text-link`: what the outline and link buttons used before B5a moved them to the link role</Measured>
          </span>
          <p className="text-sm">
            Selected text: <span className="bg-selection/40 px-0.5">this is what a selection looks like</span>
          </p>
        </div>
      </Block>

      <Block title="Buttons: normal, hover, focus, disabled">
        <div className="flex flex-col gap-3">
          {(['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const).map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <span className="w-24 font-mono text-xs text-muted-foreground">{v}</span>
              <Button variant={v} size="sm">New puzzle</Button>
              <Button variant={v} size="sm" className={BUTTON_HOVER[v]}>Hover</Button>
              <Button variant={v} size="sm" className={FOCUS}>Focus</Button>
              <Button variant={v} size="sm" disabled>Disabled</Button>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Form controls">
        <div className="surface-card flex flex-col gap-3 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Placeholder" />
            <Input defaultValue="Focused" className={FOCUS} />
            <Input defaultValue="Disabled" disabled />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2"><Switch defaultChecked /> Rated</label>
            <label className="flex items-center gap-2"><Switch /> Auto-advance</label>
            <label className="flex items-center gap-2"><Checkbox defaultChecked /> Checked</label>
            <label className="flex items-center gap-2"><Checkbox /> Unchecked</label>
          </div>
          <Tabs defaultValue="puzzle">
            <TabsList>
              <TabsTrigger value="puzzle">Puzzles</TabsTrigger>
              <TabsTrigger value="blitz">Blitz</TabsTrigger>
              <TabsTrigger value="rapid">Rapid</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Block>

      <Block title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Rated</Badge>
          <Badge variant="secondary">Practice</Badge>
          <Badge variant="destructive">Failed</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="surface-card flex flex-col gap-2 rounded-lg p-4 text-sm">
          <Measured className="text-success">Correct! Puzzle solved.</Measured>
          <Measured className="text-destructive">That is not the move.</Measured>
          <Measured className="text-warning">Analysis is running in another tab.</Measured>
          <div className="flex flex-wrap gap-2">
            <Measured className="rounded bg-success px-2 py-1 text-success-foreground">+12</Measured>
            <Measured className="rounded bg-destructive px-2 py-1 text-destructive-foreground">-9</Measured>
            <Measured className="rounded bg-warning px-2 py-1 text-warning-foreground">Unrated</Measured>
          </div>
        </div>
      </Block>

      <Block title="Board control bar">
        <div className="flex gap-1 rounded-lg bg-card p-1">
          {['First', 'Back', 'Next', 'Last', 'Flip'].map((l, i) => (
            <button
              key={l}
              className={`flex-1 rounded-md px-2 py-2 text-sm text-control-foreground ${i === 2 ? 'bg-control-hover' : 'bg-control'}`}
            >
              {l}{i === 2 ? ' (hover)' : ''}
            </button>
          ))}
        </div>
      </Block>

      <Block title="Dialog scrim and toast">
        <div className="relative h-36 overflow-hidden rounded-lg">
          <div className="surface-card h-full rounded-lg p-4 text-sm text-muted-foreground">Page content under a dialog.</div>
          <div className="absolute inset-0 bg-overlay" />
          <div className="absolute left-1/2 top-1/2 w-56 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
            Stop this training plan?
          </div>
        </div>
        <div className="flex">
          <Measured className="rounded-lg bg-inverse px-4 py-2 text-sm text-inverse-foreground shadow-lg">Link copied</Measured>
        </div>
      </Block>

      <Block title="Nav: broadcast states (tournament days only on the real site)">
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-background p-2">
          <Button variant="ghost" size="sm" className="relative gap-2 text-live hover:bg-live/10">
            Live <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-live" />
          </Button>
          <Button variant="ghost" size="sm" className="relative gap-2 bg-live/10 text-live">Live (hover)</Button>
          <Button variant="ghost" size="sm" className="relative gap-2 text-event-day hover:bg-event-day/10">
            Event day <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-event-day" />
          </Button>
          <Measured className="text-sm text-live">Live text</Measured>
          <Measured className="text-sm text-event-day">Event-day text</Measured>
        </div>
      </Block>

      <Block title="Training plan">
        <div className="grid grid-cols-4 gap-2 text-sm">
          {(['tactics', 'middlegame', 'endgame', 'mixed'] as const).map((a) => (
            <div key={a} className={`training-area-${a} rounded-md border px-2 py-3 text-center capitalize`}>{a}</div>
          ))}
        </div>
      </Block>

      <Block title="Every role with its text">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <tbody>
            {PAIRS.map(([bg, fg]) => (
              <tr key={bg}>
                <td className="w-48 font-mono text-xs text-muted-foreground">{bg}</td>
                <td>
                  <span className="inline-block rounded px-3 py-1.5" style={{ background: hsl(bg) }}>
                    <Measured style={{ color: hsl(fg) }}>Aa The quick knight</Measured>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2">
          {COLOR_ROLES.filter((r) => !PAIRS.some(([b, f]) => b === r || f === r)).map((r) => (
            <span key={r} className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-4 w-4 rounded border border-border" style={{ background: hsl(r) }} />
              <span className="font-mono text-muted-foreground">{r}</span>
            </span>
          ))}
        </div>
      </Block>
    </div>
  );
}

/*
  THE WHOLE SITE IN EITHER THEME, ON THE DEV SERVER ONLY (B3). The dev server
  honours a stored preference, so this switch sets it for every page in this
  browser: the way to check the B5 sweep page by page. Production ignores it
  until F3.
*/
function SiteThemeSwitch() {
  const { preference, resolved, setPreference } = useTheme();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Whole site (dev only):</span>
      {(['dark', 'light', 'system'] as ThemePreference[]).map((p) => (
        <button
          key={p}
          onClick={() => setPreference(p)}
          className={`rounded-md border px-3 py-1 capitalize ${preference === p ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
        >
          {p}
        </button>
      ))}
      <span className="font-mono text-xs text-muted-foreground">resolved: {resolved}</span>
    </div>
  );
}

export default function ThemePreview() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
        <h1 className="font-playfair text-2xl">Theme preview</h1>
        <p className="text-sm text-muted-foreground">
          Layout redesign B2. The same parts in both themes, at 1:1. Ratios are measured from what the
          browser draws; a red one is below WCAG AA. Hover and focus are shown statically.
        </p>
        </div>
        <SiteThemeSwitch />
      </header>
      <div className="flex flex-col xl:flex-row">
        <Pane theme="dark" />
        <Pane theme="light" />
      </div>
    </div>
  );
}
