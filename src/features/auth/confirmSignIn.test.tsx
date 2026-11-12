/**
 * Confirming an email signs the player in (owner, staging, 2026-11-12).
 *
 * `signUp` asked for `autoSignIn` and nothing ever called `autoSignIn()`, so
 * from launch (2026-03-26) every email sign-up landed on the homepage signed
 * out. These tests hold the two halves: the context completes the sign-in, and
 * the code page sends the player where they were going, or to sign in when the
 * automatic sign-in is not available.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const amplify = vi.hoisted(() => ({
  confirmSignUp: vi.fn(),
  autoSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: amplify.fetchAuthSession,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: amplify.confirmSignUp,
  autoSignIn: amplify.autoSignIn,
  resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));
vi.mock('aws-amplify/utils', () => ({ Hub: { listen: () => () => {} } }));
vi.mock('../../config/amplify', () => ({}));
vi.mock('./utils/linkAnonymous', () => ({ linkAnonymousData: async () => {} }));
vi.mock('./utils/migrateGuestData', () => ({ migrateGuestData: async () => {} }));
vi.mock('@/hooks/useBoardTheme', () => ({ reloadBoardTheme: () => {} }));
vi.mock('@/services/analytics', () => ({ logGA4Event: () => {} }));
vi.mock('@/services/metaPixel', () => ({ trackLead: () => {}, trackCompleteRegistration: () => {} }));

import { AuthProvider, useAuth } from './AuthContext';
import VerifyEmailPage from './pages/VerifyEmailPage';

const SIGNED_IN_TOKENS = {
  tokens: { idToken: { payload: { sub: 'sub-1', email: 'a@example.com', preferred_username: 'alice' } } },
};

beforeEach(() => {
  vi.clearAllMocks();
  amplify.fetchAuthSession.mockResolvedValue({ tokens: undefined });
});

describe('confirmEmail', () => {
  let confirm: ReturnType<typeof useAuth>['confirmEmail'];
  function Grab() {
    confirm = useAuth().confirmEmail;
    return null;
  }
  async function mount() {
    render(<AuthProvider><Grab /></AuthProvider>);
    await waitFor(() => expect(amplify.fetchAuthSession).toHaveBeenCalled());
  }

  it('completes the automatic sign-in', async () => {
    await mount();
    amplify.confirmSignUp.mockResolvedValue({ nextStep: { signUpStep: 'COMPLETE_AUTO_SIGN_IN' } });
    amplify.autoSignIn.mockResolvedValue({ isSignedIn: true });
    amplify.fetchAuthSession.mockResolvedValue(SIGNED_IN_TOKENS);
    let result: { signedIn: boolean } | undefined;
    await act(async () => { result = await confirm('a@example.com', '123456'); });
    expect(amplify.autoSignIn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ signedIn: true });
  });

  it('reports not signed in when no automatic sign-in was prepared', async () => {
    await mount();
    amplify.confirmSignUp.mockResolvedValue({ nextStep: { signUpStep: 'DONE' } });
    let result: { signedIn: boolean } | undefined;
    await act(async () => { result = await confirm('a@example.com', '123456'); });
    expect(amplify.autoSignIn).not.toHaveBeenCalled();
    expect(result).toEqual({ signedIn: false });
  });

  it('reports not signed in when the automatic sign-in fails', async () => {
    await mount();
    amplify.confirmSignUp.mockResolvedValue({ nextStep: { signUpStep: 'COMPLETE_AUTO_SIGN_IN' } });
    amplify.autoSignIn.mockRejectedValue(new Error('The autoSignIn flow has not started'));
    let result: { signedIn: boolean } | undefined;
    await act(async () => { result = await confirm('a@example.com', '123456'); });
    expect(result).toEqual({ signedIn: false });
  });
});

describe('the code page', () => {
  function Where() {
    const l = useLocation();
    return <div data-testid="where">{l.pathname + l.search}</div>;
  }
  async function submitAt(path: string) {
    render(
      <HelmetProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </HelmetProvider>,
    );
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } });
    fireEvent.submit(screen.getByLabelText(/verification code/i).closest('form')!);
    return (await screen.findByTestId('where')).textContent;
  }

  it('signed in: goes where the player was going', async () => {
    amplify.confirmSignUp.mockResolvedValue({ nextStep: { signUpStep: 'COMPLETE_AUTO_SIGN_IN' } });
    amplify.autoSignIn.mockResolvedValue({ isSignedIn: true });
    amplify.fetchAuthSession.mockResolvedValue(SIGNED_IN_TOKENS);
    expect(await submitAt('/verify-email?email=a%40example.com&returnTo=%2Fpuzzles%2Fplan')).toBe('/puzzles/plan');
  });

  it('not signed in: asks for one sign-in, keeping the address and the destination', async () => {
    amplify.confirmSignUp.mockResolvedValue({ nextStep: { signUpStep: 'DONE' } });
    const where = await submitAt('/verify-email?email=a%40example.com&returnTo=%2Fpuzzles%2Fplan');
    const url = new URL(where!, 'https://x');
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('confirmed')).toBe('1');
    expect(url.searchParams.get('email')).toBe('a@example.com');
    expect(url.searchParams.get('returnTo')).toBe('/puzzles/plan');
  });
});
