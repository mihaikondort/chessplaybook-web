# Chess Playbook website: frontend source

This is the source code of the website at **https://www.chessplaybook.com**: the React application
your browser downloads when you visit it. The code is published under the **GNU General Public
License, version 3 or later** (see `LICENSE`), because it includes GPL libraries, chiefly
[chessground](https://github.com/lichess-org/chessground) and
[chessops](https://github.com/niklasf/chessops).

It is a snapshot of the code behind the live site; `SOURCE_COMMIT` names the commit it was taken
from. It is published for licence compliance and for anyone curious about how the site is built. We
do not accept pull requests here.

## What is and is not here

**Here:** the application (`src/`), its static files (`public/`), the build configuration, the build
scripts (`scripts/`), and the four CloudFront function files the build checks (`deploy/`, production
and staging).

**Not here:**
- The API server, its databases and data, and the infrastructure. They run only on our servers and
  are not distributed.
- Media we do not own or that is not needed to build the code: article photos, social preview
  images, the self-hosted web fonts, and the champion game PGN files. A local build works without
  them; those images and fonts simply do not load.

## Licence of media

**The GPL covers the code, not media.** The images that are included keep their own licences:
the champion portraits are Wikimedia Commons photos under the Creative Commons licence named for
each one in `src/config/championPortraits.ts`. See `THIRD_PARTY_NOTICES.md`.

## Building

We build with Node 24.

```sh
npm install
npm test
npm run build      # output in dist/
```

The app talks to the Chess Playbook API. A local build without your own API will load, but pages
that need data will be empty.

## Licence

Copyright (c) Chess Playbook. The code is licensed under GPL-3.0-or-later; see `LICENSE`.
Third-party components keep their own licences; see `THIRD_PARTY_NOTICES.md`.
