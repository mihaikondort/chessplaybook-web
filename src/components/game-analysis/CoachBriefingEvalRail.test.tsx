import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CoachBriefingEvalRail } from './CoachBriefingEvalRail';
import { classifyVerdict } from './positionVerdictPresentation';

function renderRail(verdict: string) {
  const utils = render(
    <CoachBriefingEvalRail presentation={classifyVerdict(verdict)} verdictText={verdict} />,
  );
  return utils;
}

/** Height % of the black (top) region for a given verdict. */
function blackHeight(container: HTMLElement): string | undefined {
  const img = container.querySelector('[role="img"]');
  const rail = img?.querySelector('div'); // the w-[18px] rail
  const black = rail?.querySelector('div'); // first child = black region
  return (black as HTMLElement | undefined)?.style.height;
}

describe('CoachBriefingEvalRail — tier → fill', () => {
  it.each([
    ['Equal position', '50%'],
    ['White has a slight edge', '42%'],   // white share 58 → black 42
    ['Black has a slight edge', '58%'],
    ['White has a clear advantage', '34%'],
    ['Black has a clear advantage', '66%'],
    ['White has a decisive advantage', '26%'],
    ['Black has a decisive advantage', '74%'],
    ['White is winning', '18%'],
    ['Black is winning', '82%'],
    ['Mate in 3 for White', '8%'],        // white share 92 → black 8
    ['Mate in 5 for Black', '92%'],
  ])('%s → black region %s', (verdict, expected) => {
    const { container } = renderRail(verdict);
    expect(blackHeight(container)).toBe(expected);
  });
});

describe('CoachBriefingEvalRail — meaning cues', () => {
  it('uses the backend verdict string verbatim as its accessible name', () => {
    renderRail('Black has a clear advantage');
    expect(screen.getByRole('img', { name: 'Black has a clear advantage' })).toBeInTheDocument();
  });

  it('shows a crown on mate as a non-colour cue', () => {
    const { container } = renderRail('Mate in 2 for White');
    expect(container.querySelector('.lucide-crown')).toBeInTheDocument();
  });

  it('shows no crown when not mate', () => {
    const { container } = renderRail('White is winning');
    expect(container.querySelector('.lucide-crown')).not.toBeInTheDocument();
  });

  it('renders NO frontend-authored magnitude word (hard rule)', () => {
    const { container } = renderRail('Black is winning');
    const text = container.textContent ?? '';
    for (const word of ['SLIGHT', 'CLEAR', 'DECISIVE', 'WINNING', 'MATE', 'winning', 'Winning']) {
      expect(text).not.toContain(word);
    }
    // only the B / W endpoint letters are allowed
    expect(text.replace(/\s/g, '')).toBe('BW');
  });

  it('renders nothing for an unrecognised verdict', () => {
    const { container } = renderRail('a wild double-edged mess');
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
