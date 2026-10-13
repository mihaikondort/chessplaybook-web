import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../AuthContext';
import { trackLead, trackCompleteRegistration } from '@/services/metaPixel';

export default function VerifyEmailPage() {
  const { confirmEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await confirmEmail(email, code.trim());
      // Meta Pixel: registration finalised. Fire both Lead (sign-up
      // intent captured + completed) and CompleteRegistration (account
      // is ready to use). Meta's optimisation can use whichever event
      // is better-tuned for the campaign — firing both is the
      // recommended pattern.
      trackLead();
      trackCompleteRegistration();
      navigate('/', { replace: true });
    } catch (err: any) {
      if (err.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Code has expired. Please request a new one.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResendSent(false);
    try {
      await resendCode(email);
      setResendSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Verify Email - Chess Playbook</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-background flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="font-playfair text-2xl">Check your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
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

                {error && <p className="text-sm text-destructive">{error}</p>}
                {resendSent && <p className="text-sm text-success">A new code has been sent.</p>}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify email'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Didn't receive it?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-link hover:underline"
                >
                  Resend code
                </button>
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
