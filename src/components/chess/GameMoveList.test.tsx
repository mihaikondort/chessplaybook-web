import { render, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameMoveList } from './GameMoveList';

const MOVES = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];

describe('GameMoveList', () => {
  it('marks the current move and says it in a polite live region', () => {
    const { container } = render(<GameMoveList moves={MOVES} currentMoveIndex={2} onMoveClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Nf3' })).toHaveAttribute('aria-current', 'step');
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe('Move 2, white, knight F 3');
  });

  it('says the starting position before the first move', () => {
    const { container } = render(<GameMoveList moves={MOVES} currentMoveIndex={-1} onMoveClick={() => {}} />);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Starting position');
    expect(screen.queryByRole('button', { current: 'step' })).toBeNull();
  });

  it('goes to a clicked move', () => {
    const onMoveClick = vi.fn();
    render(<GameMoveList moves={MOVES} currentMoveIndex={4} onMoveClick={onMoveClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'e5' }));
    expect(onMoveClick).toHaveBeenCalledWith(1);
  });

  it('has one tab stop, on the current move', () => {
    render(<GameMoveList moves={MOVES} currentMoveIndex={3} onMoveClick={() => {}} />);
    const stops = screen.getAllByRole('button').filter(b => b.tabIndex === 0);
    expect(stops.map(b => b.textContent)).toEqual(['Nc6']);
  });

  it('steps with the keys: Left/Right one move, Up/Down a full move, Home/End the ends', () => {
    const onMoveClick = vi.fn();
    render(<GameMoveList moves={MOVES} currentMoveIndex={2} onMoveClick={onMoveClick} />);
    const current = screen.getByRole('button', { name: 'Nf3' });
    for (const [key, to] of [['ArrowLeft', 1], ['ArrowRight', 3], ['ArrowUp', 0], ['ArrowDown', 4], ['Home', -1], ['End', 4]] as const) {
      fireEvent.keyDown(current, { key });
      expect(onMoveClick).toHaveBeenLastCalledWith(to);
    }
  });

  it('keeps one key press one step when the page also listens on the window', () => {
    const onWindow = vi.fn();
    window.addEventListener('keydown', onWindow);
    render(<GameMoveList moves={MOVES} currentMoveIndex={2} onMoveClick={() => {}} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Nf3' }), { key: 'ArrowLeft' });
    window.removeEventListener('keydown', onWindow);
    expect(onWindow).not.toHaveBeenCalled();
  });

  it('does not step past either end', () => {
    const onMoveClick = vi.fn();
    render(<GameMoveList moves={MOVES} currentMoveIndex={4} onMoveClick={onMoveClick} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Bb5' }), { key: 'ArrowRight' });
    expect(onMoveClick).not.toHaveBeenCalled();
  });

  it('shows text, not controls, when the reader may not step', () => {
    render(<GameMoveList moves={MOVES} currentMoveIndex={4} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Bb5')).toHaveAttribute('aria-current', 'step');
  });

  it('keeps the list\'s children to its rows, so the live region sits beside it', () => {
    const { container } = render(<GameMoveList moves={MOVES} onMoveClick={() => {}} />);
    expect(container.querySelector('.font-mono')?.children).toHaveLength(3);
  });

  it('numbers a game from a FEN from its own move, Black first (E6)', () => {
    const { container } = render(
      <GameMoveList moves={['Kd7', 'e4', 'Ke6']} startFen="4k3/8/8/8/8/8/4P3/4K3 b - - 0 40" currentMoveIndex={0} onMoveClick={() => {}} />,
    );
    const rows = [...container.querySelectorAll('.font-mono > div')].map(r => r.textContent?.replace(/\s+/g, ' '));
    expect(rows).toEqual(['40....Kd7', '41.e4Ke6']);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe('Move 40, black, king D 7');
  });
});
