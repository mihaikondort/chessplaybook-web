import { reloadBoardTheme } from '@/hooks/useBoardTheme';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  fetchAuthSession,
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  type SignInInput,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { redirectToGoogle, clearAmplifyTokens, clearUserLocalStorage } from './utils/oauth';
import { migrateGuestData } from './utils/migrateGuestData';
import { linkAnonymousData } from './utils/linkAnonymous';
import { classifyAuthError } from './utils/authErrors';
import { logGA4Event } from '@/services/analytics';

// Configure Amplify when this module loads (moved from main.tsx for lazy-load support)
import '../../config/amplify';

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<{ nextStep: string }>;
  confirmEmail: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmNewPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const migratedRef = useRef<string | null>(null);

  const loadUser = useCallback(async () => {
    try {
      // fetchAuthSession reads tokens from localStorage and refreshes if needed.
      // Decoding the idToken avoids an extra GetUser network call.
      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) {
        setUser(null);
        return;
      }
      const p = tokens.idToken.payload;
      const preferredUsername = (p['preferred_username'] as string) || '';
      // Cognito auto-generates 'Google_xxx' / 'Facebook_xxx' for federated logins —
      // those are internal IDs, not display names. Use the 'name' claim instead.
      const isFederatedId = /^(Google|Facebook|SignInWithApple)_/.test(preferredUsername);
      const username = (!isFederatedId && preferredUsername)
        ? preferredUsername
        : (p['name'] as string) || (p['email'] as string) || '';
      setUser({
        userId: p.sub as string,
        email: (p['email'] as string) || '',
        username,
      });
    } catch (err) {
      /*
        "ANY FAILURE MEANS THE SESSION IS INVALID" WAS FALSE, and it cost real
        players their accounts (2026-08-12). `fetchAuthSession` throws for a
        dropped connection and a Cognito 5xx exactly as it does for a dead
        grant, and this clause answered all three by deleting the refresh token
        — the one credential that could have recovered the session.

        Only Cognito's verdict may destroy Cognito's grant. Everything else
        leaves the tokens where they are and is retried on the next call, which
        costs at most one failed refresh per page load.

        `setUser(null)` still runs either way: we could not read a session, so
        the UI must not claim one. The difference is whether we can get it back.
      */
      const reason = classifyAuthError(err);
      const tokensCleared = reason === 'definitive';
      if (tokensCleared) clearAmplifyTokens();
      logGA4Event({
        name: 'auth_session_lost',
        params: {
          reason,
          source: 'load_user',
          tokens_cleared: tokensCleared,
          error_name: (err as { name?: string } | null)?.name ?? 'unknown',
        },
      });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /*
    LINK FIRST, THEN MIGRATE — and the order is the bug fix (2026-08-09).

    These two write the same preferences row from opposite directions. The link
    is the SERVER merging the guest's record onto the account; the migration is
    the CLIENT pushing this device's localStorage up. Fired together, the
    migration read the account row before the link had written to it, saw
    nothing, kept its own local values, and PUT them a second later (the save is
    debounced) — last write wins.

    That is not theoretical: a player who solved 74 puzzles as a guest and then
    created an account ended up with `puzzle_solved: 0` and a rating of 1200
    beside a deviation of 76.9, which is the signature of the defect. The
    deviation survived only because the client does not know that field and so
    could not overwrite it.

    Awaiting the link makes the migration's read see the merged truth. It is not
    the whole fix — `migrateGuestData` no longer sends server-owned counters at
    all — but ordering is what makes its remaining merge honest.
  */
  useEffect(() => {
    if (!user || migratedRef.current === user.userId) return;
    migratedRef.current = user.userId;
    void (async () => {
      await linkAnonymousData();
      await migrateGuestData(user.userId);
      // The account may carry its own board theme (B4: the store loads once).
      reloadBoardTheme();
    })();
  }, [user]);

  useEffect(() => {
    loadUser();
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'tokenRefresh') {
        loadUser();
      } else if (payload.event === 'signedOut') {
        setUser(null);
      } else if (payload.event === 'tokenRefresh_failure') {
        /*
          THE PRIME SUSPECT, AND THE REASON THIS EVENT IS INSTRUMENTED.

          `storeTokensForAmplify` hand-writes Amplify's localStorage keys after
          our manual PKCE redirect, keyed on `sub` and without the
          `signInDetails`/`oauthMetadata` entries Amplify's own store writes. If
          that makes Amplify attempt a refresh it did not need, the refresh
          fails here — and the old code answered by deleting the refresh token,
          turning a recoverable hiccup into a permanent sign-out minutes after
          signing up.

          Same rule as `loadUser`: clear only on Cognito's verdict. A transient
          failure keeps the tokens, and Amplify will try again.
        */
        const err = (payload as { data?: unknown }).data;
        const reason = classifyAuthError(err);
        const tokensCleared = reason === 'definitive';
        if (tokensCleared) clearAmplifyTokens();
        logGA4Event({
          name: 'auth_session_lost',
          params: {
            reason,
            source: 'token_refresh',
            tokens_cleared: tokensCleared,
            error_name: (err as { name?: string } | null)?.name ?? 'unknown',
          },
        });
        // Only surrender the UI's session when the grant is genuinely gone. On
        // a transient failure the tokens are still there, so `loadUser` can
        // read them and the player never sees a sign-out that did not happen.
        if (tokensCleared) setUser(null);
        else void loadUser();
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [loadUser]);

  const signInWithEmail = async (email: string, password: string) => {
    const { isSignedIn } = await signIn({ username: email, password } as SignInInput);
    if (isSignedIn) await loadUser();
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    const { nextStep } = await signUp({
      username: email,
      password,
      options: {
        userAttributes: { email, preferred_username: username },
        autoSignIn: true,
      },
    });
    return { nextStep: nextStep.signUpStep };
  };

  const confirmEmail = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
    await loadUser();
  };

  const resendCode = async (email: string) => {
    await resendSignUpCode({ username: email });
  };

  const signInWithGoogle = async () => {
    await redirectToGoogle();
  };

  const signOutUser = async () => {
    await signOut();
    clearAmplifyTokens();
    clearUserLocalStorage();
    reloadBoardTheme();
    setUser(null);
  };

  const requestPasswordReset = async (email: string) => {
    await resetPassword({ username: email });
  };

  const confirmNewPassword = async (email: string, code: string, newPassword: string) => {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading,
      signInWithEmail, signUpWithEmail, confirmEmail, resendCode,
      signInWithGoogle, signOutUser,
      requestPasswordReset, confirmNewPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Safe default when DeferredAuthProvider hasn't loaded the real provider yet.
// Returns user=null, isLoading=true with noop methods — pages render in
// "not signed in" state until auth loads, instead of crashing.
const noop = () => Promise.resolve() as any;
const AUTH_LOADING_STUB: AuthContextType = {
  user: null, isLoading: true,
  signInWithEmail: noop, signUpWithEmail: noop, confirmEmail: noop,
  resendCode: noop, signInWithGoogle: noop, signOutUser: noop,
  requestPasswordReset: noop, confirmNewPassword: noop,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  return ctx ?? AUTH_LOADING_STUB;
}
