/**
 * The editorial news list — SINGLE SOURCE.
 *
 * Consumed by `/news` (the full index) and by `NewsTeaser` (the homepage
 * teaser, which takes the newest few). Before this module existed the two kept
 * their own copies and the homepage teaser silently went four months stale,
 * missing the four most recent articles.
 *
 * Ordering is newest-first and is the display order in both places.
 *
 * Relationship to `route-meta.json`: that file remains the single source of
 * page *metadata* (title/description/OG/schema, rendered by `SeoHead` and baked
 * into the prerendered HTML). This file holds the *editorial* fields metadata
 * does not carry — category, card excerpt, card image. `newsArticles.test.ts`
 * asserts every entry here has a matching route-meta entry, so adding an
 * article to one and not the other fails the build rather than drifting.
 */

export interface NewsArticle {
  /** Route path, and the key by which route-meta is cross-checked (minus the leading slash). */
  href: string;
  category: string;
  title: string;
  excerpt: string;
  /** Human-readable publication date, as displayed on the cards. */
  date: string;
  image: string;
}

export const newsArticles: NewsArticle[] = [
  {
    category: 'Title Match Build-up',
    title: 'Geneva, 25 November: The World Championship Has a Date',
    excerpt:
      'FIDE has confirmed the venue and dates for Gukesh vs Sindarov — Geneva, 25 November to 15 December, 14 classical games. The youngest title match ever played, what has been announced, and what has not.',
    date: '29 July 2026',
    href: '/news/world-championship-2026-geneva',
    image: '/assets/news/title-matches-2026/geneva-jet-deau.webp',
  },
  {
    category: 'Title Match Build-up',
    title: 'Vaishali vs Ju Wenjun: The Reign and the Underdog',
    excerpt:
      "Ju Wenjun has not lost a title match in eight years and just produced her most dominant defense. Vaishali has never beaten her in classical - and just won the Candidates as the lowest-rated player in the field. The women's title match, previewed.",
    date: '27 July 2026',
    href: '/news/vaishali-ju-wenjun-title-match',
    image: '/assets/news/title-matches-2026/vaishali-ju-wenjun.webp',
  },
  {
    category: 'Title Match Build-up',
    title: 'The Champion Is Ranked 26th: Sindarov vs Gukesh, Head-to-Head',
    excerpt:
      'The challenger is the world number 4. The reigning World Champion is 26th, has lost 91 points from his peak, and just finished last and winless at home in Chennai. Every game they have played, and the uncomfortable question underneath it.',
    date: '27 July 2026',
    href: '/news/sindarov-gukesh-head-to-head',
    image: '/assets/news/title-matches-2026/sindarov-portrait.webp',
  },
  {
    category: 'Tournament Conclusion',
    title: 'The Tournament Nobody Else Turned Up To: Candidates 2026 Conclusions',
    excerpt:
      "Sindarov's record 10/14, unbeaten across fourteen rounds, and Vaishali winning the women's section as the lowest-rated player in the field — who delivered in Paphos, who did not, and where both tournaments turned.",
    date: '25 July 2026',
    href: '/news/candidates-2026-conclusion',
    image: '/assets/news/candidates-2026-conclusion/sindarov-champion.webp',
  },
  {
    category: 'Round Recap',
    title: 'A Star Is Born: Sindarov and Caruana Surge Clear',
    excerpt:
      'Sindarov demolishes Praggnanandhaa with a masterpiece sacrifice in the QGD, Caruana crushes Wei Yi in just 19 moves. The two co-leaders pull a full point clear of the field.',
    date: '31 March 2026',
    href: '/news/candidates-2026-round-3',
    image: '/assets/news/candidates-2026-r3/sindarov.webp',
  },
  {
    category: 'Round Recap',
    title: 'Fireworks in Paphos: Three Decisive Games Ignite the Candidates',
    excerpt:
      'Caruana stuns Nakamura in an 83-move epic, Praggnanandhaa dismantles Giri with flawless precision, and Sindarov downs Esipenko. An explosive Round 1.',
    date: '29 March 2026',
    href: '/news/candidates-2026-round-1',
    image: '/assets/news/candidates-2026-r1/caruana-nakamura.webp',
  },
  {
    category: 'Tournament',
    title: "Eight Queens, One Crown: Women's Candidates 2026",
    excerpt:
      "Eight of the world's strongest women compete in Cyprus for the right to challenge Women's World Champion Ju Wenjun. Player profiles, the Humpy withdrawal controversy, and Round 1 pairings.",
    date: '29 March 2026',
    href: '/news/candidates-2026-women',
    image: '/assets/news/candidates-2026-women/zhu.webp',
  },
  {
    category: 'Tournament',
    title: 'The Road to the Crown: FIDE Candidates 2026 in Cyprus',
    excerpt:
      'Eight elite grandmasters compete in Paphos for the right to challenge World Champion Gukesh. Full preview with player profiles, betting odds, Round 1 pairings, and expert predictions.',
    date: '24 March 2026',
    href: '/news/candidates-2026',
    image: '/assets/news/candidates-2026/caruana.webp',
  },
];

// `latestArticles()` fed the homepage NewsTeaser, which was removed on
// 2026-08-02 when the homepage became a six-card chooser. /news renders the
// full list, so nothing needs a "newest n" slice any more.
