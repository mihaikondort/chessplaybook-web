import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import routeMeta from '@/config/route-meta.json';
import RouteHeading from './RouteHeading';

/**
 * These assert the contract that a page's visible heading comes from
 * route-meta.json — the same entry `SeoHead` reads and
 * `scripts/generate-route-html.cjs` bakes into the prerendered <noscript>.
 *
 * The defect being guarded (audit, 2026-07-31): `/play-online` and `/puzzles`
 * declared `heading` in route-meta.json, the generator baked it, and the React
 * page rendered no heading at all — so the string reached Google's
 * non-rendering first pass and nobody else. A hard-coded <h1> in the page
 * would "fix" the missing heading while re-creating the drift, which is why
 * these assert the rendered text EQUALS the config value rather than merely
 * asserting an <h1> exists.
 */

describe('RouteHeading', () => {
  /**
   * Asserting `h1 === routeMeta[key].heading` for ONE route is not enough, and
   * this was caught by reintroducing the defect: replacing `{meta.heading}`
   * with the literal string "Play Chess Online" kept that assertion green,
   * because the literal and the config value are the same text. A hard-coded
   * heading is precisely the drift this component exists to prevent.
   *
   * Rendering two routes and requiring they DIFFER is what actually pins it:
   * any hard-coded string makes both render the same text.
   */
  it('renders each route its own declared heading, not one hard-coded string', () => {
    const a = render(<RouteHeading routeKey="play-online" />);
    const headingA = a.container.querySelector('h1')?.textContent;
    a.unmount();

    const b = render(<RouteHeading routeKey="puzzles" />);
    const headingB = b.container.querySelector('h1')?.textContent;

    expect(headingA).toBe(routeMeta['play-online'].heading);
    expect(headingB).toBe(routeMeta.puzzles.heading);
    expect(headingA).not.toBe(headingB);
  });

  it('renders each route its own declared body text', () => {
    const a = render(<RouteHeading routeKey="play-online" />);
    const bodyA = a.container.querySelector('p')?.textContent;
    a.unmount();

    const b = render(<RouteHeading routeKey="puzzles" />);
    const bodyB = b.container.querySelector('p')?.textContent;

    expect(bodyA).toBe(routeMeta['play-online'].body);
    expect(bodyB).toBe(routeMeta.puzzles.body);
    expect(bodyA).not.toBe(bodyB);
  });

  it('emits exactly one <h1>, so a page never competes with itself', () => {
    const { container } = render(<RouteHeading routeKey="puzzles" />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
  });

  it('omits the body but keeps the heading when hideBody is set', () => {
    render(<RouteHeading routeKey="play-online" hideBody />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(routeMeta['play-online'].body)).not.toBeInTheDocument();
  });

  it('throws rather than rendering an empty heading for an entry with no heading', () => {
    // The failure mode this prevents is silent: a page shipping a blank <h1>
    // reads as "has a heading" to every automated check, including the audit
    // script that found the original defect.
    expect(() => render(<RouteHeading routeKey={'nonexistent-route' as never} />)).toThrow(
      /no "heading"/,
    );
  });

  /**
   * The routes that render through this component. If any loses its
   * heading/body in route-meta.json, the prerendered <noscript> block silently
   * bakes "undefined" and the page silently renders nothing — neither of which
   * fails any existing build check.
   *
   * `''` is the homepage, added 2026-08-02 when it became the six-card chooser.
   */
  it.each(['', 'play-online', 'puzzles'] as const)(
    'route-meta.json still declares heading and body for "%s"',
    (key) => {
      expect(routeMeta[key].heading).toBeTruthy();
      expect(routeMeta[key].body).toBeTruthy();
    },
  );

  it('renders the homepage H1 from route-meta.json, not a hard-coded string', () => {
    // The homepage is a paid ad's landing page: its <h1>, its <title> and the
    // ad copy have to agree, and one source is what makes that enforceable.
    // A hard-coded heading here would drift from the metadata the campaign
    // points at without failing anything.
    render(<RouteHeading routeKey="" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(routeMeta[''].heading);
  });

  it('keeps the homepage heading short enough to leave the card grid in view', () => {
    // The whole point of the rewrite is that all six cards sit in the first
    // mobile viewport. The heading is the only thing competing for that space,
    // so an essay here is a real regression, not a style opinion.
    expect(routeMeta[''].heading.length).toBeLessThanOrEqual(48);
    expect(routeMeta[''].body.length).toBeLessThanOrEqual(120);
  });
});
