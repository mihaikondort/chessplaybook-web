import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('@/config/env', () => ({ default: { apiBaseUrl: '' } }));
import { isFullPriceCountry, REDUCED_CURRENCIES } from './paddleCheckout';

const root = path.resolve(__dirname, '../../..');
const table = JSON.parse(readFileSync(path.join(root, 'scripts/paddle/local-prices.json'), 'utf8')).prices as
  Record<string, { currency: string; countries: string[]; yearly?: unknown; reduced?: unknown }>;

describe('the page agrees with the price table (owner, 2026-11-13)', () => {
  it('knows every reduced-only currency, so its fallback never offers monthly there', () => {
    const reducedOnly = new Set<string>();
    const fullToo = new Set<string>();
    for (const group of Object.values(table)) (group.yearly ? fullToo : reducedOnly).add(group.currency);
    for (const currency of fullToo) reducedOnly.delete(currency);
    expect([...REDUCED_CURRENCIES].sort()).toEqual([...reducedOnly].sort());
  });

  it('offers monthly exactly in the countries the table gives a full price', () => {
    for (const group of Object.values(table)) {
      for (const country of group.countries) expect(isFullPriceCountry(country), country).toBe(Boolean(group.yearly));
    }
    expect(isFullPriceCountry('us')).toBe(true);
    expect(isFullPriceCountry('RU')).toBe(false);
    expect(isFullPriceCountry(undefined)).toBe(false);
  });
});
