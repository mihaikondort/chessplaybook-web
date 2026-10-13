import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEGAL_LAST_UPDATED, formatLegalDate } from './legalDates';

describe('legal page dates', () => {
  // formatLegalDate pins timeZone 'UTC'. Without it a visitor in Los Angeles
  // would read "October 12" (checked by hand; Node on Windows ignores TZ, so a
  // TZ= run of this test cannot show it).
  it('formats the stored date', () => {
    expect(formatLegalDate('2026-10-13')).toBe('October 13, 2026');
  });

  it('are real ISO dates', () => {
    for (const d of Object.values(LEGAL_LAST_UPDATED)) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(d))).toBe(false);
    }
  });

  it("the sitemap's legal lastmod is not older than either page's date", () => {
    const src = readFileSync('scripts/generate-sitemap.cjs', 'utf8');
    const m = src.match(/legal:\s*'(\d{4}-\d{2}-\d{2})'/);
    expect(m, 'LASTMOD.legal not found in generate-sitemap.cjs').not.toBeNull();
    for (const d of Object.values(LEGAL_LAST_UPDATED)) {
      expect(m![1] >= d).toBe(true);
    }
  });
});
