import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SiteShell } from './SiteShell';
import { DocumentLayout } from './DocumentLayout';
import { FocusedLayout } from './FocusedLayout';
import { WorkspaceKindLayout } from './WorkspaceKindLayout';

vi.mock('@/components/Navigation', () => ({
  Navigation: () => <nav data-testid="site-nav" />,
}));
vi.mock('@/components/Footer', () => ({
  Footer: () => <footer data-testid="site-footer" />,
}));

function ContentPage() {
  return (
    <div>
      <span>content page</span>
      <Link to="/other">other content</Link>
      <Link to="/app">app page</Link>
    </div>
  );
}
function OtherContentPage() {
  return <span>other content page</span>;
}
function AppPage() {
  return (
    <div>
      <span>app page</span>
      <Link to="/">back to content</Link>
    </div>
  );
}

function renderApp(initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<SiteShell />}>
          <Route element={<DocumentLayout />}>
            <Route path="/" element={<ContentPage />} />
            <Route path="/other" element={<OtherContentPage />} />
          </Route>
          <Route element={<WorkspaceKindLayout />}>
            <Route path="/app" element={<AppPage />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const click = (label: string) =>
  act(() => { screen.getByText(label).click(); });

describe('the footer belongs to the page KIND, not to the page (#72)', () => {
  it('a content route renders exactly one footer', () => {
    renderApp('/');
    expect(screen.getAllByTestId('site-footer')).toHaveLength(1);
  });

  it('an app route renders none', () => {
    renderApp('/app');
    expect(screen.queryByTestId('site-footer')).toBeNull();
  });

  /*
    THE NODE, NOT ITS PRESENCE. A test that only asserts "a footer is on the
    page" passes just as happily against the arrangement being replaced, where
    every route rendered its own - which is precisely why #55's own guarantee
    needed this form. Stamping the node and finding the SAME element after a
    navigation is what distinguishes one hoisted footer from 32 identical ones.
  */
  it('is the SAME element across a content-to-content navigation', () => {
    renderApp('/');
    const first = screen.getByTestId('site-footer');
    (first as HTMLElement).dataset.stamp = 'original';

    click('other content');
    expect(screen.getByText('other content page')).toBeTruthy();

    const after = screen.getByTestId('site-footer');
    expect(after).toBe(first);
    expect((after as HTMLElement).dataset.stamp).toBe('original');
  });

  /*
    AND THE CHROME SURVIVES A CONTENT-TO-APP NAVIGATION, which is the failure
    the obvious implementation would have introduced. Two SIBLING shells - one
    with a footer, one without - are two route branches, so crossing between
    them unmounts one and mounts the other and the nav is a new DOM node again:
    #55's defect, reintroduced by the fix for #72. Nesting both layouts inside
    the single shell is what prevents it, and this is what says so.
  */
  it('keeps the same nav node when crossing between the two kinds', () => {
    renderApp('/');
    const nav = screen.getByTestId('site-nav');
    (nav as HTMLElement).dataset.stamp = 'original';

    click('app page');
    expect(screen.getByText('app page')).toBeTruthy();
    expect(screen.queryByTestId('site-footer')).toBeNull();

    const navAfter = screen.getByTestId('site-nav');
    expect(navAfter).toBe(nav);
    expect((navAfter as HTMLElement).dataset.stamp).toBe('original');

    click('back to content');
    expect(screen.getByTestId('site-nav')).toBe(nav);
    expect(screen.getAllByTestId('site-footer')).toHaveLength(1);
  });
});

describe('each page-kind layout stamps its kind on the page region', () => {
  const cases = [
    ['document', DocumentLayout],
    ['focused', FocusedLayout],
    ['workspace', WorkspaceKindLayout],
  ] as const;

  for (const [kind, Layout] of cases) {
    it(`${Layout.name} -> data-kind="${kind}", one region, holding the page`, () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/x']}>
          <Routes>
            <Route element={<SiteShell />}>
              <Route element={<Layout />}>
                <Route path="/x" element={<span>the page</span>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      const regions = container.querySelectorAll('[data-kind]');
      expect(regions).toHaveLength(1);
      expect(regions[0].getAttribute('data-kind')).toBe(kind);
      expect(regions[0].textContent).toContain('the page');
      /*
        STILL A FLEX COLUMN. The footer's `mt-auto` and the fitted pages'
        height chain both rely on the page's parent being one; a plain block
        here would break both without failing anything else.
      */
      expect(regions[0].className).toBe('flex flex-1 flex-col');
      // Only the Document carries the footer.
      expect(container.querySelectorAll('[data-testid="site-footer"]')).toHaveLength(kind === 'document' ? 1 : 0);
    });
  }
});

/*
  THE DOM CONTRACT (spec §1, added in C1a): the shell has exactly two element
  children, the nav and the page region, and the element carrying `data-kind`
  is the shell's DIRECT child. The Workspace lock is `:has(> [data-kind])`
  and sees nothing deeper, so a wrapper in between would silently unlock it.
*/
describe('the page region is a direct child of the shell', () => {
  for (const Layout of [DocumentLayout, FocusedLayout, WorkspaceKindLayout]) {
    it(`${Layout.name}`, () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/x']}>
          <Routes>
            <Route element={<SiteShell />}>
              <Route element={<Layout />}>
                <Route path="/x" element={<span>the page</span>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>,
      );
      const shell = container.querySelector('[data-shell]')!;
      expect(shell).not.toBeNull();
      expect([...shell.children].map((c) => c.tagName.toLowerCase() + (c.hasAttribute('data-kind') ? '[data-kind]' : '')))
        .toEqual(['nav', 'div[data-kind]']);
    });
  }
});

describe('the real route table', () => {
  const source = readFileSync('src/app/routes.tsx', 'utf8');

  /*
    NO PAGE RENDERS ITS OWN. The sweep removed 35 of them across 32 files; this
    is what stops the 36th being added, and it reads the SOURCE rather than a
    render because the failure is a page component containing the element at
    all, on a route no test happens to visit.
  */
  it('no page component renders a Footer', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = join(dir, e.name);
        if (e.isDirectory()) return walk(full);
        return e.name.endsWith('.tsx') ? [full] : [];
      });

    const files = walk('src');
    // The sweep is only meaningful if it actually looked at the tree.
    expect(files.length).toBeGreaterThan(50);

    /*
      Only the two places the element legitimately appears. Deliberately NOT a
      growing allowlist: when this first ran it flagged `routes.tsx`, whose
      COMMENT mentioned the element - the same false positive a comment produced
      on 2026-08-07 by naming `potentialAction`. The comment was reworded rather
      than the file exempted, because an allowlist is how a guard stops guarding.
    */
    const ALLOWED = ['DocumentLayout.tsx', 'pageKind.test.tsx'];
    const offenders = files.filter(
      (f) => !ALLOWED.some((a) => f.endsWith(a)) && readFileSync(f, 'utf8').includes('<Footer'),
    );
    expect(offenders, `these render their own footer: ${offenders.join(', ')}`).toEqual([]);
  });

  /*
    EVERY ROUTE SITS INSIDE ONE OF THE TWO KINDS. Without this, "no footer" is
    what a route gets by FORGETTING to choose, and the next page added inherits
    a decision nobody made - which is how the footer reached 32 files. Counting
    braces would be brittle, so this asserts the two group openings exist and
    that no `<Route path=` appears between the shell opening and the first
    group opening, which is the one place a route could sit outside both.
  */
  /*
    THE TWO KINDS ARE SIBLINGS, AND THIS IS PARSED RATHER THAN PATTERN-MATCHED.

    The first version of this test compared string POSITIONS - both groups after
    the shell, no path route before the first one - and it passed against a tree
    where `ContentLayout` was nested INSIDE `AppLayout`. Codex found that; the
    test could not, because positions cannot see nesting. Today `AppLayout`
    renders a bare outlet so the two arrangements behave identically, which is
    exactly what makes the wrong one survivable: the moment `AppLayout` grows the
    fitted no-scroll wrapper its own comment describes, every content page would
    have inherited it.

    So this walks the `<Route>` tags and builds the actual tree.
  */
  function routeTree() {
    /*
      A HAND SCANNER, BECAUSE A REGEX CANNOT READ THIS. `<Route element={<X />}>`
      contains a `>` INSIDE its own attributes, so `<Route[^>]*>` stops at the
      nested component's `/>` and reports every layout route as self-closing -
      which is precisely how the first version of this test concluded there was
      no shell at all. Walking forward with brace depth is the smallest thing
      that is actually correct.
    */
    /*
      COMMENTS FIRST. This file's own prose quotes `<Route element={<SiteShell />}>`
      to explain the structure, and so does `routes.tsx`. Scanning the raw source
      counted those quotations as real routes and the tree came out empty - the
      same false positive the footer sweep hit when a comment named the element.
    */
    const src = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const nodes: any[] = [];
    const stack: any[] = [{ label: 'root', children: nodes }];
    for (let i = 0; i < src.length; i++) {
      if (src.startsWith('</Route>', i)) { stack.pop(); i += 7; continue; }
      /*
        `<Routes>` ALSO STARTS WITH `<Route`, and treating it as one put the
        shell a level deeper than this test looked for it - the tree was correct
        and the lookup was not.
      */
      if (!src.startsWith('<Route', i) || /\w/.test(src[i + 6] ?? '')) continue;
      let depth = 0, j = i;
      for (; j < src.length; j++) {
        const ch = src[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '>' && depth === 0) break;
      }
      const tag = src.slice(i, j + 1);
      const selfClosing = src[j - 1] === '/';
      const layout = tag.match(/element=\{<(\w+)\s*\/>\}/)?.[1];
      const path = tag.match(/path=["']([^"']+)["']/)?.[1];
      /* A pass-through guard is not the page: `<ChampionSlugGuard><GameViewer /></...>`
         is GameViewer's route (E4b-1). Named, so a new wrapper is a visible edit. */
      const PASS_THROUGH = ['ChampionSlugGuard'];
      const elements = path ? [...tag.matchAll(/<(\w+)/g)].map((m) => m[1]).filter((n) => n !== 'Route') : [];
      const comp = elements.find((n) => !PASS_THROUGH.includes(n));
      const node = { label: layout ?? path ?? '?', path, layout, comp, children: [] as any[] };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
      i = j;
    }
    return nodes;
  }

  const GROUPS = ['WorkspaceKindLayout', 'FocusedLayout', 'DocumentLayout'];

  function groups() {
    const shell = routeTree().find((n: any) => n.layout === 'SiteShell');
    expect(shell, 'no SiteShell route found').toBeTruthy();
    return shell;
  }

  /** Every path declared anywhere under a node, however deep. */
  const pathsUnder = (n: any): string[] =>
    n.children.flatMap((c: any) => [...(c.path ? [c.path] : []), ...pathsUnder(c)]);

  /** The group a path is declared in. */
  function groupOf(path: string): string | undefined {
    const shell = groups();
    return shell.children.find((g: any) => GROUPS.includes(g.layout) && pathsUnder(g).includes(path))?.layout;
  }

  it('nests every page-kind group directly under the one shell, as siblings', () => {
    const shell = groups();
    const kinds = shell.children.filter((c: any) => GROUPS.includes(c.layout));
    expect(kinds.map((k: any) => k.layout).sort()).toEqual([...GROUPS].sort());

    // None may contain another.
    for (const k of kinds) {
      const nested = k.children.filter((c: any) => GROUPS.includes(c.layout));
      expect(nested, `${k.layout} contains ${nested.map((n: any) => n.layout).join(', ')}`).toEqual([]);
    }
  });

  it('puts every route inside exactly one page kind', () => {
    const shell = groups();
    const stray = shell.children.filter((c: any) => c.path);
    expect(stray.map((s: any) => s.path), 'these routes are in no group').toEqual([]);

    const seen = new Map<string, string>();
    for (const g of shell.children.filter((c: any) => GROUPS.includes(c.layout))) {
      for (const p of pathsUnder(g)) {
        expect(seen.get(p), `${p} is in both ${seen.get(p)} and ${g.layout}`).toBeUndefined();
        seen.set(p, g.layout);
      }
    }
    // The tree is only meaningful if the scanner actually read the table.
    expect(seen.size).toBeGreaterThan(40);
  });

  /*
    THE WORKSPACE GROUP HOLDS EXACTLY THE PAGES THAT RENDER `Workspace` (plan
    §3 A6, made real in C2). A route joins it in the same commit its page moves
    onto the primitive: in the group early, C1's viewport lock would apply to a
    page not built for it; outside it, a Workspace page would scroll the
    document instead of being locked to the window.
  */
  const lazyImports = new Map<string, string>(
    [...source.matchAll(/const (\w+)\s*=[^;]*?import\("@\/([^"]+)"\)/g)].map((m) => [m[1], `src/${m[2]}.tsx`]),
  );
  /*
    `/puzzles` IS SERVED THROUGH `PuzzlesRoute`, which picks a trainer by flag.
    Its default, and the page in this group, is v3 (`PuzzlesV3`); v1 and v2 are
    rollbacks C6 deletes. Named here rather than inferred, so a change to the
    default is a visible edit to this test.
  */
  for (const [route, page] of [['PuzzlesRoute', 'PuzzlesV3']] as const) {
    const file = lazyImports.get(page);
    if (file) lazyImports.set(route, file);
  }
  /*
    A ROUTE PAGE THAT HANDS THE BOARD TO A COMPONENT. Champion Challenge's
    session route (#68) resolves the champion and owns the SEO; the Workspace is
    `ChallengeSession`. Named here, so the route counts as rendering the
    Workspace and that component counts as belonging to the route.
  */
  const WORKSPACE_VIA: Record<string, string> = {
    'src/features/champion-challenge/pages/ChallengeSessionPage.tsx':
      'src/features/champion-challenge/components/ChallengeSession.tsx',
    /* E4b-1, E5: the route pages load the game and own the SEO; the board page is one shared component. */
    'src/pages/GameViewer.tsx': 'src/components/game-viewer/GameViewerWorkspace.tsx',
    'src/pages/live-game/LiveGameViewer.tsx': 'src/components/game-viewer/GameViewerWorkspace.tsx',
  };
  const rendersWorkspace = (file: string) =>
    /<Workspace[\s>]/.test(readFileSync(WORKSPACE_VIA[file] ?? file, 'utf8'));
  const pathsWithComp = (n: any): { path: string; comp?: string }[] =>
    n.children.flatMap((c: any) => [...(c.path ? [{ path: c.path, comp: c.comp }] : []), ...pathsWithComp(c)]);

  it('every route in the Workspace group renders the Workspace', () => {
    const ws = groups().children.find((c: any) => c.layout === 'WorkspaceKindLayout');
    const routes = pathsWithComp(ws);
    expect(routes.length).toBeGreaterThan(0);
    for (const r of routes) {
      const file = lazyImports.get(r.comp!);
      expect(file, `${r.path}: cannot find the page module for <${r.comp}>`).toBeTruthy();
      expect(rendersWorkspace(file!), `${r.path} is in the Workspace group but ${file} renders no <Workspace>`).toBe(true);
    }
  });

  it('no page outside the Workspace group renders the Workspace', () => {
    const ws = groups().children.find((c: any) => c.layout === 'WorkspaceKindLayout');
    const allowed = new Set(pathsWithComp(ws).flatMap((r) => {
      const file = lazyImports.get(r.comp!)!;
      return WORKSPACE_VIA[file] ? [file, WORKSPACE_VIA[file]] : [file];
    }));
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = join(dir, e.name).replace(/\\/g, '/');
        if (e.isDirectory()) return walk(full);
        return e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx') ? [full] : [];
      });
    const offenders = walk('src')
      .filter((f) => f !== 'src/components/workspace/Workspace.tsx' && rendersWorkspace(f) && !allowed.has(f));
    expect(offenders, 'these render <Workspace> but their route is not in the Workspace group').toEqual([]);
  });

  /*
    `/analysis` WAS PINNED HERE as a board page until D3b moved it to the
    Workspace (below). Champion Challenge stays until D4. Pinned so that moving
    it is a deliberate act with a test to change.
  */
  /* The legacy group was emptied by D4b and deleted in F2; it must not come back. */
  it('has no legacy group', () => {
    expect(readFileSync(join(process.cwd(), 'src/app/routes.tsx'), 'utf8')).not.toMatch(/AppLayout/);
  });

  /* C5b: the first real page on the Workspace. */
  it('serves /puzzles from the Workspace group', () => {
    expect(groupOf('/puzzles')).toBe('WorkspaceKindLayout');
    /* D1: /play is the second, D2a: /play-online the third, D3b: /analysis the fourth. */
    expect(groupOf('/play')).toBe('WorkspaceKindLayout');
    expect(groupOf('/play-online')).toBe('WorkspaceKindLayout');
    expect(groupOf('/analysis')).toBe('WorkspaceKindLayout');
    /* D4b: Champion Challenge's session, the fifth; its own route since #68. */
    expect(groupOf('/champion-challenge/:champion')).toBe('WorkspaceKindLayout');
    /* #68 (owner): the picker has no board, so it is a Document. */
    expect(groupOf('/champion-challenge')).toBe('DocumentLayout');
  });

  /*
    THE TRAINER'S DEV STAND-IN MOVES WITH THE TRAINER. `/dev/puzzles-layout`
    renders the component `/puzzles` serves, and the layout guards drive it in
    the trainer's place. As a Document it would carry a footer the real page
    does not, and those guards would measure a different page.
  */
  it('keeps /dev/puzzles-layout in the same group as /puzzles', () => {
    expect(source).toContain('path="/dev/puzzles-layout"');
    expect(groupOf('/dev/puzzles-layout')).toBe(groupOf('/puzzles'));
  });

  it('files the auth pages as Focused', () => {
    for (const p of ['/login', '/signup', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback']) {
      expect(groupOf(p), p).toBe('FocusedLayout');
    }
  });

  /* A6's one visible change: the record and the plan gain the footer. */
  it('files the training record and plan as Documents', () => {
    expect(groupOf('/puzzles/progress')).toBe('DocumentLayout');
    expect(groupOf('/puzzles/plan')).toBe('DocumentLayout');
  });

  /*
    THE CATCH-ALL MUST BE LAST IN THE FILE, and this is not cosmetic.

    `check-indexability.cjs` resolves a sitemap URL with `routes.find(...)` -
    FIRST match in file order. React Router ranks by specificity and does not
    care, so the app was correct either way; the checker is not. When #72 first
    grouped the routes it left `path="*"` in the middle of the file, and the
    build failed with `/puzzles is in the sitemap but NotFound.tsx renders
    noindex` - a real report of a problem that existed only for the checker.

    Rather than teach the checker about specificity, the file is ordered so the
    two agree. This pins it, because the next person to group routes will move
    this line without knowing why it is where it is.
  */
  it('keeps the catch-all last, so the indexability checker agrees with the router', () => {
    const splatAt = source.indexOf('path="*"');
    expect(splatAt).toBeGreaterThan(-1);
    const laterRoute = source.slice(splatAt + 1).match(/<Route\s+path=["'][^"']+["']/);
    expect(laterRoute, `a route is declared after the catch-all: ${laterRoute?.[0]}`).toBeNull();
  });

});
