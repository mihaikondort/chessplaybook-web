/**
 * Is the dev server's API target production? (#35)
 *
 * `vite.config.ts` refuses writes, and does not proxy the game socket, when it is:
 * local probes have written real rows to production through it before.
 *
 * FAIL-CLOSED, WITH AN ALLOWLIST. Every `chessplaybook.com` host is production
 * unless it is exactly a known non-production host. The regex this replaces
 * matched every subdomain, so a staging API would have inherited the production
 * write ban; narrowing the regex to exclude staging would instead silently unban
 * the next `api-v2.chessplaybook.com` somebody stands up, which shows up only as
 * real rows in production. A new host is production until it is added here.
 *
 * A target that does not parse as a URL is treated as production, for the same
 * reason.
 */
export const NON_PRODUCTION_API_HOSTS: readonly string[] = [
  // The staging API, as `.env.staging.example` names it (#37-#40).
  'api.staging.chessplaybook.com',
];

export function isProductionApiTarget(target: string): boolean {
  let host: string;
  try {
    host = new URL(target).hostname.toLowerCase();
  } catch {
    return true;
  }
  const ours = host === 'chessplaybook.com' || host.endsWith('.chessplaybook.com');
  return ours && !NON_PRODUCTION_API_HOSTS.includes(host);
}
