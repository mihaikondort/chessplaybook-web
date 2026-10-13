import { GameAnalysis } from '@/components/GameAnalysis';
import { Card } from '@/components/ui/card';
import type { BoardTheme } from '@/config/boardThemes';

interface GameAnalysisPanelProps {
  currentFen?: string;
  boardTheme: BoardTheme;
  isMobile?: boolean;
}

export const GameAnalysisPanel = ({ currentFen, boardTheme, isMobile = false }: GameAnalysisPanelProps) => {
  // Only render analysis when we have a valid FEN
  // When game loads, chessground.set() will be called with initial position
  // and our hook will send the FEN, triggering analysis automatically
  if (!currentFen) {
    // Brief initial load — render full-size empty card to prevent layout shift
    return (
      <div className={isMobile ? 'w-full' : 'w-full lg:w-80 flex-shrink-0 h-full flex flex-col'}>
        <Card className="bg-card border relative flex-1 flex flex-col" />
      </div>
    );
  }

  return (
    <div className={isMobile ? 'w-full' : 'w-full lg:w-80 flex-shrink-0 h-full flex flex-col'}>
      <GameAnalysis fen={currentFen} boardTheme={boardTheme} isMobile={isMobile} />
    </div>
  );
};
