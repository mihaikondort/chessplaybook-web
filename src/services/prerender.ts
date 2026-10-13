/**
 * A page the browser rendered on spec is not a visit.
 *
 * Chrome's Speculation Rules API PRERENDERS a page before anyone clicks: the
 * document is created, scripts run and React mounts, all while the user is still
 * looking at the previous page — or at a Google results list they may never click.
 * If the speculation is discarded, nobody ever saw it.
 *
 * WHY OUR EXISTING VISIBILITY CHECK DOES NOT COVER THIS. The old prerender
 * implementation exposed `visibilityState === 'prerendering'`, and a lot of advice
 * still says so. It is out of date: under Speculation Rules the prerendered document
 * reports `visibilityState === 'visible'`, so a visibility guard passes and the
 * heartbeat goes out. `document.prerendering` is the only reliable signal.
 *
 * This matters here more than for most sites. Owner, 2026-08-08: "somebody searches
 * for chess puzzle on google, clicks, stays a few seconds and closes the site" — a
 * prerender that is never activated looks EXACTLY like that, because the page really
 * did load and really did go away seconds later.
 *
 * Contract: callers must not report anything while `isPrerendering()` is true, and
 * should use `onPrerenderActivated` to fire once the page is genuinely shown.
 */

interface PrerenderingDocument extends Document {
  /** Chrome ≥ 108. Absent in every other browser, which is treated as "not a prerender". */
  prerendering?: boolean;
}

export function isPrerendering(doc: Document = document): boolean {
  return (doc as PrerenderingDocument).prerendering === true;
}

/**
 * Run `callback` when a prerendered page is actually activated.
 *
 * Fires at most once, and only for a page that really was prerendered — a normal
 * load never registers the listener, so there is nothing to leak. Returns a cleanup
 * function for the caller's effect teardown.
 */
export function onPrerenderActivated(
  callback: () => void,
  doc: Document = document,
): () => void {
  if (!isPrerendering(doc)) return () => {};
  const handler = () => {
    // `prerenderingchange` fires on activation; the flag is false by then.
    if (!isPrerendering(doc)) callback();
  };
  doc.addEventListener('prerenderingchange', handler, { once: true });
  return () => doc.removeEventListener('prerenderingchange', handler);
}
