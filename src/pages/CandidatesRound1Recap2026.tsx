import { ArticleGameViewer, type ArticleGame } from '@/components/game-viewer/ArticleGameViewer';
import SeoHead from '@/components/SeoHead';

// ---------------------------------------------------------------------------
// PGN Data — all 8 games from Round 1 (Open + Women's)
// ---------------------------------------------------------------------------

const ROUND1_GAMES: (ArticleGame & { result: string })[] = [
  {
    id: 'caruana-nakamura',
    label: 'Caruana 1-0 Nakamura',
    section: 'Open',
    result: '1-0',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.1"]
[White "Caruana, Fabiano"]
[Black "Nakamura, Hikaru"]
[Result "1-0"]
[WhiteElo "2795"]
[BlackElo "2810"]
[ECO "A13"]
[Opening "English Opening: Agincourt Defense"]

1. Nf3 d5 2. c4 e6 3. g3 d4 4. Bg2 Nc6 5. O-O Bc5 6. e3 Nge7 7. Nxd4 Nxd4 8. b4 Bxb4 9. exd4 O-O 10. Qb3 Ba5 11. Nc3 Nf5 12. Ba3 Re8 13. d5 Nd4 14. Qa4 b6 15. Rae1 Bd7 16. Qd1 c5 17. Bb2 Rb8 18. a4 a6 19. dxe6 Bxe6 20. Nd5 Qd6 21. Bxd4 cxd4 22. Re4 Bxd5 23. Rxe8+ Rxe8 24. Bxd5 Bb4 25. h4 a5 26. d3 Qf6 27. Kg2 Qe5 28. Qf3 Qf6 29. Qg4 Bc5 30. h5 h6 31. Rh1 Qg5 32. Qd1 Qe7 33. Bc6 Rc8 34. Re1 Qc7 35. Bd5 Kf8 36. Qg4 Rd8 37. Qe4 Kg8 38. Qf5 Qd7 39. Qf3 Rf8 40. Re5 Bd6 41. Rf5 Qe7 42. Qg4 Be5 43. Rf3 Bf6 44. Rf4 Qd8 45. Be4 Re8 46. Rf5 Qd7 47. Qf4 Bg5 48. Qf3 Qc7 49. Rxf7 Qxf7 50. Bd5 Re6 51. Qg4 Kf8 52. Bxe6 Qe8 53. Bd7 Qa8+ 54. Kg1 Bf6 55. Qe6 Qd8 56. Bc6 Qe7 57. Qc8+ Qd8 58. Qb7 Be5 59. Bd5 Qc7 60. Qa8+ Ke7 61. Qg8 Kd6 62. Be4 Ke7 63. Bg6 Bf6 64. Qf7+ Kd6 65. Qd5+ Ke7 66. Bf5 Be5 67. f4 Bf6 68. Kg2 Qd6 69. Qb7+ Kf8 70. Kf3 Qe7 71. Qe4 Qxe4+ 72. dxe4 Be7 73. e5 Bb4 74. Bd3 Be1 75. g4 Ke7 76. Ke4 Bg3 77. f5 Kd7 78. Kd5 Bh4 79. f6 gxf6 80. e6+ Ke7 81. Kc6 Kxe6 82. Kxb6 Be1 83. c5 1-0`,
  },
  {
    id: 'pragg-giri',
    label: 'Praggnanandhaa 1-0 Giri',
    section: 'Open',
    result: '1-0',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.2"]
[White "Praggnanandhaa R"]
[Black "Giri, Anish"]
[Result "1-0"]
[WhiteElo "2741"]
[BlackElo "2753"]
[ECO "B23"]
[Opening "Sicilian Defense: Closed, Grand Prix Attack"]

1. e4 c5 2. Nc3 d6 3. f4 g6 4. Nf3 Bg7 5. Bb5+ Bd7 6. a4 Nc6 7. O-O a6 8. Bc4 e6 9. d3 Nge7 10. f5 exf5 11. Qe1 Be6 12. exf5 gxf5 13. Bxe6 fxe6 14. Qxe6 Qd7 15. Qc4 O-O-O 16. Bg5 Rde8 17. Rae1 Ng6 18. Nd5 Kb8 19. Nf6 Bxf6 20. Bxf6 Rhf8 21. Bc3 f4 22. Rxe8+ Rxe8 23. Re1 Rf8 24. Qe6 Qxe6 25. Rxe6 Kc7 26. Ng5 Kd7 27. Re4 Rf5 28. Nxh7 d5 29. Re2 d4 30. Be1 Nce5 31. Re4 Ng4 32. h3 Ne3 33. c3 Nd5 34. h4 dxc3 35. bxc3 Rh5 36. Ng5 Nf6 37. Re6 Rxg5 38. Rxf6 Rg4 39. h5 Ne5 40. h6 Nf3+ 41. Kf1 Nxe1 42. Kxe1 Rxg2 43. Rxf4 Rh2 44. Rf6 Rh3 45. Kd2 Rh2+ 46. Ke3 Rh3+ 47. Ke4 c4 48. dxc4 Rxc3 49. Kf5 Ke7 50. Rb6 Rxc4 51. h7 1-0`,
  },
  {
    id: 'sindarov-esipenko',
    label: 'Sindarov 1-0 Esipenko',
    section: 'Open',
    result: '1-0',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.4"]
[White "Sindarov, Javokhir"]
[Black "Esipenko, Andrey"]
[Result "1-0"]
[WhiteElo "2745"]
[BlackElo "2698"]
[ECO "D37"]
[Opening "Queen's Gambit Declined: Three Knights Variation"]

1. d4 d5 2. c4 e6 3. Nf3 Nf6 4. Nc3 Be7 5. cxd5 exd5 6. Bf4 O-O 7. e3 c5 8. Bd3 Nc6 9. O-O c4 10. Bc2 Nh5 11. Be5 f6 12. Bg3 f5 13. Be5 Be6 14. b3 Qa5 15. Ne2 b5 16. Nf4 Nxf4 17. exf4 Qd8 18. Re1 Qd7 19. Re3 Rae8 20. h4 h6 21. g3 a6 22. Kg2 Bf7 23. Qd2 Bb4 24. Qe2 Bh5 25. a4 Ba5 26. axb5 axb5 27. Bd1 Bxf3+ 28. Qxf3 Bb6 29. Ra6 Nxd4 30. Qh5 Rxe5 31. Rxe5 Qc6 32. bxc4 bxc4 33. Ba4 Qc5 34. Qg6 Ba7 35. Re8 Rxe8 36. Qxe8+ Kh7 37. Qg6+ Kg8 38. Bd7 c3 39. Qe8+ Kh7 40. Qg6+ Kg8 41. Re6 1-0`,
  },
  {
    id: 'bluebaum-weiyi',
    label: 'Bluebaum \u00BD-\u00BD Wei Yi',
    section: 'Open',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.3"]
[White "Bluebaum, Matthias"]
[Black "Wei, Yi"]
[Result "1/2-1/2"]
[WhiteElo "2698"]
[BlackElo "2754"]
[ECO "D41"]
[Opening "Queen's Gambit Declined: Semi-Tarrasch Defense"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 c5 5. cxd5 cxd4 6. Qxd4 exd5 7. Bg5 Be7 8. e3 O-O 9. Rd1 Be6 10. Bb5 h6 11. Bh4 a6 12. Ba4 Nc6 13. Qd3 Ne4 14. Bxe7 Nxe7 15. O-O Nxc3 16. Qxc3 Rc8 17. Qe5 Rc4 18. Bb3 Re4 19. Qc3 Bg4 20. Rd2 Bxf3 21. gxf3 Qd7 22. fxe4 Qg4+ 23. Kh1 Qf3+ 24. Kg1 Qg4+ 25. Kh1 Qf3+ 26. Kg1 Qg4+ 1/2-1/2`,
  },
  {
    id: 'deshmukh-muzychuk',
    label: 'Deshmukh \u00BD-\u00BD Muzychuk',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.4"]
[White "Divya Deshmukh"]
[Black "Muzychuk, Anna"]
[Result "1/2-1/2"]
[WhiteElo "2497"]
[BlackElo "2522"]
[ECO "C45"]
[Opening "Scotch Game: Mieses Variation"]

1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6 5. Nxc6 bxc6 6. e5 Qe7 7. Qe2 Nd5 8. g3 g6 9. c4 Ba6 10. b3 Bg7 11. Bb2 O-O 12. Bh3 Rfe8 13. O-O Bxe5 14. Qxe5 Qxe5 15. Bxe5 Rxe5 16. Bxd7 Nb4 17. Nc3 Bc8 18. Rfd1 Kf8 19. Kf1 Nd5 20. Bxc6 Bh3+ 21. Kg1 Nxc3 22. Bxa8 Nxd1 23. Rxd1 Re2 24. Bg2 Bf5 25. h4 Rxa2 26. b4 Rb2 27. Rd5 Rxb4 28. Rc5 Be6 29. Rxc7 Rxc4 30. Rxa7 Rc1+ 31. Kh2 Rc2 32. Kg1 Rc1+ 33. Kh2 Rc2 34. Kg1 Rc1+ 35. Kh2 1/2-1/2`,
  },
  {
    id: 'vaishali-assaubayeva',
    label: 'Vaishali \u00BD-\u00BD Assaubayeva',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.3"]
[White "Vaishali, Rameshbabu"]
[Black "Assaubayeva, Bibisara"]
[Result "1/2-1/2"]
[WhiteElo "2470"]
[BlackElo "2516"]
[ECO "B32"]
[Opening "Sicilian Defense: Lowenthal Variation"]

1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 e5 5. Ne2 Nf6 6. Nbc3 Bc5 7. Ng3 d6 8. Na4 Bb4+ 9. c3 Ba5 10. Be2 a6 11. b4 Bc7 12. O-O O-O 13. Qd3 Be6 14. Rd1 h6 15. Be3 Rb8 16. Nb2 b5 17. a3 Ng4 18. Bxg4 Bxg4 19. Rd2 Ne7 20. c4 Be6 21. Rc1 f5 22. exf5 Nxf5 23. Nxf5 Rxf5 24. cxb5 axb5 25. Rc6 Rf7 26. Qc3 Rc8 27. a4 bxa4 28. Nc4 Bd7 29. Nxd6 Bxd6 30. Rdxd6 Rxc6 31. Qxc6 Bxc6 32. Rxd8+ Rf8 33. Rxf8+ Kxf8 34. f4 exf4 35. Bxf4 a3 36. Kf2 Kf7 37. Bc1 a2 38. Bb2 g6 39. g3 Ke6 40. Ke3 Kd5 41. Ba1 1/2-1/2`,
  },
  {
    id: 'goryachkina-lagno',
    label: 'Goryachkina \u00BD-\u00BD Lagno',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.2"]
[White "Goryachkina, Aleksandra"]
[Black "Lagno, Kateryna"]
[Result "1/2-1/2"]
[WhiteElo "2534"]
[BlackElo "2508"]
[ECO "C84"]
[Opening "Ruy Lopez: Closed, Martinez Variation"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. d3 b5 7. Bb3 O-O 8. Nc3 d6 9. a3 Bg4 10. Be3 Qd7 11. h3 Be6 12. Nd5 Bd8 13. Nxf6+ Bxf6 14. Bxe6 Qxe6 15. Rc1 d5 16. exd5 Qxd5 17. c4 bxc4 18. Rxc4 Rfd8 19. Qc2 Ne7 20. d4 Ng6 21. Rc5 Qe6 22. Re1 Qd6 23. dxe5 Nxe5 24. Nxe5 Bxe5 25. b4 Re8 26. Rd1 Qf6 27. Rcd5 h6 28. Bd4 Bxd4 29. R5xd4 Rad8 30. Rxd8 Rxd8 31. Re1 Qd6 32. Qc3 Kh7 33. Qc4 Rd7 34. Qe4+ Kg8 35. Qe8+ Kh7 36. Qe4+ Kg8 37. Qe5 Qd3 38. h4 Kh7 39. Qe8 h5 40. Qe5 Qd5 41. Qxd5 Rxd5 42. Rc1 a5 43. Rxc7 axb4 44. axb4 Rd1+ 45. Kh2 Rd4 46. g3 Rxb4 47. Rxf7 Kh6 48. Kg2 Rb3 49. Rd7 Ra3 50. Rd6+ Kh7 51. Kf1 Ra2 52. Ke1 g6 53. Rd7+ Kh6 54. Rf7 Rb2 55. Kf1 Ra2 56. Kg2 Ra3 57. Re7 Rb3 58. Re3 Rb2 59. Re7 Rb3 60. Rd7 Ra3 61. f3 Ra2+ 62. Kh3 Ra3 63. Rf7 Rb3 64. g4 hxg4+ 65. Kxg4 Rb5 66. Re7 Ra5 67. Re3 Rb5 68. Re4 Ra5 69. f4 Ra1 70. Re6 Rg1+ 71. Kh3 Rf1 72. Kg3 Kg7 73. Re5 1/2-1/2`,
  },
  {
    id: 'zhu-tan',
    label: 'Zhu Jiner \u00BD-\u00BD Tan Zhongyi',
    section: 'Women',
    result: '\u00BD-\u00BD',
    pgn: `[Event "FIDE Women's Candidates Tournament 2026"]
[Site "Paphos, Cyprus"]
[Date "2026.03.29"]
[Round "1.1"]
[White "Zhu, Jiner"]
[Black "Tan, Zhongyi"]
[Result "1/2-1/2"]
[WhiteElo "2578"]
[BlackElo "2535"]
[ECO "C55"]
[Opening "Italian Game: Two Knights Defense"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d3 Be7 5. O-O O-O 6. Nc3 d6 7. a4 Na5 8. Ba2 c5 9. Bg5 Nc6 10. Bxf6 Bxf6 11. Nd5 g6 12. c3 Bg7 13. Qd2 Bg4 14. Ng5 h6 15. f4 Kh8 16. Ne3 hxg5 17. f5 gxf5 18. exf5 Bh5 19. g4 e4 20. dxe4 Ne5 21. h3 Bg6 22. fxg6 fxg6 23. Kg2 Qd7 24. Nc4 Rf4 25. Rxf4 gxf4 26. Qxf4 Qxa4 27. Nxe5 dxe5 28. Qg5 Qxe4+ 29. Kg1 c4 30. Qh4+ Kg8 31. Re1 Qf4 32. Rf1 Qe3+ 33. Qf2 Qxf2+ 34. Rxf2 Rc8 35. Bb1 Bh6 36. Re2 Kf7 37. Rxe5 Rd8 38. Ba2 Rd1+ 39. Kf2 Rd2+ 40. Ke1 Rxb2 41. Bxc4+ Kf6 1/2-1/2`,
  },
];

// ---------------------------------------------------------------------------
// Photo component with FIDE attribution
// ---------------------------------------------------------------------------

function FidePhoto({
  src, alt, width, height, className = '',
}: { src: string; alt: string; width: number; height: number; className?: string }) {
  // 600px sibling + intrinsic dimensions, brought in line with the newer
  // articles' Photo component (audit P2 #11): without width/height every photo
  // shifted the article as it loaded, and phones downloaded the 1400-1600px
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
        Photo: FIDE / Michal Walusza
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Article Component
// ---------------------------------------------------------------------------

const CandidatesRound1Recap2026 = () => {
  return (
    <>
      <SeoHead routeKey="news/candidates-2026-round-1" />

      <div className="bg-background flex flex-col">

        {/* ── Hero Banner ─────────────────────────────────────────── */}
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

            <p className="text-editorial font-semibold tracking-wider uppercase text-sm mb-4">Round 1 Recap</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
              Fireworks in Paphos
            </h1>
            <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
              Three Decisive Games Ignite the Candidates
            </h2>

            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5">
                <span className="text-editorial">&#9656;</span> 3 Decisive Games
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> Round 1 of 14
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> 29 March 2026
              </span>
            </div>

            <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
              The 2026 Candidates Tournament exploded into life with three decisive results in four games —
              an opening salvo that sent shockwaves through the chess world and announced that nobody came to
              Paphos to draw.
            </p>
            <p className="text-muted-foreground text-sm">Published 29 March 2026</p>
          </div>
        </div>

        {/* ── Article Body ────────────────────────────────────────── */}
        <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <FidePhoto src="/assets/news/candidates-2026-r1/deshmukh.webp" width={1400} height={931} alt="Divya Deshmukh watches all eight games on the big screen" />

            {/* ── Venue & Atmosphere ──────────────────────────────── */}
            <section className="mb-12">
              <p className="text-muted-foreground leading-relaxed mb-4">
                Before a single pawn was pushed, the players were already in high spirits. In the days leading
                up to Round 1, several competitors could barely contain their enthusiasm about the venue. The
                Cap St George's Hotel & Resort on the Mediterranean coast of Paphos, with its sun-drenched
                terraces and turquoise waters, is a far cry from the windowless hotel conference rooms that
                elite chess players are accustomed to.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <em>"It's the first time in quite a while that we get to play in a sunny location,"</em> was
                the sentiment echoed by multiple players in pre-tournament interviews. The brilliant weather,
                the stunning surroundings, and the excellent playing conditions drew universal praise. Some
                players joked that beyond competing in the greatest tournament world chess has to offer, they
                were also getting a three-week vacation on a Mediterranean island — quite the change from what
                they're used to.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether the sunshine and sea air had anything to do with the fighting spirit on display in
                Round 1 is anyone's guess — but with three decisive results in four games, something in the
                Cypriot air clearly brought out the best in these players.
              </p>
            </section>

            {/* ── Results Overview ─────────────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Open Section — Results
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Three decisive results out of four games. If anyone expected a cautious opening round full of
                grandmaster draws, the Candidates field had other ideas. Caruana, Praggnanandhaa, and Sindarov
                stormed into the lead on day one, setting a blistering pace that promises one of the most
                exciting Candidates tournaments in recent memory.
              </p>

              <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[1fr_60px_1fr] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm text-right pr-3">White</span>
                    <span className="text-link font-semibold text-sm text-center">Result</span>
                    <span className="text-link font-semibold text-sm pl-3">Black</span>
                  </div>
                  {[
                    { w: 'Caruana', b: 'Nakamura', r: '1 - 0', highlight: true },
                    { w: 'Praggnanandhaa', b: 'Giri', r: '1 - 0', highlight: true },
                    { w: 'Bluebaum', b: 'Wei Yi', r: '\u00BD - \u00BD', highlight: false },
                    { w: 'Sindarov', b: 'Esipenko', r: '1 - 0', highlight: true },
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

            <FidePhoto src="/assets/news/candidates-2026-r1/caruana-nakamura.webp" width={1400} height={933} alt="Fabiano Caruana faces Hikaru Nakamura in the headline clash of Round 1" />

            {/* ── Game 1: Caruana vs Nakamura ──────────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Caruana 1-0 Nakamura — The Impossible Comeback
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                English Opening: Agincourt Defense (A13) &middot; 83 moves
              </p>

              <p className="text-muted-foreground leading-relaxed mb-4">
                The marquee matchup of Round 1 delivered drama beyond anyone's wildest expectations. In the
                all-American battle between the world's second and third-ranked players, it was Fabiano Caruana
                who emerged victorious — but not before staring into the abyss.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                After 20 moves, Caruana found himself in a nightmarish situation: a complex middlegame position
                with <strong className="text-foreground">barely 13 minutes on his clock</strong> — against none
                other than <strong className="text-foreground">Hikaru Nakamura</strong>, the undisputed master
                of fast-paced chaos. The position screamed danger. The clocks screamed danger louder. Every
                chess fan watching could feel it: Caruana was in deep trouble.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                And then, nothing short of a miracle happened. Over the next sequence of moves, Nakamura
                committed a series of small, almost imperceptible inaccuracies — the kind that only a player
                of Caruana's caliber could exploit. Slowly, methodically, the American number one began to
                turn the screws. What had looked like a lost cause transformed into a promising opposite-colored
                bishops endgame with queens and rooks — theoretically balanced material, but a position where
                Caruana's legendary technique could shine.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The endgame battle that followed was intense, grueling, and marked by mistakes on both sides —
                inevitable given the clock situation. But Caruana never let go. Eighty-three moves after the
                first piece was pushed, the man who many had written off an hour earlier raised his hand in
                victory. A result that seemed impossible to even contemplate just sixty minutes before was now
                reality. What a way to start the tournament.
              </p>

            </section>

            {/* ── Game 2: Praggnanandhaa vs Giri ──────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Praggnanandhaa 1-0 Giri — A Statement of Intent
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Sicilian Defense: Closed (B23) &middot; 51 moves
              </p>

              <FidePhoto src="/assets/news/candidates-2026-r1/pragg-giri.webp" width={1400} height={933} alt="Praggnanandhaa vs Giri, Round 1" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                If anyone had doubts about Praggnanandhaa's form after a string of uninspiring recent
                performances, the 20-year-old Indian prodigy silenced them with a masterclass. This was
                not just a victory — it was a declaration of war.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Pragg chose the Grand Prix Variation of the Closed Sicilian with White — an ambitious system
                that signals aggressive intent from the very first moves. From the opening, he displayed a
                level of preparation and precision that washed away every question mark about his readiness.
                Giri, widely regarded as one of the best theoreticians in the world, was outprepared and
                outplayed.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The defining moment came when Pragg launched{' '}
                <strong className="text-foreground">f5</strong> — the thematic pawn break in this variation
                that guarantees a battle. From that point on, there was no doubt: this was going to be a
                fight to the finish. Pragg built up relentless pressure on the kingside, and move 30,{' '}
                <strong className="text-foreground">Be1</strong> — a quiet but devastating retreat that
                sealed the positional bind.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                The game transitioned into a rook endgame where Pragg held an extra pawn — not much in
                theory, but more than enough in the hands of a player performing at this level. With precise,
                clinical technique, the Indian prodigy nursed his advantage all the way to victory, his
                passed h-pawn proving unstoppable in the final position. Fifty-one moves. Flawless execution.
                The young Indian is here to fight for the crown.
              </p>

            </section>

            {/* ── Game 3: Sindarov vs Esipenko ────────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Sindarov 1-0 Esipenko — The Wildcard Strikes
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Queen's Gambit Declined: Three Knights (D37) &middot; 41 moves
              </p>

              <FidePhoto src="/assets/news/candidates-2026-r1/sindarov-esipenko.webp" width={1400} height={933} alt="Sindarov vs Esipenko, Round 1" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                This game was a tale of two halves — and a cautionary reminder of how quickly fortunes can
                reverse in elite chess. Andrey Esipenko emerged from the opening with a promising position out
                of the Queen's Gambit Declined. For a brief, tantalizing moment, it looked like the young
                Russian would land the first blow of the tournament.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                But Javokhir Sindarov, the World Cup champion playing in his first Candidates, had other
                plans entirely. With the swagger of a player who has beaten Magnus Carlsen and fears nobody,
                Sindarov unleashed a sequence of powerful moves that turned Esipenko's advantage into thin air.
                The critical moment came with <strong className="text-foreground">30.Qh5!</strong> followed by
                the devastating <strong className="text-foreground">34.Qg6</strong> — a queen maneuver of
                breathtaking audacity that ripped open Black's position.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Esipenko must have been heartbroken. A position that promised so much had crumbled in the span
                of ten moves against the relentless tactical pressure of the Uzbek wildcard. Sindarov wrapped up
                the game in just 41 moves — a ruthless display of the attacking prowess that has drawn
                comparisons to Mikhail Tal. The youngest player in the field served notice: he is here to win.
              </p>

            </section>

            {/* ── Game 4: Bluebaum vs Wei Yi ──────────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Bluebaum {'\u00BD'}-{'\u00BD'} Wei Yi — A Theoretical Duel
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Queen's Gambit Declined: Semi-Tarrasch (D41) &middot; 26 moves
              </p>

              <FidePhoto src="/assets/news/candidates-2026-r1/bluebaum-weiyi.webp" width={1400} height={933} alt="Bluebaum vs Wei Yi, Round 1" />

              <p className="text-muted-foreground leading-relaxed mb-4">
                The only draw of the round, and one that carried plenty of tension beneath its peaceful
                scoreline. Matthias Bluebaum's Queen's Gambit met Wei Yi's Semi-Tarrasch Defense — a sharp
                theoretical duel between two deeply prepared players. Wei Yi generated dangerous counterplay
                against Bluebaum's exposed king, and facing perpetual check, the German wisely accepted the
                repetition.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At just 26 moves, the game finished so fast that the photographers had to be quick with their
                cameras to make sure they actually got a picture of the two players at the board. Both live to
                fight another day — and in a Candidates marathon, a solid draw with Black is never a bad
                result for Wei Yi.
              </p>

            </section>

            {/* ── Standings After Round 1 ──────────────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Standings After Round 1
              </h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[40px_1fr_60px] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm">#</span>
                    <span className="text-link font-semibold text-sm">Player</span>
                    <span className="text-link font-semibold text-sm text-center">Pts</span>
                  </div>
                  {[
                    { pos: '1', name: 'Fabiano Caruana', pts: '1', flag: '\u{1F1FA}\u{1F1F8}' },
                    { pos: '', name: 'Praggnanandhaa R.', pts: '1', flag: '\u{1F1EE}\u{1F1F3}' },
                    { pos: '', name: 'Javokhir Sindarov', pts: '1', flag: '\u{1F1FA}\u{1F1FF}' },
                    { pos: '4', name: 'Matthias Bl\u00FCbaum', pts: '\u00BD', flag: '\u{1F1E9}\u{1F1EA}' },
                    { pos: '', name: 'Wei Yi', pts: '\u00BD', flag: '\u{1F1E8}\u{1F1F3}' },
                    { pos: '6', name: 'Hikaru Nakamura', pts: '0', flag: '\u{1F1FA}\u{1F1F8}' },
                    { pos: '', name: 'Anish Giri', pts: '0', flag: '\u{1F1F3}\u{1F1F1}' },
                    { pos: '', name: 'Andrey Esipenko', pts: '0', flag: '\u{1F1EA}\u{1F1FA}' },
                  ].map((p) => (
                    <div key={p.name} className={`grid grid-cols-[40px_1fr_60px] px-4 py-2.5 ${p.pts === '1' ? 'bg-primary/5' : ''}`}>
                      <span className="text-muted-foreground text-sm">{p.pos}</span>
                      <span className="text-sm text-foreground">
                        {p.flag} {p.name}
                      </span>
                      <span className={`text-sm text-center font-mono font-bold ${p.pts === '1' ? 'text-link' : 'text-muted-foreground'}`}>
                        {p.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Game Viewer ─────────────────────────────────────── */}
            <ArticleGameViewer games={ROUND1_GAMES} />

            {/* ── Women's Candidates ───────────────────────────────── */}
            <section className="mb-16">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Women's Candidates — Four Battles, Four Draws
              </h2>

              <p className="text-muted-foreground leading-relaxed mb-4">
                Don't let the all-draws scoreline fool you — the Women's Candidates Tournament opened with
                four intensely fought battles where the result hung in the balance until the very last moves.
                These were not grandmaster draws. These were wars.
              </p>

              <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  <div className="grid grid-cols-[1fr_60px_1fr] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm text-right pr-3">White</span>
                    <span className="text-link font-semibold text-sm text-center">Result</span>
                    <span className="text-link font-semibold text-sm pl-3">Black</span>
                  </div>
                  {[
                    { w: 'Deshmukh', b: 'Muzychuk', r: '\u00BD - \u00BD' },
                    { w: 'Vaishali', b: 'Assaubayeva', r: '\u00BD - \u00BD' },
                    { w: 'Goryachkina', b: 'Lagno', r: '\u00BD - \u00BD' },
                    { w: 'Zhu Jiner', b: 'Tan Zhongyi', r: '\u00BD - \u00BD' },
                  ].map((g) => (
                    <div key={g.w} className="grid grid-cols-[1fr_60px_1fr] px-4 py-3">
                      <span className="text-sm text-right pr-3 text-muted-foreground">{g.w}</span>
                      <span className="text-sm text-center font-mono text-muted-foreground">{g.r}</span>
                      <span className="text-sm pl-3 text-muted-foreground">{g.b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                Vaishali's Great Escape
              </h3>
              <FidePhoto src="/assets/news/candidates-2026-r1/vaishali.webp" width={1400} height={933} alt="Vaishali Rameshbabu deep in thought" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                The headline story of the women's round was the survival act of{' '}
                <strong className="text-foreground">Vaishali Rameshbabu</strong>. Against the formidable
                Bibisara Assaubayeva in a Sicilian structure, Vaishali found herself in an impossibly dire
                situation — down on the board <em>and</em> down on the clock, with{' '}
                <strong className="text-foreground">just 38 seconds remaining to make roughly 13 moves</strong>{' '}
                before the time control. It was the kind of position where even the strongest nerves crack.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                But Vaishali, Pragg's older sister and a formidable competitor in her own right, held her
                nerve magnificently. Move after move, with her flag hanging by a thread, she found resources
                to stay alive. Assaubayeva, perhaps surprised that her opponent was still standing, let the
                advantage slip, and the game was eventually drawn at move 40. A Houdini act that Vaishali
                will remember for years — and a warning to the rest of the field: she is not going down
                without a fight.
              </p>

              <h3 className="text-lg font-playfair font-bold text-foreground mb-3">
                Other Women's Games
              </h3>
              <FidePhoto src="/assets/news/candidates-2026-r1/deshmukh-muzychuk.webp" width={1400} height={933} alt="Divya Deshmukh vs Anna Muzychuk" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Divya Deshmukh</strong> showed excellent opening preparation
                against Anna Muzychuk, building a significant time advantage early. A critical decision on
                move 20 — capturing a pawn instead of trading knights — shifted the balance to equality, and
                the game ended in a threefold repetition after 32 moves.
              </p>
              <FidePhoto src="/assets/news/candidates-2026-r1/goryachkina-lagno.webp" width={1400} height={933} alt="Goryachkina vs Lagno, Women's Candidates Round 1" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Aleksandra Goryachkina</strong> came closest to a decisive
                result, building up a clearly winning position against Kateryna Lagno. The top-rated woman in
                the field looked set to take sole lead — but an inaccurate recapture on move 24 saw her entire
                advantage evaporate in an instant. It was Lagno who got lucky there, escaping with a draw from
                a position that should have been lost.
              </p>
              <FidePhoto src="/assets/news/candidates-2026-r1/tan-zhu.webp" width={1400} height={933} alt="Tan Zhongyi vs Zhu Jiner, Round 1" />
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Zhu Jiner vs Tan Zhongyi</strong> — the all-Chinese
                encounter — produced one of the most exciting games of the round across both sections.
                Zhu Jiner threw caution to the wind and sacrificed a full piece to launch a ferocious
                attack against her compatriot. The position was electric, with tactical complications
                everywhere — but Jiner rushed to win the piece back rather than maintaining the pressure,
                and the game petered out into a draw. A missed opportunity, but a spectacular fight that
                showed neither player is afraid to go for the jugular.
              </p>
            </section>

            {/* ── Looking Ahead ────────────────────────────────────── */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Looking Ahead to Round 2
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                With three players already on a perfect score, Round 2 promises even more fireworks.
                If Round 1 is any indication, the 2026 Candidates Tournament is shaping up to be one for the
                ages. Thirteen rounds remain. Everything is still to play for.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4 font-semibold">
                Open Section — Round 2 Pairings:
              </p>
              <ul className="text-muted-foreground leading-relaxed mb-4 list-disc list-inside space-y-1">
                <li>Esipenko vs Nakamura</li>
                <li>Giri vs Caruana</li>
                <li>Wei Yi vs Praggnanandhaa</li>
                <li>Sindarov vs Bluebaum</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mb-4 font-semibold">
                Women's Section — Round 2 Pairings:
              </p>
              <ul className="text-muted-foreground leading-relaxed mb-4 list-disc list-inside space-y-1">
                <li>Muzychuk vs Tan Zhongyi</li>
                <li>Lagno vs Zhu Jiner</li>
                <li>Assaubayeva vs Goryachkina</li>
                <li>Deshmukh vs Vaishali</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed italic">
                Round 2 begins on 30 March at 15:30 local time (13:30 UTC).
              </p>
            </section>

            {/* ── Sources ─────────────────────────────────────────── */}
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
                    href="https://lichess.org/broadcast/fide-candidates-2026-open/round-1/uLCZwqAK"
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

export default CandidatesRound1Recap2026;
