/**
 * The contact form's one call (#43). The server stores the message before it answers,
 * so a 201 means it is safe, whatever happens to the email after.
 *
 * The auth headers are imported at call time, as in `PlanApi`: a static import of
 * `getAuthToken` pulls the Cognito graph into the contact page's chunk.
 */
import env from '@/config/env';

export type SupportCategory = 'problem' | 'game_data' | 'suggestion' | 'account' | 'other';

export interface SupportMessage {
  category: SupportCategory;
  message: string;
  email: string | null;
  page: string | null;
  viewport: string | null;
  /** The honeypot. Always empty from a person. */
  website: string;
}

export type SupportFailure = 'invalid' | 'rate_limited' | 'network' | 'server';

export class SupportApiError extends Error {
  constructor(readonly reason: SupportFailure, message: string) {
    super(message);
    this.name = 'SupportApiError';
  }
}

export async function sendSupportMessage(input: SupportMessage): Promise<void> {
  const headers = await (await import('@/features/auth/utils/getAuthToken')).getRequestHeaders();
  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/api/support/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(input),
    });
  } catch {
    throw new SupportApiError('network', 'network');
  }
  if (response.ok) return;

  let error = '';
  try {
    error = ((await response.json()) as { error?: string }).error ?? '';
  } catch {
    // A proxy error page: the status says enough.
  }
  if (response.status === 400) throw new SupportApiError('invalid', error);
  if (response.status === 429) throw new SupportApiError('rate_limited', error);
  throw new SupportApiError('server', error);
}
