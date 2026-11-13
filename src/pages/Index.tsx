/**
 * Homepage — the six-card chooser.
 *
 * A visitor who has not said what they want lands here and self-selects; a
 * visitor with a specific intent still goes straight to its own page. The
 * paid campaign lands on /puzzles, not here (owner, 2026-11-13).
 *
 * TWO HOMEPAGES, ONE SWITCH (visual redesign plan C2, `HOME_V2_LIVE` in
 * src/design/designFlags.ts):
 *
 * - off (today's): a compact heading and the chooser, nothing else (the
 *   2026-08-02 design: the hero, spotlight, showcase and news teaser removed;
 *   the News card left the grid on 2026-11-13 for the Opening Trainer, and
 *   articles are one click away via /news in the nav).
 * - on (design v2): the chooser in the mock's clothes over a hero photo, then
 *   the Journey card, the featured champion, the champions strip and the latest
 *   news below it. The owner's D1 decision supersedes the 08-02 "six cards and
 *   nothing else" rule, with every new link measured (`home_section_click`), so
 *   `home_choice_click` keeps counting exactly the six cards in both.
 *
 * Either way the <h1> comes from RouteHeading, i.e. from route-meta.json, which
 * is also what SeoHead renders and what the prerender bakes, so the heading,
 * the <title> and the ad copy cannot disagree. The switch rolls back on its
 * own, separately from the design tokens' switch.
 */
import { lazy, Suspense } from 'react';
import { Features } from "@/components/Features";
import { RouteHeading } from "@/components/RouteHeading";
import SeoHead from '@/components/SeoHead';
import routeMeta from '@/config/route-meta.json';
import { HOME_V2_LIVE } from '@/design/designFlags';
import { GoldGradientDefs } from '@/features/home/GoldGradientDefs';
import { HomeStage } from '@/features/home/HomeStage';

// Below the first screen, so out of the homepage's first chunk (plan S5).
const HomeSections = lazy(() => import('@/features/home/HomeSections'));

const Index = () => {
  return (
    <>
      <SeoHead routeKey="">
        {/* Descriptions are read from route-meta.json rather than written out
            again here. This schema block and the static WebSite block in
            index.html were both stale for months — they still described
            "watch live tournaments" and "replay legendary games" after the
            page had moved on — because each was a separate hand-maintained
            copy of the same sentence. */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Chess Playbook",
          "url": "https://www.chessplaybook.com",
          "description": routeMeta[""].description,
          "sameAs": []
        })}</script>
        {/* No `WebSite` block here. index.html already carries one, with its
            description patched from this same route-meta entry by
            generate-route-html.cjs. That tag has no `data-rh`, so Helmet cannot
            replace it and a copy here is APPENDED: the rendered homepage ended
            up declaring two WebSite entities for one URL. Removed 2026-08-07,
            with the same change that stopped every other route serving the
            homepage's copy of it. */}
      </SeoHead>

      {HOME_V2_LIVE ? (
        <main className="bg-background text-foreground">
          <GoldGradientDefs />
          <HomeStage />
          {/* Reserves roughly its height while it loads, so the footer does not jump up and back. */}
          <Suspense fallback={<div className="min-h-[900px]" aria-hidden />}>
            <HomeSections />
          </Suspense>
        </main>
      ) : (
        <div className="bg-background flex flex-col">
          <main className="flex-1">
            {/* Deliberately compact. Every one of the six cards has to sit in the
                first mobile viewport — that is what stops "the last card was chosen least"
                from being an artefact of scroll depth — and the heading is the
                only thing competing with them for that space. */}
            <div className="container max-w-6xl mx-auto px-4 pt-4 pb-3 md:pt-10 md:pb-6 text-center">
              <RouteHeading routeKey="" />
            </div>
            <Features />
          </main>
        </div>
      )}
    </>
  );
};

export default Index;
