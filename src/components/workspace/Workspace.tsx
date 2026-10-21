/**
 * THE WORKSPACE (LAYOUT_SPEC.md §3-§5 and §9, layout redesign C2).
 *
 * One layout for every board page: the board and its toolbar in the centre,
 * an activity lane and a context lane of cards beside them (stacked below on
 * a narrow or short window). All geometry is CSS (`workspace.css`) computed
 * from the layout tokens and the page region's size; nothing here measures.
 * (`onModeChange` READS which mode the container query chose; it computes
 * nothing, see `useWorkspaceMode`.)
 *
 * THE API IS DELIBERATELY NARROW (spec §9). No `className`, no `style`, no
 * sizes or variants: a page supplies content and declares each card's share
 * and type, and that is all. A lane accepts only `WorkspaceCard` elements, so
 * a page cannot wrap its cards in its own grid.
 */
import {
  Children, isValidElement, useContext, useId, useLayoutEffect, useRef,
  type CSSProperties, type ReactElement, type ReactNode, type RefObject,
} from 'react';
import { ChromeContext } from '@/app/chromeContext';
import { CARD_TYPES, cardUnits, type CardType, type CardTypeSpec } from './cardTypes';
import './workspace.css';

export interface WorkspaceCardProps {
  /** The card's share of its lane's stack. Default 1; ignored on a foot. */
  share?: 1 | 2 | 3;
  /** Declares the card's text rows and control reserve (`cardTypes.ts`). */
  type: CardType;
  /** The activity lane's one card that survives focus mode. */
  keepInFocus?: boolean;
  children: ReactNode;
}

export interface WorkspaceLane {
  /** The lane landmark's accessible name. */
  title: string;
  cards: ReactElement<WorkspaceCardProps>[];
  /** A card exactly the toolbar's height, ending the lane. */
  foot?: ReactElement<WorkspaceCardProps>;
  /**
   * A panel drawn OVER the lane's cards, leaving the foot visible. The cards
   * keep their size and state underneath and are inert while it is up, so
   * nothing in the grid moves when it opens or closes. It is the lane's second
   * scroll exception: its content has no bound, so it scrolls inside itself.
   */
  overlay?: { label: string; content: ReactNode } | null;
}

export interface WorkspaceProps {
  board: ReactNode;
  toolbar: ReactNode;
  activity?: WorkspaceLane;
  context?: WorkspaceLane;
  /**
   * Focus mode. Comes from the shell's chrome state (spec §9: never chosen by
   * a page); the default reads it, and the prop exists for tests.
   */
  focus?: boolean;
  /**
   * Told which mode CSS chose, on mount and whenever it changes. An OUTPUT,
   * never an input: the container query decides and this only reports it, so
   * JS cannot hold a second copy of the thresholds. Focus mode is columns-only
   * (owner, 2026-10-08), and a page cannot know the mode any other way.
   */
  onModeChange?: (mode: WorkspaceMode) => void;
}

/**
 * `columns` / `stacked` is the mode now. `focusHolds` is whether focus mode,
 * which makes the workspace taller by the nav, would still be columns: a page
 * offers focus only when both are true, or entering it would stack the page and
 * leave focus in the same moment.
 */
export interface WorkspaceMode {
  mode: 'columns' | 'stacked';
  focusHolds: boolean;
}

/*
  READ, NOT MEASURED. The columns query sets `--workspace-columns: 1` on the
  canvas and the base rule sets 0, and `--workspace-focus-slack` is a length CSS
  computes from the same container and the nav token; this reads the answers CSS
  already gave. It runs when the container's size changes, because that is the
  only thing either depends on.
*/
function useWorkspaceMode(
  viewportRef: RefObject<HTMLDivElement>,
  canvasRef: RefObject<HTMLDivElement>,
  onModeChange?: (mode: WorkspaceMode) => void,
) {
  const lastRef = useRef<string | null>(null);
  const callbackRef = useRef(onModeChange);
  callbackRef.current = onModeChange;
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas || !callbackRef.current) return;
    const report = () => {
      const style = getComputedStyle(canvas);
      const columns = style.getPropertyValue('--workspace-columns').trim() === '1';
      const slack = parseFloat(style.getPropertyValue('--workspace-focus-slack'));
      const next: WorkspaceMode = {
        mode: columns ? 'columns' : 'stacked',
        focusHolds: columns && Number.isFinite(slack) && slack >= 0,
      };
      const key = `${next.mode}/${next.focusHolds}`;
      if (key === lastRef.current) return;
      lastRef.current = key;
      callbackRef.current?.(next);
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [viewportRef, canvasRef]);
}

function cardStyle(type: CardType): CSSProperties {
  const t: CardTypeSpec = CARD_TYPES[type];
  return {
    ['--card-rows' as string]: t.rows,
    ['--card-reserve' as string]: t.reserve,
    ['--card-content' as string]: t.content,
    ['--card-controls' as string]: t.controls ? `calc(${t.controls})` : '0px',
    ['--card-units' as string]: cardUnits(t),
    ['--card-gaps' as string]: t.gaps,
    ...(t.lead ? { ['--card-lead' as string]: t.lead } : {}),
  };
}

/** The element a card renders its content in: the rhythm's declarations and, for a type with a lead, the marker that switches it on. */
function contentProps(type: CardType) {
  return {
    className: 'workspace-card-content',
    style: cardStyle(type),
    'data-card-lead': (CARD_TYPES[type] as CardTypeSpec).lead ? '' : undefined,
  };
}

/**
 * A card. Rendered by its lane from its props; rendered alone (a test, a
 * story) it draws the same box.
 */
export function WorkspaceCard({ share = 1, type, keepInFocus, children }: WorkspaceCardProps) {
  return (
    <div
      className="workspace-card surface-card rounded-lg"
      data-card-type={type}
      data-keep-in-focus={keepInFocus || undefined}
      style={{ ['--share' as string]: share }}
    >
      <div {...contentProps(type)}>{children}</div>
    </div>
  );
}

/**
 * The one scroll exception (spec §5, contract §9.1): a list whose length the
 * page cannot bound scrolls inside its fixed card. Nothing else in a lane may
 * scroll, and `verify-workspace-contract` checks exactly that.
 */
export function WorkspaceList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div data-workspace-list role={label ? 'region' : undefined} aria-label={label} tabIndex={label ? 0 : undefined}>
      {children}
    </div>
  );
}

function assertCard(el: unknown, where: string): asserts el is ReactElement<WorkspaceCardProps> {
  if (!isValidElement(el) || el.type !== WorkspaceCard) {
    throw new Error(`Workspace: ${where} accepts only <WorkspaceCard> elements (spec §9).`);
  }
}

function Lane({ role, lane, focus }: { role: 'activity' | 'context'; lane?: WorkspaceLane; focus: boolean }) {
  const id = useId();
  const hiddenLane = focus && role === 'context';

  // An absent lane still occupies its track, so the board stays centred (spec §9).
  if (!lane) {
    return <div className="workspace-lane" data-lane={role} aria-hidden="true" hidden={hiddenLane || undefined} />;
  }

  const cards = Children.toArray(lane.cards);
  cards.forEach((c) => assertCard(c, `the ${role} lane`));
  if (lane.foot) assertCard(lane.foot, `the ${role} lane's foot`);
  const keepers = (cards as ReactElement<WorkspaceCardProps>[]).filter((c) => c.props.keepInFocus);
  if (keepers.length > 1) {
    throw new Error(`Workspace: at most one card in a lane may set keepInFocus; the ${role} lane has ${keepers.length} (spec §9).`);
  }

  return (
    <section
      className="workspace-lane"
      data-lane={role}
      data-has-foot={lane.foot ? '' : undefined}
      aria-labelledby={id}
      hidden={hiddenLane || undefined}
    >
      <h2 id={id} className="sr-only">{lane.title}</h2>
      <div className="workspace-lane-stack">
        {(cards as ReactElement<WorkspaceCardProps>[]).map((c, i) => {
          const { share = 1, type, keepInFocus, children } = c.props;
          return (
            <div
              key={c.key ?? i}
              className="workspace-card surface-card rounded-lg"
              data-card-type={type}
              data-keep-in-focus={keepInFocus || undefined}
              style={{ ['--share' as string]: share }}
              hidden={(focus && !keepInFocus) || undefined}
              /* Under an overlay a card is covered, so it must not take focus
                 or be read out either. */
              {...(lane.overlay ? { inert: '' as unknown as boolean } : {})}
            >
              <div {...contentProps(type)}>{children}</div>
            </div>
          );
        })}
        {lane.overlay && (
          <div
            className="workspace-lane-overlay surface-card rounded-lg"
            role="region"
            aria-label={lane.overlay.label}
            data-workspace-overlay
          >
            {lane.overlay.content}
          </div>
        )}
      </div>
      {lane.foot && (
        <div className="workspace-foot surface-card rounded-lg" data-card-type={lane.foot.props.type}>
          <div {...contentProps(lane.foot.props.type)}>{lane.foot.props.children}</div>
        </div>
      )}
    </section>
  );
}

export function Workspace({ board, toolbar, activity, context, focus, onModeChange }: WorkspaceProps) {
  const chrome = useContext(ChromeContext);
  const isFocus = focus ?? chrome?.chromeHidden ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  useWorkspaceMode(viewportRef, canvasRef, onModeChange);

  /* DOM order is the reading order in both modes: centre, activity, context (spec §4). */
  return (
    <div className="workspace-viewport" ref={viewportRef}>
      <div className="workspace-canvas" ref={canvasRef} data-focus={isFocus || undefined}>
        <div className="workspace-centre">
          <div className="workspace-board">{board}</div>
          <div className="workspace-toolbar">{toolbar}</div>
        </div>
        <Lane role="activity" lane={activity} focus={isFocus} />
        <Lane role="context" lane={context} focus={isFocus} />
      </div>
    </div>
  );
}
