import { Link } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';

/**
 * Sindarov–Gukesh: the head-to-head, and the trajectory question.
 *
 * First piece of the title-match build-up series (M2 work-queue item 2).
 * Brief: docs/Master Plan - Active/M2/SINDAROV_GUKESH_HEAD_TO_HEAD_BRIEF.md
 *
 * ---------------------------------------------------------------------------
 * HOUSE RULE FOR THIS PIECE: the article NEVER talks about our own data.
 *
 * No mention of this site's database, what it holds, where its game files come
 * from, or which games are missing from it. Two reasons, both from the owner:
 * it is bad writing — self-referential plumbing dropped into the middle of an
 * argument — and the records are all publicly available anyway, so a gap on our
 * side is our problem to fix, not a caveat to publish. Sources cites published
 * references only. Do not reintroduce first-person data confessions.
 *
 * INTERNAL PROVENANCE, kept here and deliberately not in the body: the
 * seven-game record, the rating history and the score-by-game-length figures
 * were measured from the current PGN Mentor player collection. This site's own
 * database is a snapshot ending 2025-01-01 and does not contain the later
 * meetings — see M2 work-queue item 10 for the refresh that closes that gap.
 * ---------------------------------------------------------------------------
 *
 * The piece makes a contestable claim about a living twenty-year-old, so the
 * evidentiary bar is higher than usual, not lower:
 *
 *   - Every rating, rank, age and result is from a published source or measured
 *     from game files. Nothing is from recall. Two review rounds caught real
 *     errors in exactly this class of claim, including a Chennai record that was
 *     arithmetically impossible and a Ballon d'Or age that was a year out.
 *   - The decline is presented as measurement. The PREDICTION that it is
 *     permanent is presented as a question, with the counter-case given real
 *     weight and the post-title confound named by us rather than left for a
 *     reader to find.
 *   - Gukesh was NOT the top seed at Chennai — he was joint fifth of eight.
 *     An earlier draft claimed otherwise and drew a "no excuse" conclusion from
 *     it. The accurate framing is stronger: a reigning champion seeded fifth.
 *
 * Fact-checking changed the argument rather than decorating it. Ostapenko was
 * cut from the cross-sport parallels because checking her disproved the point,
 * and the body says so; the physical-cause passage argues against our own thesis
 * because that is where the evidence led.
 */

/**
 * Photo with an explicit credit line, sized for mobile.
 *
 * Credits are per-photo and come from
 * public/assets/news/title-matches-2026/CREDITS.md. NOTE that the Gukesh photo is
 * Wikimedia Commons CC BY-SA 2.0, not FIDE material like the rest — its licence
 * requires the attribution AND the declared crop/resize recorded there.
 *
 * Perf contract per docs/Fixes/INDIA_PERFORMANCE_FIX_PLAN.md (mobile PSI
 * 39 -> 98): a 600px sibling for phones, explicit width/height so the box is
 * reserved before the image lands, eager + high fetch priority on the single
 * above-the-fold LCP image only.
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
  /** The one above-the-fold LCP image: eager + high fetch priority. */
  priority?: boolean;
  /** Above the fold but not the LCP element — eager, normal priority. */
  eager?: boolean;
  /**
   * Rendered width, for picking a srcset candidate. The default assumes one
   * full-width image, which is how every other article on the site uses this.
   * A side-by-side pair MUST override it — otherwise the browser is told the
   * slot is 896px wide, picks the 1400px file for a ~440px box, and downloads
   * roughly three times the bytes it needs.
   */
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

/**
 * All seven meetings.
 *
 * `classical: false` marks the rapid/blitz/online games. They are shown because
 * omitting them would be cherry-picking, but they are excluded from the headline
 * record, which is the classical one.
 */
const MEETINGS = [
  { date: '4 Feb 2018', event: '14th Moscow Open A', white: 'Gukesh', black: 'Sindarov', result: '0–1', classical: true, note: 'Gukesh rated 2354' },
  { date: '22 May 2022', event: '5th Sharjah Masters', white: 'Sindarov', black: 'Gukesh', result: '1–0', classical: true, note: 'Gukesh rated 2659' },
  { date: '25 Mar 2025', event: 'Titled Tuesday', white: 'Sindarov', black: 'Gukesh', result: '½–½', classical: false, note: 'Online blitz' },
  { date: '17 Jan 2026', event: '88th Tata Steel Masters', white: 'Sindarov', black: 'Gukesh', result: '½–½', classical: true, note: 'Their only meeting as peers' },
  { date: '6 May 2026', event: 'GCT Super Rapid, Poland', white: 'Sindarov', black: 'Gukesh', result: '0–1', classical: false, note: 'Rapid' },
  { date: '8 May 2026', event: 'GCT Super Blitz, Poland', white: 'Sindarov', black: 'Gukesh', result: '1–0', classical: false, note: 'Blitz' },
  { date: '9 May 2026', event: 'GCT Super Blitz, Poland', white: 'Gukesh', black: 'Sindarov', result: '0–1', classical: false, note: 'Blitz' },
];

/** FIDE July 2026 open list. Abridged — the ranks that matter to the argument. */
const RANKINGS = [
  { pos: 1, name: 'Magnus Carlsen', rating: 2823, note: '' },
  { pos: 2, name: 'Fabiano Caruana', rating: 2792, note: '' },
  { pos: 3, name: 'Hikaru Nakamura', rating: 2792, note: '' },
  { pos: 4, name: 'Javokhir Sindarov', rating: 2777, note: 'Challenger' },
  { pos: 12, name: 'Alireza Firouzja', rating: 2749, note: '' },
  { pos: 14, name: 'Viswanathan Anand', rating: 2739, note: '' },
  { pos: 15, name: 'Ding Liren', rating: 2738, note: '' },
  { pos: 19, name: 'Hans Niemann', rating: 2730, note: '' },
  { pos: 26, name: 'Gukesh Dommaraju', rating: 2717, note: 'World Champion' },
];

/**
 * Quantbox Chennai Grand Masters, 16–22 July 2026. Final crosstable.
 *
 * Firouzja is 2–5–0, NOT the 2–3–2 one aggregator lists: reports describe him as
 * unbeaten, 2+2.5 is the only record yielding 4½, and the field's wins and losses
 * only balance (8 each) with this version. Cross-foot any crosstable before use.
 */
const CHENNAI = [
  { pos: 1, name: 'Alireza Firouzja', score: '4½', record: '2–5–0' },
  { pos: 2, name: 'Dmitry Andreikin', score: '4', record: '1–6–0' },
  { pos: 3, name: 'Arjun Erigaisi', score: '4', record: '2–4–1' },
  { pos: 4, name: 'Nodirbek Abdusattorov', score: '3½', record: '1–5–1' },
  { pos: 5, name: 'Pranesh M', score: '3½', record: '1–5–1' },
  { pos: 6, name: 'Nihal Sarin', score: '3½', record: '1–5–1' },
  { pos: 7, name: 'Hans Niemann', score: '3', record: '0–6–1' },
  { pos: 8, name: 'Gukesh Dommaraju', score: '2', record: '0–4–3' },
];

const TITLE = 'Sindarov vs Gukesh: The Champion Is Ranked 26th';
const DESCRIPTION =
  'Javokhir Sindarov is the world number 4. Gukesh, the reigning World Champion he must beat, is ranked 26th and is 91 points below his peak. Their full head-to-head record, and the uncomfortable question underneath it.';
const OG_IMAGE = 'https://www.chessplaybook.com/assets/news/title-matches-2026/gukesh-tata-steel.webp';

/** One row of the at-a-glance band. */
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

const SindarovGukeshHeadToHead = () => {
  return (
    <div className="bg-background flex flex-col">
      <SeoHead routeKey="news/sindarov-gukesh-head-to-head" />


      {/* -- Hero ---------------------------------------------------------- */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

          <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">
            Title Match Build-up &middot; Part One
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
            The Champion Is Ranked 26th
          </h1>
          <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
            Sindarov, Gukesh, and a head-to-head record that reads the wrong way round
          </h2>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> Both aged 20
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-link">&#9656;</span> 7 Meetings
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-editorial">&#9656;</span> Gukesh has never won a classical one
            </span>
          </div>

          <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
            A challenger normally has to prove he belongs at the same table as the champion. This time
            the rating list has it the other way round, by twenty-two places.
          </p>
          <p className="text-muted-foreground text-sm">Published 27 July 2026</p>
        </div>
      </div>

      {/* -- Article Body -------------------------------------------------- */}
      <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/*
            Paired lead images, equal weight. An earlier draft illustrated a piece
            critical of Gukesh with photographs of his opponent only, which was
            unfair on its face. The Gukesh photo is the page's LCP element.
          */}
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <Photo
              src="/assets/news/title-matches-2026/gukesh-tata-steel.webp"
              alt="Gukesh Dommaraju, reigning World Chess Champion, at the board during the 2025 Tata Steel Chess Tournament"
              credit="Frans Peeters / Wikimedia Commons, CC BY-SA 2.0"
              width={1400}
              height={933}
              priority
              sizes="(max-width: 640px) 100vw, 440px"
              className="my-0"
            />
            <Photo
              src="/assets/news/title-matches-2026/sindarov-portrait.webp"
              alt="Javokhir Sindarov, winner of the 2026 Candidates Tournament and challenger for the World Championship"
              credit="FIDE / Niki Riga"
              width={1400}
              height={933}
              eager
              sizes="(max-width: 640px) 100vw, 440px"
              className="my-0"
            />
          </div>

          {/* -- Intro ---------------------------------------------------- */}
          <section className="mb-10 mt-8">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Two boys were born six months apart, in the winter and the spring of the same school year.
              One of them is the World Chess Champion. The other is about to play him for the title. They
              are both twenty years old, and they first sat down opposite each other when they were eleven
              and twelve.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Here is the part that does not fit the story. The champion is the lower-ranked player, and
              not by a little. Javokhir Sindarov is the fourth-highest-rated player in the world. Gukesh
              Dommaraju, who holds the title Sindarov is coming to take, is twenty-sixth — below Ding
              Liren, the man he beat for the crown, and below Viswanathan Anand, who is fifty-six.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Five days before this was written, Gukesh finished last at a tournament in his home city of
              Chennai, winless in seven games, and held on to his place among the world's 2700-rated
              players by taking a short draw in the final round. So there is a question worth asking out
              loud, and it is not a comfortable one: has Gukesh already peaked?
            </p>
          </section>

          {/* -- At a glance ---------------------------------------------- */}
          <section className="mb-16 bg-card border border-border rounded-lg p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">
              The matchup at a glance
            </h2>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-end pb-1">
              <span className="text-base sm:text-lg font-playfair font-bold text-foreground text-right">
                Sindarov
              </span>
              <span className="text-xs text-muted-foreground text-center px-1">vs</span>
              <span className="text-base sm:text-lg font-playfair font-bold text-foreground text-left">
                Gukesh
              </span>
            </div>
            <GlanceRow label="Age" left="20" right="20" />
            <GlanceRow label="World rank" left="4th" right="26th" />
            <GlanceRow label="Rating" left="2777" right="2703" />
            <GlanceRow label="Classical wins, head to head" left="2" right="0" />
            <GlanceRow label="All formats" left="4 wins" right="1 win" />
            <p className="text-xs text-muted-foreground mt-4 text-center">
              One draw in classical, two in all formats, seven meetings in total.{' '}
              <a href="#all-seven-games" className="underline hover:text-link">
                Jump to every game they have played
              </a>
            </p>
          </section>

          {/* -- The prodigy question ------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Prodigy Who Does Not Come Back &mdash; How Often, Really?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sport has a particular kind of story it does not much like telling. Someone very young wins
              the biggest thing there is, everybody decides an era has begun, and then the era does not
              begin. They stay good. They never go back.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The cleanest example is not from chess. At the Sydney Olympics in 2000 the Romanian swimmer{' '}
              <strong className="text-foreground">Diana Mocanu</strong> won gold in both the 100m and 200m
              backstroke, the 100m in Olympic-record time. She was sixteen. She won the 200m again at the
              World Championships the following year, so the fall was not immediate. Then she retired in
              2004, aged twenty, after failing to make the Olympic team. Two Olympic golds at sixteen, and
              out of the sport at twenty.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A softer version is <strong className="text-foreground">Emma Raducanu</strong>, who won the
              US Open in 2021 at eighteen, reached world number 10 the following July, and has not been
              back to the top ten since — she was ranked 37th as of May this year. The precise claim is
              the only one worth making: no second major, no return to the top ten. It is not a
              disappearance. She reached her first grass-court final at Queen's last month, and her recent
              slide has as much to do with a foot stress fracture and a post-viral illness as with
              anything else.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We had a third example and checking it destroyed it, which seems worth admitting.{' '}
              <strong className="text-foreground">Jelena Ostapenko</strong> won the French Open in 2017 at
              twenty and is often filed under the same heading. But she rose to world number 5{' '}
              <em>after</em> that title, has won nine singles titles, and is still competing. What is
              actually true of her is narrow: she has never again reached the second week at Roland Garros.
              That is failing to repeat a peak result, not a career that fell away — nearly the opposite of
              the pattern.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Which tells you something about the pattern itself. Of three cases that felt obvious, one
              survived contact with the record. Premature peaking is real, and rarer than it feels, and
              anyone arguing it about a twenty-year-old should carry that with them.
            </p>
          </section>

          {/* -- Why chess may be different ------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Why Chess May Be Different
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              There is a bigger problem with importing the idea into chess, and it works against the
              argument this article is making. In several of the clearest cases the cause was physical.{' '}
              <strong className="text-foreground">Michael Owen</strong> won the Ballon d&rsquo;Or at
              twenty-two and had ruptured a hamstring at nineteen — an injury he has since said cost him
              the pace his whole game was built on. Bodies stop cooperating. That particular mechanism has
              no equivalent at a chessboard.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Chess is also unusually unkind to the early-peak theory, because chess players so often
              arrive late. <strong className="text-foreground">Levon Aronian</strong> was a grandmaster at
              seventeen and a good one for years — and then reached his actual peak, 2830 and world number
              2, in March 2014, at thirty-one. He held a place in the top three continuously from
              twenty-eight to thirty-one. Viktor Korchnoi contested a World Championship match at
              forty-seven. Anand is a top-fifteen player at fifty-six.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              What might carry across is the psychological half, and one idea in particular: the shift from
              hunter to hunted. Winning the biggest thing available turns a player from somebody with
              nothing to lose into the result everybody else in the field is trying to collect, which
              plausibly changes both how opponents prepare and what a draw is worth to them.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              That happens to be the dullest available explanation for what has happened to Gukesh, and it
              deserves stating before the numbers rather than after them. A rating dip after winning the
              title is close to routine. The new champion plays almost nothing but elite opposition, every
              one of them motivated, and rating is zero-sum against a cohort of twenty-somethings all
              improving at once. Magnus Carlsen fell from 2882 to the 2820s without a single person
              suggesting he had forgotten how to play chess.
            </p>
          </section>

          {/* -- All seven games ------------------------------------------ */}
          <section className="mb-16 scroll-mt-8" id="all-seven-games">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Every Game They Have Played
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Seven meetings since 2018. Three were classical; the other four were rapid, blitz or online,
              and are included so that nothing is quietly left out.
            </p>

            <div className="bg-card border border-border rounded-lg overflow-x-auto mb-6">
              <table className="w-full border-collapse min-w-[560px]">
                <caption className="sr-only">
                  All seven Sindarov versus Gukesh games, 2018 to 2026
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3 w-28">Date</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Event</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">White</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Black</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-20">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {MEETINGS.map((g) => (
                    <tr
                      key={`${g.date}-${g.event}`}
                      className={`border-t border-border/50 ${g.classical ? 'bg-primary/5' : ''}`}
                    >
                      <th scope="row" className="text-xs text-left font-normal text-muted-foreground px-4 py-3 whitespace-nowrap">
                        {g.date}
                      </th>
                      <td className="text-sm text-foreground px-4 py-3">
                        {g.event}
                        <span className="block text-xs text-muted-foreground">
                          {g.classical ? `Classical · ${g.note}` : g.note}
                        </span>
                      </td>
                      <td className="text-sm text-muted-foreground px-4 py-3">{g.white}</td>
                      <td className="text-sm text-muted-foreground px-4 py-3">{g.black}</td>
                      <td className="text-sm text-center font-mono font-bold text-foreground px-4 py-3">
                        {g.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">In classical chess: Sindarov two, Gukesh nil, one draw.
              Gukesh has never beaten Javokhir Sindarov in a classical game.</strong> Across all formats it
              is Sindarov four, Gukesh one, two draws.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              And now the context a fair reading requires, because the raw record flatters Sindarov. Both
              of those classical wins came long before Gukesh&rsquo;s elite breakthrough. In February 2018
              he was an eleven-year-old rated 2354 playing a stronger junior. In May 2022 he was 2659 and
              Sindarov 2609 — close, but neither of them yet the player he would become. Their only
              classical game as peers, and as the two men who would contest a World Championship, was a
              draw at Tata Steel in January this year.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Which is why the head-to-head record, for all that it is the first thing anyone looks up,
              is close to useless here. &ldquo;Sindarov leads 2&ndash;0&rdquo; is true, and what it
              mostly tells you is that a schoolboy lost to an older schoolboy. The useful question is
              not where these two have finished against each other in the past. It is which direction
              each of them has been travelling since.
            </p>
          </section>

          {/* -- The evidence: rating slide ------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Two Lines Going Opposite Ways
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Gukesh peaked at <strong className="text-foreground">2794 in October 2024</strong> — before
              the title match, not after it — and was already back to 2783 by the time he sat down against
              Ding Liren in December. Since then: 2787 in June 2025, 2776 in August, 2767 in October, 2754
              in December, 2754 through the first quarter of 2026, 2732 by April. Today he is on{' '}
              <strong className="text-foreground">2703</strong>.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              That is <strong className="text-foreground">ninety-one points below his peak, and about
              eighty of them lost since he became champion.</strong> There is a rebound in there and a long
              plateau, so it is not a clean diagonal — but the direction since the spring of 2025 is not in
              dispute, and he has not gained ground in fifteen months.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sindarov&rsquo;s line over the same careers runs the other way: 2429 when they first met in
              2018, 2609 by Sharjah in 2022, 2726 at Tata Steel this January, 2777 now. He won the 2025
              World Cup, beating Wei Yi in the final as its youngest ever winner, and then took the
              Candidates with the highest score in the modern history of the event — ten from fourteen,
              unbeaten.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              A match between a rising player and a declining one is not unusual. A match where the
              declining one is the reigning champion, is twenty years old, and is defending a title he won
              nineteen months ago against somebody born in the same school year is something else.
            </p>
          </section>

          {/* -- The evidence: Chennai ------------------------------------ */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Chennai: Last, Winless, At Home
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The Quantbox Chennai Grand Masters ran from 16 to 22 July 2026 — an eight-player round robin
              in the city where Gukesh grew up, and a strong field, with seven of the eight rated above
              2700.
            </p>

            <div className="bg-card border border-border rounded-lg overflow-x-auto mb-6">
              <table className="w-full border-collapse min-w-[420px]">
                <caption className="sr-only">
                  Quantbox Chennai Grand Masters 2026 final standings
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3 w-12">#</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Player</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-20">Score</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-24">W–D–L</th>
                  </tr>
                </thead>
                <tbody>
                  {CHENNAI.map((p) => {
                    const isGukesh = p.name.startsWith('Gukesh');
                    return (
                      <tr key={p.name} className={`border-t border-border/50 ${isGukesh ? 'bg-editorial/5' : p.pos === 1 ? 'bg-primary/5' : ''}`}>
                        <td className="text-muted-foreground text-sm px-4 py-3">{p.pos}</td>
                        <th scope="row" className={`text-sm text-left px-4 py-3 ${isGukesh || p.pos === 1 ? 'text-foreground font-semibold' : 'text-foreground font-normal'}`}>
                          {p.name}
                        </th>
                        <td className={`text-sm text-center font-mono font-bold px-4 py-3 ${isGukesh ? 'text-editorial' : p.pos === 1 ? 'text-link' : 'text-muted-foreground'}`}>
                          {p.score}/7
                        </td>
                        <td className="text-xs text-center font-mono text-muted-foreground px-4 py-3">{p.record}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4">
              No wins, four draws, three losses. Beaten by Firouzja in Round 2, by Arjun Erigaisi in Round
              5, and by Pranesh M in Round 6 — the lowest-rated player in the field, a result reported at
              the time as an upset on its own terms.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              This was not a tournament Gukesh was expected to walk. Abdusattorov and Erigaisi both came in
              rated above him, so did Firouzja and Niemann, and Nihal Sarin arrived on the same 2717. The
              reigning World Champion was the joint fifth seed of eight — which is itself worth sitting with
              for a moment.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              But joint fifth is not eighth, and it is not winless. His rating implied a score somewhere
              around three and a half from seven. He made two, gave up 13.9 rating points doing it, and
              finished a full point behind seventh place.
            </p>
          </section>

          {/* -- The rankings -------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              Twenty-Two Places, The Wrong Way Round
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              The FIDE July 2026 list, abridged to the names that matter here:
            </p>

            <div className="bg-card border border-border rounded-lg overflow-x-auto mb-6">
              <table className="w-full border-collapse min-w-[420px]">
                <caption className="sr-only">
                  FIDE July 2026 open rating list, selected ranks
                </caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3 w-12">#</th>
                    <th scope="col" className="text-link font-semibold text-sm text-left px-4 py-3">Player</th>
                    <th scope="col" className="text-link font-semibold text-sm text-center px-4 py-3 w-20">Rating</th>
                    <th scope="col" className="text-link font-semibold text-sm text-right px-4 py-3 w-32">
                      <span className="sr-only">Role</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RANKINGS.map((p) => {
                    const highlight = p.name.startsWith('Javokhir') || p.name.startsWith('Gukesh');
                    return (
                      <tr key={p.name} className={`border-t border-border/50 ${highlight ? 'bg-primary/5' : ''}`}>
                        <td className="text-muted-foreground text-sm px-4 py-3">{p.pos}</td>
                        <th scope="row" className={`text-sm text-left px-4 py-3 ${highlight ? 'text-foreground font-semibold' : 'text-foreground font-normal'}`}>
                          {p.name}
                        </th>
                        <td className={`text-sm text-center font-mono font-bold px-4 py-3 ${highlight ? 'text-link' : 'text-muted-foreground'}`}>
                          {p.rating}
                        </td>
                        <td className="text-xs text-right text-link px-4 py-3">{p.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4">
              Two details there deserve saying out loud rather than leaving for the reader to notice.{' '}
              <strong className="text-foreground">Ding Liren, whom Gukesh beat for the crown in December
              2024, is now eleven places above him.</strong> And{' '}
              <strong className="text-foreground">Anand, at fifty-six, is ranked above the reigning World
              Champion.</strong>
            </p>
            <p className="text-muted-foreground leading-relaxed">
              That list is also the flattering version. It is dated 1 July, before Chennai. Take
              Chennai&rsquo;s 13.9 points off it and Gukesh is on 2703, which is where the live list has
              him, and which puts his real position lower than twenty-sixth. Reported figures suggest he
              had already shed close to fifteen points at Norway Chess in June, which makes something like
              twenty-nine points across two consecutive elite events in two months.
            </p>
          </section>

          {/* -- The fade -------------------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              What It Looks Like From The Sofa
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Watching the Chennai games rather than the crosstable, one thing stood out that a score table
              cannot show. Gukesh was frequently fine out of the opening and fine in the early middlegame —
              in some of those games he was better, in one or two he was winning. The damage came later. The
              longer a game went on, the worse his position got. It looked less like a player who has
              forgotten how to play and more like one who cannot hold what he has built across five hours.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              That is an impression from watching, so we went to check it, and the check is instructive in a
              way we did not expect. Comparing his scoring in short games and long ones: at his peak across
              2023 and 2024, over 297 classical games, he scored 60.9% in games of 45 moves or fewer and
              56.6% in games of 46 or more — already slightly worse in the long ones. Across 2025 and 2026,
              153 games, those figures are 47.0% and 45.3%. His scoring rate has fallen by roughly fourteen
              percentage points, and on this measure the fall is not concentrated in the long games. The
              long-game penalty did not widen. If anything it narrowed.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We are reporting that because it is what the numbers said, not because it helps. It does not
              refute the impression either, and it is worth being clear why: a result cannot see a
              squandered position. A game he was winning and drew scores exactly the same half point as a
              game that was level from move one. Settling it properly means measuring how much evaluation a
              player gives away per move at move 25 against move 55, across seasons. Until somebody does
              that, the fade is an observation, and we will label it as one.
            </p>
          </section>

          {/* -- Sindarov's own risk -------------------------------------- */}
          <section className="mb-16">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              The Same Question, Pointed The Other Way
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              It would be cheap to aim all of this only at the champion. Sindarov is twenty, has just
              produced the best Candidates score in the modern era, and is rated higher than he has ever
              been. Gukesh in December 2024 was eighteen, had just won the Candidates and then the title
              itself, and was within a dozen points of the highest rating he has ever held. The particulars
              differ. The shape — very young, just won the biggest thing available, near a career high —
              does not.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If the theory is that a spike at twenty is a warning rather than a promise, then it is a
              warning that applies to the man doing the spiking, and he is not the one wearing the crown.
              That is a question rather than a finding. But if Gukesh&rsquo;s nineteen months as champion
              show anything, it is that this kind of answer can start arriving a great deal sooner than
              anybody expects it to.
            </p>
          </section>

          {/* -- Close ---------------------------------------------------- */}
          <section className="mb-12">
            <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
              What The Match Can Tell Us
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The dates and the venue have not been announced. What is already settled is the question the
              match will produce evidence about, and it is a better question than the usual one.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Gukesh does not need to prove he can play. He proved that against Ding Liren. What is in doubt
              is whether the form that won in December 2024 is still available to him, because for fifteen
              months the rating list, and now a last place at home, have pointed the other way. Win this
              match and the slump becomes a footnote — a bad year of the sort almost every great player has
              had — and the early-peak theory goes back in its box for another decade.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Lose it to a man twenty-two places above him and nobody will be able to call it an upset.
              That is the strangest thing about a World Championship in 2026. One match will not settle what
              a twenty-year-old becomes, but it will tell us a great deal about which of these two lines was
              the real one.
            </p>
          </section>

          {/* -- Internal links ------------------------------------------- */}
          <section className="mb-12 bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
              Study the games yourself
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Gukesh&rsquo;s games are on the site alongside every other World Champion&rsquo;s, and you can
              play through them move by move.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/champions/gukesh/games"
                className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
              >
                Gukesh&rsquo;s games
              </Link>
              <Link
                to="/news/candidates-2026-conclusion"
                className="text-sm px-4 py-2 rounded-md bg-primary/10 text-link hover:bg-primary/20 transition-colors"
              >
                How Sindarov won the Candidates
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
                Rankings and ratings, July 2026:{' '}
                <a href="https://en.chessbase.com/post/fide-ratings-july-2026" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  ChessBase
                </a>{' '}
                and{' '}
                <a href="https://www.fide.com/fide-july-2026-rating-list-published/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  FIDE
                </a>
                . Live rating via{' '}
                <a href="https://2700chess.com/players/gukesh_d" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  2700chess
                </a>
              </li>
              <li>
                Chennai Grand Masters 2026 standings, seeding and rating change:{' '}
                <a href="https://en.chessbase.com/post/chennai-gms-2026-7" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  ChessBase final-round report
                </a>
                ,{' '}
                <a href="https://en.chessbase.com/post/chennai-gms-2026-preview" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  the tournament preview
                </a>
                ,{' '}
                <a href="https://www.chess.com/news/view/2026-chennai-grand-masters-round-7" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  Chess.com
                </a>{' '}
                and the{' '}
                <a href="https://liquipedia.net/chess/Chennai_Grand_Masters/2026" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  crosstable
                </a>
              </li>
              <li>
                Sindarov&rsquo;s career, age, 2025 World Cup and Candidates score:{' '}
                <a href="https://en.wikipedia.org/wiki/Javokhir_Sindarov" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  career record
                </a>{' '}
                and{' '}
                <a href="https://www.chess.com/players/javokhir-sindarov" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  Chess.com
                </a>
              </li>
              <li>
                Head-to-head games and rating histories compiled from published tournament records, with
                rapid, blitz and online events excluded from the classical figures
              </li>
              <li>
                Diana Mocanu:{' '}
                <a href="https://ishof.org/honoree/honoree-diana-mocanu/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  International Swimming Hall of Fame
                </a>
                . Emma Raducanu:{' '}
                <a href="https://www.wtatennis.com/players/328366/emma-raducanu" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  WTA
                </a>
                . Jelena Ostapenko:{' '}
                <a href="https://www.wtatennis.com/players/319939/jelena-ostapenko" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  WTA
                </a>
                . Michael Owen:{' '}
                <a href="https://www.flashscore.com/news/soccer-premier-league-flashback-the-impressive-but-injury-plagued-career-of-ballon-d-or-winner-michael-owen/vsDL723U" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  career summary
                </a>
                . Levon Aronian:{' '}
                <a href="https://en.wikipedia.org/wiki/Levon_Aronian" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  career record
                </a>
              </li>
              <li>
                Photographs: Gukesh by Frans Peeters via{' '}
                <a href="https://commons.wikimedia.org/wiki/File:D_Gukesh_at_2025_Tata_Steel_CT.jpg" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  Wikimedia Commons
                </a>
                , licensed{' '}
                <a href="https://creativecommons.org/licenses/by-sa/2.0/" className="underline hover:text-link" target="_blank" rel="noopener noreferrer">
                  CC BY-SA 2.0
                </a>{' '}
                and cropped and resized for this page. Sindarov by FIDE / Niki Riga
              </li>
            </ul>
          </section>
        </div>
      </article>

    </div>
  );
};

export default SindarovGukeshHeadToHead;
