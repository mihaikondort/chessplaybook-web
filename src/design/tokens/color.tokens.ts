/**
 * Colour tokens: the one source for the site's semantic colour roles.
 *
 * LAYOUT_SPEC.md §7, decision log C6, implementation plan §4 B1. Read by
 * `tailwind.config.ts`, which emits each theme's roles as custom properties
 * (the same mechanism A3 used for layout) and builds the Tailwind colour map
 * from the same names, so a utility class and the property it reads cannot
 * drift apart.
 *
 * VALUES ARE HSL CHANNELS, NOT COLOURS: `'218 42% 9%'`, read as
 * `hsl(var(--background))` or `hsl(var(--background) / 0.5)`. That is the
 * shadcn convention every component already uses, and the only form that lets
 * a call site add its own alpha.
 *
 * THE DARK THEME IS TODAY'S `:root`, MOVED AND NOT REDESIGNED (B1). Every
 * value below that existed before B1 is byte for byte what `index.css`
 * declared, and `scripts/verify-theme-colors-unchanged.mjs` proves the
 * computed colour of every element on ten pages is unchanged. The light theme
 * arrives in B2.
 *
 * Board palettes are NOT here. They are domain data in `config/boardThemes.ts`
 * and the board keeps its own theme in both app themes.
 */

/** HSL channels, `'<h> <s>% <l>%'`. */
export type Hsl = string;

/**
 * Every role, in the order it is emitted. A role used as a background has a
 * `-foreground` partner; the guard in B6 checks the contrast of each pair.
 */
export const COLOR_ROLES = [
  'background', 'foreground',
  'surface', 'surface-foreground',
  'surface-elevated', 'surface-elevated-foreground',
  'card', 'card-foreground',
  'popover', 'popover-foreground',
  'overlay',
  'input',
  'muted', 'muted-foreground',
  'border', 'border-strong', 'border-quiet',
  'primary', 'primary-foreground',
  'secondary', 'secondary-foreground',
  'accent', 'accent-foreground',
  'link',
  'selection',
  'ring',
  'success', 'success-foreground',
  'warning', 'warning-foreground',
  'destructive', 'destructive-foreground',
  'control', 'control-hover', 'control-foreground',
  'inverse-surface', 'inverse-surface-foreground', 'inverse-accent',
  'live', 'live-fill', 'live-fill-foreground', 'event-day',
  'win', 'loss',
  'editorial',
  'cycle-swiss', 'cycle-circuit', 'cycle-rating',
  'move-brilliant', 'move-best', 'move-great', 'move-excellent', 'move-good',
  'move-inaccuracy', 'move-mistake', 'move-blunder', 'move-severe-blunder',
  'board-ink-dark', 'board-ink-dark-muted', 'board-ink-light', 'board-ink-light-muted',
  'eval-white', 'eval-black',
  'medal-gold', 'medal-silver', 'medal-bronze',
  'clock-low', 'clock-low-foreground', 'clock-critical', 'clock-critical-foreground',
  'feature-explain', 'feature-puzzles', 'feature-play', 'feature-challenge',
  'training-tactics', 'training-tactics-border', 'training-tactics-foreground',
  'training-middlegame', 'training-middlegame-border', 'training-middlegame-foreground',
  'training-endgame', 'training-endgame-border', 'training-endgame-foreground',
  'training-review', 'training-review-border', 'training-review-foreground',
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

/**
 * Colours that are not a single role: the card surface's sheen, top highlight
 * and shadow, and the primary button's hover glow. Full CSS values, because
 * each carries its own alpha and the light theme will need different ones (a
 * white sheen on a light card is invisible, a black shadow at 0.5 is a smudge).
 */
export const COLOR_EFFECTS = [
  'surface-card-sheen',
  'surface-card-highlight',
  'surface-card-shadow',
  'surface-card-edge',
  'glow-golden',
  'overlay-alpha',
] as const;

export type ColorEffect = (typeof COLOR_EFFECTS)[number];

export interface ColorTheme {
  roles: Record<ColorRole, Hsl>;
  effects: Record<ColorEffect, string>;
}

/*
  `focus-ring` in the spec is `ring` here: it is the name every shadcn
  component already reads (`ring-ring`), and renaming it is churn with no
  change in meaning.
*/
export const darkTheme: ColorTheme = {
  roles: {
    background: '218 42% 9%',
    foreground: '42 78% 95%',

    /*
      NEW IN B1, and nothing reads them until the B5 sweep. Each takes a value
      already in this palette rather than an invented one, so the dark theme
      gains names, not colours: `surface` is the popover's step, and
      `surface-elevated` the card's. Both are reviewed with the light palette
      on B2's preview page.
    */
    surface: '218 35% 15%',
    'surface-foreground': '42 78% 95%',
    'surface-elevated': '218 30% 18%',
    'surface-elevated-foreground': '42 78% 95%',

    card: '218 30% 18%',
    'card-foreground': '42 78% 95%',

    popover: '218 35% 15%',
    'popover-foreground': '42 78% 95%',

    /* NEW IN B1. The dialog scrim; shadcn's dialogs draw `bg-black/80` today. */
    overlay: '0 0% 0%',

    input: '218 22% 26%',

    muted: '218 30% 20%',
    'muted-foreground': '42 20% 70%',

    border: '218 22% 26%',
    /*
      NEW IN B1. The homepage chooser card's border (`Features.tsx`), the one
      border on the site measured to clear 3:1 against the page (3.92:1).
    */
    'border-strong': '218 18% 48%',
    /*
      NEW IN B5b. The homepage News card's border: deliberately quieter than
      `border-strong` but still clearing 3:1 (3.22 against the card, owner,
      2026-08-02). Its exact hand-written value until B5b.
    */
    'border-quiet': '218 14% 42%',

    /* Dimmed from 42 88% 65% (owner, 2026-08-06: "can we make them a bit less
       bright?"). Saturation and lightness both step down, so it reads calmer
       without shifting hue and becoming a different colour.

       Measured, not guessed: text on the button 9.89:1 and the button against
       the page 9.45:1 — WCAG AA wants 4.5:1, so this is spending contrast we
       had to spare. The dimmest candidate tried still measured 7.93:1, i.e.
       brightness here was never carrying legibility.

       SITE-WIDE. This is the one accent token, so it moves the nav pill and the
       homepage cards too. That is deliberate: a calmer yellow on the trainer
       and the old one everywhere else is exactly the inconsistency this pass
       exists to remove. */
    primary: '42 72% 60%',
    'primary-foreground': '218 40% 12%',

    secondary: '218 30% 20%',
    'secondary-foreground': '42 78% 95%',

    accent: '42 88% 65%',
    'accent-foreground': '218 40% 12%',

    /* NEW IN B1. Links read as the primary today. */
    link: '42 72% 60%',
    /* NEW IN B1. Used with an alpha at the call site, like the primary it is. */
    selection: '42 72% 60%',

    ring: '42 88% 65%',

    /* Puzzle/result semantics (plan B5 / PZ-038). `--destructive` already
       existed; there was no success counterpart at all, which is why the
       puzzle page carried twelve hard-coded green/red literals — there was
       nothing correct to reach for. Values match the Tailwind green-500/600
       and red-500/600 pair the page was already using, so this swap changes
       ownership, not appearance. */
    /*
      BRIGHTENED IN B5d (owner, 2026-10-03), closing the success half of D15.
      It was green-600 with white text: 4.29:1 as text on a card and 3.33:1
      for the white text on it, both below AA. Now green-500 with dark text:
      6.26:1 on a card, 8.0:1 on the page, 7.49:1 for the text on it.
    */
    success: '142 71% 45%',
    'success-foreground': '218 40% 12%',

    /*
      NEW IN B1. Tailwind's amber-500, which is what the raw warning classes
      the B5 sweep replaces mostly use; the foreground is the primary's dark ink.
    */
    warning: '38 92% 50%',
    'warning-foreground': '218 40% 12%',

    /*
      BRIGHTENED IN B5e (owner, 2026-10-03), closing D15. It was red-500 with
      light text: 3.83:1 as text on a card and 3.49:1 for the text on it.
      Now red-400 with dark text, like `--success` in B5d.
    */
    destructive: '0 91% 71%',
    'destructive-foreground': '218 40% 12%',

    /*
      SEGMENTED-CONTROL FACE — the board control bar's buttons.

      Added 2026-08-08 because this palette genuinely had no surface light
      enough to be a control sitting inside a container. `--card` is L18% and
      `--border`, the lightest token there was, is L26%; a bar drawn from either
      read as one dark block with lines scored across it, which is what the
      owner kept seeing.

      Derived from the champion game viewer's bar, which is the reference for
      this control and whose values were MEASURED rather than copied by eye:
      face `#475569` on a `#1e293b` trough, 1.98:1. `--card` (L18%) is already
      that trough almost exactly, so only the face was missing. Expressed in
      this palette's own hue rather than the reference's literal slate, so it
      follows a theme change, which the hardcoded literals of the Lichess
      viewer's stylesheet (deleted in E9) could not.
    */
    control: '218 20% 35%',
    'control-hover': '218 20% 44%',
    'control-foreground': '218 40% 96%',

    /* NEW IN B1. The page's own two colours, swapped: a toast or tooltip that
       must stand out from everything around it. */
    'inverse-surface': '42 78% 95%',
    'inverse-surface-foreground': '218 42% 9%',
    /* NEW IN F1. The accent on an inverse sheet ("What matters now"): the brown
       that sheet always used on cream, until then an inline literal. */
    'inverse-accent': '38 70% 28%',

    /*
      BROADCAST STATE (B5a, B5c), a domain family like the training colours.
      LIVE IS GREEN (owner, 2026-10-03): until B5c it was red in the nav, the
      live game card and the stream button, and green on the tournament
      pages. `live` is the green-400 those pages drew for text, dots and tints;
      `live-fill` the green-600 of their solid badges, with white text.
      `event-day` (a tournament day with nothing live right now) is the
      emerald-400 the nav drew.
    */
    live: '142 69% 58%',
    'live-fill': '142 76% 36%',
    'live-fill-foreground': '218 40% 12%', // B6: white was 3.35:1 on the green; navy 5.13:1
    'event-day': '158 64% 52%',

    /*
      GAME RESULTS (B5b), a domain family. Not `--success` and
      `--destructive`: a loss is not an error, and those two fail AA in dark
      (D15). Dark values are the green-400 and red-400 the game lists drew.
      A draw is `--muted-foreground`.
    */
    win: '142 69% 58%',
    loss: '0 91% 71%',

    /*
      HOMEPAGE CARD IDENTITY (B5b), one hue per destination, like the training
      colours: Explain amber, Puzzles violet, Play emerald, Champion Challenge
      red. Champion Games uses the primary gold and News is neutral. Dark values
      are the -400 shades the icons drew.
    */
    'feature-explain': '43 96% 56%',
    'feature-puzzles': '255 92% 76%',
    'feature-play': '158 64% 52%',
    'feature-challenge': '0 91% 71%',

    /* B5c. The articles' accent (eyebrow labels, bullets, highlighted rows): the red-400 they drew. */
    editorial: '0 91% 71%',

    /*
      B5c. The World Championship cycle page's three qualification routes, as
      left-border accents: Grand Swiss amber-500, FIDE Circuit blue-500,
      rating spot purple-500, their exact values.
    */
    'cycle-swiss': '38 92% 50%',
    'cycle-circuit': '217 91% 60%',
    'cycle-rating': '271 91% 65%',

    /*
      MOVE QUALITY, ONE SCALE (B5d, unified in B5e by the owner). Champion
      Challenge, game analysis and the accuracy grades each had their own;
      "excellent" was emerald in one and blue in another. The -400 shades as
      text and fills; a badge on a fill writes `text-background`. "Good" is
      neutral, as an unremarkable move should be.
    */
    'move-brilliant': '188 86% 53%',
    'move-best': '142 69% 58%',
    'move-great': '142 69% 58%',
    'move-excellent': '158 64% 52%',
    'move-good': '42 20% 70%',
    'move-inaccuracy': '43 96% 56%',
    'move-mistake': '27 96% 61%',
    'move-blunder': '0 91% 71%',
    // B6: a darker red cannot pass on a dark page (red-600 was 3.0:1 on a card);
    // a pink-red stays distinct from `move-blunder` and reads at 5.15:1.
    'move-severe-blunder': '350 89% 70%',

    /*
      INK ON THE BOARD (B5e): text drawn on the board's own square colours
      (the engine evaluation chip) and the white/black side dots. The board
      keeps its colours in both app themes, so these are THE SAME in both.
    */
    'board-ink-dark': '222 47% 11%',
    'board-ink-dark-muted': '215 25% 27%',
    'board-ink-light': '0 0% 100%',
    'board-ink-light-muted': '216 12% 84%',

    /*
      B6. The evaluation rail's two halves are the two SIDES, not page colours:
      White's share used `foreground`, which in light is navy, so it would have
      drawn as a dark bar. Dark values are exactly what the rail drew (the cream
      foreground and #05070c, "a hair darker than the card").
    */
    'eval-white': '42 78% 95%',
    'eval-black': '223 41% 3.3%',

    /* B5d. Leaderboard trophies, exact: yellow-500, gray-400, amber-700. */
    'medal-gold': '45 93% 47%',
    'medal-silver': '218 11% 65%',
    'medal-bronze': '28 75% 50%', // B6: amber-700 was 2.85:1 on a card; 4.73:1

    /* B5d. The chess clock running low (orange-500) and critical (red-600), white digits. */
    'clock-low': '25 95% 53%',
    'clock-low-foreground': '218 40% 12%', // B6: white was 2.78:1 on the orange; navy 6.18:1
    'clock-critical': '0 72% 51%',
    'clock-critical-foreground': '0 0% 100%',

    /* Training-area identity. Colour names WHAT the session trains; it never
       names completion or action state. Gold is deliberately absent because
       --primary and .surface-card-promoted already reserve it for action and
       plan prominence. Each family has a quiet fill, a stronger edge, and a
       foreground so calendar blocks do not invent one-off Tailwind colours. */
    'training-tactics': '270 34% 24%',
    'training-tactics-border': '270 58% 61%',
    'training-tactics-foreground': '270 78% 91%',
    'training-middlegame': '210 37% 23%',
    'training-middlegame-border': '210 66% 58%',
    'training-middlegame-foreground': '210 82% 91%',
    'training-endgame': '174 35% 21%',
    'training-endgame-border': '174 55% 48%',
    'training-endgame-foreground': '174 68% 89%',
    'training-review': '218 24% 24%',
    'training-review-border': '42 22% 55%',
    'training-review-foreground': '42 42% 90%',
  },
  effects: {
    /* `.surface-card` (index.css): lit from above, a soft shadow beneath. */
    'surface-card-sheen': 'rgb(255 255 255 / 0.05)',
    'surface-card-highlight': 'rgb(255 255 255 / 0.06)',
    'surface-card-shadow': 'rgb(0 0 0 / 0.5)',
    /* No edge in dark: the page and the card differ by 1.30:1 and the shadow does the rest. */
    'surface-card-edge': 'rgb(0 0 0 / 0)',
    /* The primary button's hover (`ui/button.tsx`). */
    'glow-golden': '0 0 40px hsl(42 88% 65% / 0.3)',
    /* How opaque the dialog scrim is: the `bg-black/80` every dialog drew. */
    'overlay-alpha': '0.8',
  },
};

/*
  THE LIGHT THEME (B2). New design work, not a migration, judged by the owner
  on `/dev/theme-preview` at 1:1. Not selectable by visitors until F3: until
  the B5 sweep is finished, a light page would show dark fragments.

  The same two hues as the dark theme, so the site stays one brand: navy (218)
  as ink, gold (42) as the one accent. The page is a warm off-white rather than
  pure white, which is what keeps a board's own colours from looking pasted on.

  GOLD CANNOT BE BOTH A FILL AND TEXT HERE. On the dark page `--primary` is a
  filled button and also gold text (the outline and link button variants), and
  it reads as both. On a light page gold text needs to fall to brown before it
  clears 4.5:1, so `--primary` stays the fill and `--link` is the darker amber
  for gold-looking text. The button variants that write `text-link` move to
  `--link` in the B5a sweep; until then the preview shows their real ratio.
*/
export const lightTheme: ColorTheme = {
  roles: {
    /*
      THE PAGE IS A STEP DARKER THAN B2 CHOSE (owner, F1, 2026-10-12: "the
      contrast is a bit weak"). Measured on the owner's screenshot of /puzzles:
      page (249,248,246) against white cards, 1.04:1, so the cards did not read
      as surfaces at all. 93% is the palette's own `surface` step (unused), about
      1.15:1 against a card, near dark's 1.30:1; the cards also gain an edge.
    */
    background: '40 16% 93%',
    foreground: '218 40% 12%',

    surface: '40 16% 93%',
    'surface-foreground': '218 40% 12%',
    'surface-elevated': '0 0% 100%',
    'surface-elevated-foreground': '218 40% 12%',

    card: '0 0% 100%',
    'card-foreground': '218 40% 12%',

    popover: '0 0% 100%',
    'popover-foreground': '218 40% 12%',

    /* The scrim is navy, not black: black over a warm page reads as dirt. */
    overlay: '218 40% 12%',

    input: '218 14% 78%',

    muted: '40 14% 91%',
    /*
      21%, NOT 36% (owner, F1, 2026-10-12: "the text contrast was weak"). 36% is
      7.06:1 at its darkest pixel, but a thin regular stroke anti-aliases toward
      the white, and the stroke as read measured 3.3:1 on the owner's screenshot,
      against 4.55:1 for the same text in dark (light ink on a dark card reads
      bolder). 21% brought the light stroke to 4.5-4.6:1, dark's own (12.5:1 at
      its darkest); the owner judged it "still a bit too light", so 17%, still a
      step under `foreground` (12%).
    */
    'muted-foreground': '218 14% 17%',

    border: '218 14% 86%',
    /* 56/57 until F1 darkened the page to 93%; 54/55 keep both over 3:1 on it. */
    'border-strong': '218 10% 54%',
    'border-quiet': '218 10% 55%',

    primary: '40 82% 52%',
    'primary-foreground': '218 40% 12%',

    secondary: '218 22% 92%',
    'secondary-foreground': '218 40% 12%',

    accent: '42 88% 60%',
    'accent-foreground': '218 40% 12%',

    link: '34 85% 30%',
    selection: '42 88% 60%',

    /* 42% until F1 darkened the page: 2.85:1 on it; 40% is 3.12. */
    ring: '36 85% 40%',

    success: '142 72% 26%',
    'success-foreground': '0 0% 100%',

    /*
      Not dark's amber-500. As a fill with navy text it was fine, but as text
      on a white card it measured 2.13:1: the same fill-versus-text problem as
      gold. A deeper amber with white text works as both (above 4.5:1 as a
      fill, on a card, on the page and on the muted fill).
    */
    warning: '28 88% 33%',
    'warning-foreground': '0 0% 100%',

    destructive: '0 72% 44%',
    'destructive-foreground': '0 0% 100%',

    control: '218 16% 89%',
    'control-hover': '218 16% 82%',
    'control-foreground': '218 40% 14%',

    'inverse-surface': '218 40% 12%',
    'inverse-surface-foreground': '42 78% 95%',
    /* The sheet is navy here, so its accent is the gold that reads on navy (the
       brown measured 2.57:1, F1). */
    'inverse-accent': '42 88% 65%',

    live: '142 72% 26%',
    'live-fill': '142 72% 26%',
    'live-fill-foreground': '0 0% 100%',
    'event-day': '161 94% 24%',

    win: '142 72% 26%',
    loss: '0 72% 42%',

    'feature-explain': '26 90% 37%',
    'feature-puzzles': '262 83% 58%',
    'feature-play': '163 94% 24%',
    'feature-challenge': '0 72% 51%',

    editorial: '0 72% 42%',

    'cycle-swiss': '32 95% 40%',
    'cycle-circuit': '217 91% 45%',
    'cycle-rating': '271 70% 50%',

    'move-brilliant': '192 91% 27%',
    'move-best': '142 72% 26%',
    'move-great': '142 72% 26%',
    'move-excellent': '163 94% 24%',
    'move-good': '218 14% 36%',
    'move-inaccuracy': '26 90% 33%',
    'move-mistake': '17 88% 36%',
    'move-blunder': '0 74% 42%',
    'move-severe-blunder': '0 70% 35%',

    'board-ink-dark': '222 47% 11%',
    'board-ink-dark-muted': '215 25% 27%',
    'board-ink-light': '0 0% 100%',
    'board-ink-light-muted': '216 12% 84%',

    'eval-white': '0 0% 100%',
    'eval-black': '223 41% 3.3%',

    'medal-gold': '41 96% 33%',
    'medal-silver': '220 9% 46%',
    'medal-bronze': '26 90% 37%',

    'clock-low': '20 90% 40%',
    'clock-low-foreground': '0 0% 100%',
    'clock-critical': '0 72% 51%',
    'clock-critical-foreground': '0 0% 100%',

    /* Same three-part rule as dark: a quiet fill, a stronger edge, and ink. */
    'training-tactics': '270 60% 95%',
    'training-tactics-border': '270 40% 62%',
    'training-tactics-foreground': '270 45% 28%',
    'training-middlegame': '210 70% 95%',
    'training-middlegame-border': '210 55% 56%',
    'training-middlegame-foreground': '210 60% 24%',
    'training-endgame': '174 45% 92%',
    'training-endgame-border': '174 45% 40%',
    'training-endgame-foreground': '174 60% 18%',
    'training-review': '40 35% 92%',
    'training-review-border': '40 30% 50%',
    'training-review-foreground': '36 45% 22%',
  },
  effects: {
    /*
      A white sheen on a white card is invisible, so the light card is lifted
      by its shadow alone: a top highlight that only shows on the off-white
      surface steps, and a short, faint navy shadow instead of a black one.
    */
    'surface-card-sheen': 'rgb(255 255 255 / 0)',
    'surface-card-highlight': 'rgb(255 255 255 / 0.9)',
    'surface-card-shadow': 'rgb(16 26 46 / 0.12)',
    /* A 1px edge, an inset ring in the shadow so no card changes size and no
       clipping lane cuts it away: the `border` role's colour (218 14% 86%). */
    'surface-card-edge': 'rgb(212 217 223)',
    'glow-golden': '0 0 24px hsl(40 82% 52% / 0.35)',
    /* A navy scrim at 0.8 over a light page reads as a blackout; half is enough. */
    'overlay-alpha': '0.5',
  },
};

/** A theme as custom properties: `--<role>` and `--<effect>`. */
export function colorCustomProperties(theme: ColorTheme = darkTheme): Record<string, string> {
  const out: Record<string, string> = {};
  for (const role of COLOR_ROLES) out[`--${role}`] = theme.roles[role];
  for (const effect of COLOR_EFFECTS) out[`--${effect}`] = theme.effects[effect];
  return out;
}

const ref = (role: ColorRole) => `hsl(var(--${role}))`;

/**
 * The Tailwind colour map, built from the same role names. A role with a
 * `-foreground` partner becomes `{ DEFAULT, foreground }`, so `bg-card` and
 * `text-card-foreground` work as they always have. Training colours are
 * reached through the `training-area-*` classes in `index.css` and are not
 * utilities.
 */
export function tailwindColors() {
  return {
    background: ref('background'),
    foreground: ref('foreground'),
    surface: {
      DEFAULT: ref('surface'),
      foreground: ref('surface-foreground'),
      elevated: ref('surface-elevated'),
      'elevated-foreground': ref('surface-elevated-foreground'),
    },
    card: { DEFAULT: ref('card'), foreground: ref('card-foreground') },
    popover: { DEFAULT: ref('popover'), foreground: ref('popover-foreground') },
    /* The alpha is the theme's, so the class is `bg-overlay` with no modifier. */
    overlay: 'hsl(var(--overlay) / var(--overlay-alpha))',
    input: ref('input'),
    muted: { DEFAULT: ref('muted'), foreground: ref('muted-foreground') },
    border: { DEFAULT: ref('border'), strong: ref('border-strong'), quiet: ref('border-quiet') },
    primary: { DEFAULT: ref('primary'), foreground: ref('primary-foreground') },
    secondary: { DEFAULT: ref('secondary'), foreground: ref('secondary-foreground') },
    accent: { DEFAULT: ref('accent'), foreground: ref('accent-foreground') },
    link: ref('link'),
    selection: ref('selection'),
    ring: ref('ring'),
    success: { DEFAULT: ref('success'), foreground: ref('success-foreground') },
    warning: { DEFAULT: ref('warning'), foreground: ref('warning-foreground') },
    destructive: { DEFAULT: ref('destructive'), foreground: ref('destructive-foreground') },
    /*
      The face of a segmented control sitting inside a trough — the board
      control bar today. This palette had no surface this light: `--card` is
      L18% and `--border`, the lightest token, is L26%, so a control drawn
      from either disappeared into its own container. Measured against the
      champion viewer's bar, which separates face from trough by 1.98:1.
    */
    control: {
      DEFAULT: ref('control'),
      foreground: ref('control-foreground'),
      hover: ref('control-hover'),
    },
    inverse: { DEFAULT: ref('inverse-surface'), foreground: ref('inverse-surface-foreground'), accent: ref('inverse-accent') },
    live: { DEFAULT: ref('live'), fill: ref('live-fill'), 'fill-foreground': ref('live-fill-foreground') },
    'event-day': ref('event-day'),
    editorial: ref('editorial'),
    cycle: { swiss: ref('cycle-swiss'), circuit: ref('cycle-circuit'), rating: ref('cycle-rating') },
    move: {
      brilliant: ref('move-brilliant'), best: ref('move-best'), great: ref('move-great'),
      excellent: ref('move-excellent'), good: ref('move-good'), inaccuracy: ref('move-inaccuracy'),
      mistake: ref('move-mistake'), blunder: ref('move-blunder'), 'severe-blunder': ref('move-severe-blunder'),
    },
    eval: { white: ref('eval-white'), black: ref('eval-black') },
    'board-ink': {
      dark: ref('board-ink-dark'), 'dark-muted': ref('board-ink-dark-muted'),
      light: ref('board-ink-light'), 'light-muted': ref('board-ink-light-muted'),
    },
    medal: { gold: ref('medal-gold'), silver: ref('medal-silver'), bronze: ref('medal-bronze') },
    clock: {
      low: ref('clock-low'), 'low-foreground': ref('clock-low-foreground'),
      critical: ref('clock-critical'), 'critical-foreground': ref('clock-critical-foreground'),
    },
    win: ref('win'),
    loss: ref('loss'),
    feature: {
      explain: ref('feature-explain'),
      puzzles: ref('feature-puzzles'),
      play: ref('feature-play'),
      challenge: ref('feature-challenge'),
    },
  };
}
