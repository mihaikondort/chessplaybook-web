/**
 * What the password-reset pages may and may not claim (2026-08-04).
 *
 * The bug these guard was not a crash. Cognito's app client has
 * `PreventUserExistenceErrors` enabled — correct, it stops the page being used
 * to discover who has an account — so `ForgotPassword` returns a SUCCESS for an
 * address it cannot reset and sends nothing at all. Measured on production: a
 * request for a Google-only account returned `CodeDeliveryDetails` while SES's
 * 24-hour send count stayed at zero.
 *
 * Two consequences, both of which cost the owner real time:
 *   - the page asserted "the code was sent to X" when it cannot know that;
 *   - a Google account has NO password in Cognito, so no code can ever arrive,
 *     and nothing said so — while most accounts in the pool were Google.
 *
 * These tests are about wording, which is unusual, and deliberate: the wording
 * IS the defect. Nothing else on the path was broken.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ requestPasswordReset: async () => {}, confirmNewPassword: async () => {} }),
}));

function renderAt(ui: React.ReactElement, path = '/') {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </HelmetProvider>,
  );
}

describe('the reset-code page', () => {
  it('does not claim an email was sent', () => {
    renderAt(<ResetPasswordPage />, '/reset-password?email=nobody@example.com');
    // "If an account exists for X, we have sent it a reset code" — true whether
    // or not the account is real, which is the only thing this page can know.
    expect(screen.getByText(/if an account exists for/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Enter the code sent to/i)).not.toBeInTheDocument();
  });

  it('names the address it is talking about', () => {
    renderAt(<ResetPasswordPage />, '/reset-password?email=nobody@example.com');
    expect(screen.getByText('nobody@example.com')).toBeInTheDocument();
  });

  it('tells a Google user why no code is coming', () => {
    renderAt(<ResetPasswordPage />, '/reset-password?email=someone@example.org');
    expect(screen.getByText(/no password here, so there is nothing to reset/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue with google/i })).toBeInTheDocument();
  });
});

describe('the forgot-password page', () => {
  it('promises a code conditionally, not absolutely', () => {
    renderAt(<ForgotPasswordPage />);
    expect(screen.getByText(/if there is an account for it/i)).toBeInTheDocument();
  });

  it('warns about Google accounts BEFORE the wait, not after', () => {
    renderAt(<ForgotPasswordPage />);
    expect(screen.getByText(/there is no password to reset/i)).toBeInTheDocument();
  });
});
