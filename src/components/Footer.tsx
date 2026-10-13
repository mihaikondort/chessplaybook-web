import { Link } from 'react-router-dom';

/**
 * The SITE footer, rendered once by the content layout route (#72).
 *
 * `data-site-footer` marks it, for the same reason `[data-nav-row]` marks the
 * bar: a probe counting `<footer>` elements cannot tell this apart from an
 * article's own closing note, which is valid HTML and which `/news/candidates-2026`
 * legitimately has. Counting bare tags reported two footers on that page and it
 * was the probe that was wrong.
 */
export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Play",
      links: [
        { label: "Play Online", to: "/play-online" },
        { label: "Play vs Computer", to: "/play" },
        { label: "Puzzle Training", to: "/puzzles" },
        { label: "Champion Challenge", to: "/champion-challenge" },
        { label: "Leaderboard", to: "/leaderboard" },
      ],
    },
    {
      title: "Watch",
      links: [
        { label: "Live Events", to: "/live-events" },
        { label: "Tournament Schedule", to: "/world-championship-cycle" },
        { label: "Candidates 2026", to: "/candidates-2026" },
      ],
    },
    {
      title: "Learn",
      links: [
        { label: "Explain a Position", to: "/explain" },
        { label: "Game Analysis", to: "/analysis" },
        { label: "World Champions", to: "/champions" },
        { label: "Champions List", to: "/champions/list" },
        { label: "News & Articles", to: "/news" },
      ],
    },
    {
      title: "About",
      links: [
        { label: "Contact", to: "/contact" },
        { label: "Credits", to: "/credits" },
        { label: "Privacy Policy", to: "/privacy" },
        { label: "Terms of Service", to: "/terms" },
      ],
    },
  ];

  return (
    <footer data-site-footer className="border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Footer grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            {/*
              THE BRAND SITS ON THE COLUMN TITLES' LINE (owner, 2026-08-15: *"move
              the logo and the king crown icon at the bottom of the page a bit
              higher so it will be aligned with the rest of the titles"*).

              Both rows START at the same y — measured 373 — so nothing was
              mis-stacked. What differs is the ROW HEIGHT: the brand is an 18px
              wordmark centred in a 32px tile, while `Play`, `Watch`, `Learn` and
              `About` are a 20px line. Equal tops, unequal heights, so the
              wordmark's centre lands 6px below theirs and the eye reads the whole
              brand as dropped.

              An OPTICAL correction, which is why it is a negative margin rather
              than a layout change: the tile has to keep its size, and aligning
              the two centres is exactly what "aligned with the titles" means when
              one row is taller than the other. `sm:` only — below that the footer
              is a single column and there is nothing beside it to align to.
            */}
            <Link to="/" className="flex items-center gap-2 mb-4 sm:-mt-1.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-sm">&#9812;</span>
              </div>
              <span className="font-playfair font-bold text-lg text-foreground">Chess Playbook</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your complete chess platform for playing, watching, and learning.
            </p>
          </div>

          {/* Link columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-foreground text-sm mb-4">{section.title}</h4>
              <ul className="space-y-0.5 sm:space-y-1">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center min-h-[36px] py-1 text-sm text-muted-foreground hover:text-link transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} The Chess Playbook Team. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="/credits" className="hover:text-link transition-colors">Credits & Attribution</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
