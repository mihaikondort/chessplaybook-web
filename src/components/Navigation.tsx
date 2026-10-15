import { Link, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NavThemeButton, MenuThemeChoice } from '@/components/ThemeToggle';
import { Users, ChevronLeft, Radio, Swords, Newspaper, BarChart3, Menu, X, Crown, Lightbulb, MessageSquare } from 'lucide-react';
import { contactHref } from '@/components/support/ReportProblemLink';
import { logGA4Event } from '@/services/analytics';
import { MdPsychology } from 'react-icons/md';
import { lazy, Suspense, useState, useEffect, useRef, type CSSProperties } from 'react';

// Lazy-load auth (perf: defers 125KB aws-amplify vendor chunk from initial load)
const UserDropdown = lazy(() => import('@/features/auth/components/UserDropdown').then(m => ({ default: m.UserDropdown })));

/*
  THE SHELL TAKES NO PROPS, BECAUSE A PROP IS A WAY FOR A PAGE TO CHANGE IT
  (#55, owner 2026-08-23: *"it needs to be a fixed component that doesn't
  change"*).

  It used to take `playerName` for the champion breadcrumb and `activePath` for
  which item to mark. Both are facts about the URL, and the router already
  answers questions about the URL - so they are read from it here with `useMatch`
  rather than passed in. There is also nobody left to pass them: the bar is
  mounted once, in `SiteShell`, as the parent of every page.
*/
/**
 * `hidden` is focus mode (C1a): the shell keeps the nav MOUNTED and collapses
 * it to a zero row, rather than unmounting it. `inert` takes it out of the tab
 * order, the pointer AND the accessibility tree, and `[data-chrome-hidden]`
 * (index.css) takes its height and border to zero.
 *
 * `inert` ALONE, never with `aria-hidden`, though the spec names both: Chrome
 * refuses `aria-hidden` on an element whose descendant holds focus, which is
 * the lesson recorded in `PuzzleLiveCard.tsx` (2026-08-13). The string form is
 * React 18's, which does not know the attribute.
 */
export const Navigation = ({ hidden = false }: { hidden?: boolean }) => {
  /*
    THE AIR IS IN CSS (#55). It used to be computed here - `14 * (1 + 0.5 *
    log2(vh / 467))` - and written into an inline style from a passive effect, so
    the bar rendered short and grew a moment later. App pages measure their
    available height in a LAYOUT effect, which runs first, so they measured a bar
    that was still going to change and pinned their columns 6px too tall.

    `--nav-air` is now four chords between the approved anchor heights, in
    `index.css`. The row's geometry is final during the browser's first layout,
    which is what the app pages need and what this component was quietly
    preventing.
  */
  const rowRef = useRef<HTMLDivElement>(null);

  /*
    THE MENU TYPE IS DECLARED IN CSS, NOT FITTED HERE (#55, #67).

    A `useLayoutEffect` used to walk the type up until the rendered row stopped
    it, then write `--nav-type` back. It was removed, with its `ResizeObserver`
    and its resize listeners, because the measurement itself was the defect:

      - it wrote AFTER first paint, so the correction was visible. That is the
        flicker this issue was filed for.
      - its answer depended on what the row contained, so `/analysis` settled at
        18.5px where every other route got 19px, and a signed-in row got less
        again. The bar changed shape by route and by auth state.

    `--nav-type` is now a `clamp()` on viewport width in `index.css`, evaluated
    before paint and identical on every route. See that file for the poles and
    why each was chosen.
  */



  const location = useLocation();

  /*
    THE MARKED ITEM COMES FROM THE ROUTER, not from the page and not from a
    regex over the pathname: `useMatch` is the router's own matching, so it stays
    correct if a route's shape ever changes. The one exception is the layout skeleton, which
    lives at `/dev/puzzles-layout` while it is being built and IS the puzzles
    page, so `startsWith('/puzzles')` is false and nothing would light.
  */
  const devSkeleton = useMatch('/dev/puzzles-layout/*');
  const activePath = devSkeleton ? '/puzzles' : location.pathname;
  const navigate = useNavigate();
  const [isEventLive, setIsEventLive] = useState(false);
  const [isTournamentDay, setIsTournamentDay] = useState(false);
  const [currentRoundSlug, setCurrentRoundSlug] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Candidates 2026 schedule — game days with their dates (YYYY-MM-DD)
  // Rest days: April 2, 6, 10, 13
  const CANDIDATES_GAME_DAYS: { date: string; slug: string }[] = [
    { date: '2026-03-29', slug: 'round-1' },
    { date: '2026-03-30', slug: 'round-2' },
    { date: '2026-03-31', slug: 'round-3' },
    { date: '2026-04-01', slug: 'round-4' },
    { date: '2026-04-03', slug: 'round-5' },
    { date: '2026-04-04', slug: 'round-6' },
    { date: '2026-04-05', slug: 'round-7' },
    { date: '2026-04-07', slug: 'round-8' },
    { date: '2026-04-08', slug: 'round-9' },
    { date: '2026-04-09', slug: 'round-10' },
    { date: '2026-04-11', slug: 'round-11' },
    { date: '2026-04-12', slug: 'round-12' },
    { date: '2026-04-14', slug: 'round-13' },
    { date: '2026-04-15', slug: 'round-14' },
  ];

  const checkTournamentStatus = () => {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Nicosia' }); // YYYY-MM-DD in Cyprus time

    // Check if games are currently being played (Cyprus time 14:00-22:00)
    const cyprusTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Nicosia' }));
    const hour = cyprusTime.getHours();
    const isLive = hour >= 14 && hour < 22;

    // Find today's round or the most recent past round
    const todayRound = CANDIDATES_GAME_DAYS.find(gd => gd.date === today);
    let bestSlug: string | null = null;

    if (todayRound) {
      bestSlug = todayRound.slug;
    } else {
      // Rest day or between rounds — find the last played round
      for (const gd of CANDIDATES_GAME_DAYS) {
        if (gd.date <= today) bestSlug = gd.slug;
      }
    }

    // Tournament day = any day from first to last round (including rest days)
    const tournamentStart = '2026-03-29';
    const tournamentEnd = '2026-04-15';
    const isDuringTournament = today >= tournamentStart && today <= tournamentEnd;

    setIsEventLive(isDuringTournament && isLive && todayRound !== undefined);
    setIsTournamentDay(isDuringTournament);

    /**
     * Only deep-link to a round while the tournament is actually running.
     *
     * The loop above walks every game day and keeps the last one that is <=
     * today, so once the event ends it pins to the FINAL round forever — the
     * Candidates finished 2026-04-15 and the sitewide "Live" nav item had been
     * pointing at /candidates-2026/round-14 ever since. That page is
     * `noindex, follow`, so every page on the site was spending an internal
     * link on a URL Google is told to drop, instead of on /live-events, which
     * the fallback branch already existed to serve but could never reach.
     */
    setCurrentRoundSlug(isDuringTournament ? bestSlug : null);
  };

  useEffect(() => {
    checkTournamentStatus();
    const interval = setInterval(checkTournamentStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Champion Challenge went live 2026-07-26: corpus v2 (997 positions) and
  // migration 013 are on the production host and the API is serving.
  const CHAMPION_CHALLENGE_LIVE = true;

  // Challenge leads and Live trails: Live is only interesting on tournament
  // days, so the first slot was being spent on a link that is usually inert,
  // while the Challenge sat last. Live keeps its live/tournament-day dot, which
  // is what draws the eye back to it when there is actually something on.
  const navLinks = [
    // Explain leads, matching the homepage card order: it is the site's
    // differentiator. It was missing
    // from the nav entirely until 2026-08-02 — every other homepage card
    // destination had an entry, so on any page other than the homepage it was
    // reachable only from the footer.
    { to: '/explain', icon: Lightbulb, label: 'Explain' },
    ...(CHAMPION_CHALLENGE_LIVE
      ? [{ to: '/champion-challenge', icon: Crown, label: 'Challenge' }]
      : []),
    { to: '/play-online', icon: Swords, label: 'Play' },
    { to: '/puzzles', icon: MdPsychology, label: 'Puzzles' },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/champions', icon: Users, label: 'Champions' },
    { to: '/news', icon: Newspaper, label: 'News' },
    { to: currentRoundSlug ? `/candidates-2026/${currentRoundSlug}` : '/live-events', icon: Radio, label: 'Live', isLive: isEventLive, isTournamentDay },
  ];

  /*
   * True only *below* /champions — on a champion's games or best-games page,
   * never on the index.
   *
   * The breadcrumb links to /champions, so on the index route it was a link to
   * the page already open: visible, clickable, and inert (UI issues log #3).
   * The mobile title keys off the same value, since it is hidden precisely to
   * make room for this breadcrumb; one boolean keeps the two from drifting.
   *
   * Anchored rather than `.includes('/champions')`, which would also match any
   * future route that merely contains the segment.
   */
  const inChampionSubPage = /^\/champions\/.+/.test(location.pathname);

  return (
    <nav
      className="bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50"
      data-chrome-hidden={hidden || undefined}
      {...(hidden ? { inert: '' as unknown as boolean } : {})}
    >
      {/*
        THE SHELL READS NOTHING A PAGE PUBLISHES (#55, 2026-08-23).

        This was `max-w-[var(--content-w,80rem)]` with `--content-pad` insets, so
        a page could hand the bar its own width. Exactly one did - /puzzles - and
        the bar rendered 1493px wide there against 1216px on every other route,
        starting 138.5px further left. That is the shape change this issue was
        filed for, and no amount of tuning the fallbacks fixes it: a shell that
        any page can set is a shell that differs by page.

        Fixed at `max-w-7xl` with the site's own insets. A page that wants a
        different content width changes its own body, never this.
      */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/*
          THE HEADER SCALES WITH THE SCREEN (owner, 2026-08-15: *"the size of it
          needs to be adapted to the resolution, can't be as big as on bigger
          resolutions, the height needs to be adapted so the space it leaves
          available bellow is reasonably and proportionate"*).

          It was a flat 64px, so on a 467px viewport the site's chrome took a
          seventh of the screen before the page said anything. `clamp` rather
          than a breakpoint, so there is no width at which the row jumps.
        */}
        <div ref={rowRef} data-nav-row className="flex items-center justify-between relative">
          {/* Mobile only: centered title between icon and hamburger. Hidden on
              pages that show a left-side breadcrumb (e.g. /champions/*) so the
              two don't overlap at narrow widths — the logo icon still links home. */}
          {!inChampionSubPage && (
            <Link to="/" className="absolute left-1/2 -translate-x-1/2 md:hidden font-playfair font-bold text-[22px] text-foreground hover:text-link transition-colors">
              Chess Playbook
            </Link>
          )}

          {/* Left side - Logo/Home + Breadcrumbs.
              `min-w-0` lets this group absorb the squeeze, so a long breadcrumb
              truncates instead of forcing the row to overflow. */}
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0 text-foreground hover:text-link transition-colors">
              <img src="/chess-queen-icon-32.png" alt="Chess Playbook" className="w-8 h-8 rounded-lg" width={32} height={32} />
              {/* Hidden in the 1024–1279 band only. That is where the desktop
                  nav (7 items + dropdown) is revealed but the row is still
                  narrow, and the wordmark was the thing pushing it over — it
                  wrapped to two lines and, on champion sub-pages, overflowed.
                  Below 1024 the hamburger leaves plenty of room, and from 1280
                  the full row fits, so the wordmark shows in both. */}
              <span data-nav-wordmark className="font-playfair font-bold text-lg whitespace-nowrap hidden md:inline">
                Chess Playbook
              </span>
            </Link>

            {/*
              THE BACK LINK SHOWS ONLY WITHOUT THE FULL MENU (owner, 2026-10-10, D35).

              With the full menu, its own "Champions" item is on screen, marked as the
              current section and linking to the same place, so "‹ Champions" said it
              twice and cost the row its room: at 808-904px wide it was squeezed out of
              its group and printed over "Explain" and "Challenge" (live), and up to
              ~1100px every gap in the row shrank to fit it. Below `navrow` the menu
              is behind the hamburger, and there the back link is the way back.

              The "<player>'s Games" crumb went with it: it showed only from `xl`,
              where the full menu always shows.
            */}
            {inChampionSubPage && (
              <div className="flex items-center gap-2 text-sm min-w-0 navrow:hidden">
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Link
                  to="/champions"
                  className="shrink-0 whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
                >
                  Champions
                </Link>
              </div>
            )}
          </div>

          {/* Desktop navigation.
              Gated at `lg`, not `md`: with the Champion Challenge link the row
              is 7 items plus the user dropdown, which measures ~893px. At the
              old `md` (768px) breakpoint that overflowed the viewport and made
              the whole page scroll sideways. */}
          {/*
            SHOWN WHEREVER THE THREE-COLUMN LAYOUT IS (owner, 2026-08-15: *"in
            the landscape layout the menu should not be mobile like, should be
            desktop like, the size of the fonts need to be adapted so the menu
            fits"*). `cols` is that layout's own media query - landscape and wide
            enough - so the two can never disagree about which page shape is on
            screen. The type shrinks with the row; see `index.css`.
          */}
          <div data-nav-desktop className="hidden navrow:flex items-center gap-1 shrink-0">
            {navLinks.map((link) => {
              const isActive = (activePath ?? location.pathname).startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={isActive ? (e) => { e.preventDefault(); navigate(link.to, { state: { t: Date.now(), reset: true } }); } : undefined}
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="sm"
                    className={`gap-2 relative ${
                      !isActive && link.isTournamentDay
                        ? link.isLive
                          ? 'text-live hover:bg-live/10'
                          : 'text-event-day hover:bg-event-day/10'
                        : ''
                    }`}
                  >
                    <link.icon className={`h-4 w-4 ${link.label === 'Puzzles' ? 'scale-[1.4]' : ''} ${link.isLive ? 'animate-pulse' : ''}`} />
                    <span>{link.label}</span>
                    {link.isLive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-live rounded-full animate-pulse" />
                    )}
                    {link.isTournamentDay && !link.isLive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-event-day rounded-full" />
                    )}
                  </Button>
                </Link>
              );
            })}
            {/* The site theme (F3): a direct child, so the row's rules size it.
                It is why the row starts at 840 rather than 800: with it, the
                gaps at 800 were 0px. */}
            <NavThemeButton />
            <div className="nav-account-slot">
              <Suspense fallback={<div className="w-16 h-8" />}>
                <UserDropdown />
              </Suspense>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="navrow:hidden p-2.5 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="navrow:hidden py-4 border-t border-border/50 animate-fade-in" style={{ animationDuration: '0.2s' }}>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = (activePath ?? location.pathname).startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? 'bg-primary/10 text-link'
                      : link.isTournamentDay
                        ? link.isLive
                          ? 'text-live hover:bg-live/10'
                          : 'text-event-day hover:bg-event-day/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    onClick={isActive ? (e) => { e.preventDefault(); navigate(link.to, { state: { t: Date.now(), reset: true } }); setMobileMenuOpen(false); } : () => setMobileMenuOpen(false)}
                  >
                    <link.icon className={`h-5 w-5 ${link.label === 'Puzzles' ? 'scale-[1.4]' : ''} ${link.isLive ? 'animate-pulse' : ''}`} />
                    <span className="font-medium">{link.label}</span>
                    {link.isLive && (
                      <span className="w-2 h-2 bg-live rounded-full animate-pulse ml-auto" />
                    )}
                    {link.isTournamentDay && !link.isLive && (
                      <span className="w-2 h-2 bg-event-day rounded-full ml-auto" />
                    )}
                  </Link>
                );
              })}
              {/* #44: the phone menu has room the desktop row does not. */}
              <Link
                to={contactHref('mobile_menu', undefined, null)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => { logGA4Event({ name: 'support_entry_clicked', params: { surface: 'mobile_menu' } }); setMobileMenuOpen(false); }}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">Contact</span>
              </Link>
              <div className="border-t border-border/50 mt-1 pt-2">
                <MenuThemeChoice />
              </div>
              <div className="px-2 pt-2 border-t border-border/50 mt-1">
                <Suspense fallback={<div className="h-8" />}>
                  <UserDropdown />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
