/**
 * Chess Board Color Themes
 *
 * Collection of popular chess board color schemes that users can choose from.
 * Each theme includes light/dark square colors and highlight colors.
 */

export interface BoardTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    lightSquare: string;
    darkSquare: string;
    lastMove: string;      // rgba format for transparency
    selected: string;       // rgba format for transparency
  };
}

export const boardThemes: BoardTheme[] = [
  {
    id: 'classic-brown',
    name: 'Classic Brown',
    description: 'Traditional tournament colors',
    colors: {
      lightSquare: '#f0d9b5',
      darkSquare: '#b58863',
      lastMove: 'rgba(155, 199, 0, 0.41)',
      selected: 'rgba(20, 85, 166, 0.5)',
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    description: 'Cool blue tones',
    colors: {
      lightSquare: '#dee3e6',
      darkSquare: '#8ca2ad',
      lastMove: 'rgba(155, 199, 240, 0.5)',
      selected: 'rgba(20, 85, 166, 0.6)',
    },
  },
  {
    id: 'green',
    name: 'Green Tournament',
    description: 'Fresh green chess board',
    colors: {
      lightSquare: '#ffffdd',
      darkSquare: '#86a666',
      lastMove: 'rgba(155, 199, 0, 0.5)',
      selected: 'rgba(20, 85, 166, 0.5)',
    },
  },
  {
    id: 'gray',
    name: 'Modern Gray',
    description: 'Sleek monochrome style',
    colors: {
      lightSquare: '#e8e8e8',
      darkSquare: '#7d7d7d',
      lastMove: 'rgba(100, 150, 200, 0.5)',
      selected: 'rgba(100, 100, 255, 0.5)',
    },
  },
  {
    id: 'purple',
    name: 'Purple Night',
    description: 'Elegant purple theme',
    colors: {
      lightSquare: '#b8b4d0',
      darkSquare: '#6b5d9e',
      lastMove: 'rgba(180, 150, 255, 0.5)',
      selected: 'rgba(150, 100, 255, 0.5)',
    },
  },
  {
    id: 'wooden',
    name: 'Wooden',
    description: 'Warm wood tones',
    colors: {
      lightSquare: '#f4d4a0',
      darkSquare: '#c5915b',
      lastMove: 'rgba(155, 199, 0, 0.41)',
      selected: 'rgba(20, 85, 166, 0.5)',
    },
  },
];

export const defaultTheme = boardThemes[1]; // Blue

/**
 * Where the chosen board theme is kept. Read by `useBoardTheme` and by the
 * pre-paint script generated into `index.html` (`src/design/boardThemePrePaint.ts`),
 * so the two cannot disagree on the key.
 */
export const BOARD_THEME_STORAGE_KEY = 'chessplaybook_board_theme';

/**
 * The key an older version of the site wrote. Nothing writes it now;
 * `useBoardTheme` migrates it once and deletes it, and sign-out clears it.
 */
export const LEGACY_BOARD_THEME_STORAGE_KEY = 'boardTheme';

/**
 * THE COORDINATES' INK (owner, 2026-10-08, plan defect D26).
 *
 * The board's a-h / 1-8 labels were white at 70% under chessground's own 80%
 * opacity, about 56% white on the square: 1.0-1.5:1 on light squares and
 * 1.8-3.0:1 on dark ones, on every board on the site, far under WCAG AA's 4.5.
 *
 * Each label sits on a known square, so it takes whichever of black or white
 * contrasts more with THAT square's colour. Derived, not listed per theme, so a
 * theme added later gets it too, and `boardThemes.test.ts` holds every theme
 * to 4.5:1 on both squares. Pure black, not the navy `board-ink-dark` role: on
 * the gray theme's dark square navy reaches 4.34:1 and black 5.1.
 */
export const COORDINATE_INKS = { dark: '#000000', light: '#ffffff' } as const;

function relativeLuminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio of two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The ink a coordinate takes on a square of this colour. */
export function coordinateInk(square: string): string {
  return contrastRatio(COORDINATE_INKS.dark, square) >= contrastRatio(COORDINATE_INKS.light, square)
    ? COORDINATE_INKS.dark
    : COORDINATE_INKS.light;
}

export function getBoardTheme(themeId: string): BoardTheme {
  return boardThemes.find(theme => theme.id === themeId) || defaultTheme;
}
