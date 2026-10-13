import { render, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBoardStepInput, type BoardStepInputOptions } from './useBoardStepInput';

function Harness(props: BoardStepInputOptions) {
  const attach = useBoardStepInput(props);
  return (
    <div>
      <div data-testid="board" ref={attach} />
      <input data-testid="text" />
      <textarea data-testid="area" />
    </div>
  );
}

function setup(overrides: Partial<BoardStepInputOptions> = {}) {
  const onBack = vi.fn();
  const onForward = vi.fn();
  const view = render(<Harness enabled onBack={onBack} onForward={onForward} {...overrides} />);
  return { ...view, onBack, onForward };
}

const wheel = (el: Element, deltaY: number) => {
  const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
};

afterEach(() => vi.restoreAllMocks());

describe('useBoardStepInput', () => {
  it('steps on the arrow keys', () => {
    const { onBack, onForward } = setup();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onForward).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('leaves the keys to a text field (D28, and /play-online until Eg)', () => {
    const { getByTestId, onBack, onForward } = setup();
    fireEvent.keyDown(getByTestId('text'), { key: 'ArrowLeft' });
    fireEvent.keyDown(getByTestId('area'), { key: 'ArrowRight' });
    expect(onBack).not.toHaveBeenCalled();
    expect(onForward).not.toHaveBeenCalled();
  });

  it('leaves a key with a modifier to the browser', () => {
    const { onBack } = setup();
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true });
    fireEvent.keyDown(window, { key: 'ArrowLeft', ctrlKey: true });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('listens to no key when keys is false (/puzzles has the wheel only)', () => {
    const { onBack } = setup({ keys: false });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('steps once per wheel notch, not per tiny delta, and never scrolls the page under the board', () => {
    const { getByTestId, onBack, onForward } = setup();
    const board = getByTestId('board');
    const small = wheel(board, 2);
    expect(onForward).not.toHaveBeenCalled();
    expect(small.defaultPrevented).toBe(true);
    wheel(board, 3); // 2 + 3 crosses the threshold of 4
    expect(onForward).toHaveBeenCalledTimes(1);
    wheel(board, -100);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled, so the page scrolls as usual', () => {
    const { getByTestId, onBack } = setup({ enabled: false });
    const event = wheel(getByTestId('board'), -100);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onBack).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('calls the latest steps without rebinding', () => {
    const first = vi.fn();
    const second = vi.fn();
    const forward = vi.fn();
    const { rerender } = render(<Harness enabled onBack={first} onForward={forward} />);
    rerender(<Harness enabled onBack={second} onForward={forward} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
