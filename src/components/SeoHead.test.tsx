import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it } from 'vitest';

import routeMeta from '@/config/route-meta.json';
import SeoHead from './SeoHead';

/**
 * These assert the contract that route-meta.json is the ONLY source of page
 * metadata. Before it existed, each page's Helmet block and a hand-written
 * copy in scripts/generate-route-html.cjs had to be kept in sync by hand;
 * eight routes had drifted apart by 2026-07-28, and /puzzles served one title
 * to Google's first pass and a different one to the second.
 */

/**
 * Helmet only fills the provider context during SSR; on a client render it
 * mutates document.head, so that is what these read.
 */
async function renderHead(routeKey: string) {
  document.head.innerHTML = '';
  render(
    <HelmetProvider>
      <SeoHead routeKey={routeKey as never} />
    </HelmetProvider>,
  );
  await waitFor(() => expect(document.head.querySelector('title')).not.toBeNull());
  return {
    title: document.head.querySelector('title')?.textContent ?? '',
    meta: Array.from(document.head.querySelectorAll('meta'))
      .map((m) => m.outerHTML)
      .join('|'),
    link: Array.from(document.head.querySelectorAll('link'))
      .map((l) => l.outerHTML)
      .join('|'),
    script: Array.from(document.head.querySelectorAll('script'))
      .map((s) => s.textContent ?? '')
      .join('|'),
  };
}

describe('SeoHead', () => {
  it('renders the title and description from route-meta.json', async () => {
    const head = await renderHead('puzzles');
    expect(head.title).toBe(routeMeta['puzzles'].title);
    expect(head.meta).toContain(routeMeta['puzzles'].description);
  });

  it('derives a self-referencing canonical from the route key', async () => {
    const head = await renderHead('champions/list');
    expect(head.link).toContain('https://www.chessplaybook.com/champions/list');
    expect(head.title).toContain('1886-Present');
  });

  it('gives the homepage a trailing-slash canonical, not a bare domain', async () => {
    const head = await renderHead('');
    expect(head.link).toContain('href="https://www.chessplaybook.com/"');
  });

  it('emits article schema for routes that declare an articleType', async () => {
    const head = await renderHead('news/vaishali-ju-wenjun-title-match');
    expect(head.script).toContain('"@type":"NewsArticle"');
    expect(head.script).toContain('"datePublished":"2026-07-27"');
    expect(head.script).toContain('Chess Playbook');
  });

  it('emits no article schema for non-article routes', async () => {
    const head = await renderHead('privacy');
    expect(head.script).not.toContain('NewsArticle');
  });

  it('never renders a robots directive — noindex is opt-in per page', async () => {
    // /puzzles, /play and /play-online spent four months noindexed by a tag
    // nobody meant to keep. SeoHead must not be able to reintroduce that.
    const head = await renderHead('play-online');
    expect(head.meta).not.toContain('noindex');
  });

  it('has a title and description for every route in route-meta.json', () => {
    for (const [key, value] of Object.entries(routeMeta)) {
      expect(value.title, `${key} has no title`).toBeTruthy();
      expect(value.description, `${key} has no description`).toBeTruthy();
      // Long descriptions get truncated in the SERP; short ones waste the slot.
      expect(value.description.length, `${key} description too short`).toBeGreaterThan(50);
    }
  });
});
