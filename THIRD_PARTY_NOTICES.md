# Third-party notices

The website includes the following third-party components. Each keeps its own licence. Every other
npm dependency is under a permissive licence (MIT, ISC, BSD or Apache-2.0); after `npm install`, its
licence text is in its package under `node_modules/`.

## Code under the GPL

| Component | Licence | Source |
|---|---|---|
| chessground (`@lichess-org/chessground`) | GPL-3.0-or-later | https://github.com/lichess-org/chessground |
| chessops | GPL-3.0-or-later | https://github.com/niklasf/chessops |
| Stockfish.js 18 (`public/stockfish/stockfish-18-lite-single.{js,wasm}`), based on Stockfish 18 | GPL-3.0; text in `public/stockfish/Copying.txt` | The files are byte-identical to `bin/` of the npm package `stockfish@18.0.7` (https://www.npmjs.com/package/stockfish/v/18.0.7); its source is https://github.com/nmrugg/stockfish.js, built from https://github.com/official-stockfish/Stockfish |
| Code adapted from `@lichess-org/pgn-viewer` 2.5.2 (`src/components/chess/stepwiseScroll.ts`; the board control bar rules in `src/index.css`) | GPL-3.0-or-later | https://github.com/lichess-org/pgn-viewer |

## Media and data

| Component | Licence | Source |
|---|---|---|
| Champion portraits (`public/assets/images/champions/portraits-v1/`) | Creative Commons, per image; author, licence and source for each are in `src/config/championPortraits.ts` and on https://www.chessplaybook.com/credits | Wikimedia Commons |
| Piece set "cburnett" (drawn through chessground's CSS) | By Colin M.L. Burnett, offered by its author under GPL-2.0-or-later (among other licences); used here under the GPL | https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces |
| Lichess puzzle database (served by our API, not included here) | CC0 | https://database.lichess.org/ |

The web fonts the site self-hosts (Inter and Playfair Display, SIL Open Font License 1.1) are not
included in this repository.
