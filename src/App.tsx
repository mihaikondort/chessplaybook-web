import { useEffect, useRef } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Providers } from "@/app/providers";
import { AppRoutes } from "@/app/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackPageView as trackMetaPixelPageView } from "@/services/metaPixel";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

// ---------------------------------------------------------------------------
// Analytics: deferred loading
// ---------------------------------------------------------------------------
// Page views have exactly two sources, and neither is manual:
//   - the entry page_view comes from gtag's own `config` (send_page_view, left
//     at its default true);
//   - SPA navigations come from GA4 Enhanced Measurement ("page changes based
//     on browser history events").
//
// Enhanced Measurement does NOT cover the initial load. Suppressing the config
// page_view therefore made every non-navigating visitor invisible — see the
// note in services/analytics.ts. Do not add a manual page_view call: that is
// what caused the duplicates this comment used to warn about.

const App = () => {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const load = () => {
      import('./services/analytics').then(m => {
        m.initializeAnalytics();
      });
      // Meta Pixel — loads in parallel with GA, no-ops in dev.
      // See docs/Master Plan - Active/M1/META_PIXEL_INSTALL_PLAN.md.
      import('./services/metaPixel').then(m => {
        m.initMetaPixel();
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: 5000 });
    } else {
      setTimeout(load, 3000);
    }
  }, []);

  return (
    <ErrorBoundary>
      <Providers>
        <BrowserRouter>
          <PresenceHeartbeat />
          <MetaPixelRouteListener />
          <AppRoutes />
        </BrowserRouter>
      </Providers>
    </ErrorBoundary>
  );
};

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

/**
 * Fires Meta Pixel `PageView` on every SPA route change.
 *
 * Required because Meta Pixel doesn't auto-track client-side
 * navigation the way GA4's Enhanced Measurement does. Without this
 * listener, only the first page-load fires PageView and every
 * internal route change is missed — retargeting and conversion
 * attribution would be wildly broken.
 *
 * Component must live INSIDE <BrowserRouter> for useLocation to
 * have router context. Renders nothing — it's a listener-only.
 *
 * Skips the very first location change (the initial mount), since
 * `initMetaPixel()` already fires PageView at boot. Without this
 * skip, the first page-load would emit two PageView events: one
 * from init, one from the listener's first effect run.
 */
function MetaPixelRouteListener() {
  const location = useLocation();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    trackMetaPixelPageView();
  }, [location.pathname, location.search]);

  return null;
}

export default App;
