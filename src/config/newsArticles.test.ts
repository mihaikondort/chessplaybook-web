/**
 * Guards the news list against the drift that made the homepage teaser go four
 * months stale: two hand-maintained copies of the same list.
 *
 * `newsArticles` is now the only editorial copy, and `route-meta.json` is the
 * only metadata copy. These tests assert the two agree on which articles exist,
 * so publishing an article and updating only one of them fails here.
 */
import { describe, it, expect } from 'vitest';
import { newsArticles } from './newsArticles';
import routeMeta from './route-meta.json';

const routes = (routeMeta as { routes?: Record<string, unknown> }).routes ?? (routeMeta as Record<string, unknown>);

describe('newsArticles', () => {
  it('has a route-meta entry for every article', () => {
    const missing = newsArticles
      .map((a) => a.href.replace(/^\//, ''))
      .filter((key) => !(key in routes));
    expect(missing, `articles with no route-meta entry: ${missing.join(', ')}`).toEqual([]);
  });

  it('covers every route-meta news article', () => {
    const metaArticles = Object.keys(routes).filter(
      (k) => k.startsWith('news/') && (routes[k] as { articleType?: string }).articleType,
    );
    const listed = new Set(newsArticles.map((a) => a.href.replace(/^\//, '')));
    const missing = metaArticles.filter((k) => !listed.has(k));
    expect(missing, `published articles absent from the news list: ${missing.join(', ')}`).toEqual([]);
  });

  it('is ordered newest-first by publication date', () => {
    const dates = newsArticles.map((a) => {
      const key = a.href.replace(/^\//, '');
      return (routes[key] as { datePublished?: string }).datePublished ?? '';
    });
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('has no duplicate hrefs', () => {
    expect(new Set(newsArticles.map((a) => a.href)).size).toBe(newsArticles.length);
  });
});
