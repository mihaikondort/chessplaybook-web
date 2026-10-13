import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

/**
 * Guards the automatic chunk-error recovery to one attempt per tab. Without it a
 * genuinely broken build would reload forever.
 */
const RECOVERY_KEY = 'cpb_chunk_recovery_attempted';

/** sessionStorage access that cannot throw — private mode / blocked storage. */
const recovery = {
  attempted: (): boolean => {
    try {
      return sessionStorage.getItem(RECOVERY_KEY) === '1';
    } catch {
      return true; // cannot record an attempt, so never auto-retry
    }
  },
  mark: (): void => {
    try {
      sessionStorage.setItem(RECOVERY_KEY, '1');
    } catch {
      /* no-op */
    }
  },
  clear: (): void => {
    try {
      sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* no-op */
    }
  },
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk');

    return { hasError: true, isChunkError };
  }

  componentDidMount() {
    // Reached the app without a chunk error, so re-arm auto-recovery. A tab can
    // outlive several deploys — that is exactly what happened on 2026-07-30 —
    // and each one deserves its own single retry.
    if (!this.state.hasError) recovery.clear();
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // A chunk error means this document references bundles that are no longer
    // served. Recover once, automatically — the user has nothing useful to do
    // here, and clicking Reload used to leave them stuck (see hardReload).
    // `recovery` reports "already attempted" when storage is unavailable, so a
    // browser that cannot record the attempt gets the manual button instead of a
    // possible reload loop.
    if (this.state.isChunkError && !recovery.attempted()) {
      recovery.mark();
      void this.hardReload();
    }
  }

  /**
   * Reload in a way that can actually pick up a new build.
   *
   * `window.location.reload()` re-serves the SAME cached index.html, which
   * references the same missing chunks — so the error reappeared immediately and
   * the button looked broken. Reported 2026-07-30: repeated reloads failed until
   * the HTML's max-age expired on its own.
   *
   * Two things have to be dropped first: the service worker's CacheStorage
   * (cache-first for hashed bundles, so it can hold the old ones) and the HTTP
   * cache entry for this document, which `fetch(..., { cache: 'reload' })`
   * refreshes without polluting the URL with a cache-busting query param.
   */
  hardReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      /* best effort */
    }
    try {
      await fetch(window.location.href, { cache: 'reload' });
    } catch {
      /* offline or blocked — reload anyway */
    }
    window.location.reload();
  };

  handleReload = () => {
    void this.hardReload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.state.isChunkError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Update Available
            </h2>
            <p className="text-muted-foreground mb-6">
              A new version of Chess Playbook is available. Please reload to get
              the latest version.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Something went wrong
          </h2>
          <p className="text-muted-foreground mb-6">
            An unexpected error occurred. Please try reloading the page.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
