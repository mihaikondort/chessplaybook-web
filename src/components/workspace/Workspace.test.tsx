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
});
