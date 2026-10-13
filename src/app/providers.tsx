import { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/design/theme/ThemeProvider";

// ---------- Deferred Auth Provider ----------
// aws-amplify (125KB) is NOT imported here. Instead we dynamically load the
// real AuthProvider after the first render, so the homepage paints instantly.
// While loading, a lightweight stub context is used (user=null, isLoading=true).

const noop = () => Promise.resolve() as any;

interface AuthContextType {
  user: null | { userId: string; email: string; username: string };
  isLoading: boolean;
  signInWithEmail: (...a: any[]) => Promise<void>;
  signUpWithEmail: (...a: any[]) => Promise<any>;
  confirmEmail: (...a: any[]) => Promise<void>;
  resendCode: (...a: any[]) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  requestPasswordReset: (...a: any[]) => Promise<void>;
  confirmNewPassword: (...a: any[]) => Promise<void>;
}

// Exported so components can import useAuth from here instead of AuthContext directly
// (this module is always in the initial bundle; AuthContext is deferred)
export const DeferredAuthContext = createContext<AuthContextType>({
  user: null, isLoading: true,
  signInWithEmail: noop, signUpWithEmail: noop, confirmEmail: noop,
  resendCode: noop, signInWithGoogle: noop, signOutUser: noop,
  requestPasswordReset: noop, confirmNewPassword: noop,
});

function DeferredAuthProvider({ children }: { children: React.ReactNode }) {
  const [RealProvider, setRealProvider] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);

  useEffect(() => {
    // Defer auth loading until browser is idle — don't compete with critical resources.
    // On slow 4G, loading the 125KB aws-amplify chunk during initial render tanks FCP.
    const load = () => {
      import("@/features/auth/AuthContext").then(m => {
        setRealProvider(() => m.AuthProvider);
      });
    };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(load, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(load, 3000);
      return () => clearTimeout(id);
    }
  }, []);

  if (RealProvider) {
    return <RealProvider>{children}</RealProvider>;
  }

  // No AuthProvider yet — children render without auth context.
  // UserDropdown must NOT render until RealProvider is available (it calls useAuth).
  return <>{children}</>;
}

// ---------- Main Providers ----------

const queryClient = new QueryClient();

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Site-wide SEO/social defaults.
 *
 * The same tags are in index.html marked `data-rh="true"`, which makes Helmet
 * replace them on mount instead of appending beside them. That swap is what
 * fixes the duplicate-description bug, but it also means Helmet owns these tags
 * from mount onward — so a page that sets no meta of its own would be left with
 * none at all. This puts the defaults back at the root, where any page-level
 * <Helmet> overrides them by virtue of being deeper in the tree.
 *
 * Keep in sync with index.html.
 */
function SeoDefaults() {
  return (
    <Helmet>
      <meta
        name="description"
        content="Elevate your chess strategy with the champion's playbook. Learn advanced tactics, openings, and endgame mastery."
      />
      <meta property="og:title" content="Chess Playbook - Master Your Game" />
      <meta
        property="og:description"
        content="Elevate your chess strategy with the champion's playbook. Learn advanced tactics, openings, and endgame mastery."
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.chessplaybook.com" />
      <meta property="og:image" content="https://www.chessplaybook.com/assets/facebook_cover.jpg" />
      <meta property="og:site_name" content="Chess Playbook" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="https://www.chessplaybook.com/assets/facebook_cover.jpg" />
    </Helmet>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <HelmetProvider>
      <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <DeferredAuthProvider>
          <TooltipProvider>
            <SeoDefaults />
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </DeferredAuthProvider>
      </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}
