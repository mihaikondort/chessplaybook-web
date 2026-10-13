import SeoHead from '@/components/SeoHead';

const players = [
  {
    name: 'Zhu Jiner',
    country: 'China',
    flag: '\u{1F1E8}\u{1F1F3}',
    rating: 2578,
    rank: '',
    age: 20,
    qualification: 'FIDE Circuit / Grand Swiss performance',
    photo: '/assets/news/candidates-2026-women/zhu.webp',
    photoCredit: 'Ekaterina Vasilchenko, CC BY-SA 3.0',
    chances: 'Top seed',
    bio: `The highest-rated player in the field and a rising force in world chess. Zhu Jiner earned the Grandmaster title at just 19, making her one of the youngest women ever to achieve the feat. Her explosive tactical style and fearless opening preparation have drawn comparisons to the great Chinese players who came before her — but she is very much forging her own path.`,
    recentForm: `A dominant 2025 season saw Zhu climb to the top of Chinese women's chess. She enters Cyprus as the clear rating favourite, a position she has earned through consistently strong performances in the FIDE Circuit.`,
  },
  {
    name: 'Tan Zhongyi',
    country: 'China',
    flag: '\u{1F1E8}\u{1F1F3}',
    rating: 2535,
    rank: '',
    age: 35,
    qualification: 'FIDE Circuit',
    photo: '/assets/news/candidates-2026-women/tan.webp',
    photoCredit: 'Stefan64, CC BY-SA 3.0',
    chances: 'Veteran threat',
    bio: `A former Women's World Champion, Tan Zhongyi claimed the title in 2017 by defeating Anna Muzychuk in the final — a player she may well face again in Cyprus. Known for her rock-solid positional understanding and steely nerves in must-win situations, Tan brings the kind of experience that cannot be taught. She has been a pillar of Chinese women's chess for over a decade.`,
    recentForm: `Tan has been quietly consistent through the FIDE Circuit events, avoiding the spotlight while steadily accumulating the rating points and results needed to qualify. The veteran knows how to peak at the right moment.`,
  },
  {
    name: 'Aleksandra Goryachkina',
    country: 'FIDE',
    flag: '\u{1F3F3}\u{FE0F}',
    rating: 2534,
    rank: '',
    age: 28,
    qualification: 'Rating / previous Candidates performance',
    photo: '/assets/news/candidates-2026-women/goryachkina.webp',
    photoCredit: 'Eteri Kublashvili, CC BY-SA 3.0',
    chances: 'Elite favourite',
    bio: `One of the strongest women players in history. Goryachkina challenged Ju Wenjun for the Women's World Championship in 2020, pushing the match to tiebreaks before narrowly losing. Her deep opening preparation, dynamic middlegame play, and relentless fighting spirit make her a threat in any format. She competes under the FIDE flag.`,
    recentForm: `Goryachkina remains a constant presence at the top of women's chess. Her combination of experience, preparation depth, and sheer competitive will makes her many experts' pick to win the tournament outright.`,
  },
  {
    name: 'Anna Muzychuk',
    country: 'Ukraine',
    flag: '\u{1F1FA}\u{1F1E6}',
    rating: 2522,
    rank: '',
    age: 36,
    qualification: 'Replacement for Koneru Humpy',
    photo: '/assets/news/candidates-2026-women/muzychuk.webp',
    photoCredit: 'Stefan64, CC BY-SA 3.0',
    chances: 'Wildcard',
    bio: `A former World Rapid and World Blitz Champion, Muzychuk made global headlines in 2017 when she refused to compete in the World Championships held in Saudi Arabia, sacrificing her titles rather than compromising her principles on women's rights. Creative, enterprising, and tactically sharp, she brings both quality and character to the field. She replaces Koneru Humpy, who withdrew citing safety concerns.`,
    recentForm: `As a late replacement, Muzychuk has had less time to prepare specifically for the Candidates. But her vast experience at the highest level and natural talent mean she should not be underestimated — she has nothing to lose and everything to prove.`,
  },
  {
    name: 'Bibisara Assaubayeva',
    country: 'Kazakhstan',
    flag: '\u{1F1F0}\u{1F1FF}',
    rating: 2516,
    rank: '',
    age: 22,
    qualification: 'FIDE Circuit',
    photo: '/assets/news/candidates-2026-women/assaubayeva.webp',
    photoCredit: 'CC0 (public domain)',
    chances: 'Rising star',
    bio: `When Assaubayeva earned the Grandmaster title in 2021 at just 17, she became the youngest female GM in history at the time — a record that announced her arrival on the world stage. Representing Kazakhstan, she plays an aggressive, tactical brand of chess that keeps opponents on edge from the first move. She is the standard-bearer for Central Asian women's chess.`,
    recentForm: `Assaubayeva has continued her upward trajectory through strong FIDE Circuit results. At 22, she is entering her prime years and the Candidates represents the biggest stage of her career so far.`,
  },
  {
    name: 'Kateryna Lagno',
    country: 'FIDE',
    flag: '\u{1F3F3}\u{FE0F}',
    rating: 2508,
    rank: '',
    age: 37,
    qualification: 'Rating / FIDE Circuit',
    photo: '/assets/news/candidates-2026-women/lagno.webp',
    photoCredit: 'Ministry of Sport of Republic of Tatarstan, CC BY 4.0',
    chances: 'Experienced contender',
    bio: `A former Women's World Blitz Champion and one of the most decorated players in elite women's chess. Lagno has competed at the highest level for nearly two decades, accumulating a wealth of experience that few can match. Her sharp tactical vision and ability to handle pressure make her dangerous in any long tournament format. She competes under the FIDE flag.`,
    recentForm: `Lagno brings the calm confidence of a player who has seen it all. Her FIDE Circuit and rating performances have kept her firmly among the world's best, and she arrives in Cyprus with nothing left to prove except the result.`,
  },
  {
    name: 'Divya Deshmukh',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    rating: 2497,
    rank: '',
    age: 19,
    qualification: 'Grand Swiss winner',
    photo: '/assets/news/candidates-2026-women/deshmukh.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'Fearless debutante',
    bio: `India's latest chess prodigy and the youngest player in the field. Deshmukh announced herself on the world stage by winning the Women's Grand Swiss 2024, earning her Candidates spot in emphatic fashion. A fearless attacker who thrives in complex positions, she represents the extraordinary depth of Indian chess talent that has emerged in recent years.`,
    recentForm: `Deshmukh has been in excellent form heading into the Candidates. At just 19, she plays with the freedom of youth — unburdened by expectations and unafraid of reputations. A genuine dark horse.`,
  },
  {
    name: 'R Vaishali',
    country: 'India',
    flag: '\u{1F1EE}\u{1F1F3}',
    rating: 2470,
    rank: '',
    age: 25,
    qualification: 'FIDE Circuit',
    photo: '/assets/news/candidates-2026-women/vaishali.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'The sister story',
    bio: `Vaishali earned the Grandmaster title in 2024, joining an exclusive club of women who hold the unrestricted GM title. But the most remarkable storyline? Her younger brother, Praggnanandhaa, is competing in the Open Candidates Tournament at the same venue, at the same time. Sharp tactical vision and relentless fighting spirit define her play.`,
    recentForm: `Strong FIDE Circuit performances secured Vaishali's qualification. The chance to compete alongside her brother in the most important chess event of the year adds an extraordinary personal dimension to her tournament.`,
  },
];

const round1Pairings = [
  { board: 1, white: 'Deshmukh', black: 'Muzychuk' },
  { board: 2, white: 'Vaishali', black: 'Assaubayeva' },
  { board: 3, white: 'Goryachkina', black: 'Lagno', highlight: true },
  { board: 4, white: 'Zhu Jiner', black: 'Tan Zhongyi', highlight: true },
];

const CandidatesArticleWomen2026 = () => {
  return (
    <>
      <SeoHead routeKey="news/candidates-2026-women" />

      <div className="bg-background flex flex-col">

        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-b from-card via-card to-background">
          {/* Background chess board pattern */}
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

          {/* Floating chess pieces */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span className="absolute text-link/[0.07] text-7xl sm:text-8xl top-8 left-[8%] animate-float-slow select-none">&#9813;</span>
            <span className="absolute text-link/[0.07] text-6xl sm:text-7xl top-16 right-[12%] animate-float-medium select-none">&#9819;</span>
            <span className="absolute text-link/[0.05] text-5xl sm:text-6xl bottom-12 left-[15%] animate-float-fast select-none">&#9816;</span>
            <span className="absolute text-link/[0.05] text-5xl sm:text-6xl bottom-8 right-[8%] animate-float-slow select-none">&#9822;</span>
            <span className="absolute text-link/[0.04] text-6xl top-1/2 left-[3%] animate-float-medium select-none">&#9815;</span>
            <span className="absolute text-link/[0.04] text-6xl top-1/3 right-[3%] animate-float-fast select-none">&#9821;</span>
          </div>

          {/* Gradient overlays */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background/50 to-transparent" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
            {/* Site icon */}
            <img src="/chess-queen-icon.png" alt="Chess Playbook" className="w-14 h-14 mb-6 mx-auto" />

            <p className="text-link font-semibold tracking-wider uppercase text-sm mb-4">
              Tournament Preview
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-foreground mb-4 leading-tight">
              Eight Queens, One Crown
            </h1>
            <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
              FIDE Women's Candidates Tournament 2026 in Cyprus
            </h2>

            {/* Tournament quick facts ribbon */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-sm text-muted-foreground mb-8">
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> 8 Grandmasters
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> 14 Rounds
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> Paphos, Cyprus
              </span>
              <span className="hidden sm:inline text-border">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-link">&#9656;</span> 29 Mar — 16 Apr
              </span>
            </div>

            <p className="text-muted-foreground text-lg italic max-w-2xl mx-auto mb-6">
              The strongest women's chess tournament of the year begins — eight grandmasters from five countries,
              fourteen rounds, and one dream: to challenge for the Women's World Chess Championship.
            </p>
            <p className="text-muted-foreground text-sm">
              Published 29 March 2026
            </p>
          </div>
        </div>

        <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">

            {/* Stakes Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Throne Awaits a Challenger
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Ju Wenjun has been the dominant force in women's chess for the better part of a decade. The
                Chinese grandmaster has held the Women's World Championship title since 2018, successfully
                defending it four times and establishing herself as one of the greatest champions in the
                history of the women's game. But every reign must eventually face its most dangerous
                challenger — and that challenger will emerge from Paphos.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The 2026 FIDE Women's Candidates Tournament is the final proving ground. Eight of the world's
                strongest female players will battle across fourteen rounds of classical chess in a double
                round-robin format. The winner earns the right to challenge{' '}
                <strong className="text-foreground">Ju Wenjun</strong> for the Women's World Championship
                later in 2026. The field is the strongest in years — a collision of generations, styles,
                and national chess traditions that promises extraordinary drama.
              </p>
            </section>

            {/* Tournament Details Card */}
            <section className="mb-12 bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-playfair font-bold text-foreground mb-4">Tournament Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Dates', '29 March \u2013 16 April 2026'],
                  ['Venue', 'Pafos, Cyprus'],
                  ['Format', '8-player double round-robin (14 rounds)'],
                  ['Time Control', '90 min/40 moves + 30 min, 30s increment'],
                  ['Prize', 'Winner challenges for Women\'s World Championship'],
                  ['Parallel Event', 'FIDE Candidates Tournament 2026 (Open)'],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-link font-semibold">{label}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Humpy Withdrawal Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Humpy Withdrawal
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The biggest pre-tournament story has been the withdrawal of{' '}
                <strong className="text-foreground">Koneru Humpy</strong>, India's highest-rated female
                player and a former world number one. Humpy cited safety concerns about travelling to
                Cyprus amid regional instability — a decision that sparked debate across the chess world.
                A British military base on the island was targeted by a drone earlier in March, and the
                US State Department had issued a Level 3 "Reconsider Travel" advisory for the region.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Her replacement?{' '}
                <strong className="text-foreground">Anna Muzychuk</strong> — a player who needs no
                introduction. The Ukrainian grandmaster and former World Rapid and Blitz Champion famously
                boycotted the 2017 World Championships in Saudi Arabia over women's rights, forfeiting her
                titles on principle. Now she arrives in Cyprus as a late entrant with a point to prove,
                adding an extraordinary layer of narrative to an already compelling tournament.
              </p>
            </section>

            {/* Round 1 Pairings */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Round 1 Pairings — The Draw
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Round 1 kicks off on <strong className="text-foreground">29 March at 15:30 local time</strong>.
                Two highlighted pairings stand out: Board 3 features both FIDE-flag players (Goryachkina vs Lagno),
                while Board 4 brings an all-Chinese derby between top seed Zhu Jiner and former World Champion Tan Zhongyi.
              </p>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-border/50">
                  {/* Header */}
                  <div className="grid grid-cols-[80px_1fr_40px_1fr] px-4 py-3 border-b border-border">
                    <span className="text-link font-semibold text-sm">Board</span>
                    <span className="text-link font-semibold text-sm text-right pr-2">White</span>
                    <span className="text-muted-foreground text-sm text-center"></span>
                    <span className="text-link font-semibold text-sm pl-2">Black</span>
                  </div>
                  {/* Rows */}
                  {round1Pairings.map((p) => (
                    <div
                      key={p.board}
                      className={`grid grid-cols-[80px_1fr_40px_1fr] px-4 py-3 ${p.highlight ? 'bg-primary/10' : ''}`}
                    >
                      <span className="text-muted-foreground text-sm">{p.board}</span>
                      <span className={`text-sm text-right pr-2 ${p.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {p.white}
                      </span>
                      <span className="text-muted-foreground text-sm text-center">vs</span>
                      <span className={`text-sm pl-2 ${p.highlight ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {p.black}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* The Eight Contenders */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-6 border-b border-primary/30 pb-2">
                The Eight Contenders
              </h2>
              <div className="space-y-8">
                {players.map((player, idx) => (
                  <div key={player.name} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Photo */}
                      <div className="w-full aspect-[4/3] sm:aspect-auto sm:w-48 flex-shrink-0 sm:self-stretch">
                        <img
                          src={player.photo}
                          alt={player.name}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                      {/* Info */}
                      <div className="p-5 flex-grow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-playfair font-bold text-foreground">
                              {idx + 1}. {player.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {player.flag} {player.country} · Rating: {player.rating}
                              {player.rank ? ` · World ${player.rank}` : ''} · Age: {player.age}
                            </p>
                          </div>
                          <span className="text-xs bg-primary/20 text-link px-2 py-1 rounded font-semibold whitespace-nowrap ml-2">
                            {player.chances}
                          </span>
                        </div>
                        <p className="text-xs text-link mb-3">
                          Qualification: {player.qualification}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {player.bio}
                        </p>
                        <div className="bg-background/50 rounded p-3">
                          <p className="text-xs text-link font-semibold mb-1">Recent Form</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {player.recentForm}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Photo: {player.photoCredit}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* A New Generation */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                A New Generation Meets the Old Guard
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                What makes this field so compelling is the generational divide.{' '}
                <strong className="text-foreground">Lagno</strong> (37),{' '}
                <strong className="text-foreground">Muzychuk</strong> (36), and{' '}
                <strong className="text-foreground">Tan Zhongyi</strong> (35) represent the established
                elite — players who have held world titles, competed against the very best for over a decade,
                and know exactly what it takes to survive a gruelling 14-round tournament. On the other side,{' '}
                <strong className="text-foreground">Zhu Jiner</strong> (20),{' '}
                <strong className="text-foreground">Deshmukh</strong> (19),{' '}
                <strong className="text-foreground">Assaubayeva</strong> (22), and{' '}
                <strong className="text-foreground">Vaishali</strong> (25) are the fearless new wave —
                a generation raised on engine analysis, unafraid of reputations, and hungry to make their
                mark.{' '}
                <strong className="text-foreground">Goryachkina</strong> (28) bridges the gap — young
                enough to be at her peak, experienced enough to have already challenged for the world title.
              </p>
            </section>

            {/* The Sibling Story */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Sibling Story
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Perhaps the most remarkable subplot of the entire Candidates cycle:{' '}
                <strong className="text-foreground">R Vaishali</strong> is competing in the Women's
                Candidates while her younger brother,{' '}
                <strong className="text-foreground">Praggnanandhaa</strong>, is competing in the Open
                Candidates — at the same venue, at the same time, in Paphos. It is believed to be the
                first time siblings have competed simultaneously in both Candidates tournaments.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The two share a coach, share a home, and now share the biggest stage in chess. Both hail
                from Chennai, the city that produced Viswanathan Anand and has become the undisputed capital
                of Indian chess. Whether either sibling wins or not, the image of brother and sister both
                fighting for the right to challenge for world titles — in the same building, on the same
                days — is a story that transcends chess.
              </p>
            </section>

            {/* Venue Map */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Venue: Paphos, Cyprus
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Both the Open and Women's Candidates are being held at the same venue on the Mediterranean
                coast of Paphos — marking the first time the Candidates has been hosted on a Mediterranean
                island. The historic setting provides a dramatic backdrop for what promises to be an
                unforgettable tournament.
              </p>
              <div className="rounded-lg overflow-hidden border border-border">
                <iframe
                  src="https://www.google.com/maps?q=Cap+St+Georges+Hotel+Resort+Paphos+Cyprus&z=12&output=embed&hl=en"
                  width="100%"
                  height="350"
                  style={{ border: 0 }}
                  allowFullScreen
                  title="Cap St George's Hotel & Resort, Paphos, Cyprus"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <a
                  href="https://www.google.com/maps/search/Cap+St+Georges+Hotel+Resort+Paphos+Cyprus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link hover:underline"
                >
                  View larger map
                </a>
              </p>
            </section>

            {/* How to Follow */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                How to Follow
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The tournament will be broadcast live with grandmaster commentary on the{' '}
                <a href="https://candidates2026.fide.com" target="_blank" rel="noopener noreferrer"
                   className="text-link hover:underline">
                  official FIDE Candidates website
                </a>
                , as well as major chess platforms including Chess.com and ChessBase.
                All fourteen rounds will be streamed with expert analysis. With both the Open and Women's
                events running in parallel, there will be no shortage of world-class chess to follow
                throughout the three-week tournament.
              </p>
            </section>

            {/* Footer note */}
            <footer className="text-center text-sm text-muted-foreground border-t border-border/50 pt-6">
              <p className="italic">
                The FIDE Women's Candidates Tournament 2026 begins on 29 March at Paphos, Cyprus.
              </p>
              <p className="mt-4 text-xs">
                Player photos from Wikimedia Commons under Creative Commons licenses.
                See individual photo credits above.
              </p>
            </footer>
          </div>
        </article>

      </div>
    </>
  );
};

export default CandidatesArticleWomen2026;
