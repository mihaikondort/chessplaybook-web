import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../AuthContext';

export default function ResetPasswordPage() {
  const { confirmNewPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await confirmNewPassword(email, code.trim(), newPassword);
      navigate('/login?reset=success');
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        setError('Invalid code. Please check and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Code has expired. Please request a new reset email.');
      } else if (err.name === 'InvalidPasswordException') {
        setError('Password must be 8+ characters with uppercase, lowercase, number, and symbol.');
      } else {
        setError(err.message || 'Password reset failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password - Chess Playbook</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="font-playfair text-2xl">Set new password</CardTitle>
              {/*
                CONDITIONAL, not a claim (2026-08-04). Cognito's app client has
                `PreventUserExistenceErrors` enabled — correctly, it stops this
                page being used to discover who has an account — which means
                ForgotPassword returns a SUCCESS for an address it cannot reset
                and sends nothing. Measured: a request for a Google-only account
                returned `CodeDeliveryDetails` while SES sent zero.

                So "we sent a code to you@example.com" is a sentence this page
                cannot know to be true, and the owner lost time to it: no
                account existed for the address they typed, and every screen
                told them one was on its way.
              */}
              <CardDescription>
                If an account exists for{' '}
                <span className="font-medium text-foreground">{email}</span>, we have sent it
                a reset code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/*
                The majority case, said out loud. A Google account has no
                password in Cognito, so no reset code will ever arrive for one,
                and most accounts in this pool are Google. Without
                this line the player waits for an email that cannot exist.
              */}
              <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                No email?{' '}
                <Link to="/login" className="text-link hover:underline">Try Continue with Google</Link>{' '}
                — accounts created that way have no password here, so there is nothing to reset.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Reset code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="8+ characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must include uppercase, lowercase, number, and symbol.
                  </p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/forgot-password" className="text-link hover:underline">
                  Resend reset code
                </Link>
                {' · '}
                <Link to="/login" className="text-link hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
