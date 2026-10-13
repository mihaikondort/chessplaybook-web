import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
  THE DELETED MECHANISMS STAY DELETED (layout redesign F4, 2026-10-12).

  Phases C-F replaced every page's own geometry with the Workspace and one board
  component, and F2 deleted what they replaced. Each of these can come back by
  copying an old file or an old answer, and none of them fails a build:

  - a `cols:` / `colsmd:` / `colsxl:` class. The screens are gone, and Tailwind
    IGNORES an unknown prefix silently, so the class would simply do nothing;
  - a window-width layout gate (`window.innerWidth`, `matchMedia(` on a width,
    `useIsMobile`), the JS answer to a question the Workspace answers in CSS from
    its own size. The ones that remain are allowed BY NAME with their reason,
    and an allowance whose file no longer needs it fails, so the list only shrinks;
  - a second chess board: only `ChessBoard` may create a chessground board, and
    the Lichess viewer package is gone (E9);
  - the deleted modules and custom properties (F2).

  Every rule is also shown catching a sample, so none of them can pass vacuously.
*/

const strip = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));

const walk = (dir: string, ext = /\.(tsx|ts)$/): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) return walk(full, ext);
    return ext.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });

const files = walk('src');
const cssFiles = walk('src', /\.css$/);
const code = (f: string) => strip(readFileSync(f, 'utf8'));

const COLS_CLASS = /(?<![\w-])cols(?:md|xl)?:[\w[!-]/;
const WIDTH_GATE = /window\.innerWidth|matchMedia\(|\buseIsMobile\b/;
const CHESSGROUND_RUNTIME = /^import\s+(?!type\b)[^;]*from\s+['"]@lichess-org\/chessground['"]/m;
const PGN_VIEWER = /@lichess-org\/pgn-viewer/;

/* The width gates that remain, each with why. Not a list to add to. */
const WIDTH_GATES_ALLOWED: Record<string, string> = {
  'src/hooks/use-mobile.tsx': 'the hook itself',
  'src/components/workspace/useAnchoredPopover.ts': 'keeps a popover inside the window; positioning, not layout',
  'src/design/theme/ThemeProvider.tsx': 'prefers-color-scheme, not a width',
  'src/design/theme/themePrePaint.ts': 'prefers-color-scheme, not a width',
  'src/components/analysis/useEngineAnalysis.ts': 'one engine line on a narrow window (pre-Workspace, the engine card)',
  'src/pages/GameList.tsx': 'a Document list: table or cards',
  'src/pages/Explain.tsx': 'a Document page: its mobile arrangement',
  'src/components/game-viewer/ArticleGameViewer.tsx': 'mounts ONE engine panel, beside or below the board (E7)',
};

const DELETED_FILES = [
  'src/app/layoutMode.ts', 'src/app/useNavTotal.ts', 'src/app/AppLayout.tsx',
  'src/components/chess/useBoardSize.ts', 'src/components/chess/useAvailableHeight.ts',
  'src/components/chess/WorkspaceLayout.tsx', 'src/config/boardConfig.ts',
  'src/components/ChessBoardViewer.tsx', 'src/components/LichessPgnViewer.tsx',
  'src/components/GameReviewLayout.tsx', 'src/components/game-analysis/GameAnalysisWrapper.tsx',
  'src/components/analysis/ClassicEvalBar.tsx', 'src/components/LiveChessBoard.tsx',
];
const DELETED_NAMES = /\b(?:useNavTotal|layoutMode|useBoardSize|useAvailableHeight|WorkspaceLayout|ChessBoardViewer|LichessPgnViewer|GameReviewLayout|ClassicEvalBar|computeBoardSize)\b/;
const DELETED_PROPERTIES = /--nav-total\b|--shell-content-h\b/;

describe('the rules catch what they name', () => {
  it.each([
    ['cols:', COLS_CLASS, 'className="mt-1 cols:mt-2"'],
    ['colsxl:', COLS_CLASS, 'className="colsxl:w-60"'],
    ['innerWidth gate', WIDTH_GATE, 'const narrow = window.innerWidth < 1024;'],
    ['useIsMobile', WIDTH_GATE, 'const isMobile = useIsMobile(1024);'],
    ['a second board', CHESSGROUND_RUNTIME, "import { Chessground } from '@lichess-org/chessground';"],
    ['the viewer package', PGN_VIEWER, "import LichessPgnViewer from '@lichess-org/pgn-viewer';"],
    ['a deleted module', DELETED_NAMES, "import { useNavTotal } from '@/app/useNavTotal';"],
    ['a deleted property', DELETED_PROPERTIES, 'height: calc(100svh - var(--nav-total));'],
  ])('%s', (_name, re, sample) => {
    expect(re.test(sample)).toBe(true);
  });
  it('and leaves alone what they do not name', () => {
    expect(COLS_CLASS.test('className="grid-cols-2 navrow:flex"')).toBe(false);
    expect(CHESSGROUND_RUNTIME.test("import type { Key } from '@lichess-org/chessground/types';")).toBe(false);
  });
});

describe('the deleted mechanisms stay deleted', () => {
  it('looked at the tree', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no cols/colsmd/colsxl class (Tailwind would ignore it silently)', () => {
    const offenders = [...files, ...cssFiles].flatMap((f) =>
      code(f).split('\n').flatMap((l, i) => (COLS_CLASS.test(l) ? [`${f}:${i + 1}  ${l.trim().slice(0, 100)}`] : [])));
    expect(offenders).toEqual([]);
  });

  it('no new window-width layout gate', () => {
    const offenders = files.filter((f) => !(f in WIDTH_GATES_ALLOWED) && WIDTH_GATE.test(code(f)));
    expect(offenders, 'size from the Workspace or CSS instead; see the comment above').toEqual([]);
  });

  it('every allowed width gate is still there (the list only shrinks)', () => {
    for (const f of Object.keys(WIDTH_GATES_ALLOWED)) {
      expect(existsSync(f) && WIDTH_GATE.test(code(f)), `${f} no longer has a width gate: remove its allowance`).toBe(true);
    }
  });

  it('only ChessBoard creates a chessground board, and the Lichess viewer is gone', () => {
    const boards = files.filter((f) => CHESSGROUND_RUNTIME.test(code(f)));
    expect(boards).toEqual(['src/components/chess/ChessBoard.tsx']);
    expect(files.filter((f) => PGN_VIEWER.test(code(f)))).toEqual([]);
    expect(PGN_VIEWER.test(readFileSync('package.json', 'utf8'))).toBe(false);
  });

  it('the deleted modules are not back', () => {
    for (const f of DELETED_FILES) expect(existsSync(f), `${f} is back`).toBe(false);
    const offenders = files.filter((f) => DELETED_NAMES.test(code(f)));
    expect(offenders).toEqual([]);
  });

  it('the deleted custom properties are not read or set', () => {
    const offenders = [...files, ...cssFiles].filter((f) => DELETED_PROPERTIES.test(code(f)));
    expect(offenders).toEqual([]);
  });
});
