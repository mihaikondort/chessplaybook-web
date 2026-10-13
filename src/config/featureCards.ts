/**
 * The site's six headline features — SINGLE SOURCE.
 *
 * Rendered by `Features` — the homepage card grid, and since 2026-08-02 the
 * only consumer. `FeatureStrip` used to render these too, on the interior
 * landing pages; it was removed when the site adopted one-job-per-page.
 *
 * Order IS the grid order, left-to-right then top-to-bottom (3-up on desktop,
 * 2-up on mobile). It is NOT arbitrary: the cards are ranked by how likely a
 * cold visitor is to get a satisfying first experience. Explain and Puzzles
 * deliver in one click with no dependency on anyone else; Play depends on an
 * opponent existing, which — with the current pool — is the least reliable
 * promise on the page.
 *
 * The homepage is the site's only chooser, where a visitor who has not said
 * what they want self-selects. What visitors pick is the measurement this grid
 * exists to produce (`home_choice_click`), so presentation changes here are
 * changes to an experiment's stimulus, not just styling.
 */
import { Lightbulb, Swords, Target, BookOpen, Newspaper } from 'lucide-react';
import { MdPsychology } from 'react-icons/md';

export interface FeatureCard {
  icon: React.ComponentType<{ className?: string }>;
  /** Override for the default icon sizing, where a glyph needs different optical weight. */
  iconSize?: string;
  title: string;
  /** Short label for compact renderings that cannot fit `title`. */
  shortTitle?: string;
  description: string;
  cta: string;
  href: string;
  /** Background tint, from the card's identity hue (colour tokens, `feature-*`). */
  gradient: string;
  iconColor: string;
  /** Optional pill in the card's top-right ("Live Now", "Beta", "New"). */
  badge?: string;
  /**
   * `secondary` cards are deliberately quieter: muted styling, and excluded
   * from the rotating highlight. News is the only one — it is a browse
   * destination, and it must not compete with the interactive actions above
   * it. Before the grid became a single visible screen, being last was enough
   * to keep it quiet; now it has to be carried by visual weight instead.
   */
  tier?: 'secondary';
}

export const featureCards: FeatureCard[] = [
  {
    icon: Lightbulb,
    title: 'Explain a Position',
    shortTitle: 'Explain',
    description: 'See why a famous position works — in plain English, not engine numbers.',
    cta: 'See why',
    href: '/explain',
    gradient: 'from-feature-explain/20 to-feature-explain/5',
    iconColor: 'text-feature-explain',
  },
  {
    icon: MdPsychology,
    iconSize: 'w-10 h-10 md:w-9 md:h-9',
    title: 'Puzzles',
    description: 'Your daily brain workout. Spot the tactic, sharpen your pattern recognition.',
    cta: 'Solve puzzles',
    href: '/puzzles',
    gradient: 'from-feature-puzzles/20 to-feature-puzzles/5',
    iconColor: 'text-feature-puzzles',
  },
  {
    icon: Swords,
    title: 'Play',
    // Points at online play because that is what "play chess" ordinarily means.
    // The choice between a person and the computer is made on /play-online,
    // not here — a chooser whose cards each do one thing is what keeps the
    // click data readable.
    description: 'Play a real opponent online, or take on the computer at your own pace.',
    cta: 'Start a game',
    href: '/play-online',
    gradient: 'from-feature-play/20 to-feature-play/5',
    iconColor: 'text-feature-play',
  },
  {
    icon: Target,
    title: 'Champion Challenge',
    shortTitle: 'Challenge',
    description: 'Play your move in a World Champion’s position, then see what they played.',
    cta: 'Take it on',
    href: '/champion-challenge',
    gradient: 'from-feature-challenge/20 to-feature-challenge/5',
    iconColor: 'text-feature-challenge',
  },
  {
    icon: BookOpen,
    title: 'Champion Games',
    shortTitle: 'Champions',
    description: 'Replay legendary games from Fischer, Kasparov, Carlsen and every other champion.',
    cta: 'Explore games',
    href: '/champions',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-link',
  },
  // Last, and quiet, on purpose — see `tier` above. Do not move it up the array:
  // position in this list is position in the grid, and the measurement reads
  // click share by position.
  {
    icon: Newspaper,
    title: 'News & Articles',
    shortTitle: 'News',
    description: 'Title matches, tournaments and the stories behind them.',
    cta: 'Read now',
    href: '/news',
    gradient: 'from-muted-foreground/10 to-muted-foreground/5',
    iconColor: 'text-muted-foreground',
    tier: 'secondary',
  },
];

// `featureCardsExcept()` lived here for `FeatureStrip`, which showed every card
// except the current page's. Both were removed on 2026-08-02 when the site
// adopted one-job-per-page: the homepage is the only chooser, and an action page
// promotes nothing but itself.
