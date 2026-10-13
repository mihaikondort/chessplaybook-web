import { Link } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';

/**
 * Vaishali–Ju Wenjun: the women's title match preview.
 *
 * Title-match build-up, part two. Brief (facts, sources, honest limits):
 * docs/Master Plan - Active/M2/VAISHALI_JU_WENJUN_BRIEF.md
 *
 * House rules carried over from part one:
 *   - No first-person talk about our own data anywhere in the body.
 *   - Every number from a cited published source; the head-to-head was
 *     cross-verified across ESPN and ChessBase India round reports (a third
 *     source's "two games" count is wrong — Norway Women is a double round
 *     robin, two classical meetings per edition).
 *   - The prodigy-curve argument from part one is NOT run here: Ju at 35 is
 *     the standing counterexample, and the piece uses her as exactly that.
 *   - Match dates/venue are unannounced; the Shanghai/Chennai split is ESPN
 *     speculation and is not stated as fact.
 */

/** Photo with credit, same perf contract as the other articles. */
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

/** Ju Wenjun's five title wins. Scores per Wikipedia's championship record. */
const TITLE_RECORD = [
  { year: '2018', opponent: 'Tan Zhongyi', score: '5½–4½', note: 'Won the title' },
  { year: '2018', opponent: '64-player knockout', score: '—', note: 'Defended' },
  { year: '2020', opponent: 'Aleksandra Goryachkina', score: '6–6 (2½–1½ tiebreak)', note: 'Defended' },
  { year: '2023', opponent: 'Lei Tingjie', score: '6½–5½', note: 'Defended' },
  { year: '2025', opponent: 'Tan Zhongyi', score: '6½–2½', note: 'Won with three games to spare' },
];

/** All classical meetings, Norway Chess Women 2024 + 2025 (double round robin). */
const MEETINGS = [
  { event: 'Norway Chess Women 2024', result: 'Ju won', note: "Ju's only classical win in the pair" },
  { event: 'Norway Chess Women 2024', result: 'Draw', note: 'Ju won the unrated armageddon' },
  { event: 'Norway Chess Women 2025', result: 'Draw', note: '' },
  { event: 'Norway Chess Women 2025', result: 'Draw', note: 'Vaishali won the unrated armageddon — her first win over Ju in any form' },
];

const TITLE = 'Vaishali vs Ju Wenjun: The Reign and the Underdog';
const DESCRIPTION =
  'Ju Wenjun has not lost a Women’s World Championship match in eight years and just produced her most dominant defense. Vaishali arrives having never beaten her in classical — and having just won the Candidates as the lowest-rated player in the field.';
const OG_IMAGE = 'https://www.chessplaybook.com/assets/news/title-matches-2026/vaishali-ju-wenjun.webp';

function GlanceRow({ label, left, right }: { label: string; left: string; right: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center py-2 border-t border-border/50">
      <span className="text-sm text-foreground text-right font-medium">{left}</span>
      <span className="text-xs text-muted-foreground uppercase tracking-wider text-center px-1">
        {label}
      </span>
      <span className="text-sm text-foreground text-left font-medium">{right}</span>
    </div>
  );
}

const VaishaliJuWenjunTitleMatch = () => {
  return (
    <div className="bg-background flex flex-col">
      <SeoHead routeKey="news/vaishali-ju-wenjun-title-match" />


      {/* -- Hero ---------------------------------------------------------- */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

          <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">
            Title Match Build-up &middot; Part Two
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
            The Reign and the Underdog
          </h1>
          <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
            Vaishali, Ju Wenjun, and the title match that is the men&rsquo;s in reverse
          </h2>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> 5 titles since 2018
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> 4 classical meetings
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-editorial">&#9656;</span> No classical win for Vaishali
            </span>
          </div>

          <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
            The men&rsquo;s title match asks whether a champion has already peaked. The
            women&rsquo;s asks the opposite question: whether anything can interrupt the most
            stable reign in chess.
          </p>
          <p className="text-muted-foreground text-sm">Published 27 July 2026</p>
        </div>
      </div>

      {/* -- Article Body -------------------------------------------------- */}
      <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/* LCP element: the two of them together, from the Candidates closing ceremony. */}
          <Photo
            src="/assets/news/title-matches-2026/vaishali-ju-wenjun.webp"
            alt="Vaishali Rameshbabu and Women's World Champion Ju Wenjun together at the 2026 Candidates closing ceremony"
            credit="FIDE / Michal Walusza"
            width={1400}
            height={933}
            priority
          />

          {/* -- Intro ---------------------------------------------------- */}
          <section className="mb-10 mt-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              While one World Champion spent the last fifteen months sliding down the rating
              list, the other one quietly produced the most one-sided match of her reign. In April
              2025, at thirty-four, Ju Wenjun defended her title 6½&ndash;2½ — with three games to
              spare, against the same opponent she had needed a final-game win to beat in 2018.
              Seven years into her reign, she was getting more dominant, not less.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The woman coming to take that title has never beaten her in a game that counts
              for rating: not in four classical meetings, not in rapid — one unrated armageddon
              win at Norway Chess last year is the whole of it. Vaishali Rameshbabu arrives as the kind
              of underdog the record books are unkind to.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              She also arrives as the woman who just won the Candidates as the lowest-rated
              player in the field — eighth of eight on paper, first when it was over. Whatever
              the numbers say about this match, Vaishali&rsquo;s entire 2026 has been an argument
              against reading numbers as destiny.
            </p>
          </section>

          {/* -- At a glance ---------------------------------------------- */}
          <section className="mb-16 bg-card border border-border rounded-lg p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">
              The matchup at a glance
            </h2>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-end pb-1">
              <span className="text-base sm:text-lg font-playfair font-bold text-foreground text-right">
                Ju Wenjun
              </span>
              <span className="text-xs text-muted-foreground text-center px-1">vs</span>
              <span className="text-base sm:text-lg font-playfair font-bold text-foreground text-left">
                Vaishali
              </span>
            </div>
            <GlanceRow label="Age" left="35" right="25" />
            <GlanceRow label="Rating" left="2560" right="2496" />
            <GlanceRow label="World titles" left="5" right="0" />
            <GlanceRow label="Classical wins, head to head" left="1" right="0" />
            <GlanceRow label="Title matches lost since 2018" left="0" right="—" />
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Three classical draws between them. Dates and venue not yet announced.
            </p>
          </section>

          {/* -- The reign ------------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Eight Years Without Losing a Match
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Ju Wenjun has held the Women&rsquo;s World Championship continuously since May
              2018, through every format FIDE has thrown at it:
            </p>

            <div className="bg-card border border-border rounded-lg overflow-x-auto mb-6">
              <table className="w-full border-collapse min-w-[480px]">
                <caption className="sr-only">
                  Ju Wenjun&rsquo;s five Women&rsquo;s World Championship titles
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3 w-16">Year</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Opponent / format</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-40">Score</th>
                    <th scope="col" className="text-link font-semibold text-sm text-right px-4 py-3 w-44">
                      <span className="sr-only">Outcome</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TITLE_RECORD.map((t, i) => (
                    <tr key={i} className={`border-t border-border/50 ${i === TITLE_RECORD.length - 1 ? 'bg-primary/5' : ''}`}>
                      <td className="text-muted-foreground text-sm px-4 py-3">{t.year}</td>
                      <th scope="row" className="text-sm text-left font-normal text-foreground px-4 py-3">{t.opponent}</th>
                      <td className="text-sm text-center font-mono text-muted-foreground px-4 py-3">{t.score}</td>
                      <td className="text-xs text-right text-link px-4 py-3">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4">
              Read the last row again. The 2025 defense was not a veteran hanging on — it was the
              most one-sided match of her reign, against Tan Zhongyi, the opponent who had taken
              her the full distance in 2018. Seven years apart, same two players, and the gap had
              grown.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              There is one honest caveat, and it matters for a match: Ju barely plays classical
              chess anymore. In 2025 her only classical event outside the championship was Norway
              Chess Women, where she finished mid-field. A champion who plays little is hard to
              scout — and hard to judge. The 6½&ndash;2½ says the match player is intact. The
              thin calendar says nobody outside her own camp really knows her current level
              between matches.
            </p>
          </section>

          {/* -- The challenger -------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Underdog Who Keeps Ignoring the Script
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Vaishali came to the 2026 Candidates in Paphos rated 2470 — the lowest-rated player
              of the eight, in a field led by Aleksandra Goryachkina and Tan Zhongyi. She won it
              with 8½ from 14. Not on tiebreaks, not by surviving — outright, with a final-round
              win. It made her the challenger the seedings said should not exist.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              She is twenty-five, a grandmaster since 2024 — she and her younger brother
              Praggnanandhaa are the best-known sibling pair in chess — and her arc has none of
              the smoothness of a favourite&rsquo;s. She qualified, struggled, rebuilt, and then
              produced the tournament of her life at exactly the moment it counted. The Candidates
              run is covered in detail in{' '}
              <Link to="/news/candidates-2026-conclusion" className="text-link hover:underline">
                our conclusions piece
              </Link>
              .
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The honest version of her chances starts with the record above and does not flinch:
              a 64-point rating gap, no classical win against the champion, and an opponent who
              has never lost a title match. But it also includes this — the ratings and the
              seedings wrote her off in Paphos too, and the field they favoured is not the one
              going to the title match.
            </p>
          </section>

          <Photo
            src="/assets/news/title-matches-2026/vaishali-trophy.webp"
            alt="Vaishali Rameshbabu with the 2026 Women's Candidates trophy"
            credit="FIDE / Niki Riga"
            width={1400}
            height={933}
          />

          {/* -- Every game ------------------------------------------------ */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Every Game They Have Played
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Four classical meetings, all at Norway Chess Women, which pairs its double
              round-robin with unrated armageddon tiebreaks after draws:
            </p>

            <div className="bg-card border border-border rounded-lg overflow-x-auto mb-6">
              <table className="w-full border-collapse min-w-[480px]">
                <caption className="sr-only">
                  All classical games between Ju Wenjun and Vaishali
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Event</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-24">Result</th>
                    <th scope="col" className="text-link font-semibold text-sm text-right px-4 py-3">
                      <span className="sr-only">Note</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MEETINGS.map((g, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <th scope="row" className="text-sm text-left font-normal text-foreground px-4 py-3">{g.event}</th>
                      <td className={`text-sm text-center font-mono font-bold px-4 py-3 ${g.result === 'Ju won' ? 'text-editorial' : 'text-muted-foreground'}`}>
                        {g.result}
                      </td>
                      <td className="text-xs text-right text-muted-foreground px-4 py-3">{g.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              The trend inside the small sample favours the challenger: the loss came in 2024,
              the draws have got steadier, and the 2025 armageddon win — unrated, but her first
              victory over Ju in any form — broke a long sequence of coming second to her.
              Four games is not evidence of much. But it is not nothing that the line points up.
            </p>
          </section>

          {/* -- The mirror ------------------------------------------------ */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Mirror Image of the Men&rsquo;s Match
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Put the two 2026 title matches side by side and they invert almost perfectly. The
              men&rsquo;s champion is twenty and ranked twenty-two places below his challenger;
              the women&rsquo;s champion is thirty-five and outrates hers by sixty-four points.
              Gukesh&rsquo;s question is whether the player who won in December 2024 still
              exists. Ju&rsquo;s is whether an eight-year fortress has a door.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Ju Wenjun is also, quietly, the strongest argument against the early-peak anxiety
              hanging over the men&rsquo;s match. Her peak rating came in 2017 — and eight years
              later she is producing the most dominant match results of her life. Careers in
              chess do not run on one curve.{' '}
              <Link to="/news/sindarov-gukesh-head-to-head" className="text-link hover:underline">
                Part one of this series
              </Link>{' '}
              asked whether a champion can peak at twenty; this match features a champion who
              made peaking look optional at thirty-five.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              And the two matches share one thread: both challengers made their case in Paphos in
              April, in the same building, a corridor apart. If both of them win, chess crowns
              two first-time champions in the same cycle. If both champions hold, the established
              order will have answered back twice.
            </p>
          </section>

          {/* -- Close ---------------------------------------------------- */}
          <section className="mb-12">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              What Would An Upset Actually Take
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The dates and the venue are not announced yet. What is already clear is the shape
              of Vaishali&rsquo;s problem: you do not outlast Ju Wenjun in a match — no
              challenger has taken the title from her, and the one who dragged her to tiebreaks
              in 2020 still lost.
              An upset needs what the Candidates run showed in flashes: sharp preparation landing
              early, and the nerve to play for wins in positions where the safer player would
              bank the draw.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The record says Ju, comfortably. The record also said Vaishali finishes eighth in
              Paphos. That is the whole reason they play the matches.
            </p>
          </section>

          {/* -- Internal links ------------------------------------------- */}
          <section className="mb-12 bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
              More from the title-match build-up
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/news/sindarov-gukesh-head-to-head"
                className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
              >
                Part one: Sindarov vs Gukesh
              </Link>
              <Link
                to="/news/candidates-2026-conclusion"
                className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
              >
                How both challengers won in Paphos
              </Link>
              <Link
                to="/champion-challenge"
                className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
              >
                Play a champion&rsquo;s position
              </Link>
            </div>
          </section>

          {/* -- Sources --------------------------------------------------- */}
          <section className="mb-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Sources &amp; Credits
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                Ju Wenjun&rsquo;s championship record, ratings and career:{' '}
                <a href="https://en.wikipedia.org/wiki/Ju_Wenjun" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  career record
                </a>
              </li>
              <li>
                Vaishali&rsquo;s career and Candidates win:{' '}
                <a href="https://en.wikipedia.org/wiki/Vaishali_Rameshbabu" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  career record
                </a>{' '}
                and{' '}
                <a href="https://www.fide.com/vaishali-conquers-womens-candidates-to-set-up-world-title-showdown-against-ju-wenjun/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  FIDE
                </a>
              </li>
              <li>
                Head-to-head record and match background:{' '}
                <a href="https://www.espn.com/chess/story/_/id/48504971/r-vaishali-vs-ju-wenjun-way-too-early-preview-womens-world-chess-championship" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  ESPN&rsquo;s preview
                </a>{' '}
                and{' '}
                <a href="https://www.chessbase.in/news/Norway-Chess-Women-2025-Round-8-report" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  ChessBase India&rsquo;s Norway Chess round reports
                </a>
              </li>
              <li>
                Photographs: FIDE, from the 2026 Candidates in Paphos — Ju Wenjun and Vaishali by
                Michal Walusza; Vaishali with the trophy by Niki Riga
              </li>
            </ul>
          </section>
        </div>
      </article>

    </div>
  );
};

export default VaishaliJuWenjunTitleMatch;
