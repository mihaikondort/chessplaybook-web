import { describe, it, expect } from 'vitest';
import { resolveLinkedFilters, linkedRunSelection } from './linkedFilters';

const q = (s: string) => new URLSearchParams(s);

describe('resolveLinkedFilters', () => {
  it('a linked theme beats the remembered one', () => {
    // The defect this exists to prevent: the progress page says "your back-rank
    // mates are weak — train them", and the trainer opens on whatever filter
    // the player last used, making the link decorative.
    expect(resolveLinkedFilters(q('theme=backRankMate'), 'fork').theme).toBe('backRankMate');
  });

  it('the remembered theme stands when no link chose one', () => {
    expect(resolveLinkedFilters(q(''), 'fork').theme).toBe('fork');
    expect(resolveLinkedFilters(q('area=endgame'), 'fork').theme).toBe('fork');
  });

  it('an area comes only from a link', () => {
    expect(resolveLinkedFilters(q('area=endgame'), '').area).toBe('endgame');
    expect(resolveLinkedFilters(q(''), 'fork').area).toBe('');
  });

  it('every area the progress page can link to is accepted', () => {
    for (const area of ['tactics', 'middlegame', 'endgame']) {
      expect(resolveLinkedFilters(q(`area=${area}`), '').area).toBe(area);
    }
  });

  it('an unrecognised area is dropped, not forwarded', () => {
    // The server refuses it anyway; sending it would turn a stale link into a
    // failed request instead of an ordinary puzzle.
    expect(resolveLinkedFilters(q('area=opening'), '').area).toBe('');
    expect(resolveLinkedFilters(q('area=; DROP TABLE'), '').area).toBe('');
  });

  it('an empty link parameter is not a filter', () => {
    expect(resolveLinkedFilters(q('theme=&area='), 'fork').theme).toBe('fork');
    expect(resolveLinkedFilters(q('theme=&area='), 'fork').area).toBe('');
  });
});

describe('linkedRunSelection (#108)', () => {
  it('only ?run=missed picks a mode, and it picks Missed before', () => {
    expect(linkedRunSelection(q('run=missed'))).toBe('failed_review');
    expect(linkedRunSelection(q('run=weak_areas'))).toBeNull();
    expect(linkedRunSelection(q(''))).toBeNull();
  });
});
