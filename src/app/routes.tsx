import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { SiteShell } from "@/app/SiteShell";
import { DocumentLayout } from "@/app/DocumentLayout";
import { FocusedLayout } from "@/app/FocusedLayout";
import { WorkspaceKindLayout } from "@/app/WorkspaceKindLayout";
import { CANDIDATES_2026_CONFIG } from "@/config/tournaments/candidates2026";

// Critical pages � eagerly loaded (above-the-fold, high traffic)
import Index from "@/pages/Index";
import Champions from "@/pages/Champions";
import ChampionsList from "@/pages/ChampionsList";
import GameList from "@/pages/GameList";
import NotFound from "@/pages/NotFound";

// GameViewer lazy-loaded: it imports chess.js + AnalysisService (71KB vendor-chess chunk)
// which are not needed on landing pages. Users only reach GameViewer after clicking a game.
const GameViewer = lazy(() => lazyRetry(() => import("@/pages/GameViewer")));

/**
 * Retry a dynamic import up to `retries` times with exponential backoff.
 * Handles flaky mobile networks where chunk downloads intermittently fail.
 */
function lazyRetry<T extends { default: React.ComponentType<unknown> }>(
  factory: () => Promise<T>,
  retries = 2,
): Promise<T> {
  return factory().catch((err: unknown) => {
    if (retries <= 0) throw err;
    return new Promise<T>((resolve) =>
      setTimeout(() => resolve(lazyRetry(factory, retries - 1)), 1000),
    );
  });
}

// Lazy-loaded pages (with automatic retry on chunk load failure)
const BestGames = lazy(() => lazyRetry(() => import("@/pages/BestGames")));
const LiveEventsHub = lazy(() => lazyRetry(() => import("@/pages/LiveEventsHub")));
const WorldCup2025Hub = lazy(() => lazyRetry(() => import("@/pages/WorldCup2025Hub")));
const WorldCup2025GameDay = lazy(() => lazyRetry(() => import("@/pages/WorldCup2025GameDay")));
const LiveGameViewer = lazy(() => lazyRetry(() => import("@/pages/live-game/LiveGameViewer")));
const Privacy = lazy(() => lazyRetry(() => import("@/pages/Privacy")));
const Terms = lazy(() => lazyRetry(() => import("@/pages/Terms")));
const Contact = lazy(() => lazyRetry(() => import("@/pages/Contact")));
const Credits = lazy(() => lazyRetry(() => import("@/pages/Credits")));
const WorldChampionshipCycle = lazy(() => lazyRetry(() => import("@/pages/WorldChampionshipCycle")));
const Play = lazy(() => lazyRetry(() => import("@/features/play/pages/PlayComputer")));
const PlayOnline = lazy(() => lazyRetry(() => import("@/features/online/pages/PlayOnline")));
const PuzzleProgress = lazy(() => lazyRetry(() => import("@/features/puzzles/pages/PuzzleProgress")));
const PuzzlePlan = lazy(() => lazyRetry(() => import("@/features/puzzles/pages/PuzzlePlan")));
const Analysis = lazy(() => lazyRetry(() => import("@/pages/Analysis")));
const Explain = lazy(() => lazyRetry(() => import("@/pages/Explain")));
const ChampionChallenge = lazy(() => lazyRetry(() => import("@/features/champion-challenge/pages/ChampionChallenge")));
const ChallengeSessionPage = lazy(() => lazyRetry(() => import("@/features/champion-challenge/pages/ChallengeSessionPage")));

// Dev-only design prototype. Both the lazy() and its dynamic import() live
// inside an `import.meta.env.DEV` branch that Vite statically resolves to
// `false` in production, so Rollup tree-shakes the import entirely � the
// gallery never enters the production bundle.
const ExplainerCardGallery = import.meta.env.DEV
  ? lazy(() => import("@/components/game-analysis/design-prototype/ExplainerCardGallery"))
  : null;
// Layout redesign C2: the Workspace primitive on a fixture, same dev-only treatment.
const WorkspaceFixture = import.meta.env.DEV
  ? lazy(() => import("@/components/workspace/WorkspaceFixture"))
  : null;
// Layout redesign B2: both colour themes side by side, same dev-only treatment.
const ThemePreview = import.meta.env.DEV
  ? lazy(() => import("@/design/preview/ThemePreview"))
  : null;
/*
  THE REBUILT PUZZLES PAGE, which `/puzzles` serves as of 2026-08-16.

  It began on 2026-08-15 as the trainer's geometry with empty cards - see the
  header of `TrainerLayoutSkeleton` for why that was built as the real layout
  rather than as a drawing - and it kept the name through every card being
  filled. Renaming it is a separate change from swapping the route, and doing
  both at once would make the swap unreviewable.

  `lazyRetry` like every other route: a chunk that fails to load on a flaky
  connection retries rather than leaving a blank page.
*/
const PuzzlesV3 = lazy(() => lazyRetry(() => import("@/features/puzzles/components/TrainerLayoutSkeleton")));
/*
  AND IT KEEPS ITS DEV URL, which is not redundant. Every layout guard on this
  page - `verify-layout-frozen`, `verify-card-content-fits`,
  `verify-puzzles-viewports` - drives `/dev/puzzles-layout`, and pointing them at
  `/puzzles` would make them depend on the version flag: a rollback to `v2` would
  turn a layout guard into a guard of a different page, passing or failing for
  reasons that have nothing to do with what it measures.

  DEV-gated, so it is tree-shaken from the production build. Verified on the
  built artefact: `/dev/puzzles-layout` 404s there while `/puzzles` renders.
*/
const TrainerLayoutSkeleton = import.meta.env.DEV
  ? lazy(() => import("@/features/puzzles/components/TrainerLayoutSkeleton"))
  : null;
const News = lazy(() => lazyRetry(() => import("@/pages/News")));
const Candidates2026Hub = lazy(() => lazyRetry(() => import("@/pages/Candidates2026Hub")));
const Candidates2026GameDay = lazy(() => lazyRetry(() => import("@/pages/Candidates2026GameDay")));
const CandidatesArticle2026 = lazy(() => lazyRetry(() => import("@/pages/CandidatesArticle2026")));
const CandidatesArticleWomen2026 = lazy(() => lazyRetry(() => import("@/pages/CandidatesArticleWomen2026")));
const CandidatesRound1Recap2026 = lazy(() => lazyRetry(() => import("@/pages/CandidatesRound1Recap2026")));
const CandidatesRound3Recap2026 = lazy(() => lazyRetry(() => import("@/pages/CandidatesRound3Recap2026")));
const CandidatesConclusion2026 = lazy(() => lazyRetry(() => import("@/pages/CandidatesConclusion2026")));
const SindarovGukeshHeadToHead = lazy(() => lazyRetry(() => import("@/pages/SindarovGukeshHeadToHead")));
const VaishaliJuWenjunTitleMatch = lazy(() => lazyRetry(() => import("@/pages/VaishaliJuWenjunTitleMatch")));
const WorldChampionship2026Announced = lazy(() => lazyRetry(() => import("@/pages/WorldChampionship2026Announced")));
const LoginPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/LoginPage")));
const SignupPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/SignupPage")));
const VerifyEmailPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/VerifyEmailPage")));
const ForgotPasswordPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/ForgotPasswordPage")));
const ResetPasswordPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/ResetPasswordPage")));
const AuthCallbackPage = lazy(() => lazyRetry(() => import("@/features/auth/pages/AuthCallbackPage")));
const ProfilePage = lazy(() => lazyRetry(() => import("@/features/auth/pages/ProfilePage")));
const GameHistory = lazy(() => lazyRetry(() => import("@/features/online/pages/GameHistory")));
const PlayerProfile = lazy(() => lazyRetry(() => import("@/features/online/pages/PlayerProfile")));
const Leaderboard = lazy(() => lazyRetry(() => import("@/features/online/pages/Leaderboard")));

const ProtectedRoute = lazy(() => lazyRetry(() => import("@/features/auth/components/ProtectedRoute").then(m => ({ default: m.ProtectedRoute }))));

/** Redirect /live-events to today's round during Candidates 2026 */
function LiveEventsRedirect() {
  const today = new Date().toISOString().split('T')[0];
  const gameDay = CANDIDATES_2026_CONFIG.gameDays.find(d => {
    const dayDate = d.startTime.toISOString().split('T')[0];
    return dayDate === today;
  });
  if (gameDay) {
    return <Navigate to={`/candidates-2026/${gameDay.slug}`} replace />;
  }
  // During tournament but rest day � go to hub
  const start = '2026-03-29';
  const end = '2026-04-15';
  if (today >= start && today <= end) {
    return <Navigate to="/candidates-2026" replace />;
  }
  // Outside tournament � show the regular live events page
  return <LiveEventsHub />;
}

function LazyFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Champion slugs are lowercase ("gukesh"), and the API matches on the slug
 * exactly � a capitalised segment 404s and the page renders "Failed to load".
 *
 * That mattered because the sitemap advertised the capitalised form until
 * 2026-07-26, so Google holds 36 such URLs. Rather than let them decay as soft
 * 404s, this redirects them onto the canonical lowercase URL, which also
 * consolidates any signal they picked up instead of splitting it.
 *
 * `replace` so the broken URL does not sit in the user's back history.
 */
function ChampionSlugGuard({ children }: { children: React.ReactNode }) {
  const { name } = useParams();
  const location = useLocation();

  if (name && name !== name.toLowerCase()) {
    const canonical = location.pathname.replace(
      `/champions/${name}`,
      `/champions/${name.toLowerCase()}`,
    );
    return <Navigate to={canonical + location.search} replace />;
  }

  return <>{children}</>;
}

/*
  NO SUSPENSE BOUNDARY HERE. It lives inside `SiteShell`, around the outlet only
  - see the note there. A boundary at this level replaces the shell itself while
  a route's chunk loads, which is the one way the persistent nav could still be
  taken off screen.
*/
export function AppRoutes() {
  return (
    <Routes>
        {/*
          THE LAYOUT ROUTE (#55). Every page is a child of `SiteShell`, which
          renders the chrome once and an `<Outlet />` where the page goes. Before
          a different element on every route and nothing could guarantee it was
          the same. Adding a page here gets the shell; it cannot forget to, and
          it has no way to change it.
        */}
        <Route element={<SiteShell />}>
        {/*
          PAGE KINDS, DECLARED (#72, layout redesign A6). Each group stamps its
          kind on the page region as `data-kind`, and the kind decides the
          footer and, from C1, the scroll model: Document (read and left, with
          the footer), Focused (one short task, no footer), Workspace (a board
          locked to the viewport). It used to be decided by whether a page
          component happened to render the footer itself - 35 call sites across
          32 files did.

          (Written without the footer element's own literal on purpose:
          `pageKind.test` scans the source for it, and a mention in prose reads
          as an offender. The same false positive the 2026-08-07
          `potentialAction` comment produced.)

          EVERY GROUP NESTS INSIDE THE ONE `SiteShell`. Sibling shells would
          remount the chrome on every navigation between kinds and give back the
          new-nav-node defect #55 exists to prevent. `pageKind.test.tsx`
          requires every route to be inside exactly one group, so a new page
          cannot get a footer, or miss one, by accident.
        */}
        {/*
          WORKSPACE. A route joins it in the same commit its page moves onto the
          `Workspace` primitive, and not before. First member: the C2 fixture.
        */}
        <Route element={<WorkspaceKindLayout />}>
        {/* C2: the primitive's fixture, the first route to render `Workspace`. */}
        {import.meta.env.DEV && WorkspaceFixture && (
          <Route path="/dev/workspace" element={<WorkspaceFixture />} />
        )}
        {/*
          C5b: `/puzzles` on the Workspace. C6 deleted trainers v1 and v2 and the
          `?trainer=` / `VITE_PUZZLE_TRAINER_VERSION` switch between them, so a
          rollback is now a deploy of an older ref (decision log Q2).
        */}
        <Route path="/puzzles" element={<PuzzlesV3 />} />
        {/* D1: `/play` on the Workspace, the second page after `/puzzles`. */}
        <Route path="/play" element={<Play />} />
        {/* D2a: `/play-online`, the third. */}
        <Route path="/play-online" element={<PlayOnline />} />
        {/* D3b: `/analysis`, the fourth; its review mode since E6, on the shared
            game viewer page. */}
        <Route path="/analysis" element={<Analysis />} />
        {/* D4b: Champion Challenge's session, the fifth. Its own route since #68,
            so the picker at `/champion-challenge` can be a Document. */}
        <Route path="/champion-challenge/:champion" element={<ChallengeSessionPage />} />
        {/* E4b-1: the champion game viewers, the sixth and seventh: the board, the
            moves and the game on the Workspace instead of the Lichess viewer. */}
        <Route path="/champions/:name/games/:gameIndex" element={<ChampionSlugGuard><GameViewer /></ChampionSlugGuard>} />
        <Route path="/champions/:name/best-games/:gameIndex" element={<ChampionSlugGuard><GameViewer /></ChampionSlugGuard>} />
        {/* E5: the live game viewer, the eighth: the same board page as the champion
            viewers, with live clocks; it follows new moves only for a reader at the
            latest one (D31). It was a content page until now. */}
        <Route path="/live-game/:roundId/:gameId" element={<LiveGameViewer />} />
        {/*
          `/dev/puzzles-layout` moves WITH `/puzzles`, as it always said it would:
          it is the same component, and the layout guards drive it as the
          trainer's stand-in. DEV-only.
        */}
        {import.meta.env.DEV && TrainerLayoutSkeleton && (
          <Route path="/dev/puzzles-layout" element={<TrainerLayoutSkeleton />} />
        )}
        </Route>

        {/* FOCUSED: auth. One short task each, no footer, as before. */}
        <Route element={<FocusedLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Route>

        <Route element={<DocumentLayout />}>
        {/*
          The training record (TRAINING_SYSTEM C7). Deliberately NOT wrapped in
          ProtectedRoute: the attempt log is keyed on an anonymous UUID as well
          as a Cognito sub, and most traffic has no account.

          A DOCUMENT SINCE A6, and so it gains the footer. Neither this page nor
          the plan below has a board or a fitted height; they are read and
          scrolled like an article.
        */}
        <Route path="/puzzles/progress" element={<PuzzleProgress />} />
        {/*
          The training plan (plan-page work A3). Not wrapped in ProtectedRoute
          for the same reason as the record above: plan routes require an
          identity, which an anonymous UUID satisfies, and most traffic has no
          account.
        */}
        <Route path="/puzzles/plan" element={<PuzzlePlan />} />

        {/* Dev-only galleries, tree-shaken from production builds (guarded by
            import.meta.env.DEV; Vite drops the dead branch and the lazy import
            never enters the prod bundle). Scrolling sheets of cards, so
            Documents. */}
        {import.meta.env.DEV && ExplainerCardGallery && (
          <Route path="/dev/explainer-card" element={<ExplainerCardGallery />} />
        )}
        {import.meta.env.DEV && ThemePreview && (
          <Route path="/dev/theme-preview" element={<ThemePreview />} />
        )}

        {/* Home */}
        <Route path="/" element={<Index />} />

        {/* Champions & Games */}
        <Route path="/champions" element={<Champions />} />
        <Route path="/champions/list" element={<ChampionsList />} />
        <Route path="/champions/:name/games" element={<ChampionSlugGuard><GameList /></ChampionSlugGuard>} />
        <Route path="/champions/:name/best-games" element={<ChampionSlugGuard><BestGames /></ChampionSlugGuard>} />

        {/* Live Events � redirects to today's round during Candidates 2026 */}
        <Route path="/live-events" element={<LiveEventsRedirect />} />
        <Route path="/world-cup-2025" element={<WorldCup2025Hub />} />
        <Route path="/world-cup-2025/:slug" element={<WorldCup2025GameDay />} />
        <Route path="/candidates-2026" element={<Candidates2026Hub />} />
        <Route path="/candidates-2026/:slug" element={<Candidates2026GameDay />} />

        {/* News */}
        <Route path="/news" element={<News />} />
        <Route path="/news/candidates-2026" element={<CandidatesArticle2026 />} />
        <Route path="/news/candidates-2026-women" element={<CandidatesArticleWomen2026 />} />
        <Route path="/news/candidates-2026-round-1" element={<CandidatesRound1Recap2026 />} />
        <Route path="/news/candidates-2026-round-3" element={<CandidatesRound3Recap2026 />} />
        <Route path="/news/candidates-2026-conclusion" element={<CandidatesConclusion2026 />} />
        <Route path="/news/sindarov-gukesh-head-to-head" element={<SindarovGukeshHeadToHead />} />
        <Route path="/news/vaishali-ju-wenjun-title-match" element={<VaishaliJuWenjunTitleMatch />} />
        <Route path="/news/world-championship-2026-geneva" element={<WorldChampionship2026Announced />} />

        {/* Legal & Info */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/world-championship-cycle" element={<WorldChampionshipCycle />} />

        {/* Accounts and rankings � read-and-leave pages, so they keep the footer */}
        <Route path="/game-history" element={<GameHistory />} />
        <Route path="/player/:username" element={<PlayerProfile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/explain" element={<Explain />} />
        {/* The Champion Challenge picker: a Document since #68 (owner). It has no
            board; its sessions are `/champion-challenge/:champion`, Workspaces. */}
        <Route path="/champion-challenge" element={<ChampionChallenge />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
        </Route>
        </Route>
      </Routes>
  );
}
