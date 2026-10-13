import env from '@/config/env';
import { getRequestHeaders } from '@/features/auth/utils/getAuthToken';

/** Losing telemetry must never interrupt a board move. */
export async function recordPuzzleTry(puzzleId: string, tryId?: string): Promise<void> {
  try {
    const headers = await getRequestHeaders();
    await fetch(`${env.apiBaseUrl}/api/puzzles/try`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleId, tryId }),
    });
  } catch {
    // A later result repeats the idempotent insert. A genuinely abandoned
    // offline try cannot be recovered and should not break solving.
  }
}
