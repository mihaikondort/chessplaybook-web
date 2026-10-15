/**
 * When each legal page's WORDING last changed (#48).
 *
 * The pages used to print `new Date()`, so "Last Updated" always read today:
 * false every day the text had not changed, on a page whose own copy tells
 * visitors to watch that date for changes. BUMP THE DATE IN THE COMMIT THAT
 * CHANGES THE PAGE'S TEXT, and only then. A styling change is not an update.
 *
 * The sitemap's `LASTMOD.legal` (scripts/generate-sitemap.cjs) covers these
 * pages too; legalDates.test.ts fails if it falls behind either date here.
 */
export const LEGAL_LAST_UPDATED = {
  privacy: '2026-10-15',
  terms: '2026-10-13',
} as const;

/**
 * "October 13, 2026". Formatted in UTC: a date-only string is UTC midnight, so
 * formatting it in a timezone west of UTC would print the day before.
 */
export function formatLegalDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
