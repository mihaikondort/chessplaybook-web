import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import SeoHead from '@/components/SeoHead';
import { PORTRAIT_CREDITS } from '@/config/championPortraits';

const Credits = () => {
  return (
    <>
      <SeoHead routeKey="credits">
        {/* Open Graph */}

        {/* Twitter */}
      </SeoHead>

      <div className="bg-background flex flex-col">
        <div className="flex-1">
          <div className="container max-w-4xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="font-playfair text-4xl md:text-5xl font-bold mb-4">
                Credits & Attribution
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Chess Playbook is made possible by the incredible work of organizations,
                open-source projects, and the global chess community.
              </p>
            </div>

            {/* Credits Cards */}
            <div className="space-y-6">
              {/* Lichess */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <img
                      src="https://lichess.org/assets/logo/lichess-favicon-512.png"
                      alt="Lichess"
                      className="w-6 h-6"
                    />
                    Lichess.org
                  </CardTitle>
                  <CardDescription>
                    Free, Open-Source Chess Platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Lichess is a free, open-source chess server powered entirely by donations and volunteers.
                    Much of this site is built on what Lichess shares.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">What we use from Lichess:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Our puzzles, from the Lichess puzzle database (public domain, CC0)</li>
                      <li>Chessground, the chessboard, and chessops, the chess rules (GPL-3.0)</li>
                      <li>Live tournament broadcasts and game streams</li>
                      <li>Game import on the analysis page</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <a
                      href="https://lichess.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Visit Lichess.org
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Our own source (#48). Chessground and chessops are GPL, so the
                  site's code is published under the GPL too. */}
              <Card id="source">
                <CardHeader>
                  <CardTitle>This Website's Code</CardTitle>
                  <CardDescription>
                    Free Software Under the GPL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The code of this website is free software under the GNU General Public License, version 3.
                    You can read it, copy it and change it.
                  </p>
                  <div className="pt-2">
                    <a
                      href="https://github.com/mihaikondort/chessplaybook-web"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Read the source on GitHub
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* FIDE */}
              <Card>
                <CardHeader>
                  <CardTitle>FIDE</CardTitle>
                  <CardDescription>
                    World Chess Federation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The Fédération Internationale des Échecs (FIDE) is the international governing body
                    of chess. We source official tournament data, world championship information, and
                    player rankings from FIDE.
                  </p>

                  <div className="pt-2">
                    <a
                      href="https://www.fide.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Visit FIDE.com
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Stockfish */}
              <Card>
                <CardHeader>
                  <CardTitle>Stockfish</CardTitle>
                  <CardDescription>
                    Open-Source Chess Engine
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Stockfish is a free, open-source chess engine and one of the strongest in the world.
                    We use Stockfish 18 to provide real-time game analysis, position evaluation,
                    and suggested moves for desktop users.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Analysis Features:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Real-time position evaluation</li>
                      <li>Multi-PV analysis (multiple best moves)</li>
                      <li>Mate detection and move counting</li>
                      <li>Win-Draw-Loss probability calculations</li>
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Stockfish is licensed under the GNU General Public License, version 3. The engine your browser
                    runs is Stockfish.js 18 (npm package stockfish 18.0.7), shipped with{' '}
                    <a href="/stockfish/Copying.txt" className="text-link hover:underline">its licence</a>.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-x-6 gap-y-2">
                    <a
                      href="https://stockfishchess.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Visit Stockfishchess.org
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a
                      href="https://github.com/nmrugg/stockfish.js"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Stockfish.js source
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Leela Chess Zero */}
              <Card>
                <CardHeader>
                  <CardTitle>Leela Chess Zero (Lc0)</CardTitle>
                  <CardDescription>
                    Neural Network Chess Engine
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Leela Chess Zero is a free, open-source neural network chess engine inspired by
                    AlphaZero. We use the Lc0 engine to analyze and evaluate the quality of games played
                    by World Chess Champions, enabling us to identify and feature the top 100 highest-quality
                    games in history.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">What we use Lc0 for:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Game quality analysis and scoring</li>
                      <li>Identifying the most brilliant games by World Champions</li>
                      <li>Curating the top 100 games by objective quality metrics</li>
                      <li>Deep neural network-based position evaluation</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <a
                      href="https://lczero.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Visit Lczero.org
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* PGN Format */}
              <Card>
                <CardHeader>
                  <CardTitle>PGN Format</CardTitle>
                  <CardDescription>
                    Portable Game Notation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The Portable Game Notation (PGN) is a standard plain text format for recording
                    chess games, developed by Steven J. Edwards. All games on Chess Playbook are
                    stored and processed using the PGN standard.
                  </p>

                  <div className="pt-2">
                    <a
                      href="https://en.wikipedia.org/wiki/Portable_Game_Notation"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-link hover:underline"
                    >
                      Learn about PGN Format
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* Historical Game Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Historical Game Data</CardTitle>
                  <CardDescription>
                    World Chess Champions' Games
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    The champions' games come from the free player collections at{' '}
                    <a
                      href="https://www.pgnmentor.com/files.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline"
                    >
                      PGN Mentor
                    </a>
                    . We are grateful to the chess community for preserving and sharing these legendary games.
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Featured Champions:</h4>
                    <p className="text-sm text-muted-foreground">
                      18 World Chess Champions from Wilhelm Steinitz (1886) to Gukesh Dommaraju (2024)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Champion portraits (#68). CC BY and CC BY-SA require the author
                  and the licence to be shown, and the changes to be stated. */}
              <Card id="portraits">
                <CardHeader>
                  <CardTitle>Champion Portraits</CardTitle>
                  <CardDescription>
                    Photos from Wikimedia Commons
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    We cropped each photo, removed the background and turned it black and white.
                    Portraits made from a CC BY-SA photo are shared under the same licence.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {PORTRAIT_CREDITS.map((credit) => (
                      <li key={credit.champion} className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {credit.champion}{credit.year ? `, ${credit.year}` : ''}
                        </span>
                        <span>Photo: {credit.author}</span>
                        <span>
                          {credit.licenceUrl ? (
                            <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                              {credit.licence}
                            </a>
                          ) : credit.licence}
                        </span>
                        <a href={credit.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
                          Source
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Technology Stack */}
              <Card>
                <CardHeader>
                  <CardTitle>Technology Stack</CardTitle>
                  <CardDescription>
                    Open-Source Technologies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Chess Playbook is built with modern open-source technologies:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Frontend</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>React + TypeScript</li>
                        <li>Vite</li>
                        <li>Tailwind CSS</li>
                        <li>shadcn/ui</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Infrastructure</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>AWS S3 + CloudFront</li>
                        <li>AWS SES (Email)</li>
                        <li>Google Analytics 4</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Thank You */}
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle>Thank You</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We extend our deepest gratitude to all the organizations, developers, and chess
                    enthusiasts who make projects like Chess Playbook possible. The open-source
                    community and the spirit of sharing knowledge continue to inspire us.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default Credits;
