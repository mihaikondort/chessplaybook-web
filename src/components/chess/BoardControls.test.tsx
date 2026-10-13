import { render, fireEvent, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardControls } from './BoardControls';

describe('BoardControls hold-to-repeat (the Lichess viewer\'s timing)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const back = () => screen.getByRole('button', { name: 'Previous move' });

  it('steps once for a press and its click', () => {
    const onBack = vi.fn();
    render(<BoardControls onBack={onBack} onForward={() => {}} />);
    fireEvent.pointerDown(back(), { button: 0 });
    fireEvent.pointerUp(document);
    fireEvent.click(back(), { detail: 1 });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('still steps on Enter or Space (a click with no pointer)', () => {
    const onBack = vi.fn();
    render(<BoardControls onBack={onBack} onForward={() => {}} />);
    fireEvent.click(back(), { detail: 0 });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('repeats after 500ms while held, faster each time, and stops on release', () => {
    const onBack = vi.fn();
    render(<BoardControls onBack={onBack} onForward={() => {}} />);
    fireEvent.pointerDown(back(), { button: 0 });
    expect(onBack).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(499); });
    expect(onBack).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(1); });
    expect(onBack).toHaveBeenCalledTimes(2);
    act(() => { vi.advanceTimersByTime(350); });
    expect(onBack).toHaveBeenCalledTimes(3);
    act(() => { vi.advanceTimersByTime(327); }); // 350 - 350/15 = 326.67
    expect(onBack).toHaveBeenCalledTimes(4);
    fireEvent.pointerUp(document);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(onBack).toHaveBeenCalledTimes(4);
  });

  it('calls the handler of the latest render, not the one held at the press', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<BoardControls onBack={first} onForward={() => {}} />);
    fireEvent.pointerDown(back(), { button: 0 });
    rerender(<BoardControls onBack={second} onForward={() => {}} />);
    act(() => { vi.advanceTimersByTime(500); });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    fireEvent.pointerUp(document);
  });

  it('ignores a right-button press', () => {
    const onBack = vi.fn();
    render(<BoardControls onBack={onBack} onForward={() => {}} />);
    fireEvent.pointerDown(back(), { button: 2 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onBack).not.toHaveBeenCalled();
  });
});
