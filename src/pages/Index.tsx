/**
 * Homepage — a six-card chooser, and nothing else.
 *
 * A visitor who has not said what they want used to be sent to /play-online
 * on the assumption that they want a game against a stranger, and very few
 * pressed Play. So they land here instead and self-select; a visitor with a
 * specific intent still goes straight to its own page.
 *
 * That makes this page's job exactly two things: present six choices, and
 * record which one was taken (`home_choice_click`). The hero, the live-tournament
 * spotlight, the champions showcase and the news teaser were all removed on
 * 2026-08-02 — a chooser with four scrolling sections underneath is not a
 * chooser. Their destinations are all still reachable: five of the six are grid
 * cards, and articles are one click further via /news.
 *
 * The <h1> comes from RouteHeading, i.e. from route-meta.json, which is also
 * what SeoHead renders and what the prerender bakes. The homepage is the
 * landing page for a paid ad, so its heading, its <title> and the ad copy have
 * to agree — one source is what makes that enforceable.
 */
import { Features } from "@/components/Features";
import { RouteHeading } from "@/components/RouteHeading";
import SeoHead from '@/components/SeoHead';
import routeMeta from '@/config/route-meta.json';

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

      <div className="bg-background flex flex-col">
        <main className="flex-1">
          {/* Deliberately compact. Every one of the six cards has to sit in the
              first mobile viewport — that is what stops "News was chosen least"
              from being an artefact of scroll depth — and the heading is the
              only thing competing with them for that space. */}
          <div className="container max-w-6xl mx-auto px-4 pt-4 pb-3 md:pt-10 md:pb-6 text-center">
            <RouteHeading routeKey="" />
          </div>
          <Features />
        </main>
      </div>
    </>
  );
};

export default Index;
