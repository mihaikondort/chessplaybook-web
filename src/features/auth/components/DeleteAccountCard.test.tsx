/**
 * The delete-account control (2026-08-04).
 *
 * What is tested is what the control OWES the player, not that it renders:
 * it must be impossible to trigger by accident, it must say what is kept as
 * well as what is destroyed, and it must never report success for a deletion
 * that only half-happened — the data and the login are two systems and the
 * second can fail after the first has succeeded.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

/*
  `fireEvent`, not `user-event`: the latter is not a dependency of this project
  and adding one for a single test file is how a frontend-only devDependency
  ends up breaking a backend type-check in CI. Typing is simulated with a change
  event, which is what the controlled input actually listens to.
*/
const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const typeUsername = (value: string) =>
  fireEvent.change(screen.getByLabelText(/type/i), { target: { value } });
import { DeleteAccountCard } from './DeleteAccountCard';

const signOutMock = vi.fn();
vi.mock('aws-amplify/auth', () => ({ signOut: (...args: unknown[]) => signOutMock(...args) }));
vi.mock('../utils/getAuthToken', () => ({ getAuthHeader: async () => ({ Authorization: 'Bearer test' }) }));

const summary = {
  success: true,
  data: { identityIds: ['sub'], counts: { puzzle_attempts: 341, challenge_answers: 12, ratings: 1, online_games: 4 } },
};

function mockFetch(deleteResponse: Partial<Response> & { json?: () => Promise<unknown> }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/api/account/summary')) {
      return { ok: true, json: async () => summary } as Response;
    }
    if (init?.method === 'DELETE') return deleteResponse as Response;
    throw new Error(`unexpected fetch: ${url}`);
  });
}

/** The server now reports BOTH halves; the client only reads the verdict. */
const okDeletion = { success: true, data: { deleted: {}, anonymised: {}, cognito: { deleted: true } } };

beforeEach(() => {
  signOutMock.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('fetch', mockFetch({ ok: true, json: async () => okDeletion }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('DeleteAccountCard', () => {
  it('says what will be destroyed, in the account\'s own terms', async () => {
    render(<DeleteAccountCard username="QuietBishop" />);
    await waitFor(() => expect(screen.getByText(/341 puzzle attempts/)).toBeInTheDocument());
    expect(screen.getByText(/12 Champion Challenge answers/)).toBeInTheDocument();
  });

  it('says what will NOT be destroyed, before anything is clicked', () => {
    render(<DeleteAccountCard username="QuietBishop" />);
    expect(screen.getByText(/Games you played against other people are kept/i)).toBeInTheDocument();
    expect(screen.getByText(/Backups are removed within 30 days/i)).toBeInTheDocument();
  });

  it('cannot be triggered by a single click', async () => {
    render(<DeleteAccountCard username="QuietBishop" />);
    click(/delete my account/i);
    // The destructive button exists but refuses until the name is typed —
    // on a phone a stray tap is cheap.
    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/account'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('refuses a near-miss of the username', async () => {
    render(<DeleteAccountCard username="QuietBishop" />);
    click(/delete my account/i);
    typeUsername('quietbishop');
    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeDisabled();
  });

  it('asks the server to delete, then clears the dead session', async () => {
    // Both halves are the server's job; the client's remaining duty is not to
    // leave a signed-in-looking tab behind an account that no longer exists.
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });

    render(<DeleteAccountCard username="QuietBishop" />);
    click(/delete my account/i);
    typeUsername('QuietBishop');
    click(/delete permanently/i);

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/account'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('never claims success when only the data went', async () => {
    /*
      The failure that matters, and it HAPPENED: on 2026-08-04 the owner
      deleted a real Google account, the data went and the Cognito login
      survived, because Amplify's client-side `deleteUser()` needs a scope a
      federated token does not carry. The server now reports the verdict and
      the client must not paper over it.
    */
    vi.stubGlobal('fetch', mockFetch({
      ok: true,
      json: async () => ({
        success: true,
        data: { deleted: {}, anonymised: {}, cognito: { deleted: false, reason: 'AccessDeniedException' } },
      }),
    } as never));
    render(<DeleteAccountCard username="QuietBishop" />);
    click(/delete my account/i);
    typeUsername('QuietBishop');
    click(/delete permanently/i);

    await waitFor(() => expect(screen.getByText(/data is deleted, but the login itself was not removed/i)).toBeInTheDocument());
    expect(screen.getByText(/support@chessplaybook.com/)).toBeInTheDocument();
  });

  it('a refused request says nothing was deleted, and means it', async () => {
    vi.stubGlobal('fetch', mockFetch({
      ok: false, status: 500,
      json: async () => ({ success: false, error: 'Deletion failed.' }),
    } as never));
    render(<DeleteAccountCard username="QuietBishop" />);
    click(/delete my account/i);
    typeUsername('QuietBishop');
    click(/delete permanently/i);

    await waitFor(() => expect(screen.getByText(/nothing was deleted/i)).toBeInTheDocument());
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('still offers deletion when the summary cannot be loaded', async () => {
    // The counts are a courtesy. Losing them must not remove the right.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    render(<DeleteAccountCard username="QuietBishop" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /delete my account/i })).toBeInTheDocument());
  });
});
