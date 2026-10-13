import { Helmet } from 'react-helmet-async';
import SeoHead from '@/components/SeoHead';

/**
 * Candidates 2026 — the conclusion piece.
 *
 * A retrospective on both sections: what happened, who delivered, who did not,
 * and where the tournaments turned. The title match is mentioned but is
 * deliberately NOT the subject — that is the next series.
 *
 * Every result here is sourced from the final classification tables, not from
 * recall. No games are embedded because we hold no verified PGNs for the
 * decisive rounds.
 */

/**
 * Photo with an explicit credit line, sized for mobile.
 *
 * Credit is REQUIRED and per-photo: the tournament images in this repo come
 * from mixed sources — FIDE's official photographers for the event shots,
 * Creative Commons portraits for the players — so a blanket "Photo: FIDE"
 * would be wrong for most of them.
 *
 * Performance, per docs/Fixes/INDIA_PERFORMANCE_FIX_PLAN.md (the work that
 * took mobile PSI from 39 to 98):
 *   - `srcset` offers a 600px variant beside the 1400px original, so a phone
 *     downloads ~25KB instead of ~100KB. Every file has a `-600.webp` sibling.
 *   - `width`/`height` are REQUIRED so the browser reserves the box before the
 *     image arrives. Without them each photo shifts the article as it loads,
 *     which is exactly the CLS the perf work drove down to 0.005.
 *   - `priority` marks the one image above the fold. It is the page's LCP
 *     element, so it must load eagerly with high fetch priority; lazy-loading
 *     an LCP image delays the metric it defines. Everything else stays lazy.
 */
function Photo({
  src, alt, credit, width, height, priority = false, className = '',
}: {
  src: string;
  alt: string;
  credit: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  const small = src.replace(/\.webp$/, '-600.webp');
  return (
    <figure className={`my-6 ${className}`}>
      <img
        src={src}
        srcSet={`${small} 600w, ${src} ${width}w`}
        sizes="(max-width: 896px) 100vw, 896px"
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto rounded-lg border border-border"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
      />
      <figcaption className="text-xs text-muted-foreground mt-2 text-right italic">
        Photo: {credit}
      </figcaption>
    </figure>
  );
}

const OPEN_STANDINGS = [
  { pos: 1, name: 'Javokhir Sindarov', flag: '\u{1F1FA}\u{1F1FF}', pts: '10', note: 'Qualified' },
  { pos: 2, name: 'Anish Giri', flag: '\u{1F1F3}\u{1F1F1}', pts: '8½', note: '' },
  { pos: 3, name: 'Fabiano Caruana', flag: '\u{1F1FA}\u{1F1F8}', pts: '7½', note: '' },
  { pos: 4, name: 'Wei Yi', flag: '\u{1F1E8}\u{1F1F3}', pts: '7', note: '' },
  { pos: 5, name: 'Hikaru Nakamura', flag: '\u{1F1FA}\u{1F1F8}', pts: '6½', note: '' },
  { pos: 6, name: 'Matthias Blübaum', flag: '\u{1F1E9}\u{1F1EA}', pts: '6', note: '' },
  { pos: 7, name: 'R Praggnanandhaa', flag: '\u{1F1EE}\u{1F1F3}', pts: '6', note: '' },
  { pos: 8, name: 'Andrey Esipenko', flag: '\u{1F3F3}️', pts: '4½', note: '' },
];

const WOMEN_STANDINGS = [
  { pos: 1, name: 'R Vaishali', flag: '\u{1F1EE}\u{1F1F3}', pts: '8½', note: 'Qualified' },
  { pos: 2, name: 'Bibisara Assaubayeva', flag: '\u{1F1F0}\u{1F1FF}', pts: '8', note: '' },
  { pos: 3, name: 'Zhu Jiner', flag: '\u{1F1E8}\u{1F1F3}', pts: '7½', note: '' },
  { pos: 4, name: 'Aleksandra Goryachkina', flag: '\u{1F3F3}️', pts: '7½', note: '' },
  { pos: 5, name: 'Anna Muzychuk', flag: '\u{1F1FA}\u{1F1E6}', pts: '7', note: '' },
  { pos: 6, name: 'Kateryna Lagno', flag: '\u{1F3F3}️', pts: '6½', note: '' },
  { pos: 7, name: 'Divya Deshmukh', flag: '\u{1F1EE}\u{1F1F3}', pts: '5½', note: '' },
  { pos: 8, name: 'Tan Zhongyi', flag: '\u{1F1E8}\u{1F1F3}', pts: '5½', note: '' },
];

/**
 * Final standings.
 *
 * A real <table>, not a grid of divs: this is tabular data and it is the
 * article's factual anchor, so screen readers need the row/column
 * relationships and the caption. Styled to match the div-based tables in the
 * older recaps.
 */
function StandingsTable({
  caption,
  rows,
}: {
  caption: string;
  rows: typeof OPEN_STANDINGS;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3 w-10">
              #
            </th>
            <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">
              {caption}
            </th>
            <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-16">
              Pts
            </th>
            <th scope="col" className="text-link font-semibold text-sm text-right px-4 py-3 w-24">
              <span className="sr-only">Qualification</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isWinner = p.pos === 1;
            return (
              <tr
                key={p.name}
                className={`border-t border-border/50 ${isWinner ? 'bg-primary/5' : ''}`}
              >
                <td className="text-muted-foreground text-sm px-4 py-3">{p.pos}</td>
                <th
                  scope="row"
                  className={`text-sm text-left font-normal px-4 py-3 ${
                    isWinner ? 'text-foreground font-semibold' : 'text-foreground'
                  }`}
                >
                  <span aria-hidden="true">{p.flag} </span>
                  {p.name}
                </th>
                <td
                  className={`text-sm text-center font-mono font-bold px-4 py-3 ${
                    isWinner ? 'text-link' : 'text-muted-foreground'
                  }`}
                >
                  {p.pts}
                </td>
                <td className="text-xs text-right text-link px-4 py-3">{p.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CandidatesConclusion2026() {
  return (
    <div className="bg-background flex flex-col">
      <SeoHead routeKey="news/candidates-2026-conclusion" />


      {/* -- Hero ---------------------------------------------------------- */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

          <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">
            Candidates 2026 &middot; Conclusions
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
            Two Winners, Two Different Stories
          </h1>
          <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
            Sindarov breaks the Candidates record; Vaishali wins from the bottom of the field
          </h2>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> 14 Rounds
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> Paphos, Cyprus
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-editorial">&#9656;</span> 29 March &ndash; 16 April 2026
            </span>
          </div>

          <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
            One player produced the highest score in the history of the modern Candidates. Another
            won her section having started as the lowest-rated competitor in it. Everything else
            that happened in Paphos happened in their shadow.
          </p>
          <p className="text-muted-foreground text-sm">Published 25 July 2026</p>
        </div>
      </div>

      {/* -- Article Body -------------------------------------------------- */}
      <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/* Above the fold — this is the page's LCP element. */}
          <Photo
            src="/assets/news/candidates-2026-conclusion/sindarov-champion.webp"
            alt="Javokhir Sindarov at the closing ceremony as winner of the 2026 Candidates Tournament"
            credit="FIDE / Niki Riga"
            width={1400}
            height={933}
            priority
          />

          {/* -- Intro ---------------------------------------------------- */}
          <section className="mb-12">
            <p className="text-muted-foreground leading-relaxed mb-4">
              A Candidates Tournament is supposed to be decided in the final rounds. That is the
              format's whole promise: eight players, fourteen games, and a fortnight of accumulated
              tension that resolves on the last afternoon. Paphos did not read the brief. By the
              halfway mark the Open section was effectively finished, and the only genuine question
              left was whether Javokhir Sindarov would break a record on his way out.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              He did. Ten points from fourteen games, unbeaten, with a performance rating of 2908 —
              the highest score anyone has managed in the modern Candidates format, past Ian
              Nepomniachtchi's 9{'½'} from 2022. He gained thirty rating points and arrived in
              the world's top five. He is twenty years old.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The women's section told the opposite kind of story, and was the better tournament for
              it. R Vaishali came to Cyprus rated 2470 — the lowest-rated player in the field, eighth
              of eight on paper — and left it as the challenger for the world title. Two sections,
              two winners, and almost nothing in common between how they did it.
            </p>
          </section>

          {/* -- Open: Sindarov ------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Open Section: A Procession
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The warning had been posted early. In Round 3 Sindarov sacrificed a piece against
              Praggnanandhaa and then explained the resulting complications in the press conference
              with the air of a man reading from notes he had written weeks earlier. In Round 4 he
              beat Fabiano Caruana — at that point his co-leader and the most experienced Candidates
              campaigner in the building — and took sole possession of first place. He never gave it
              back.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              By the halfway point he had 6 from 7, itself a record for the format, and the
              tournament had quietly stopped being a competition. What makes the score remarkable is
              not a hot streak — six wins in fourteen games is excellent but not freakish. It is the
              other eight games. Sindarov did not lose. Not once, in fourteen rounds, against seven
              of the strongest players alive, while carrying the pressure of a lead everyone in the
              building could see. The nearest thing to a blemish was a winning position let slip
              against Bl{'ü'}baum.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              He clinched qualification in Round 13, with a round still to play, and signed off the
              next day with an eight-minute draw against Wei Yi — a formality between two players who
              both knew the tournament was over.
            </p>

            <Photo
              src="/assets/news/candidates-2026-conclusion/open-podium.webp"
              alt="The Open section podium: Sindarov, Giri and Caruana at the closing ceremony"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
            />

            <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
              Giri: second place, and a joke with something behind it
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Anish Giri finished on 8{'½'} from 14 — a{' '}
              <strong className="text-foreground">+3</strong> score, three more wins than losses,
              and a mark that has won Candidates tournaments before, and one he closed out in style by beating Bl{'ü'}baum
              in 28 moves in the final round after his opponent went looking for complications on
              move nine. His own summary was perfect: <em>"Everything is epic, just a small little
              detail: I didn't qualify for the world championship match."</em>
            </p>
            <Photo
              src="/assets/news/candidates-2026-conclusion/giri.webp"
              alt="Anish Giri at the closing ceremony, second on 8.5/14"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
            />
            <p className="text-muted-foreground leading-relaxed mb-6">
              The line is funny because it is true. Giri played one of the best Candidates of his
              career, produced the kind of tournament that has haunted him by its absence for a
              decade, and finished a full point and a half behind. There is no version of this event
              in which he did anything wrong. He simply ran into someone having the tournament of
              their life.
            </p>

            <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
              The ones that got away
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Caruana took third on 7{'½'}, finishing with a sharp attacking win over Esipenko —
              respectable, and nowhere near his own standard for an event he has made his own over
              six appearances. Wei Yi's 7 was a par score that never threatened; his Round 3 loss to
              Caruana in nineteen moves, a piece simply dropped, was the sort of accident that colours
              a whole fortnight.
            </p>
            <Photo
              src="/assets/news/candidates-2026-conclusion/praggnanandhaa.webp"
              alt="R Praggnanandhaa at the closing ceremony after a flat tournament"
              credit="FIDE / Niki Riga"
              width={1400}
              height={2101}
            />
            <p className="text-muted-foreground leading-relaxed mb-4">
              The real disappointments sat lower. Hikaru Nakamura, among the highest-rated players in
              the field, managed 6{'½'} and was never a factor. R Praggnanandhaa, carrying the
              hopes of by far the largest chess audience in the world, finished on 6 — level with
              Bl{'ü'}baum, who came in as the field's outsider and left having matched a player
              rated far above him. For an Indian audience that has grown used to watching its players
              contend for everything, this was a flat tournament.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Andrey Esipenko finished last on 4{'½'}, and the final round summed it up: a loss
              to Caruana in a game that mattered to neither of them.
            </p>

            <StandingsTable caption="Open Section — Final Standings" rows={OPEN_STANDINGS} />
          </section>

          {/* -- Women's -------------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Women's Section: The Best Tournament of the Fortnight
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              While the Open was being settled early, the women's event delivered exactly what the
              format is meant to deliver — a tournament that stayed genuinely open until the final
              afternoon, and was won by the player nobody had picked.
            </p>
            <Photo
              src="/assets/news/candidates-2026-conclusion/vaishali-champion.webp"
              alt="R Vaishali at the closing ceremony as winner of the 2026 Women's Candidates"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
            />
            <p className="text-muted-foreground leading-relaxed mb-4">
              R Vaishali started badly. She lost in Round 1 to Zhu Jiner, and after five rounds she
              was still under water, a game below even, with the leaders ahead of her and no obvious
              reason to think the tournament was hers. What followed was the best sustained stretch
              of chess of her career: level by the middle rounds, then two clear by Round 9, then
              three by Round 11, when she beat Aleksandra Goryachkina in the game that finally
              separated her from the field.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Zhu Jiner beat her a second time in Round 12 — the only player to solve her all
              tournament — and Vaishali's own account of it was revealing: relief, more than anything,
              at no longer having to protect a lead. She won four of her last six. In the final round,
              needing the result to avoid tiebreaks, she beat Kateryna Lagno outright.
            </p>
            <Photo
              src="/assets/news/candidates-2026-conclusion/women-podium.webp"
              alt="The Women's podium: Vaishali, Assaubayeva and Zhu Jiner at the closing ceremony"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
            />
            <p className="text-muted-foreground leading-relaxed mb-6">
              She finished on 8{'½'} from 14 — five wins, seven draws, two losses — half a point
              ahead of Bibisara Assaubayeva, who drew her last against Divya Deshmukh and will wonder
              about it for a while. The detail that frames the whole event: Vaishali gained 26 rating
              points for winning the Candidates and{' '}
              <strong className="text-foreground">is still the lowest-rated player of the eight</strong>.
              She now plays Ju Wenjun for the world title.
            </p>

            <Photo
              src="/assets/news/candidates-2026-conclusion/assaubayeva.webp"
              alt="Bibisara Assaubayeva, who finished second by half a point"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
            />

            <StandingsTable caption="Women's Section — Final Standings" rows={WOMEN_STANDINGS} />
          </section>

          {/* -- What it means -------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              What Paphos Actually Told Us
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Three things, none of them comfortable for the established order.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">The generational handover is not coming — it has
              happened.</strong> The Open was won by its youngest competitor, a twenty-year-old
              rated below several of the players he beat. Hikaru Nakamura, among the most decorated
              names in the field, finished fifth; Praggnanandhaa, its most watched, finished seventh
              on the same score as the tournament's outsider.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Rating told you almost nothing.</strong> The Open
              was won by a player who was not the favourite; the women's section was won by the
              lowest-rated entrant, who remains the lowest-rated entrant. In a fourteen-round
              double round-robin — the most sample-heavy format in elite chess, specifically designed
              to let quality out — that is not noise.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              <strong className="text-foreground">Not losing is the whole skill.</strong> Sindarov
              won six games. Several players below him won nearly as many. What separated him was
              fourteen rounds without a single loss, under the most sustained pressure in chess. The
              margin at the top of the game is not brilliance; it is the absence of bad days.
            </p>
          </section>

          {/* -- Coming next ---------------------------------------------- */}
          <section className="mb-12">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              And Now the Matches
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Both winners have earned the same reward: a match against a reigning champion who has
              been there before. Sindarov meets Gukesh Dommaraju; Vaishali meets Ju Wenjun.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Both are worth waiting for, and both raise questions this article is not the place to
              answer — not least what kind of form the reigning champion will bring to his first
              defence. That is a subject in its own right, and we will come to it.
            </p>
          </section>

          {/* -- Sources --------------------------------------------------- */}
          <section className="mb-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Sources &amp; Credits
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                Final standings and results:{' '}
                <a
                  href="https://candidates2026.fide.com/"
                  className="underline hover:text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FIDE Candidates 2026 Official Site
                </a>
              </li>
              <li>
                Round-by-round detail, scores and performance figures:{' '}
                <a
                  href="https://en.wikipedia.org/wiki/Candidates_Tournament_2026"
                  className="underline hover:text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Candidates Tournament 2026
                </a>{' '}
                and{' '}
                <a
                  href="https://en.wikipedia.org/wiki/Women%27s_Candidates_Tournament_2026"
                  className="underline hover:text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Women's Candidates Tournament 2026
                </a>
              </li>
              <li>
                Final-round reports and the Giri quotation:{' '}
                <a
                  href="https://www.chess.com/news/view/2026-fide-candidates-tournament-round-14"
                  className="underline hover:text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chess.com Round 14 report
                </a>{' '}
                and{' '}
                <a
                  href="https://www.chess.com/news/view/sindarov-vaishali-win-7-fide-candidates-2026-conclusions"
                  className="underline hover:text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Candidates conclusions
                </a>
              </li>
              <li>
                All photos: FIDE / Niki Riga, closing ceremony, 16 April 2026 — used for editorial
                purposes per FIDE Photography Guidelines
              </li>
            </ul>
          </section>
        </div>
      </article>

    </div>
  );
}
