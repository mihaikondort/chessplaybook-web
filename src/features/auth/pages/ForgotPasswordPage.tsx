import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../AuthContext';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      if (err.name === 'UserNotFoundException') {
        // Don't reveal whether the account exists
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        setError(err.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - Chess Playbook</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="font-playfair text-2xl">Reset your password</CardTitle>
              <CardDescription>
                Enter your email and we&rsquo;ll send a reset code — if there is an account for it
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send reset code'}
                </Button>
              </form>

              {/*
                Said before the wait, not after it. A Google account has no
                password in Cognito, so a reset code will never arrive for one —
                and that is the majority of accounts here.
              */}
              <p className="text-sm text-muted-foreground">
                Signed up with Google? There is no password to reset —{' '}
                <Link to="/login" className="text-link hover:underline">continue with Google</Link>{' '}
                instead.
              </p>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-link hover:underline">Back to sign in</Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
