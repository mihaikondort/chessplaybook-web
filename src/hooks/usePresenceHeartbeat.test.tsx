import { render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePresenceHeartbeat } from './usePresenceHeartbeat';
import { sendPresenceHeartbeat } from '@/services/presence';

vi.mock('@/services/presence', async importOriginal => {
  const original = await importOriginal<typeof import('@/services/presence')>();
  return { ...original, sendPresenceHeartbeat: vi.fn().mockResolvedValue(undefined) };
});

function Harness({ exposeNavigate }: { exposeNavigate?: (navigate: ReturnType<typeof useNavigate>) => void }) {
  const navigate = useNavigate();
  exposeNavigate?.(navigate);
  usePresenceHeartbeat();
  return null;
}

describe('usePresenceHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(sendPresenceHeartbeat).mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  afterEach(() => vi.useRealTimers());

  it('sends immediately, on route-group changes, and every 30 visible seconds', () => {
    let navigate: ReturnType<typeof useNavigate> | undefined;
    const view = render(
      <MemoryRouter initialEntries={['/']}>
        <Harness exposeNavigate={value => { navigate = value; }} />
      </MemoryRouter>,
    );
    expect(sendPresenceHeartbeat).toHaveBeenCalledWith('home');

    act(() => navigate?.('/puzzles/123?gclid=private'));
    expect(sendPresenceHeartbeat).toHaveBeenLastCalledWith('puzzles');
    act(() => vi.advanceTimersByTime(30_000));
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(3);

    view.unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('pauses while hidden and sends immediately when visible again', () => {
    render(<MemoryRouter><Harness /></MemoryRouter>);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => vi.advanceTimersByTime(30_000));
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(2);
  });

  // Active time is credited retroactively, so without a send on the way out the
  // final interval of every visit is lost and any visit shorter than one 30s tick
  // records zero seconds while still counting as a visitor.
  describe('trailing heartbeat', () => {
    it('credits the final interval when the page is hidden', () => {
      render(<MemoryRouter><Harness /></MemoryRouter>);
      expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);

      act(() => vi.advanceTimersByTime(20_000));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(2);
    });

    it('credits the final interval when the page is unloaded', () => {
      render(<MemoryRouter><Harness /></MemoryRouter>);
      act(() => vi.advanceTimersByTime(25_000));
      act(() => window.dispatchEvent(new Event('pagehide')));

      // A 25s visit used to report zero seconds: the first tick had not fired yet.
      expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(2);
    });

    it('does not fire on rapid tab switching', () => {
      render(<MemoryRouter><Harness /></MemoryRouter>);
      act(() => vi.advanceTimersByTime(500));

      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      act(() => document.dispatchEvent(new Event('visibilitychange')));

      // Under 2s there is nothing worth crediting, and a visitor flicking between
      // tabs would otherwise fire two requests per switch.
      expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);
    });

    it('stops sending after unmount', () => {
      const view = render(<MemoryRouter><Harness /></MemoryRouter>);
      act(() => vi.advanceTimersByTime(25_000));
      view.unmount();
      act(() => window.dispatchEvent(new Event('pagehide')));

      expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * A prerendered page is not a visit (2026-08-08).
 *
 * Chrome's Speculation Rules API renders a page before anyone clicks. If the
 * speculation is discarded nobody ever saw it — and because the prerendered
 * document reports visibilityState 'visible', the existing visibility guard does
 * NOT catch it. That phantom looks exactly like the owner's report: "somebody
 * searches for chess puzzle on google, clicks, stays a few seconds and closes".
 */
describe('usePresenceHeartbeat — prerendering', () => {
  const setPrerendering = (value: boolean) =>
    Object.defineProperty(document, 'prerendering', { configurable: true, value });

  // A top-level describe inherits nothing from the block above it.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(sendPresenceHeartbeat).mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  afterEach(() => {
    vi.useRealTimers();
    // @ts-expect-error — removing the test-only property
    delete document.prerendering;
  });

  it('sends nothing while the page is only a speculation', () => {
    setPrerendering(true);
    render(<MemoryRouter><Harness /></MemoryRouter>);

    expect(sendPresenceHeartbeat).not.toHaveBeenCalled();
    // Not even on the interval: a discarded prerender must cost nothing.
    act(() => vi.advanceTimersByTime(120_000));
    expect(sendPresenceHeartbeat).not.toHaveBeenCalled();
  });

  it('counts the visit the moment the prerender is activated', () => {
    setPrerendering(true);
    render(<MemoryRouter><Harness /></MemoryRouter>);
    expect(sendPresenceHeartbeat).not.toHaveBeenCalled();

    // The user clicks through: the flag clears and `prerenderingchange` fires.
    setPrerendering(false);
    act(() => document.dispatchEvent(new Event('prerenderingchange')));

    // Immediately, not up to 30 seconds later on the next tick.
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('is unaffected on a normal load', () => {
    setPrerendering(false);
    render(<MemoryRouter><Harness /></MemoryRouter>);
    expect(sendPresenceHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('does not credit a trailing heartbeat for a page nobody saw', () => {
    setPrerendering(true);
    render(<MemoryRouter><Harness /></MemoryRouter>);
    act(() => vi.advanceTimersByTime(25_000));
    act(() => window.dispatchEvent(new Event('pagehide')));

    expect(sendPresenceHeartbeat).not.toHaveBeenCalled();
  });
});
