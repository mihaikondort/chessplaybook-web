import SeoHead from '@/components/SeoHead';

const players = [
  {
    name: 'Fabiano Caruana',
    country: 'USA',
    flag: '🇺🇸',
    rating: 2795,
    rank: '#3',
    age: 33,
    qualification: '2024 FIDE Circuit winner',
    photo: '/assets/news/candidates-2026/caruana.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'Elite favourite',
    polymarket: '30.5%',
    odds: '13/8',
    bio: `The clear pre-tournament favourite. Caruana is making his fifth Candidates appearance — a remarkable testament to his consistency at the very highest level. He won this tournament in Berlin in 2018, earning a World Championship match against Magnus Carlsen in London that went down as one of the closest in history, requiring rapid tiebreaks to decide. Widely regarded as one of the strongest players of the 21st century, Caruana combines extraordinary calculation with some of the deepest opening preparation in the game.`,
    recentForm: `By far the busiest player heading into the Candidates. Caruana won his fifth US Championship in October 2025, tying Bobby Fischer's record of four consecutive titles. In February 2026, he reached the final of the Freestyle Chess World Championship in Weissenhaus, losing only to Magnus Carlsen. He followed that with a strong showing at the Saint Louis Masters (7/9, sole 2nd) and competed in the American Cup. The concern? Fatigue.`,
  },
  {
    name: 'Hikaru Nakamura',
    country: 'USA',
    flag: '🇺🇸',
    rating: 2810,
    rank: '#2',
    age: 38,
    qualification: 'Highest average classical rating',
    photo: '/assets/news/candidates-2026/nakamura.webp',
    photoCredit: 'Eldar Azimov, CC BY-SA 4.0',
    chances: 'Top contender',
    polymarket: '20.5%',
    odds: '13/5',
    bio: `The highest-rated player in the field. A five-time US Champion and 2022 World Rapid Champion, Nakamura has become a global chess icon — one of the most-watched streamers in the world — without ever losing his competitive fire over the board.`,
    recentForm: `Nakamura has played no elite classical tournaments in 2026, stating he would save his energy for the Candidates. His only competitive tune-up was a training match against Awonder Liang in Saint Louis (March 13–15), which he lost 6–4 overall — though the two classical games were drawn.`,
  },
  {
    name: 'Praggnanandhaa R.',
    country: 'India',
    flag: '🇮🇳',
    rating: 2741,
    rank: '',
    age: 20,
    qualification: '2025 FIDE Circuit',
    photo: '/assets/news/candidates-2026/pragg.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'Serious challenger',
    polymarket: '12.5%',
    odds: '~6/1',
    bio: `At just 20 years old, "Pragg" is already a battle-hardened veteran of elite chess. He kicked off 2025 by winning the prestigious Tata Steel Masters, followed by victories at the SuperBet Classic Romania and the UzChess Cup Masters.`,
    recentForm: `After a dominant 2025, Pragg's early 2026 has been quieter. He finished 11th at Tata Steel 2026. Viswanathan Anand offered a reassuring assessment: "He's slowed down a little bit, but maybe mentally he is already peaking and getting ready for the Candidates."`,
  },
  {
    name: 'Wei Yi',
    country: 'China',
    flag: '🇨🇳',
    rating: 2754,
    rank: '#7',
    age: 26,
    qualification: '2025 World Cup finalist',
    photo: '/assets/news/candidates-2026/weiyi.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'Dark horse',
    polymarket: '~8%',
    odds: '~8/1',
    bio: `Once hailed as the greatest chess prodigy since Magnus Carlsen, Wei Yi became the youngest player in history to cross the 2700 rating mark at just 15 years old. His fearless, attacking style and tactical brilliance make him one of the most entertaining players to watch.`,
    recentForm: `Wei Yi has been notably quiet in early 2026 — no major classical tournaments. He appears to have entered full preparation mode, working behind closed doors. The silence could mean he arrives fresh and fully prepared, or lacking competitive sharpness.`,
  },
  {
    name: 'Anish Giri',
    country: 'Netherlands',
    flag: '🇳🇱',
    rating: 2753,
    rank: '#8',
    age: 31,
    qualification: '2025 Grand Swiss winner',
    photo: '/assets/news/candidates-2026/giri.webp',
    photoCredit: 'Frans Peeters, CC BY-SA 2.0',
    chances: 'Underestimated',
    polymarket: '~6%',
    odds: '~10/1',
    bio: `Giri's third Candidates appearance. His 2016 debut became infamous — he drew all 14 games. But he has reinvented himself, adopting a more ambitious playing style. Widely considered "probably the best theoretician in the world."`,
    recentForm: `Giri scored 6.5/13 at Tata Steel 2026 (8th place). He called the 2026 line-up "surprising", highlighting the strength of the lower-rated players. Also runs chessmonitor.com alongside his playing career.`,
  },
  {
    name: 'Javokhir Sindarov',
    country: 'Uzbekistan',
    flag: '🇺🇿',
    rating: 2745,
    rank: '#12',
    age: 20,
    qualification: '2025 World Cup champion',
    photo: '/assets/news/candidates-2026/sindarov.webp',
    photoCredit: 'MiroJP, CC BY-SA 4.0',
    chances: 'The wildcard',
    polymarket: '14.5%',
    odds: '~5/1',
    bio: `The youngest player in the field and perhaps the most exciting. Sindarov burst onto the world stage as part of Uzbekistan's sensational gold medal team at the 2022 Chess Olympiad and has continued his meteoric rise ever since.`,
    recentForm: `Arguably the most in-form player in the world. Brilliant 2nd at Tata Steel 2026 (8.5/13), won the Freestyle Chess Grand Slam round-robin in South Africa ahead of Magnus Carlsen, and won three Titled Tuesdays in 2026. GM Perelshteyn compared his trajectory to Mikhail Tal.`,
  },
  {
    name: 'Matthias Blübaum',
    country: 'Germany',
    flag: '🇩🇪',
    rating: 2698,
    rank: '',
    age: 29,
    qualification: '2025 Grand Swiss runner-up',
    photo: '/assets/news/candidates-2026/bluebaum.webp',
    photoCredit: 'Vysotsky, CC BY-SA 4.0',
    chances: 'The underdog',
    polymarket: '~4%',
    odds: '~16/1',
    bio: `Germany's top player and a two-time European Champion. His encyclopaedic opening knowledge and outstanding endgame technique have made him a force in Swiss-format tournaments.`,
    recentForm: `Strong impression at Tata Steel 2026, finishing 6th with 7.0/13 on his Wijk aan Zee debut. Beat World Champion Gukesh, Vincent Keymer (2776), and Anish Giri (2760). Unusually, Blübaum has mostly worked alone without a coach or second.`,
  },
  {
    name: 'Andrey Esipenko',
    country: 'FIDE',
    flag: '🏳️',
    rating: 2698,
    rank: '',
    age: 23,
    qualification: '2025 World Cup third place',
    photo: '/assets/news/candidates-2026/esipenko.webp',
    photoCredit: 'Stefan64, CC BY-SA 3.0',
    chances: 'Capable of upsets',
    polymarket: '~4%',
    odds: '~16/1',
    bio: `Esipenko made global headlines by defeating Magnus Carlsen in a classical game — a feat that announced him as a player of extraordinary potential. A co-winner of the 2022 European Individual Championship.`,
    recentForm: `Relatively quiet in early 2026. His World Cup 2025 run included a painful semifinal blunder against Wei Yi, but he recovered to beat Yakubboev 2-0 for third place. Last major classical title: Qatar Masters (December 2024, 7.5/9).`,
  },
];

const round1Pairings = [
  { board: 1, white: 'Sindarov', black: 'Esipenko' },
  { board: 2, white: 'Blübaum', black: 'Wei Yi' },
  { board: 3, white: 'Praggnanandhaa', black: 'Giri' },
  { board: 4, white: 'Caruana', black: 'Nakamura', highlight: true },
];

const CandidatesArticle2026 = () => {
  return (
    <>
      <SeoHead routeKey="news/candidates-2026" />

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
            <span className="absolute text-link/[0.07] text-7xl sm:text-8xl top-8 left-[8%] animate-float-slow select-none">&#9812;</span>
            <span className="absolute text-link/[0.07] text-6xl sm:text-7xl top-16 right-[12%] animate-float-medium select-none">&#9818;</span>
            <span className="absolute text-link/[0.05] text-5xl sm:text-6xl bottom-12 left-[15%] animate-float-fast select-none">&#9816;</span>
            <span className="absolute text-link/[0.05] text-5xl sm:text-6xl bottom-8 right-[8%] animate-float-slow select-none">&#9822;</span>
            <span className="absolute text-link/[0.04] text-6xl top-1/2 left-[3%] animate-float-medium select-none">&#9814;</span>
            <span className="absolute text-link/[0.04] text-6xl top-1/3 right-[3%] animate-float-fast select-none">&#9820;</span>
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
              The Road to the Crown
            </h1>
            <h2 className="text-xl sm:text-2xl font-playfair text-link mb-8">
              FIDE Candidates Tournament 2026 in Cyprus
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
              The most prestigious tournament in chess returns — eight elite grandmasters, fourteen rounds,
              and one dream: to challenge for the World Chess Championship.
            </p>
            <p className="text-muted-foreground text-sm">
              Published 24 March 2026
            </p>
          </div>
        </div>

        <article className="py-8 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">

            {/* Stakes Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Stakes Have Never Been Higher
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                In the world of chess, no tournament carries more weight than the Candidates. It is the final
                and most gruelling proving ground — the last gate between the world's best players and a shot
                at the ultimate prize: the World Chess Championship title. The 2026 FIDE Candidates Tournament
                promises to be one of the most thrilling editions in the event's storied 76-year history,
                bringing together an extraordinary blend of seasoned veterans and fearless newcomers on the
                sun-drenched Mediterranean coast of Cyprus.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The winner will earn the right to challenge reigning World Chess Champion{' '}
                <strong className="text-foreground">Gukesh Dommaraju</strong> — the youngest World Champion
                in history — later in 2026.
              </p>
            </section>

            {/* Tournament Details Card */}
            <section className="mb-12 bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-playfair font-bold text-foreground mb-4">Tournament Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  ['Dates', '29 March – 16 April 2026'],
                  ['Venue', 'Cap St George\'s Hotel & Resort, Paphos, Cyprus'],
                  ['Format', 'Double round-robin (14 rounds)'],
                  ['Time Control', '120 min/40 moves + 30 min, 30s increment from move 41'],
                  ['Prize Fund', '€1,000,000 (record)'],
                  ['Parallel Event', "FIDE Women's Candidates Tournament 2026"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-link font-semibold">{label}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Round 1 Pairings */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Round 1 Pairings — The Draw
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Round 1 kicks off on <strong className="text-foreground">29 March at 15:30 local time</strong>.
                The headline pairing is the all-American clash on Board 4: Caruana vs Nakamura.
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

            {/* Security Concerns */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Shadow Over Paphos
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The biggest off-the-board story has been the question of safety. Due to the ongoing West Asia
                conflict, concerns have been raised about holding the tournament in Cyprus. A British airbase on
                the island suffered a drone attack earlier in March, and the US State Department issued a Level 3
                "Reconsider Travel" advisory.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Koneru Humpy</strong> withdrew from the Women's Candidates
                citing personal safety. FIDE CEO Emil Sutovsky confirmed there will be no venue change. All eight
                players in the Open section appear committed to playing.
              </p>
            </section>

            {/* Generational Collision */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                A Generational Collision
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Caruana</strong> (33) and{' '}
                <strong className="text-foreground">Nakamura</strong> (38) represent the established elite —
                players who have faced Carlsen in his prime and survived. On the other end,{' '}
                <strong className="text-foreground">Sindarov</strong> (20),{' '}
                <strong className="text-foreground">Praggnanandhaa</strong> (20), and{' '}
                <strong className="text-foreground">Esipenko</strong> (23) represent the fearless new wave —
                a generation that grew up training with engines, unafraid of reputations.{' '}
                <strong className="text-foreground">Wei Yi</strong> (26),{' '}
                <strong className="text-foreground">Giri</strong> (31), and{' '}
                <strong className="text-foreground">Bl\übaum</strong> (29) bridge the gap.
              </p>
            </section>

            {/* Predictions Table */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                Who Will Win? Odds and Predictions
              </h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-link font-semibold">Player</th>
                      <th className="px-4 py-3 text-center text-link font-semibold">Polymarket</th>
                      <th className="px-4 py-3 text-center text-link font-semibold">Odds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.name} className="border-b border-border/50">
                        <td className="px-4 py-2 text-muted-foreground">{p.name}</td>
                        <td className="px-4 py-2 text-center text-foreground font-mono">{p.polymarket}</td>
                        <td className="px-4 py-2 text-center text-muted-foreground font-mono">{p.odds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                One thing is certain: in a field this strong and this hungry, every single game matters.
                Fourteen rounds. Eight players. One ticket to the World Championship match.
                The chess world will be watching.
              </p>
            </section>

            {/* Venue Map */}
            <section className="mb-12">
              <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
                The Venue: Paphos, Cyprus
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Cap St George's Hotel & Resort on the Mediterranean coast of Paphos provides a dramatic
                backdrop, marking the first time the Candidates has been held on a Mediterranean island.
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
                Jan Gustafsson and Peter Svidler provide expert commentary. Legendary players including
                Vishy Anand, Nigel Short, and Boris Gelfand will be attending.
              </p>
            </section>

            {/* Footer note */}
            <footer className="text-center text-sm text-muted-foreground border-t border-border/50 pt-6">
              <p className="italic">
                The FIDE Candidates Tournament 2026 begins on 29 March at The Cap St George's Hotel & Resort
                in Paphos, Cyprus.
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

export default CandidatesArticle2026;
