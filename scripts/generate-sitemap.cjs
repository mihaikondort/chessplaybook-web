/**
 * Sitemap Generator for Chess Playbook
 *
 * Generates a focused sitemap.xml with only high-value pages.
 * Individual game pages are excluded as they have no search value
 * (nobody searches "Fischer game 42"). This concentrates Google's
 * crawl budget on ~20 important pages instead of 9,000+ similar pages.
 *
 * Run this script after building the site before deployment.
 *
 * Usage: node scripts/generate-sitemap.cjs
 */

const fs = require('fs');
const path = require('path');

/*
  THE SITE THIS BUILD IS FOR (#34).

  Hardcoded to production until 2026-08-23, so a staging build emitted PRODUCTION
  canonicals - an SEO hazard on top of a configuration one, and the kind that is
  invisible until Google has already read it. Defaults to production, so a build
  with `SITE_URL` unset is byte-identical to before.
*/
const PRODUCTION_DOMAIN = 'https://www.chessplaybook.com';
const DOMAIN = (process.env.SITE_URL || PRODUCTION_DOMAIN).replace(/\/$/, '');
const IS_PRODUCTION_SITE = DOMAIN === PRODUCTION_DOMAIN;
const OUTPUT_PATH = path.join(__dirname, '../dist/sitemap.xml');
const PLAYERS_JSON_PATH = path.join(__dirname, '../public/assets/players/players_list.json');

// Priority values for different page types
const PRIORITIES = {
  homepage: '1.0',
  explain: '0.95',
  liveEvents: '0.95',
  champions: '0.9',
  playerGames: '0.8',
  educational: '0.7',
  legal: '0.3'
};

// Change frequency values
const CHANGEFREQ = {
  homepage: 'weekly',
  explain: 'weekly',
  liveEvents: 'daily',
  champions: 'monthly',
  playerGames: 'monthly',
  educational: 'monthly',
  legal: 'yearly'
};

/**
 * Honest lastmod dates (2026-07-27 audit P1).
 *
 * Previously every URL was stamped with the BUILD date, so each deploy told
 * Google all 58 pages changed today — which trains crawlers to ignore the
 * field entirely. Dates now come from these constants: articles carry their
 * publish date, event hubs their event end date, and the evergreen sections a
 * manually-bumped content date. BUMP THE RELEVANT CONSTANT when the underlying
 * content actually changes; do not reintroduce new Date().
 */
const LASTMOD = {
  /*
    Core pages: bump when the content of a page still sharing this key changes.

    What is left on `core` after 2026-08-20: /explain, /champions,
    /champions/list, /live-events, /champion-challenge and
    /world-championship-cycle. Everything that moved on its own cadence has been
    split out below, because a shared key can only ever be right for one of its
    members.

    DELIBERATELY NOT BUMPED on 2026-08-20: /champions and /champions/list were
    re-styled on 08-14/08-15 to the puzzles visual system, and
    /champion-challenge with them. That is a change to how the page LOOKS; the
    champion data, the game corpus and the position corpus are all untouched
    since the 07-27 refresh. A crawler re-fetching those pages would find the
    same content, which is what makes a bump an overstatement rather than a
    correction.

    2026-08-06: this had gone STALE in the direction nobody checks for. It still
    said 2026-07-27 while the homepage had been rebuilt as a six-card chooser on
    08-02 — so the sitemap was telling Google that the site's front door had not
    changed in a fortnight, when it had been replaced. Under-claiming is the
    quieter failure: an over-eager lastmod gets the file distrusted, a stale one
    just means the crawl never gets prompted.
  */
  core: '2026-07-27',
  /*
    THE HOMEPAGE HAS ITS OWN DATE, and it has to (Codex review, 2026-08-06).

    `core` was then shared by /explain, /champions, /analysis, /play,
    /play-online and /leaderboard. Bumping it to 08-02 for the homepage rebuild
    claimed freshness for six pages that did not change that day — trading a
    stale date for an
    overstated one, which is the worse of the two: a sitemap that overstates gets
    its lastmod distrusted wholesale, and then the honest entries stop working.
  */
  home: '2026-08-02',
  /*
    The puzzles feature pages, on their own key because they change on their own
    cadence — and did so on a different date from the homepage. `/puzzles` stopped
    being a puzzle page and became the training system between 08-03 and 08-06:
    adaptive selection, bounded runs, a training plan and a progress record.
    Sharing `core` would have meant one of the two dates was always wrong.
  */
  puzzles: '2026-08-16',
  /*
    THE SAME KEY WENT STALE THE SAME WAY, and this is the second time.

    On 2026-08-06 `core` was found still reading 07-27 while the homepage had
    been replaced on 08-02. Fifteen days later the identical audit found four
    more pages under-claiming — /puzzles at 08-06 after the v3 page was swapped
    in on 08-16, and /play, /play-online, /analysis and /leaderboard all still on
    07-27 after being rebuilt or materially changed. Under-claiming is the
    quieter half: nothing fails, Google simply never gets a reason to re-crawl
    the pages that changed most.

    The constants below exist so that a page which changes on its own cadence
    carries its own date. Adding a key is cheap; sharing one and remembering to
    split it later is what keeps failing.
  */
  /*
    /play and /play-online, rebuilt on the shared workspace grammar and deployed
    2026-08-14 (b1dae464): aligned three-column shell, persistent side cards,
    player cards, always-visible history controls. Both pages now render the
    Workspace (layout redesign D1/D2), so one key is still right for the pair -
    and it moves when the redesign merges, since both pages change then.
  */
  play: '2026-08-14',
  /*
    /analysis, 2026-08-09 (42584789): the board is sized to the window instead of
    a constant 600px, the move list below the board was removed, and the wheel
    steps through the moves.
  */
  analysis: '2026-08-09',
  /*
    /leaderboard, 2026-08-20: guests appear on every board under allocated
    handles, and the puzzle ratings board merged the guest and account sources —
    33 rows became 411. This is the one whose indexed copy is furthest from what
    the page now serves.
  */
  leaderboard: '2026-08-20',
  // Champion pages: bump when the game corpus or champion data changes.
  champions: '2026-07-27', // corpus refresh: +1869 games, coverage to 2026-07-05
  // Event hubs: the events are over; these are archival end dates.
  worldCup2025: '2025-11-27',
  candidates2026: '2026-04-16',
  // Articles: publish dates.
  news: '2026-07-27',
  articleCandidatesPreview: '2026-03-27',
  articleCandidatesWomen: '2026-03-27',
  articleRound1: '2026-03-29',
  articleRound3: '2026-03-31',
  articleConclusion: '2026-07-25',
  articleWch2026Geneva: '2026-07-29',
  articleSindarovGukesh: '2026-07-27',
  articleVaishaliJu: '2026-07-27',
  legal: '2026-07-26',
};

/*
  NOT the build date, despite what the old name said.

  It was called `getCurrentDate` and returns a fixed constant — which read as
  "stamp today on everything", the exact dishonesty the 2026-07-27 audit removed.
  It was already doing the right thing; the name was the only thing lying.
*/
function coreLastmod() {
  return LASTMOD.core;
}

/**
 * Create a URL entry for the sitemap
 */
function createUrlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Generate the focused sitemap with only high-value pages
 */
function generateSitemap() {
  const currentDate = coreLastmod();
  const urls = [];

  // Homepage
  urls.push(createUrlEntry(
    DOMAIN + '/',
    LASTMOD.home,
    CHANGEFREQ.homepage,
    PRIORITIES.homepage
  ));

  // Position Explainer — marketing hero / primary conversion page
  urls.push(createUrlEntry(
    DOMAIN + '/explain',
    currentDate,
    CHANGEFREQ.explain,
    PRIORITIES.explain
  ));

  // Champions gallery page
  urls.push(createUrlEntry(
    DOMAIN + '/champions',
    currentDate,
    CHANGEFREQ.champions,
    PRIORITIES.champions
  ));

  // Champions list page (reference list with all champions)
  urls.push(createUrlEntry(
    DOMAIN + '/champions/list',
    currentDate,
    CHANGEFREQ.champions,
    PRIORITIES.champions
  ));

  // Live Events hub page
  urls.push(createUrlEntry(
    DOMAIN + '/live-events',
    currentDate,
    CHANGEFREQ.liveEvents,
    PRIORITIES.liveEvents
  ));

  // FIDE World Cup 2025 hub page — event over 2025-11-27, archival now. It was
  // still advertised daily/0.95 eight months after it ended (audit P1 #6).
  urls.push(createUrlEntry(
    DOMAIN + '/world-cup-2025',
    LASTMOD.worldCup2025,
    'monthly',
    0.6
  ));

  // FIDE Candidates Tournament 2026 — event over 2026-04-16, archival now.
  urls.push(createUrlEntry(
    DOMAIN + '/candidates-2026',
    LASTMOD.candidates2026,
    'monthly',
    0.6
  ));

  // News pages
  urls.push(createUrlEntry(
    DOMAIN + '/news',
    LASTMOD.news,
    'weekly',
    0.8
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/candidates-2026',
    LASTMOD.articleCandidatesPreview,
    'monthly',
    0.8
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/candidates-2026-women',
    LASTMOD.articleCandidatesWomen,
    'monthly',
    0.8
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/candidates-2026-round-1',
    LASTMOD.articleRound1,
    'monthly',
    0.8
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/candidates-2026-round-3',
    LASTMOD.articleRound3,
    'monthly',
    0.8
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/candidates-2026-conclusion',
    LASTMOD.articleConclusion,
    'monthly',
    0.8
  ));

  // Title-match build-up series. Priority above the other news pages: the
  // Sindarov-Gukesh window is the highest-intent chess search period there is,
  // and a new page needs days to weeks to be indexed.
  // The announcement page. Highest priority of any news URL: it is the one that
  // answers "when is the match" and "where is the match", and that lookup demand
  // spikes now and decays. Indexing takes days to weeks, so it cannot wait.
  urls.push(createUrlEntry(
    DOMAIN + '/news/world-championship-2026-geneva',
    LASTMOD.articleWch2026Geneva,
    'weekly',
    '0.9'
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/sindarov-gukesh-head-to-head',
    LASTMOD.articleSindarovGukesh,
    'weekly',
    '0.9'
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/news/vaishali-ju-wenjun-title-match',
    LASTMOD.articleVaishaliJu,
    'weekly',
    '0.9'
  ));

  // Legal and informational pages
  urls.push(createUrlEntry(
    DOMAIN + '/privacy',
    LASTMOD.legal,
    CHANGEFREQ.legal,
    PRIORITIES.legal
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/terms',
    LASTMOD.legal,
    CHANGEFREQ.legal,
    PRIORITIES.legal
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/contact',
    LASTMOD.legal,
    CHANGEFREQ.legal,
    PRIORITIES.legal
  ));

  urls.push(createUrlEntry(
    DOMAIN + '/credits',
    LASTMOD.legal,
    CHANGEFREQ.legal,
    PRIORITIES.legal
  ));

  // Analysis page — free game analysis tool
  urls.push(createUrlEntry(
    DOMAIN + '/analysis',
    LASTMOD.analysis,
    'weekly',
    '0.9'
  ));

  // Champion Challenge — training loop on real World Champion positions.
  // Live since 2026-07-26.
  urls.push(createUrlEntry(
    DOMAIN + '/champion-challenge',
    currentDate,
    'weekly',
    '0.9'
  ));

  // World Championship Cycle educational page
  urls.push(createUrlEntry(
    DOMAIN + '/world-championship-cycle',
    currentDate,
    CHANGEFREQ.educational,
    PRIORITIES.educational
  ));

  // Load players list
  if (!fs.existsSync(PLAYERS_JSON_PATH)) {
    console.error('Error: players_list.json not found');
    process.exit(1);
  }

  const playersData = JSON.parse(fs.readFileSync(PLAYERS_JSON_PATH, 'utf-8'));
  const players = Object.keys(playersData);

  console.log(`Found ${players.length} champions`);

  // Play & Puzzles — public feature pages, absent from the sitemap until the
  // 2026-07-27 audit (P2 #15); static HTML added the same day.
  urls.push(createUrlEntry(DOMAIN + '/play', LASTMOD.play, 'monthly', PRIORITIES.educational));
  urls.push(createUrlEntry(DOMAIN + '/play-online', LASTMOD.play, 'monthly', PRIORITIES.educational));
  urls.push(createUrlEntry(DOMAIN + '/puzzles', LASTMOD.puzzles, 'weekly', PRIORITIES.educational));

  // Leaderboard
  urls.push(createUrlEntry(
    DOMAIN + '/leaderboard',
    LASTMOD.leaderboard,
    'weekly',
    PRIORITIES.educational
  ));

  // For each champion, add their games list and best games pages
  // Individual game pages are NOT included (no search value)
  //
  // These must be the SLUG, not the players_list.json key. The key is
  // capitalised ("Gukesh"); the API looks players up by slug ("gukesh") and
  // 404s on anything else, so a capitalised URL renders "Failed to load games".
  // The site's own links already use the slug — only the sitemap did not, which
  // pointed Google at 36 error pages. Verified for all 18 champions that the
  // slug is exactly the lowercased key.
  players.forEach(playerName => {
    const slug = playerName.toLowerCase();
    urls.push(createUrlEntry(
      `${DOMAIN}/champions/${slug}/games`,
      LASTMOD.champions,
      CHANGEFREQ.playerGames,
      PRIORITIES.playerGames
    ));
    urls.push(createUrlEntry(
      `${DOMAIN}/champions/${slug}/best-games`,
      LASTMOD.champions,
      CHANGEFREQ.playerGames,
      PRIORITIES.playerGames
    ));
    console.log(`  Added: ${playerName} games list page`);
  });

  // Construct the XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  // Ensure dist directory exists
  const distDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Write the sitemap
  fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');

  console.log(`\nSitemap generated successfully!`);
  console.log(`  Total URLs: ${urls.length}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

// Run the generator
try {
  generateSitemap();
} catch (error) {
  console.error('Error generating sitemap:', error);
  process.exit(1);
}
