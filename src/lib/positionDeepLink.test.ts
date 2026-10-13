import { describe, expect, it } from 'vitest';

import { buildPositionHref, readPositionDeepLink } from './positionDeepLink';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/8/1P3N2/PBPPPPPP/RN1QKB1R w KQkq - 2 3';

describe('position deep links', () => {
  it('round-trips a puzzle FEN and displayed orientation', () => {
    const href = buildPositionHref('/analysis', FEN, 'black');
    expect(readPositionDeepLink(new URL(href, 'https://chessplaybook.com').search)).toEqual({
      value: { fen: FEN, orientation: 'black', source: 'puzzle' },
      error: null,
    });
  });

  it('accepts underscore-separated FENs', () => {
    const result = readPositionDeepLink(`?fen=${encodeURIComponent(FEN.replace(/ /g, '_'))}`);
    expect(result.value?.fen).toBe(FEN);
  });

  it('rejects invalid positions without returning a board value', () => {
    const result = readPositionDeepLink('?fen=not-a-position');
    expect(result.value).toBeNull();
    expect(result.error).toContain('invalid');
  });
});
