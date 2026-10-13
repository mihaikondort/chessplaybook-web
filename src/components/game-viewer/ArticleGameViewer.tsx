import { useMemo, useState } from 'react';
import type { Key } from '@lichess-org/chessground/types';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { BoardControls } from '@/components/chess/BoardControls';
import { GameMoveList } from '@/components/chess/GameMoveList';
import { useBoardStepInput } from '@/components/chess/useBoardStepInput';
import { GameAnalysisPanel } from '@/components/game-viewer/GameAnalysisPanel';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseGame } from '@/lib/game/gameModel';

export interface ArticleGame {
  id: string;
  /** The selector's label: "Caruana 1-0 Nakamura". */
  label: string;
  /** The selector's group: "Open", "Women". */
  section: string;
  pgn: string;
}

/**
 * "Replay the Games" in an article (layout redesign E7, 2026-10-12): a game selector,
 * one board and the engine panel, sized by the article's column. Shared by the
 * Candidates recaps, which each carried a copy around the Lichess viewer.
 *
 * A DOCUMENT, NOT A WORKSPACE (plan §4, E7): the article scrolls as a page, and the
 * board is as wide as its column allows (beside the engine panel from `lg`, the whole
 * column below it). The board, the toolbar and the move list are the ones every board
 * page uses; the engine panel is the one these pages had, and it replaces the eval bar
 * (owner, E0).
 *
 * THE WHEEL STEPS OVER THE BOARD, AS THE LICHESS VIEWER DID, BUT THE ARROW KEYS DO NOT
 * LISTEN ON THE PAGE: on an article they scroll the reading. They step once focus is in
 * the move list.
 */
export function ArticleGameViewer({ games }: { games: ArticleGame[] }) {
  const [selectedId, setSelectedId] = useState(games[0].id);
  const selected = games.find(g => g.id === selectedId) ?? games[0];
  const sections = [...new Set(games.map(g => g.section))];

  return (
    <section className="mb-16">
      <h2 className="text-2xl font-playfair font-bold text-foreground mb-4 border-b border-primary/30 pb-2">
        Replay the Games
      </h2>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-3">Select a game to replay with engine analysis:</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:flex-wrap">
          {sections.map(section => (
            <div key={section} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-link uppercase tracking-wider px-1">{section}</span>
              <div className="flex flex-wrap gap-1.5">
                {games.filter(g => g.section === section).map(game => (
                  <button
                    key={game.id}
                    type="button"
                    aria-pressed={selected.id === game.id}
                    onClick={() => setSelectedId(game.id)}
                    className={`text-xs sm:text-sm px-3 py-1.5 rounded-md border transition-colors ${
                      selected.id === game.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    {game.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyed by the game, so another game opens at its starting position. */}
      <ArticleBoard key={selected.id} pgn={selected.pgn} />
    </section>
  );
}

function ArticleBoard({ pgn }: { pgn: string }) {
  const parsed = useMemo(() => parseGame(pgn), [pgn]);
  const model = parsed.ok ? parsed.game : null;
  const plies = model?.plies ?? [];
  const last = plies.length - 1;
  const [ply, setPly] = useState(-1);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const { currentTheme } = useBoardTheme();
  /* One engine panel, the one that fits: beside the board from `lg`, compact below it. */
  const narrow = useIsMobile(1024);

  const current = ply >= 0 ? plies[ply] : null;
  const fen = current?.fen ?? model?.startFen ?? '';
  const stepTo = (to: number) => setPly(Math.max(-1, Math.min(last, to)));
  const attachWheel = useBoardStepInput({
    enabled: last >= 0,
    keys: false,
    onBack: () => setPly(p => Math.max(-1, p - 1)),
    onForward: () => setPly(p => Math.min(last, p + 1)),
  });

  const headers = model?.headers;
  const player = (side: 'white' | 'black') => {
    const name = side === 'white' ? headers?.white : headers?.black;
    const elo = side === 'white' ? headers?.whiteElo : headers?.blackElo;
    return (
      <div className="flex items-baseline gap-2 px-1 py-1.5 text-sm">
        <span className="font-medium text-foreground truncate">{name || (side === 'white' ? 'White' : 'Black')}</span>
        {elo ? <span className="text-muted-foreground tabular-nums">({elo})</span> : null}
      </div>
    );
  };
  const top = orientation === 'white' ? 'black' : 'white';
  const bottom = orientation === 'white' ? 'white' : 'black';

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="surface-card rounded-lg p-2 sm:p-3 w-full min-w-0 lg:flex-1">
        {player(top)}
        <div ref={attachWheel} className="document-board" role="group" aria-label={`Chess board, ${headers?.white ?? 'White'} against ${headers?.black ?? 'Black'}`}>
          <ChessBoard
            fen={fen}
            orientation={orientation}
            lastMove={current ? (current.lastMove as Key[]) : undefined}
            check={current?.check ? (current.color === 'white' ? 'black' : 'white') : undefined}
            turnColor={fen.split(' ')[1] === 'b' ? 'black' : 'white'}
            themeId={currentTheme.id}
          />
        </div>
        {player(bottom)}
        {/* Tighter under the board on a phone (owner, 2026-08-05); 8px once the
            engine panel sits beside the board, which here is `lg`. */}
        <BoardControls
          className="mt-1 lg:mt-2"
          onStart={() => stepTo(-1)}
          onBack={() => stepTo(ply - 1)}
          onForward={() => stepTo(ply + 1)}
          onReset={() => stepTo(last)}
          onFlip={() => setOrientation(o => (o === 'white' ? 'black' : 'white'))}
          historyDisabled={last < 0}
        />
        {/* An unbounded list in a fixed box: the list scrolls, the page does not move (contract §9.1). */}
        <GameMoveList
          moves={plies.map(p => p.san)}
          startFen={model?.startFen}
          currentMoveIndex={ply}
          onMoveClick={stepTo}
          className="mt-2 h-40 rounded-md border border-border/60 p-1"
        />
      </div>
      <div className={narrow ? 'w-full' : 'w-80 flex-shrink-0'}>
        <GameAnalysisPanel currentFen={fen} boardTheme={currentTheme} isMobile={narrow} />
      </div>
    </div>
  );
}
