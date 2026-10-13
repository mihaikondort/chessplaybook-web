import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../AuthContext';
import { logGA4Event } from '@/services/analytics';
import { returnToFrom, stashReturnTo } from '../utils/returnTo';

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  /*
    `?returnTo=` FIRST, then router state, then the homepage.

    Every "sign in to save your progress" link on the site writes the query
    parameter and none of them set router state, so reading only the latter
    sent all of them home — losing the page, and with it whatever the player
    was in the middle of.
  */
  const from = returnToFrom(location.search) || (location.state as any)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      logGA4Event({ name: 'signed_in', params: { provider: 'cognito' } });
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.name === 'UserNotConfirmedException') {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (err.name === 'UserNotFoundException') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      /*
        Google leaves the site, so the destination cannot ride the URL. Stashed
        for `/auth/callback` to pick up — one tab, one attempt.
      */
      stashReturnTo(returnToFrom(window.location.search));
      await signInWithGoogle();
    } catch (err: any) {
      setError('Google sign in failed. Please try again.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In - Chess Playbook</title>
        <meta name="description" content="Sign in to your Chess Playbook account to track your progress, solve puzzles, and play online." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="font-playfair text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your Chess Playbook account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGoogle}
                type="button"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-link transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-link hover:underline">
                  Create a free account
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
