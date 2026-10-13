import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PositionExplanationCard } from './PositionExplanationCard';
import type { StructuredExplanation } from '@/types/positionExplanation';

const STRUCTURED: StructuredExplanation = {
  verdict: { eval: 'Black is winning', opening: 'Sicilian Defence', eco: 'B33', phase: 'middlegame' },
  action: 'Play Rxc3 — an exchange sacrifice for lasting pressure.',
  sections: {
    threats_and_tactics: {
      summary: '',
      items: [
        { text: 'Rxc3 wins material by force', side: 'black', priority: 70 },
        { text: 'avoid Bxf6 — it repairs White’s structure', side: 'black', priority: 60, tag: 'warning' },
      ],
    },
    king_safety: { summary: '', items: [{ text: 'White’s king shelter is cracked', side: 'white', priority: 60 }] },
    material: { summary: '', items: [] },               // major, empty → placeholder when open
    pieces: { summary: '', items: [{ text: 'the b7 bishop rakes the long diagonal', side: 'black', priority: 55 }] },
    pawn_structure: { summary: '', items: [] },          // major, empty → placeholder when open
    // plan omitted → minor, hidden
  },
};

describe('PositionExplanationCard — populated (desktop, all populated sections open)', () => {
  it('renders the backend verdict, action, and section text verbatim', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Black is winning');
    expect(screen.getByText(/exchange sacrifice for lasting pressure/)).toBeInTheDocument();
    expect(screen.getByText(/Rxc3 wins material by force/)).toBeInTheDocument();
    expect(screen.getByText(/rakes the long diagonal/)).toBeInTheDocument();
    // opening + eco + phase metadata
    expect(screen.getByText(/Sicilian Defence/)).toBeInTheDocument();
    expect(screen.getByText(/B33/)).toBeInTheDocument();
  });

  it('uses the "What matters now" action sheet and "N notes" counts', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getByText('What matters now')).toBeInTheDocument();
    expect(screen.getByText('2 notes')).toBeInTheDocument();   // threats has 2 items
    expect(screen.getAllByText('1 note').length).toBeGreaterThan(0); // king safety / pieces have 1
  });

  it('gives the eval indicator an accessible name equal to the backend verdict string', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getByRole('img', { name: 'Black is winning' })).toBeInTheDocument();
  });

  it('renders no eval indicator for an unrecognised verdict (neutral fallback)', () => {
    render(<PositionExplanationCard structured={{ ...STRUCTURED, verdict: { ...STRUCTURED.verdict, eval: 'Total chaos' } }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Total chaos');
  });

  it('keeps empty major sections collapsed on desktop, and hides a minor section', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    // Material + Pawn Structure are major + empty → rendered but collapsed
    // (their "nothing notable" content stays unmounted until expanded).
    expect(screen.queryByText('Nothing notable here.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Material/i })).toHaveAttribute('data-state', 'closed');
    // Expanding an empty major reveals the neutral placeholder.
    fireEvent.click(screen.getByRole('button', { name: /Material/i }));
    expect(screen.getByText('Nothing notable here.')).toBeInTheDocument();
    // Plan is minor + absent → not rendered at all
    expect(screen.queryByText('Plan')).not.toBeInTheDocument();
  });

  it('labels item side markers accessibly (non-colour)', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getAllByLabelText('Black').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('White').length).toBeGreaterThan(0);
  });

  it('renders warning items as a caution panel, not a bare bar', () => {
    render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getByText('Watch out')).toBeInTheDocument();
    expect(screen.getByText(/it repairs White’s structure/)).toBeInTheDocument();
  });
});

describe('PositionExplanationCard — disclosure', () => {
  it('opens all populated sections on desktop, Threats only on mobile', () => {
    // Desktop: Threats + King Safety (1 item) open; Material (empty) stays closed.
    const { unmount } = render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.getByRole('button', { name: /Threats & Tactics/i })).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: /King Safety/i })).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: /Material/i })).toHaveAttribute('data-state', 'closed');
    unmount();
    // Mobile: only Threats open.
    render(<PositionExplanationCard structured={STRUCTURED} isMobile />);
    expect(screen.getByRole('button', { name: /Threats & Tactics/i })).toHaveAttribute('data-state', 'open');
    expect(screen.getByRole('button', { name: /King Safety/i })).toHaveAttribute('data-state', 'closed');
  });

  it('collapses non-threat sections on mobile and expands on click', () => {
    render(<PositionExplanationCard structured={STRUCTURED} isMobile />);
    const trigger = screen.getByRole('button', { name: /King Safety/i });
    expect(trigger).toHaveAttribute('data-state', 'closed');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('data-state', 'open');
  });
});

describe('PositionExplanationCard — loading', () => {
  it('shows the warmup copy before a depth is reported', () => {
    render(<PositionExplanationCard structured={null} loading loadingDepth={0} />);
    expect(screen.getByText('Analysing the position…')).toBeInTheDocument();
  });

  it('shows the live depth once searching', () => {
    render(<PositionExplanationCard structured={null} loading loadingDepth={22} />);
    expect(screen.getByText('Stockfish is analysing the position')).toBeInTheDocument();
    expect(screen.getByText(/depth 22/)).toBeInTheDocument();
  });
});

describe('PositionExplanationCard — error / missing', () => {
  it('renders a recoverable error with an alert role', () => {
    render(<PositionExplanationCard structured={null} error="Engine isn’t ready yet." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Engine isn’t ready yet.');
  });

  it('renders a calm message when structured data is missing', () => {
    render(<PositionExplanationCard structured={null} />);
    expect(screen.getByText(/didn’t come through/)).toBeInTheDocument();
  });

  it('shows the Back control only when onBackToStats is provided', () => {
    const onBack = vi.fn();
    const { rerender } = render(<PositionExplanationCard structured={STRUCTURED} />);
    expect(screen.queryByRole('button', { name: /Back/i })).not.toBeInTheDocument();
    rerender(<PositionExplanationCard structured={STRUCTURED} onBackToStats={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
