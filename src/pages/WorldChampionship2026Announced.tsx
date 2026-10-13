import { Link } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';

/**
 * World Championship 2026 announced: Geneva, 25 November - 15 December.
 *
 * Third piece of the title-match build-up series (M2 work-queue item 2), and the
 * "on announcement" half that was deliberately held back until FIDE published
 * dates and venue. It did so on 2026-07-28; this went up the following day.
 * Brief: docs/Master Plan - Active/M2/WCH_2026_ANNOUNCEMENT_BRIEF.md
 *
 * ---------------------------------------------------------------------------
 * THIS IS A LOOKUP PAGE FIRST AND AN ARTICLE SECOND.
 *
 * The queries it exists to answer are "when is the Gukesh Sindarov match",
 * "where is the world chess championship 2026", "world championship 2026
 * format". A reader who came for the date must not have to read three
 * paragraphs to find it, so the facts sit in a card directly under the hero,
 * above all prose. That is the opposite shape to the other two build-up
 * pieces, and it is deliberate. Do not "improve" it by leading with narrative.
 * ---------------------------------------------------------------------------
 *
 * HOUSE RULE, inherited from SindarovGukeshHeadToHead.tsx: the article never
 * talks about our own data - not the database, not what it holds, not what is
 * missing from it. Self-referential plumbing is bad writing, and the records
 * are public anyway. Sources cites published references only.
 *
 * Evidentiary notes, kept here rather than in the body:
 *
 *   - Dates are FIDE's own (25 Nov - 15 Dec). Wikipedia carried a PROVISIONAL
 *     23 Nov - 17 Dec. It is superseded and is deliberately not mentioned:
 *     printing a dead date range on the page whose entire job is answering
 *     "when" would be worse than saying nothing.
 *   - The playing venue, ceremony dates, rest days and round schedule are NOT
 *     yet announced. The page says so explicitly. Gaps stated as gaps read as
 *     current; gaps left silent read as omissions.
 *   - The US$2.5M prize fund is NOT in FIDE's release. It is attributed in the
 *     body to the reporting it comes from, and must stay attributed.
 *   - "Both players are 20" is true at the first move and FALSE by the end:
 *     Sindarov was born 8 Dec 2005 and turns 21 on 8 December, mid-match. Every
 *     wire report is running the unqualified version. Do not copy it.
 *   - Ratings and ranks are the July 2026 FIDE list, consistent with the
 *     head-to-head piece: Sindarov 2777 (4th), Gukesh 2717 (26th). The LIVE
 *     figure for Gukesh is 2703, post-Chennai. Both pages carry both numbers
 *     and label which is which - an earlier draft gave only the published list
 *     here and only the live figure there, which reads as the two pages
 *     disagreeing. Keep them labelled.
 *   - QUALIFICATION IS A CHAIN, NOT A PAIR. The 2025 World Cup won him a seat
 *     at the Candidates; the Candidates won him the title match. A draft said
 *     he "earned his place in Geneva the hard way, twice", which collapses two
 *     different prizes into one and is simply wrong - the Candidates is the
 *     only door into a title match. Keep the two steps distinct.
 *   - Sindarov is the OLDER player: 8 Dec 2005 vs Gukesh's 29 May 2006, by
 *     roughly six months. A draft close had Gukesh handing the title to
 *     "someone younger still", which is backwards. If Sindarov wins he does NOT
 *     take the youngest-champion record - Gukesh set that at 18 and will keep
 *     it. Do not reintroduce that line.
 */

/**
 * Photo with an explicit credit line, sized for mobile.
 *
 * Same contract as the other title-match articles: a 600px sibling for phones,
 * explicit width/height so the box is reserved before the image lands, eager +
 * high fetch priority on the single LCP image only. See
 * docs/Fixes/INDIA_PERFORMANCE_FIX_PLAN.md (mobile PSI 39 -> 98).
 *
 * Credits are per-photo and come from
 * public/assets/news/title-matches-2026/CREDITS.md. THREE different licences are
 * mixed in that folder - FIDE material, CC BY-SA 2.0 and CC BY-SA 4.0 - so do
 * not copy a credit line from a neighbouring image. Look it up.
 */
function Photo({
  src, alt, credit, width, height, priority = false, eager = false,
  sizes = '(max-width: 896px) 100vw, 896px', className = '',
}: {
  src: string;
  alt: string;
  credit: string;
  width: number;
  height: number;
  priority?: boolean;
  eager?: boolean;
  sizes?: string;
  className?: string;
}) {
  const small = src.replace(/\.webp$/, '-600.webp');
  return (
    <figure className={`my-6 ${className}`}>
      <img
        src={src}
        srcSet={`${small} 600w, ${src} ${width}w`}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto rounded-lg border border-border"
        loading={priority || eager ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
      />
      <figcaption className="text-xs text-muted-foreground mt-2 text-right italic">
        Photo: {credit}
      </figcaption>
    </figure>
  );
}

/** One row of the facts card. Label left, value right, readable at 390px. */
function FactRow({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 border-b border-border/60 last:border-b-0">
      <span className="text-sm text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-right">
        <span className="text-base sm:text-lg font-semibold text-foreground">{value}</span>
        {note && <span className="block text-xs text-muted-foreground mt-0.5">{note}</span>}
      </span>
    </div>
  );
}

const WorldChampionship2026Announced = () => {
  return (
    <>
      <SeoHead routeKey="news/world-championship-2026-geneva" />

      <div className="bg-background flex flex-col">

        {/* -- Hero ---------------------------------------------------------- */}
        <div className="relative overflow-hidden border-b border-border">
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
            <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

            <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">
              Title Match Build-up &middot; Part Three
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
              Geneva, 25 November
            </h1>
            <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
              The youngest World Championship match in history finally has a date and a place
            </h2>

            <p className="text-muted-foreground text-sm">Published 29 July 2026</p>
          </div>
        </div>

        {/* -- Article Body -------------------------------------------------- */}
        <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">

            {/*
              THE ANSWER BLOCK. First thing under the hero, before any prose.
              This is what the search traffic came for.
            */}
            <section className="mb-12 bg-card border border-border rounded-lg p-5 sm:p-7">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                FIDE World Championship 2026 &mdash; the details
              </h2>
              <FactRow label="Players" value="Gukesh Dommaraju vs Javokhir Sindarov" note="Reigning champion vs Candidates winner" />
              <FactRow label="Dates" value="25 November &ndash; 15 December 2026" />
              <FactRow label="City" value="Geneva, Switzerland" note="Playing venue not yet announced" />
              <FactRow label="Games" value="14 classical" />
              <FactRow label="To win" value="7&frac12; points" note="The match stops the moment someone reaches it" />
              <FactRow label="If it is 7&ndash;7" value="Rapid and blitz tiebreaks" note="Detailed tiebreak format not yet published" />
              <FactRow label="Time control" value="Not yet announced" note="The 2024 title match used 120 minutes for 40 moves, then 30 minutes with a 30-second increment from move 41" />
            </section>

            {/*
              Lead image sits BELOW the facts card, not above it. A hero photo
              here would push the dates and venue off a 390px screen, and the
              dates are what the search traffic came for. It is still the LCP
              element, so it keeps priority.
            */}
            <Photo
              src="/assets/news/title-matches-2026/geneva-jet-deau.webp"
              alt="The Jet d'Eau fountain on Lake Geneva throwing a rainbow across the Geneva waterfront, with the city skyline and the Alps behind it"
              credit="Terragio67 / Wikimedia Commons, CC BY-SA 4.0"
              width={1400}
              height={933}
              priority
            />
            <p className="text-sm text-muted-foreground -mt-3 mb-10 italic">
              Geneva will host the World Championship from 25 November. The playing venue inside the
              city has not been announced.
            </p>

            {/* -- Intro ----------------------------------------------------- */}
            <section className="mb-12">
              <p className="text-muted-foreground leading-relaxed mb-4">
                FIDE confirmed on 28 July that the 2026 World Chess Championship will be played in
                Geneva, from 25 November to 15 December. It is the first time the title match has been
                held in Switzerland since Vladimir Kramnik defended against Peter Leko in Brissago in
                2004 &mdash; a gap of twenty-two years.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The choice of a neutral country is the point. The champion is Indian, the challenger is
                Uzbek, and neither federation hosts.
              </p>
              <blockquote className="border-l-2 border-primary/40 pl-4 my-6 text-muted-foreground italic leading-relaxed">
                &ldquo;FIDE has decided to stage the match on neutral soil and bring it to Geneva, a city
                with a historic tradition of bringing nations and cultures together.&rdquo;
                <span className="block not-italic text-sm text-muted-foreground mt-2">
                  &mdash; Viswanathan Anand, FIDE Interim President
                </span>
              </blockquote>
              <p className="text-muted-foreground leading-relaxed">
                &ldquo;Twenty-two years after Brissago, an event of global chess significance is
                returning to Switzerland,&rdquo; said Andr&eacute; V&ouml;gtlin, president of the Swiss
                Chess Federation.
              </p>
            </section>

            {/* -- Still unannounced ----------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                What Has Not Been Announced Yet
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                FIDE has given the city, the dates and the format. Still to come:
              </p>
              <ul className="text-muted-foreground leading-relaxed space-y-2 mb-4 list-disc pl-5">
                <li>the playing venue inside Geneva</li>
                <li>the opening and closing ceremony dates</li>
                <li>the round-by-round schedule and the rest days</li>
                <li>the match regulations, including the time control and the tiebreak format</li>
                <li>ticketing and broadcast arrangements</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                FIDE has said these will follow in the coming weeks. One figure already circulating is
                the prize fund: reporting around the announcement puts it at US$2.5 million, matching the
                last title match, though that number does not appear in FIDE&rsquo;s own release.
              </p>
            </section>

            {/* -- The age story --------------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Youngest Title Match Ever Played
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Gukesh Dommaraju was born on 29 May 2006. Javokhir Sindarov was born on 8 December 2005.
                When the first move is played in Geneva, both of them will be twenty years old. No World
                Championship match has ever been contested by two players that young.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                There is a detail in those dates worth noticing. Sindarov turns twenty-one on 8 December,
                a week before the scheduled finish. Whether that happens with the match still running
                depends on the match itself: the title is decided the moment someone reaches 7&frac12;
                points, and a one-sided fortnight would have the thing settled before his birthday.
                Should it go the distance, the youngest World Championship in history will finish with
                only one twenty-year-old still in it.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                For scale: Garry Kasparov was 22 when he became the youngest World Champion in 1985, and
                that record stood for thirty-nine years until Gukesh took it at 18. Both men in Geneva
                are younger now than Kasparov was then.
              </p>
            </section>

            {/* -- The challenger -------------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Who Is Javokhir Sindarov?
              </h2>
              <Photo
                src="/assets/news/title-matches-2026/sindarov-trophy.webp"
                alt="Javokhir Sindarov holding the winner's trophy at the 2026 FIDE Candidates Tournament in Cyprus"
                credit="FIDE / Niki Riga"
                width={1400}
                height={933}
              />
              <p className="text-muted-foreground leading-relaxed mb-4">
                Born in Tashkent, and a grandmaster at twelve years, ten months and eight days &mdash;
                the second-youngest in the history of the game at the time he did it. He was part of the
                Uzbek team that won gold at the 44th Chess Olympiad.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                He got here the hard way, in two stages. First the 2025 World Cup, won as the sixteenth
                seed &mdash; the youngest winner the event has had, and the first from Uzbekistan &mdash;
                beating Wei Yi in the final. That put him in the Candidates, and he won that in Cyprus
                with a round to spare, on 10/14: six wins, eight draws, not a single loss in fourteen
                games. It is the highest score anyone has recorded in the tournament&rsquo;s current
                format.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                His coach, Roman Vidonyak, describes a &ldquo;universal talent&rdquo; with &ldquo;all the
                arsenal of skills that super-grandmasters possess.&rdquo; The results back the aggressive
                reputation: he knocked Alireza Firouzja out of the 2021 World Cup while ranked 121st in
                the world, and Maxime Vachier-Lagrave out of the 2023 edition.
              </p>
            </section>

            {/* -- The rating anomaly ---------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Challenger Is The Favourite
              </h2>
              <Photo
                src="/assets/news/title-matches-2026/gukesh-tata-steel.webp"
                alt="Gukesh Dommaraju, reigning World Chess Champion, at the board during the 2025 Tata Steel Chess Tournament"
                credit="Frans Peeters / Wikimedia Commons, CC BY-SA 2.0"
                width={1400}
                height={933}
              />
              <p className="text-muted-foreground leading-relaxed mb-4">
                This is the part that makes Geneva unusual. On the published July 2026 FIDE list Sindarov
                is rated 2777 and ranked fourth in the world, the highest-rated player in Uzbekistan and
                in Asia. Gukesh, who holds the title, is rated 2717 and ranked twenty-sixth. On the live
                list, which has since absorbed his last-place finish at the Chennai Grand Masters, Gukesh
                is down to 2703.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                So the champion goes into his title defence sixty points and twenty-two places below his
                challenger on the official list, and closer to seventy-five points below on current form.
                That is not the usual arrangement. Nor is the head-to-head record, which
                also runs the wrong way: they have met three times in classical chess, Sindarov has won
                two of them, and Gukesh has never beaten him at the classical time control.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                That record needs its context, though, and it is context that cuts against the easy
                conclusion &mdash; both of Sindarov&rsquo;s wins came years before Gukesh was champion,
                when he was a junior rated 2354 and then a 2659 player. We went through all of it, game by
                game, in part one of this series.
              </p>
              <div className="mt-6">
                <Link
                  to="/news/sindarov-gukesh-head-to-head"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors inline-block"
                >
                  Read: The Champion Is Ranked 26th
                </Link>
              </div>
            </section>

            {/* -- Close ------------------------------------------------------ */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                What Happens Between Now And November
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Four months. Both players will have tournaments to play and preparation to hide, and the
                rating list will keep moving in the meantime &mdash; which matters more than usual this
                time, because the gap between champion and challenger is one of the things the match is
                being asked to explain.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The women&rsquo;s title match runs on its own track, and we previewed that separately.
                Geneva is the one that decides whether the youngest World Champion in history keeps the
                crown at the first time of asking, or loses it to a man six months his senior who has
                never yet lost to him in a classical game.
              </p>
            </section>

            {/* -- Internal links --------------------------------------------- */}
            <section className="mb-12 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                Read next
              </h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/news/sindarov-gukesh-head-to-head"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                >
                  Every game they have played
                </Link>
                <Link
                  to="/news/candidates-2026-conclusion"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                >
                  How Sindarov won the Candidates
                </Link>
                <Link
                  to="/news/vaishali-ju-wenjun-title-match"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                >
                  The women&rsquo;s title match
                </Link>
                <Link
                  to="/champions/gukesh/games"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                >
                  Gukesh&rsquo;s games
                </Link>
                <Link
                  to="/champion-challenge"
                  className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
                >
                  Play a champion&rsquo;s position
                </Link>
              </div>
            </section>

            {/* -- Sources ---------------------------------------------------- */}
            <section className="mb-8 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Sources &amp; Credits
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  Venue, dates, format and official quotes:{' '}
                  <a href="https://www.fide.com/geneva-to-host-fide-world-championship-match-2026/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    FIDE announcement, 28 July 2026
                  </a>
                </li>
                <li>
                  Announcement coverage:{' '}
                  <a href="https://en.chessbase.com/post/geneva-to-host-fide-world-championship-match-2026" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    ChessBase
                  </a>
                  . The 2026 match regulations have not been published; the 2024 time control is given
                  for comparison only
                </li>
                <li>
                  Ratings and world rankings, July 2026 FIDE list:{' '}
                  <a href="https://en.chessbase.com/post/fide-ratings-july-2026" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    ChessBase
                  </a>
                  . Live rating via{' '}
                  <a href="https://2700chess.com/players/gukesh_d" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    2700chess
                  </a>
                </li>
                <li>
                  Sindarov&rsquo;s Candidates win and World Cup run:{' '}
                  <a href="https://en.chessbase.com/post/candidates-tournament-2026-o-14" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    ChessBase
                  </a>{' '}
                  and{' '}
                  <a href="https://www.chess.com/news/view/sindarov-vaishali-win-7-fide-candidates-2026-conclusions" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    Chess.com
                  </a>
                </li>
                <li>
                  Photographs: Geneva by Terragio67 (
                  <a href="https://commons.wikimedia.org/wiki/File:Arc-en-ciel_sur_le_jet_d%27eau_de_Gen%C3%A8ve_-_GT_2025.jpg" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    Wikimedia Commons
                  </a>
                  ,{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    CC BY-SA 4.0
                  </a>
                  , resized and converted to WebP); Gukesh by Frans Peeters (
                  <a href="https://commons.wikimedia.org/wiki/File:D_Gukesh_at_2025_Tata_Steel_CT.jpg" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    Wikimedia Commons
                  </a>
                  ,{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/2.0/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                    CC BY-SA 2.0
                  </a>
                  , cropped, resized and converted to WebP); Sindarov by FIDE / Niki Riga
                </li>
                <li>
                  Prize fund figure reported by the Indian Express; it does not appear in FIDE&rsquo;s
                  announcement and is attributed rather than confirmed here
                </li>
              </ul>
            </section>

          </div>
        </article>

      </div>
    </>
  );
};

export default WorldChampionship2026Announced;
