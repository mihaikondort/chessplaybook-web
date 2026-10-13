import { ArticleGameViewer, type ArticleGame } from '@/components/game-viewer/ArticleGameViewer';
import SeoHead from '@/components/SeoHead';

// ---------------------------------------------------------------------------
// PGN Data — all 8 games from Round 3 (Open + Women's)
// ---------------------------------------------------------------------------

const ROUND3_GAMES: (ArticleGame & { result: string })[] = [
  {
    id: 'pragg-sindarov',
    label: 'Praggnanandhaa 0-1 Sindarov',
    section: 'Open',
    result: '0-1',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.1"]
[White "Praggnanandhaa R"]
[Black "Sindarov, Javokhir"]
[Result "0-1"]
[WhiteElo "2741"]
[BlackElo "2745"]
[ECO "D37"]
[Opening "Queen's Gambit Declined: Harrwitz Attack"]

1. d4 d5 2. c4 e6 3. Nc3 Be7 4. Nf3 Nf6 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5 8. a3 Nc6 9. Qc2 Re8 10. Bg5 d4 11. Bxf6 Qxf6 12. Ne4 Qf5 13. b4 Nxb4 14. axb4 Bxb4+ 15. Kd1 dxe3 16. Bd3 Qg6 17. fxe3 f5 18. Ng3 Bc5 19. Qc3 e5 20. Bc2 e4 21. Nd2 Rd8 22. Kc1 Qg5 23. Re1 Qe7 24. Re2 Bb4 25. Qb2 a5 26. Nb3 Ra6 27. Nd4 Qg5 28. Kb1 h5 29. Ka2 h4 30. Nf1 Bd7 31. Rd1 Rc8 32. Nd2 Rb6 33. c5 Rxc5 34. Qb3+ Kh8 35. Qf7 Rxc2+ 36. Kb1 Rxd2 37. Rdxd2 Bxd2+ 38. Ka2 Bxe3 39. Qxd7 Bxd4 40. Qxd4 Qf6 0-1`,
  },
  {
    id: 'caruana-weiyi',
    label: 'Caruana 1-0 Wei Yi',
    section: 'Open',
    result: '1-0',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.2"]
[White "Caruana, Fabiano"]
[Black "Wei, Yi"]
[Result "1-0"]
[WhiteElo "2795"]
[BlackElo "2754"]
[ECO "A15"]
[Opening "English Opening: Anglo-Indian Defense"]

1. Nf3 Nf6 2. c4 c5 3. g3 g6 4. Nc3 d5 5. cxd5 Nxd5 6. Bg2 Bg7 7. Qa4+ Nc6 8. Ng5 Nb6 9. Bxc6+ bxc6 10. Qxc6+ Bd7 11. Qxc5 h6 12. Nf3 Rc8 13. Qa5 Bh3 14. Qb5+ Nd7 15. Rg1 O-O 16. g4 Rc5 17. Qb3 Ne5 18. Nxe5 Rxe5 19. Nd1 1-0`,
  },
  {
    id: 'nakamura-giri',
    label: 'Nakamura \u00BD-\u00BD Giri',
    section: 'Open',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.3"]
[White "Nakamura, Hikaru"]
[Black "Giri, Anish"]
[Result "1/2-1/2"]
[WhiteElo "2810"]
[BlackElo "2753"]
[ECO "A28"]
[Opening "English Opening: Four Knights Variation"]

1. c4 Nf6 2. Nc3 e5 3. Nf3 Nc6 4. d3 d5 5. cxd5 Nxd5 6. e4 Nf6 7. Be2 Bg4 8. Be3 Qd7 9. O-O Bxf3 10. Bxf3 Nd4 11. g3 Bc5 12. Rc1 Bb6 13. Bg2 O-O 14. Na4 Rfd8 15. a3 h6 16. Re1 Rac8 17. h3 Ne6 18. Nxb6 axb6 19. Bf1 c5 20. Qe2 Nd4 21. Bxd4 Qxd4 22. Rc4 Qd7 23. b4 Ne8 24. bxc5 bxc5 25. Qb2 Nd6 26. Rcc1 Re8 27. Rb1 b5 28. Rec1 Qe6 29. Qb3 c4 30. Qb4 Rc7 31. a4 bxa4 32. Qxa4 Qe7 33. Rc3 Rec8 34. Bg2 cxd3 35. Rxd3 Ne8 36. Qa3 Qxa3 37. Rxa3 Rc1+ 38. Rxc1 Rxc1+ 39. Bf1 Nf6 40. Kg2 g6 41. Ra5 1/2-1/2`,
  },
  {
    id: 'bluebaum-esipenko',
    label: 'Bluebaum \u00BD-\u00BD Esipenko',
    section: 'Open',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.4"]
[White "Bluebaum, Matthias"]
[Black "Esipenko, Andrey"]
[Result "1/2-1/2"]
[WhiteElo "2698"]
[BlackElo "2698"]
[ECO "D37"]
[Opening "Queen's Gambit Declined: Three Knights Variation"]

1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. Nc3 Be7 5. cxd5 exd5 6. Bf4 O-O 7. e3 c5 8. dxc5 Bxc5 9. Be2 Nc6 10. O-O Be6 11. Rc1 Rc8 12. Bd3 h6 13. h3 a6 14. Bb1 Qe7 15. Re1 Rfd8 16. Re2 d4 17. exd4 Nxd4 18. Rd2 Nxf3+ 19. Qxf3 Rxd2 20. Bxd2 Rd8 21. Be3 Bxe3 22. Qxe3 Kf8 23. a3 Bd7 24. Qxe7+ Kxe7 25. Re1+ Be6 26. Ne4 b6 27. Rc1 Rd4 28. Nc3 Bc4 29. Rd1 Rxd1+ 30. Nxd1 Nd5 31. Ne3 Nxe3 32. fxe3 g5 33. g3 Kd6 34. Kf2 Ke5 35. h4 f6 36. Bc2 a5 37. Kf3 Be6 38. Bd3 Bd7 39. Bc2 Bc8 40. Bd3 Bd7 41. Bc2 1/2-1/2`,
  },
  {
    id: 'goryachkina-deshmukh',
    label: 'Goryachkina \u00BD-\u00BD Deshmukh',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.1"]
[White "Goryachkina, Aleksandra"]
[Black "Divya Deshmukh"]
[Result "1/2-1/2"]
[WhiteElo "2534"]
[BlackElo "2497"]
[ECO "B31"]
[Opening "Sicilian Defense: Rossolimo Variation"]

1. e4 c5 2. Nf3 Nc6 3. Bb5 g6 4. Bxc6 bxc6 5. O-O Bg7 6. Re1 Qc7 7. d3 d6 8. e5 dxe5 9. Na3 Nf6 10. Nxe5 Nd5 11. Nac4 O-O 12. Qe2 f6 13. Nf3 e5 14. Be3 Bg4 15. h3 Nxe3 16. Qxe3 Bxf3 17. Qxf3 Rad8 18. Re2 h5 19. Rae1 Kh7 20. h4 Rd5 21. g3 Rf7 22. Qg2 Rd8 23. b3 Rd5 24. Qf3 Rf8 25. Re3 Bh6 26. Re4 Bg7 27. Qg2 Rf7 28. Kh1 Rd4 29. a4 Bf8 30. Nd2 Bh6 31. Nf3 Rxe4 32. Rxe4 Qd7 33. Kg1 Qd5 34. Rc4 Rb7 35. Nh2 Qd6 36. Qe4 Bf8 37. Qe3 Rd7 38. Nf3 Qd5 39. Kh2 Bh6 40. Qe2 Rd8 41. Nd2 Bxd2 42. Qxd2 e4 43. Qa5 exd3 44. cxd3 Rd7 45. Qxc5 Qxc5 46. Rxc5 Rxd3 47. Rxc6 f5 48. Rc7+ Kh6 49. Rb7 a5 50. Kg2 Rc3 51. Kf1 Rc1+ 52. Ke2 Rc3 53. f3 Rc2+ 54. Ke3 Rc3+ 55. Kf4 Rd3 56. Rb5 Rc3 57. Rxa5 Rxb3 58. Ra8 Rb4+ 59. Ke5 Rb3 60. Kf6 Kh7 61. Ra7+ Kh6 62. Kf7 Kh7 63. Kf8+ Kh8 64. Ra6 Kh7 65. Kf7 Rxf3 66. Rxg6 f4 67. Rf6 Rxg3 68. Rxf4 Rg4 69. Rf5 Rxh4 70. a5 Kh6 71. Kf6 Ra4 72. Rb5 h4 73. Kf5 h3 74. Rb3 Rxa5+ 75. Kg4 h2 76. Rh3+ Kg6 77. Rxh2 Ra4+ 78. Kg3 Ra3+ 79. Kg2 Ra2+ 80. Kg3 Rxh2 81. Kxh2 1/2-1/2`,
  },
  {
    id: 'vaishali-muzychuk',
    label: 'Vaishali \u00BD-\u00BD Muzychuk',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.2"]
[White "Vaishali, Rameshbabu"]
[Black "Muzychuk, Anna"]
[Result "1/2-1/2"]
[WhiteElo "2470"]
[BlackElo "2522"]
[ECO "C55"]
[Opening "Italian Game: Two Knights Defense"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Be7 5. Nc3 d6 6. a3 O-O 7. Ba2 Be6 8. Nd5 Nd4 9. Nxd4 exd4 10. Nxe7+ Qxe7 11. O-O Bxa2 12. Rxa2 d5 13. f3 Nd7 14. Ra1 c5 15. Bf4 dxe4 16. fxe4 f6 17. Bg3 Ne5 18. Qd2 Rac8 19. Rf5 Rc6 20. Raf1 Re6 21. h3 Rc8 22. Qa5 b6 23. Qb5 h6 24. a4 c4 25. Bxe5 Rxe5 26. Rxe5 Qxe5 27. Qd7 Qc7 28. Qd5+ Kh8 29. Qxd4 cxd3 30. cxd3 Qg3 31. e5 fxe5 32. Qe4 Rd8 33. Rf3 Qg5 34. Kh2 Qe7 35. Re3 Qc7 36. Qxe5 Qxe5+ 37. Rxe5 Rxd3 38. a5 bxa5 39. Rxa5 Rb3 40. Rxa7 Rxb2 41. Ra8+ 1/2-1/2`,
  },
  {
    id: 'zhu-assaubayeva',
    label: 'Zhu Jiner 0-1 Assaubayeva',
    section: 'Women',
    result: '0-1',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.3"]
[White "Zhu, Jiner"]
[Black "Assaubayeva, Bibisara"]
[Result "0-1"]
[WhiteElo "2578"]
[BlackElo "2516"]
[ECO "B30"]
[Opening "Sicilian Defense: Rossolimo, Canal Attack"]

1. e4 c5 2. Nf3 Nc6 3. Bb5 d6 4. O-O Bd7 5. Re1 Nf6 6. h3 a6 7. Bf1 Rg8 8. d3 h6 9. b4 cxb4 10. a3 b3 11. Nbd2 g5 12. d4 g4 13. hxg4 Bxg4 14. Bb2 d5 15. c4 dxe4 16. Nxe4 Nxe4 17. Rxe4 Bf5 18. Re3 Bc2 19. Qc1 Rc8 20. d5 Na5 21. Nd2 Rg4 22. Be5 h5 23. Qb2 Bh6 24. Rae1 Bxe3 25. Rxe3 Nxc4 26. Nxc4 Rcxc4 27. Bxc4 Rxc4 28. d6 e6 29. Bh2 Qg5 30. Be5 Be4 31. f4 Rc1+ 32. Kh2 Qh4+ 33. Rh3 Rh1+ 34. Kxh1 Qxh3+ 35. Kg1 Qe3+ 36. Qf2 Qxf2+ 37. Kxf2 h4 38. g4 b5 39. Kg1 h3 40. Kh2 Bg2 41. Kg3 a5 42. Kh2 Kd7 43. Kg3 a4 0-1`,
  },
  {
    id: 'tan-lagno',
    label: 'Tan Zhongyi 0-1 Lagno',
    section: 'Women',
    result: '0-1',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.31"]
[Round "3.4"]
[White "Tan, Zhongyi"]
[Black "Lagno, Kateryna"]
[Result "0-1"]
[WhiteElo "2535"]
[BlackElo "2508"]
[ECO "C53"]
[Opening "Italian Game: Giuoco Piano"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 d6 5. d4 exd4 6. cxd4 Bb6 7. Nc3 Nf6 8. Qd3 O-O 9. Bg5 h6 10. Bh4 Nb4 11. Qd2 d5 12. exd5 Re8+ 13. Kf1 c6 14. dxc6 bxc6 15. Rd1 Ba6 16. Bxa6 Nxa6 17. g4 Nc7 18. Rg1 Ncd5 19. g5 Nh5 20. Rg4 Qd7 21. h3 Qf5 22. Qd3 Ne3+ 23. fxe3 Qxf3+ 24. Bf2 Qxh3+ 25. Rg2 hxg5 26. Kg1 Bc7 27. Ne4 f6 28. Rc1 Kh8 29. Nc5 Rad8 30. Qb3 Re7 31. Na6 Qf3 32. Nb4 Rd6 33. d5 cxd5 34. Nc6 Rf7 35. Nd4 Qe4 36. Rxc7 Rxc7 37. Qb8+ Kh7 38. Qxc7 Rb6 39. b3 Qb1+ 40. Kh2 f5 41. Qf7 Rf6 42. Qxd5 Nf4 43. exf4 Rh6+ 44. Kg3 Qd3+ 45. Qf3 g4 46. Rh2 gxf3 47. Rxh6+ gxh6 48. Nxf3 a6 49. Bd4 Qc2 50. b4 Qxa2 51. Bc3 Qb3 52. Be1 Kg6 53. Kg2 Kf7 54. Nh4 Qe3 0-1`,
  },
];

// ---------------------------------------------------------------------------
// Photo component with FIDE attribution
// ---------------------------------------------------------------------------

function FidePhoto({
  src, alt, width, height, photographer, className = '',
}: { src: string; alt: string; width: number; height: number; photographer?: string; className?: string }) {
  // 600px sibling + intrinsic dimensions, brought in line with the newer
  // articles' Photo component (audit P2 #11): without width/height every photo
  // shifted the article as it loaded, and phones downloaded the 1600px
  // originals for a 600px column.
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
        loading="lazy"
        decoding="async"
      />
      <figcaption className="text-xs text-muted-foreground mt-2 text-right italic">
        Photo: FIDE{photographer ? ` / ${photographer}` : ''}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Article Component
// ---------------------------------------------------------------------------

const CandidatesRound3Recap2026 = () => {
  return (
    <>
      <SeoHead routeKey="news/candidates-2026-round-3" />

      <div className="bg-background flex flex-col">

        {/* -- Hero Banner ------------------------------------------------- */}
        <div className="relative overflow-hidden bg-gradient-to-b from-card via-card to-background">
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="grid grid-cols-8 h-full">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isDark = (row + col) % 2 === 1;
                return <div key={i} className={isDark ? 'bg-foreground' : ''} />;
              })}
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute text-editorial/[0.08] text-7xl sm:text-8xl top-8 left-[8%] animate-float-slow select-none">
              &#9813;
            </span>
            <span className="absolute text-link/[0.07] text-6xl sm:text-7xl top-16 right-[12%] animate-float-medium select-none">
              &#9818;
            </span>
            <span className="absolute text-link/[0.05] text-5xl sm:text-6xl bottom-12 left-[15%] animate-float-fast select-none">
              &#9816;
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background/50 to-transparent" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
            <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

            <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">Round 3 Recap</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
              A Star Is Born
            </h1>
            <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
              Sindarov and Caruana Surge Clear as the Candidates Catches Fire
            </h2>

            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5">
                <span className="text-editorial">&#9656;</span> 2 Decisive Games
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> Round 3 of 14
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> 31 March 2026
              </span>
            </div>

            <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
              After a quiet Round 2 where all eight games ended in draws, Round 3 delivered two
              thunderbolts that shook the tournament to its core — and announced that a new star
              has arrived on the world stage.
            </p>
            <p className="text-muted-foreground text-sm">Published 31 March 2026</p>
          </div>
        </div>

        {/* -- Article Body ------------------------------------------------ */}
        <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <FidePhoto src="/assets/news/candidates-2026-r3/sindarov.webp" width={1600} height={1067} alt="Javokhir Sindarov, the man of the hour at the 2026 Candidates" photographer="Yoav Nis" />

            {/* -- Intro / Scene-setting ---------------------------------- */}
            <section className="mb-12">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Nobody saw this coming. In the third round of the most important chess tournament
                of the cycle, with eight of the world's best players fresh, focused, and backed by
                months of preparation, Wei Yi sat down against Fabiano Caruana and produced a game
                that will haunt him for the rest of the tournament. The Chinese number one sacrificed
                two pawns for initiative — a bold concept that might have worked against a lesser
                opponent — but then couldn't handle the complications he had created. An inaccuracy
                gave Caruana a promising edge, and then came the moment that silenced the commentary
                room: Wei Yi simply blundered a piece, exchanging his knight into a lost position on
                e5. Nineteen moves. Resignation.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At this level, in this tournament, with everything at stake, a 19-move loss is almost
                unheard of. These are not players who crack under pressure — they are battle-hardened
                super-grandmasters who play grueling tournaments for a living. Yet there it was on
                the screen, plain as day: Caruana 1-0 Wei Yi, Round 3, 19 moves. Caruana, for his
                part, didn't need to do anything spectacular. He simply played perfectly, punished
                every inaccuracy, and collected the full point with ruthless efficiency.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                A victory that gives Caruana a perfect start to the tournament — and the confidence
                he'll need for what comes next. In Round 4, he faces the black pieces against the man
                of the moment, the absolutely phenomenal Javokhir Sindarov, who earlier in the day
                defeated Praggnanandhaa with Black to join Caruana at the top of the standings. Two
                co-leaders, 2{'\u00BD'} out of 3, meeting head-to-head tomorrow. If the all-draws Round 2 lulled anyone
                into thinking this would be a cautious Candidates, Round 3 was the wake-up call — and
                Round 4 promises to be unmissable.
              </p>
            </section>

            {/* -- Results Overview ---------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Open Section — Results
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Two decisive results out of four games. The two overnight leaders reminded everyone
                why they were at the top — and pulled a full point clear of the chasing pack.
              </p>

              <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[1fr_60px_1fr] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm text-right pr-3">White</span>
                    <span className="text-link font-semibold text-sm text-center">Result</span>
                    <span className="text-link font-semibold text-sm pl-3">Black</span>
                  </div>
                  {[
                    { w: 'Praggnanandhaa', b: 'Sindarov', r: '0 - 1', highlight: true },
                    { w: 'Caruana', b: 'Wei Yi', r: '1 - 0', highlight: true },
                    { w: 'Nakamura', b: 'Giri', r: '\u00BD - \u00BD', highlight: false },
                    { w: 'Bluebaum', b: 'Esipenko', r: '\u00BD - \u00BD', highlight: false },
                  ].map((g) => (
                    <div
                      key={g.w}
                      className={`grid grid-cols-[1fr_60px_1fr] px-4 py-3 ${g.highlight ? 'bg-primary/5' : ''}`}
                    >
                      <span
                        className={`text-sm text-right pr-3 ${g.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                      >
                        {g.w}
                      </span>
                      <span
                        className={`text-sm text-center font-mono ${g.highlight ? 'text-editorial font-bold' : 'text-muted-foreground'}`}
                      >
                        {g.r}
                      </span>
                      <span
                        className={`text-sm pl-3 ${g.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                      >
                        {g.b}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* -- Game 1: Sindarov beats Pragg ----------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Praggnanandhaa 0-1 Sindarov — A Masterpiece in the Queen's Gambit
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Queen's Gambit Declined (D37) &middot; 40 moves
              </p>

              <FidePhoto src="/assets/news/candidates-2026-r3/sindarov-pragg.webp" width={1600} height={1067} alt="Sindarov vs Praggnanandhaa, Round 3" photographer="Yoav Nis" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                What Javokhir Sindarov produced in Round 3 was not just a victory — it was a
                statement that will echo through the entire tournament. Playing the Black side
                of the Queen's Gambit Declined against one of the world's most talented young
                players, the 20-year-old World Cup champion delivered a performance of breathtaking
                quality that proves his triumph at the World Cup was no fluke. What we are witnessing
                is nothing less than a new star being born.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The fireworks began as early as move 13, when Sindarov sacrificed a piece with
                the audacious <strong className="text-foreground">13...Nxb4</strong> — surrendering
                a knight for two pawns to rip open the center and strand White's king. It was the
                kind of decision that separates the merely strong from the truly fearless. At the
                Candidates Tournament, with everything on the line, Sindarov chose violence.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To his credit, Praggnanandhaa absorbed the initial shock well. By move 18 the
                position had calmed, and the Indian prodigy had a chance to seize the initiative
                with the energetic <strong className="text-foreground">19.e4</strong> — a move that
                would have given White a promising position and real chances to play for an
                advantage. Instead, Pragg chose the mysterious{' '}
                <strong className="text-foreground">19.Qc3</strong> — a passive, enigmatic move
                that is hard to explain at this level. It was the turning point of the game, and
                perhaps the turning point of Sindarov's tournament.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                From that moment, Sindarov played with devastating energy and precision. The
                surprising <strong className="text-foreground">...e5</strong> — a pawn push that
                blew apart any hopes White had of finding a safe haven for his king — announced
                that the attack was coming, and nothing could stop it. Pragg tried desperately to
                untangle his pieces from the path of Black's advancing pawns and find shelter for
                his king on the queenside, but the two extra pawns Black had won in exchange for
                his knight, combined with the bishop pair, an open center, and a raging initiative,
                meant the White king was doomed. There was no convincing prospect of survival.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Sindarov prosecuted the attack in magnificent fashion, systematically dismantling
                White's improvised defenses. The finishing blow came at move 35 with the clinical{' '}
                <strong className="text-foreground">35...Rxc2</strong> — picking up a bishop that
                White's knight could not recapture due to the devastating{' '}
                <strong className="text-foreground">...Be6+</strong>, a check that would win the
                queen. A razor-sharp tactic that destroyed the last remnants of White's defense and
                sealed a memorable victory just a few moves later.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                But what happened after the game was almost as remarkable as the game itself. In the
                press conference, Sindarov sat down and began dissecting the razor-sharp
                complications that follow <strong className="text-foreground">13...Nxb4</strong>{' '}
                with the calm authority of a player who had seen everything before it happened.
                Variation after variation, five and six moves deep into positions where Black is a
                full piece down, the 20-year-old assessed each line with surgical precision:{' '}
                <em>"and here Black is just fine."</em> The room fell silent. This was not a player
                who had rolled the dice with a speculative sacrifice and gotten lucky. This was a
                player who had calculated every branch, evaluated every resulting position, and sat
                down at the board knowing exactly what he was doing. The confidence, the depth of
                preparation, the sheer calculating power on display — it was jaw-dropping.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Two wins in three rounds. A perfect score with Black. Caruana played a perfect game
                today, but it is safe to say that the man of the hour is Sindarov. He didn't just
                beat any player — he demolished one of the other pre-tournament favorites who had
                shown impressive form in the first two rounds. The youngest player in the field is
                playing the best chess of anyone in Paphos, and the rest of the field knows it.
              </p>
            </section>

            {/* -- Game 2: Caruana beats Wei Yi ----------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Caruana 1-0 Wei Yi — Nineteen Moves of Perfection
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                English Opening: Symmetrical, Three Knights System &middot; 19 moves
              </p>

              <FidePhoto src="/assets/news/candidates-2026-r3/caruana.webp" width={1600} height={1067} alt="Fabiano Caruana after his 19-move victory over Wei Yi" photographer="Yoav Nis" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                Some games need eighty moves to tell their story. This one needed nineteen. Wei Yi
                arrived at the board with an ambitious plan — sacrificing two pawns to generate
                initiative and seize the momentum. It was a bold concept, the kind of aggressive
                approach that has served the Chinese super-grandmaster well throughout his career.
                But against Caruana, ambition without precision is a death sentence.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Wei Yi couldn't handle the position he had created. The complications that were
                supposed to work in his favor instead turned poisonous, and an inaccuracy handed
                Caruana a promising edge. Then came the blunder that ended it all — Wei Yi exchanged
                his knight on e5, simply losing a piece. At this level, in Round 3 of the Candidates,
                against players who are young, fresh, and accustomed to grueling tournaments, a
                19-move loss with a piece blunder is almost impossible to comprehend. Yet there it
                was.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Caruana played a flawless game — not a single inaccuracy from first move to last.
                But this was less about Caruana's brilliance and more about Wei Yi's self-destruction.
                The six-time Candidates veteran didn't need to produce anything spectacular. He simply
                sat across the board, played every move correctly, and watched as his opponent
                imploded. Three rounds, 2{'\u00BD'} points, a perfect start to the tournament.
              </p>
            </section>

            {/* -- Games 3 & 4: The Draws ---------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Other Games — Solid Draws
              </h2>

              <FidePhoto src="/assets/news/candidates-2026-r3/nakamura.webp" width={1600} height={1067} alt="Hikaru Nakamura, Round 3" photographer="Yoav Nis" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Nakamura {'\u00BD'}-{'\u00BD'} Giri</strong> was
                an uneventful affair — played correctly from start to finish, but without either
                player taking any meaningful risks. Both will look to create more from their next
                games.
              </p>
              <FidePhoto src="/assets/news/candidates-2026-r3/bluebaum-esipenko.webp" width={1600} height={1067} alt="Bluebaum vs Esipenko, Round 3" photographer="Michal Walusza" />

              <p className="text-muted-foreground leading-relaxed mb-6">
                <strong className="text-foreground">Bluebaum {'\u00BD'}-{'\u00BD'} Esipenko</strong>{' '}
                followed a similar pattern — a solid, professional draw between two players still
                searching for their first win of the tournament.
              </p>
            </section>

            {/* -- Standings After Round 3 --------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Standings After Round 3
              </h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[40px_1fr_60px] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm">#</span>
                    <span className="text-link font-semibold text-sm">Player</span>
                    <span className="text-link font-semibold text-sm text-center">Pts</span>
                  </div>
                  {[
                    { pos: '1', name: 'Javokhir Sindarov', pts: '2\u00BD', flag: '\u{1F1FA}\u{1F1FF}' },
                    { pos: '', name: 'Fabiano Caruana', pts: '2\u00BD', flag: '\u{1F1FA}\u{1F1F8}' },
                    { pos: '3', name: 'Praggnanandhaa R.', pts: '1\u00BD', flag: '\u{1F1EE}\u{1F1F3}' },
                    { pos: '', name: 'Matthias Bl\u00FCbaum', pts: '1\u00BD', flag: '\u{1F1E9}\u{1F1EA}' },
                    { pos: '5', name: 'Hikaru Nakamura', pts: '1', flag: '\u{1F1FA}\u{1F1F8}' },
                    { pos: '', name: 'Anish Giri', pts: '1', flag: '\u{1F1F3}\u{1F1F1}' },
                    { pos: '', name: 'Wei Yi', pts: '1', flag: '\u{1F1E8}\u{1F1F3}' },
                    { pos: '', name: 'Andrey Esipenko', pts: '1', flag: '\u{1F1EA}\u{1F1FA}' },
                  ].map((p) => {
                    const isLeader = p.pts.includes('2');
                    return (
                      <div key={p.name} className={`grid grid-cols-[40px_1fr_60px] px-4 py-2.5 ${isLeader ? 'bg-primary/5' : ''}`}>
                        <span className="text-muted-foreground text-sm">{p.pos}</span>
                        <span className="text-sm text-foreground">
                          {p.flag} {p.name}
                        </span>
                        <span className={`text-sm text-center font-mono font-bold ${isLeader ? 'text-link' : 'text-muted-foreground'}`}>
                          {p.pts}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* -- Game Viewer --------------------------------------------- */}
            <ArticleGameViewer games={ROUND3_GAMES} />

            {/* -- Women's Candidates -------------------------------------- */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Women's Candidates — Round 3
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-4">
                After all draws in the first two rounds, the Women's Candidates exploded into life
                with two decisive results — both at the expense of the Chinese players.
              </p>

              <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[1fr_60px_1fr] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm text-right pr-3">White</span>
                    <span className="text-link font-semibold text-sm text-center">Result</span>
                    <span className="text-link font-semibold text-sm pl-3">Black</span>
                  </div>
                  {[
                    { w: 'Goryachkina', b: 'Deshmukh', r: '\u00BD - \u00BD', highlight: false },
                    { w: 'Vaishali', b: 'Muzychuk', r: '\u00BD - \u00BD', highlight: false },
                    { w: 'Zhu Jiner', b: 'Assaubayeva', r: '0 - 1', highlight: true },
                    { w: 'Tan Zhongyi', b: 'Lagno', r: '0 - 1', highlight: true },
                  ].map((g) => (
                    <div key={g.w} className={`grid grid-cols-[1fr_60px_1fr] px-4 py-3 ${g.highlight ? 'bg-primary/5' : ''}`}>
                      <span className={`text-sm text-right pr-3 ${g.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{g.w}</span>
                      <span className={`text-sm text-center font-mono ${g.highlight ? 'text-editorial font-bold' : 'text-muted-foreground'}`}>{g.r}</span>
                      <span className={`text-sm pl-3 ${g.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{g.b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                Zhu Jiner 0-1 Assaubayeva — A Game of Two Halves
              </h3>
              <FidePhoto src="/assets/news/candidates-2026-r3/assaubayeva.webp" width={1600} height={1067} alt="Bibisara Assaubayeva, Women's Candidates Round 3" photographer="Michal Walusza" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                A spectacular game that had two opposite halves. In the Sicilian Rossolimo, Canal
                Attack, Zhu Jiner sacrificed a pawn with the aggressive{' '}
                <strong className="text-foreground">9.b4</strong> to develop initiative and build
                a strong grip on the center. When Black tried to return the pawn with{' '}
                <strong className="text-foreground">10...b3</strong>, White simply ignored it,
                conquered the center, and the fabulous{' '}
                <strong className="text-foreground">15.c4</strong> gave Zhu Jiner a very promising
                position. But from here, Bibisara Assaubayeva showed amazing fighting spirit, found
                all the right moves in the middlegame, and entered a winning opposite-colored bishops
                ending. Spectacular from start to finish.
              </p>

              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                Tan Zhongyi 0-1 Lagno — A Rollercoaster with a Stunning Finish
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Another extremely spectacular fight. Tan Zhongyi started better, building a nice
                position in the Giuoco Piano, only to spoil it with{' '}
                <strong className="text-foreground">20.Rg4</strong>. Then Black built a winning
                position and returned the favor around move 35, when White was winning again. Then,
                just when it seemed the game would swing back and forth forever, Lagno found an
                absolutely incredible sequence of moves that leaves you speechless. Starting with{' '}
                <strong className="text-foreground">42...Nf4</strong>, Lagno played beautifully,
                allowing a stunning queen sacrifice that deserves a diagram:
              </p>

              <figure className="my-6">
                <img
                  src="/assets/news/candidates-2026-r3/Tan_Lagno_Queen_Sac_cropped.webp"
                  alt="Position after 45...g4 — Lagno's stunning queen sacrifice"
                  className="w-full max-w-sm rounded-lg border border-border"
                  loading="lazy"
                />
                <figcaption className="text-xs text-muted-foreground mt-2 italic">
                  Position after 45...g4 — Black sacrifices the queen with a devastating combination
                </figcaption>
              </figure>

              <FidePhoto src="/assets/news/candidates-2026-r3/lagno-tan.webp" width={1600} height={1067} alt="Lagno vs Tan Zhongyi, Women's Candidates Round 3" photographer="Michal Walusza" />

              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                The Draws
              </h3>
              <FidePhoto src="/assets/news/candidates-2026-r3/deshmukh-goryachkina.webp" width={1600} height={1067} alt="Deshmukh vs Goryachkina, Women's Candidates Round 3" photographer="Michal Walusza" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Goryachkina {'\u00BD'}-{'\u00BD'} Deshmukh</strong>{' '}
                was a good game for White — Goryachkina built up a winning endgame, but some
                inaccuracies let the advantage evaporate in the end.{' '}
                <strong className="text-foreground">Vaishali {'\u00BD'}-{'\u00BD'} Muzychuk</strong>{' '}
                was an uneventful game, played correctly from start to finish but without either
                party taking any risks whatsoever.
              </p>
              <FidePhoto src="/assets/news/candidates-2026-r3/muzychuk.webp" width={1600} height={1142} alt="Anna Muzychuk, Women's Candidates Round 3" photographer="Yoav Nis" />
            </section>

            {/* -- Looking Ahead ------------------------------------------- */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Looking Ahead to Round 4
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                With the first rest day looming on April 2nd, Round 4 offers one final chance for the
                players to make their mark before the tournament takes a breath. And what a way to
                head into the break:{' '}
                <strong className="text-foreground">Sindarov vs Caruana</strong> — the two runaway
                leaders, the two most in-form players in the tournament, going head-to-head with
                everything on the line.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You simply cannot ask for more than this. The World Cup champion who just dismantled
                Praggnanandhaa with a masterpiece sacrifice, against the six-time Candidates veteran
                who demolished Wei Yi in 19 flawless moves. Both on 2{'\u00BD'} out of 3. Both
                playing the best chess of their lives. Both knowing that a win tomorrow would open
                up a staggering lead over the rest of the field before anyone has had a chance to
                regroup. For chess fans around the world, this is the game you clear your schedule
                for.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4 font-semibold">
                Open Section — Round 4 Pairings:
              </p>
              <ul className="text-muted-foreground leading-relaxed mb-4 list-disc list-inside space-y-1">
                <li>Esipenko vs Giri</li>
                <li>Wei Yi vs Nakamura</li>
                <li>Sindarov vs Caruana</li>
                <li>Bluebaum vs Praggnanandhaa</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4 font-semibold">
                Women's Section — Round 4 Pairings:
              </p>
              <ul className="text-muted-foreground leading-relaxed mb-4 list-disc list-inside space-y-1">
                <li>Muzychuk vs Lagno</li>
                <li>Assaubayeva vs Tan Zhongyi</li>
                <li>Deshmukh vs Zhu Jiner</li>
                <li>Vaishali vs Goryachkina</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed italic">
                Round 4 begins on 1 April at 15:30 local time (13:30 UTC).
              </p>
            </section>

            {/* -- Sources ------------------------------------------------- */}
            <section className="mb-8 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Sources & Credits
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>
                  All photos: FIDE / Michal Walusza —{' '}
                  <a
                    href="https://www.flickr.com/photos/fide/albums/72177720332782016/"
                    className="underline hover:text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    FIDE Flickr
                  </a>
                  , used for editorial purposes per FIDE Photography Guidelines
                </li>
                <li>
                  Game PGNs:{' '}
                  <a
                    href="https://lichess.org/broadcast/fide-candidates-2026-open/round-3/SDizieNR"
                    className="underline hover:text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Lichess Broadcast
                  </a>
                </li>
                <li>
                  Results:{' '}
                  <a
                    href="https://candidates2026.fide.com/pairings"
                    className="underline hover:text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    FIDE Candidates 2026 Official Site
                  </a>
                </li>
              </ul>
            </section>
          </div>
        </article>

      </div>
    </>
  );
};

export default CandidatesRound3Recap2026;
