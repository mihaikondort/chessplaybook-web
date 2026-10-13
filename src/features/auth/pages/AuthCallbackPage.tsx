import { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForTokens, storeTokensForAmplify } from '../utils/oauth';
import { trackLead, trackCompleteRegistration } from '@/services/metaPixel';
import { logGA4Event } from '@/services/analytics';
import { takeStashedReturnTo } from '../utils/returnTo';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const params = new URLSearchParams(window.location.search);

    // Not an OAuth callback — redirect home
    if (!params.get('code') && !params.get('error')) {
      navigate('/', { replace: true });
      return;
    }

    exchangeCodeForTokens()
      .then((tokens) => {
        storeTokensForAmplify(tokens);
        logGA4Event({ name: 'signed_in', params: { provider: 'google' } });
        // Meta Pixel: only fire registration events when this OAuth
        // callback follows a sign-up flow (Google sign-up button).
        // The `cp_signup_intent` flag is set by SignupPage.handleGoogle
        // before redirecting to Google. A regular sign-in (LoginPage)
        // doesn't set the flag, so we don't fire registration events
        // for returning users.
        if (sessionStorage.getItem('cp_signup_intent') === '1') {
          sessionStorage.removeItem('cp_signup_intent');
          trackLead();
          trackCompleteRegistration();
        }
        /*
          Back where they were, not the homepage.

          A full page load rather than a router navigate, deliberately: the
          Amplify tokens were just written to storage and this reloads the app
          with them in place, which is what the previous line was doing too.
        */
        window.location.href = takeStashedReturnTo() ?? '/';
      })
      .catch((err) => {
        console.error('[OAuth] Callback error:', err);
        setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
      });
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Helmet>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="text-center max-w-md px-4">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm text-link hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Helmet>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
}
