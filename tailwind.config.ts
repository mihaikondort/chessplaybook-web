import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import { layoutCustomProperties, navCustomProperties, navTokens, workspaceTheme } from "./src/design/tokens/layout.tokens";
import { colorCustomProperties, darkTheme, lightTheme, tailwindColors } from "./src/design/tokens/color.tokens";

export default {
  /*
    `dark:` keys on the resolved theme (layout redesign B3), not on a `.dark`
    class nothing sets. No component should write `dark:`: a colour that
    differs by theme is a token, and the B6 guard holds that.
  */
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /*
        The Workspace mode thresholds (LAYOUT_SPEC.md §6), computed from the
        layout token source. CSS reads them with `theme('workspace.*')`, which
        Tailwind resolves inside at-rule params, including `@container`. That
        is the only way a container query can use a token: custom properties
        are not allowed in a query condition.
      */
      workspace: workspaceTheme(),
      screens: {
        // 360px is the floor for mainstream Android; below it (320px, older
        // and budget devices) the homepage card grid needs smaller type to
        // keep all six cards in the first viewport. Tailwind ships no `xs`,
        // and an undefined prefix is silently ignored rather than erroring.
        xs: '360px',
        /*
          `cols`, `colsmd` and `colsxl` WERE THE PRE-WORKSPACE LAYOUT SWITCH
          (orientation plus 760, 900 and 1280px), deleted in layout redesign F2
          (2026-10-12): the Workspace decides columns with a container query on
          its own size (LAYOUT_SPEC §6, `theme('workspace.*')` above).
        */
        /*
          THE NAV ROW HAS ITS OWN THRESHOLD, AND IT IS NOT `cols` (#55, 2026-08-23).

          `cols` answers "is there room BESIDE the board" and 760 is arithmetic:
          two panels, the gaps and a board at its floor. The nav row asks a
          different question - can nine labels, the brand and the account slot
          share one line - and its answer is 800.

          Measured at the 10.5px floor: 800x600 leaves 3.3px between items and
          760x600 leaves exactly 0, with the row full and nothing left for
          `space-between` to distribute. The type cannot go lower; 10.5 is the
          size the owner chose looking at real pages at that resolution.

          So below 800 in landscape the row becomes the menu button, while the
          workspace pages keep their three columns from 760. Two constraints,
          two numbers - sharing one was what put the row at zero.
        */
        /*
          840 SINCE F3 (owner, 2026-10-12). The site theme button joined the row,
          and at 800 it left 0px between items; 840 gives 2.8px, a little more
          than the row had at 800 before. Below 840 the menu is behind the
          hamburger, with the theme choice inside it.
        */
        navrow: { raw: '(orientation: landscape) and (min-width: 840px)' },
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      /*
        The colour map is built from the colour token source, so a utility
        class and the custom property it reads come from one list of names
        (layout redesign B1).
      */
      colors: tailwindColors(),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 20px hsl(42 88% 65% / 0.3))" },
          "50%": { filter: "drop-shadow(0 0 40px hsl(42 88% 65% / 0.5))" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(5deg)" },
        },
        "float-medium": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(-3deg)" },
        },
        "float-fast": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.3" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "ping-slower": {
          "0%": { transform: "scale(1)", opacity: "0.2" },
          "100%": { transform: "scale(2)", opacity: "0" },
        },
        "explain-progress": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        // Homepage chooser cards. Short and small on purpose, and applied to
        // all six SIMULTANEOUSLY — no per-card delay.
        //
        // Fill mode is `backwards`, NOT `both`. With `both` the animation's
        // final keyframe keeps applying after it ends, and a running animation
        // beats ordinary declarations — so `transform: translateY(0)` won and
        // the card's hover lift and press states silently did nothing. Caught
        // by measuring hover/press, not by reading the CSS. A staggered entrance in
        // grid order would draw the eye left-to-right/top-to-bottom, which is
        // exactly the position bias the `position` param on home_choice_click
        // exists to measure. Distinct from `fade-in` (20px over 0.6s), which is
        // far too large and slow for a compact fixed-height grid.
        "card-enter": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "glow": "glow 3s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "float-medium": "float-medium 6s ease-in-out infinite",
        "float-fast": "float-fast 4s ease-in-out infinite",
        "ping-slow": "ping-slow 3s ease-out infinite",
        "ping-slower": "ping-slower 4s ease-out infinite",
        "explain-progress": "explain-progress 1.2s ease-in-out infinite",
        "card-enter": "card-enter 220ms cubic-bezier(0.2,0,0,1) backwards",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    /*
      The layout constants as `:root` custom properties, from the same token
      source. Absolute values only: the fluid lengths are composed with
      container units on the Workspace canvas, where those units mean the
      workspace.

      And the colour roles. Dark is the default on `:root`, as it has always
      been, and also answers `[data-theme="dark"]`; light answers only
      `[data-theme="light"]` (B2). Nothing sets the attribute until B3, so
      visitors see dark; the B2 preview page sets it on each half of the page.
    */
    plugin(({ addBase }) => {
      addBase({ ":root": layoutCustomProperties() });
      // The nav row's height (C1b): stacked by default, the curve in landscape.
      addBase({ ":root": navCustomProperties().root });
      addBase({ [`@media ${navTokens.landscapeQuery}`]: { ":root": navCustomProperties().landscape } });
      addBase({ ':root, [data-theme="dark"]': colorCustomProperties(darkTheme) });
      addBase({ '[data-theme="light"]': colorCustomProperties(lightTheme) });
    }),
  ],
} satisfies Config;
