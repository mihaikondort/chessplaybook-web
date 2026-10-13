import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('from 768px up: one open card, the three points side by side', () => {
    render(<HowItWorks />);
    const card = screen.getByTestId('how-it-works');
    expect(card).toHaveClass('surface-card', 'rounded-lg', 'p-2.5', 'hidden', 'md:block');
    const title = within(card).getByText('How it works');
    expect(title).toHaveClass('uppercase', 'tracking-wide', 'text-muted-foreground');
    expect(card.querySelector('ol')).toHaveClass('grid', 'grid-cols-3');
    for (const lead of ['This is not a puzzle.', 'Every legal move is scored', 'You get the reasoning']) {
      expect(within(card).getByText(lead)).toBeInTheDocument();
    }
  });

  it('below 768px: one collapsed row that opens on a tap, points stacked', () => {
    render(<HowItWorks />);
    const compact = screen.getByTestId('how-it-works-compact');
    expect(compact.tagName).toBe('DETAILS');
    expect(compact).toHaveClass('surface-card', 'md:hidden');
    expect(compact).not.toHaveAttribute('open');
    fireEvent.click(within(compact).getByText('How it works'));
    expect(compact).toHaveAttribute('open');
    expect(compact.querySelector('ol')).not.toHaveClass('grid-cols-3');
    expect(within(compact).getByText('You get the reasoning')).toBeInTheDocument();
  });

  it('uses no em dashes in its copy (owner rule for all UI copy)', () => {
    const { container } = render(<HowItWorks />);
    expect(container.textContent).not.toContain('—');
  });

  it('keeps the copy joined exactly: lead, then the rest of the sentence', () => {
    render(<HowItWorks />);
    const items = [...screen.getByTestId('how-it-works').querySelectorAll('li p')].map((p) => p.textContent);
    expect(items[0]).toMatch(/^This is not a puzzle. There is usually/);
    expect(items[1]).toMatch(/^Every legal move is scored, not just the champion's./);
    expect(items[2]).toMatch(/^You get the reasoning for the position after each move/);
  });
});
