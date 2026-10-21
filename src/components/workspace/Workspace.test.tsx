import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Workspace, WorkspaceCard } from './Workspace';

const board = <div data-testid="board" />;
const toolbar = <div data-testid="toolbar" />;
const card = (label: string, extra: Record<string, unknown> = {}) => (
  <WorkspaceCard key={label} type="text" {...extra}><span>{label}</span></WorkspaceCard>
);

describe('Workspace API (spec §9)', () => {
  it('allows at most one keepInFocus card in a lane', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(
      <Workspace board={board} toolbar={toolbar} focus={false}
        activity={{ title: 'A', cards: [card('a', { keepInFocus: true }), card('b', { keepInFocus: true })] }} />,
    )).toThrow(/at most one card/);
    spy.mockRestore();
  });

  it('accepts only WorkspaceCard elements in a lane, so a page cannot wrap its cards', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(
      <Workspace board={board} toolbar={toolbar} focus={false}
        activity={{ title: 'A', cards: [<div key="x">not a card</div> as never] }} />,
    )).toThrow(/accepts only <WorkspaceCard>/);
    spy.mockRestore();
  });

  it('keeps DOM order centre, activity, context, with each lane a labelled landmark', () => {
    const { container } = render(
      <Workspace board={board} toolbar={toolbar} focus={false}
        activity={{ title: 'Activity', cards: [card('a')] }} context={{ title: 'Context', cards: [card('c')] }} />,
    );
    const order = [...container.querySelector('.workspace-canvas')!.children].map((e) =>
      e.classList.contains('workspace-centre') ? 'centre' : e.getAttribute('data-lane'));
    expect(order).toEqual(['centre', 'activity', 'context']);
    for (const lane of container.querySelectorAll('section.workspace-lane')) {
      const id = lane.getAttribute('aria-labelledby')!;
      expect(container.querySelector(`[id="${id}"]`)?.textContent).toBeTruthy();
    }
  });

  it('in focus mode hides the context lane and every activity card but the keepInFocus one', () => {
    const { container } = render(
      <Workspace board={board} toolbar={toolbar} focus
        activity={{ title: 'A', cards: [card('a1'), card('a2', { keepInFocus: true }), card('a3')], foot: <WorkspaceCard type="foot">foot</WorkspaceCard> }}
        context={{ title: 'C', cards: [card('c1')] }} />,
    );
    expect(container.querySelector('[data-lane="context"]')!.hasAttribute('hidden')).toBe(true);
    const visible = [...container.querySelectorAll('[data-lane="activity"] .workspace-card')]
      .filter((c) => !c.hasAttribute('hidden')).map((c) => c.textContent);
    expect(visible).toEqual(['a2']);
    expect(container.querySelector('[data-lane="activity"] .workspace-foot')).not.toBeNull();
  });

  it('keeps an absent lane as an empty track, so the board stays centred', () => {
    const { container } = render(<Workspace board={board} toolbar={toolbar} focus={false} activity={{ title: 'A', cards: [card('a')] }} />);
    expect(container.querySelector('[data-lane="context"]')).not.toBeNull();
  });

  it('draws an overlay over the lane cards without removing them, and makes them inert', () => {
    const lane = (overlay: { label: string; content: JSX.Element } | null) => (
      <Workspace board={board} toolbar={toolbar} focus={false}
        activity={{ title: 'A', cards: [card('a'), card('b')], foot: card('foot'), overlay }} />
    );
    const { container, rerender } = render(lane(null));
    const activity = container.querySelector('[data-lane="activity"]')!;
    expect(activity.querySelector('[data-workspace-overlay]')).toBeNull();
    expect(activity.querySelectorAll('.workspace-card[inert]')).toHaveLength(0);

    rerender(lane({ label: 'Explanation', content: <p>why</p> }));
    const overlay = activity.querySelector('[data-workspace-overlay]')!;
    expect(overlay.getAttribute('aria-label')).toBe('Explanation');
    expect(overlay.parentElement?.classList.contains('workspace-lane-stack')).toBe(true);
    expect(activity.querySelectorAll('.workspace-lane-stack > .workspace-card')).toHaveLength(2);
    expect(activity.querySelectorAll('.workspace-lane-stack > .workspace-card[inert]')).toHaveLength(2);
    // The foot is outside the stack, so it stays uncovered and usable.
    expect(activity.querySelector('.workspace-foot[inert]')).toBeNull();
  });
});
