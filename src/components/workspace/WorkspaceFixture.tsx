/**
 * THE WORKSPACE FIXTURE (layout redesign C2). DEV-only: the route is gated
 * behind `import.meta.env.DEV` in `app/routes.tsx` and tree-shaken from
 * production.
 *
 * The real `Workspace` API with the real board pair (`ChessBoard` and
 * `BoardControls`), in every configuration the contract guard needs:
 *
 *   ?cards=1|3|6   cards per lane (outer geometry must not change)
 *   ?foot=1        both lanes end in a foot
 *   ?list=1        the activity lane's first card holds a long move list
 *   ?long=1        the longest strings, to check nothing is clipped
 *   ?shares=1      shares 3, 2, 1 instead of all equal
 *   ?puzzles=1     the real `/puzzles` card components in C5b's lanes and shares
 *                  (`PuzzlesWorkspaceFixture`), for the card rhythm (C5a)
 *   ?play=1        the board takes moves (d2-d3/d4, f1-c4/b5, and Black d7-d6/d5), records
 *                  them in `[data-fixture-moves]`, and the first context card
 *                  cycles the board theme (C4, the drop test)
 *
 * Focus mode is the shell's: the context lane's toggle sets it, Esc and a
 * fixed control leave it.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { useSearchParams } from 'react-router-dom';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { useChrome } from '@/app/SiteShell';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { Workspace, WorkspaceCard, WorkspaceList } from './Workspace';
import { GameMoveList } from '@/components/chess/GameMoveList';

/* 120 plies, so the list overflows any card the matrix gives it. */
const FIXTURE_MOVES = Array.from({ length: 120 }, (_, i) => (i % 2 ? 'Nf6' : 'Nf3'));
import { puzzlesFixtureLanes } from '@/features/puzzles/components/PuzzlesWorkspaceFixture';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const PLAY_DESTS = new Map<Key, Key[]>([['d2', ['d3', 'd4']], ['f1', ['e2', 'd3', 'c4', 'b5', 'a6']], ['d7', ['d6', 'd5']]]);
const THEMES = ['blue', 'classic-brown', 'green'];
const LONG = 'Find the best move for White: the knight on f5 eyes d6 and h6, and the queen is overloaded';

export default function WorkspaceFixture() {
  const [params] = useSearchParams();
  const n = Number(params.get('cards') ?? 3);
  const foot = params.get('foot') === '1';
  const list = params.get('list') === '1';
  const long = params.get('long') === '1';
  const shares = params.get('shares') === '1';
  const play = params.get('play') === '1';
  const { setChromeHidden, chromeHidden } = useChrome();
  const { currentTheme, changeTheme } = useBoardTheme();
  const [themeIdx, setThemeIdx] = useState(0);
  const [moves, setMoves] = useState<string[]>([]);
  // Chessground clears its destinations after every move; a new map re-arms them.
  const dests = useMemo(() => new Map(PLAY_DESTS), [moves.length]);

  useEffect(() => {
    if (!chromeHidden) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChromeHidden(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chromeHidden, setChromeHidden]);
  useEffect(() => () => setChromeHidden(false), [setChromeHidden]);

  const leaveFocus = chromeHidden && (
    <button
      type="button"
      onClick={() => setChromeHidden(false)}
      className="surface-card fixed right-4 top-4 z-50 rounded-lg px-3 py-2 text-sm"
    >
      Leave focus mode <kbd>Esc</kbd>
    </button>
  );

  if (params.get('puzzles') === '1') {
    return (
      <>
        {leaveFocus}
        <Workspace
          board={<ChessBoard fen={FEN} viewOnly themeId={currentTheme.id} />}
          /* Five buttons, as /puzzles has: its reset button is what widened the
             centre past the board at 844x390 (C5b). */
          toolbar={<BoardControls onStart={() => {}} onBack={() => {}} onForward={() => {}} onFlip={() => {}} onReset={() => {}} />}
          focus={chromeHidden}
          {...puzzlesFixtureLanes({
            themeId: currentTheme.id,
            onThemeChange: changeTheme,
            focusMode: chromeHidden,
            onToggleFocusMode: () => setChromeHidden(!chromeHidden),
            fen: FEN,
          })}
        />
      </>
    );
  }

  const share = (i: number): 1 | 2 | 3 => (shares ? (([3, 2, 1] as const)[i % 3]) : 1);
  const text = (label: string) => (long ? `${label}: ${LONG}` : label);

  const activityCards = Array.from({ length: n }, (_, i) =>
    i === 0 && list ? (
      <WorkspaceCard key="list" type="list" share={share(i)} keepInFocus>
        <WorkspaceList label="Moves">
          {/* The real move list (Dg): no scroller of its own, following the current
              move inside the `WorkspaceList`, as a Workspace page will use it. */}
          <GameMoveList moves={FIXTURE_MOVES} scrolls={false} />
        </WorkspaceList>
      </WorkspaceCard>
    ) : (
      <WorkspaceCard key={`a${i}`} type="text" share={share(i)} keepInFocus={i === 0 && !list}>
        <p data-fixture-card={`activity-${i}`}>{text(`Activity card ${i + 1}`)}</p>
      </WorkspaceCard>
    ),
  );
  const contextCards = Array.from({ length: n }, (_, i) =>
    i === 0 ? (
      <WorkspaceCard key="toggle" type="actions" share={share(i)}>
        <p>{text('Context card 1')}</p>
        <button type="button" className="mt-2 rounded border border-border px-2 py-1 text-sm" onClick={() => setChromeHidden(true)}>
          Focus mode
        </button>
        {play && (
          <>
            <button type="button" className="ml-2 mt-2 rounded border border-border px-2 py-1 text-sm" onClick={() => setThemeIdx((i) => (i + 1) % THEMES.length)}>
              Board theme
            </button>
            <output data-fixture-moves className="sr-only">{moves.join(' ')}</output>
          </>
        )}
      </WorkspaceCard>
    ) : (
      <WorkspaceCard key={`c${i}`} type="text" share={share(i)}>
        <p data-fixture-card={`context-${i}`}>{text(`Context card ${i + 1}`)}</p>
      </WorkspaceCard>
    ),
  );

  return (
    <>
      {leaveFocus}
      <Workspace
        board={play ? (
          <ChessBoard
            fen={FEN}
            dests={dests}
            turnColor="white"
            movableColor="both"
            themeId={THEMES[themeIdx]}
            onMove={(orig, dest) => setMoves((m) => [...m, orig + dest])}
          />
        ) : <ChessBoard fen={FEN} viewOnly />}
        toolbar={<BoardControls onStart={() => {}} onBack={() => {}} onForward={() => {}} onFlip={() => {}} />}
        activity={{
          title: 'Activity',
          cards: activityCards,
          foot: foot ? <WorkspaceCard type="foot"><span>Activity foot</span></WorkspaceCard> : undefined,
        }}
        context={{
          title: 'Context',
          cards: contextCards,
          foot: foot ? <WorkspaceCard type="foot"><span>Context foot</span></WorkspaceCard> : undefined,
        }}
      />
    </>
  );
}

