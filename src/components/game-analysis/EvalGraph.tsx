/**
 * Eval Graph — chess.com-style two-tone fill.
 *
 * - White area fills from bottom to eval line
 * - Dark area fills from top to eval line
 * - Midline marks the 0.00 boundary
 * - Clickable: clicking navigates to that move
 */
import { useMemo, useState, useCallback } from 'react';
import type { ClassifiedMove } from '@/services/GameAnalysisService';

interface EvalGraphProps {
  evals: number[];         // centipawn evals per position
  currentMoveIndex: number;
  classifiedMoves?: ClassifiedMove[];
  onMoveClick?: (moveIndex: number) => void;
  height?: number;
  className?: string;
}

// Classification → dot color
const CLASSIFICATION_COLORS: Record<string, string> = {
  brilliant: '#06b6d4',       // cyan
  blunder: '#ef4444',         // red
  severe_blunder: '#991b1b',  // dark red
  mistake: '#f97316',         // orange
  inaccuracy: '#eab308',      // yellow
};

export const EvalGraph = ({
  evals,
  currentMoveIndex,
  classifiedMoves,
  onMoveClick,
  height = 120,
  className = '',
}: EvalGraphProps) => {
  const { whiteArea, blackArea, totalWidth, sigmoid, pad } = useMemo(() => {
    if (evals.length === 0) return { whiteArea: '', blackArea: '', totalWidth: 0 };

    const w = 1000; // fixed viewBox width — SVG stretches to fill container via w-full
    const h = height;
    const midY = h / 2;
    const pad = 2;

    // Dynamic sigmoid: K adapts to fill graph like chess.com
    // K = 9/effectiveMax → 50cp fills ~40%, 100cp fills ~78%, 200cp fills ~97%
    const rawMax = Math.max(...evals.map(cp => Math.abs(cp)));
    const effectiveMax = Math.max(Math.min(rawMax, 400), 250);
    const K = 1 / effectiveMax;
    const sigmoid = (cp: number) => {
      const clamped = Math.max(-1000, Math.min(1000, cp));
      return (2 / (1 + Math.exp(-K * clamped))) - 1;
    };

    const pts = evals.map((cp, i) => {
      const normalized = sigmoid(cp); // -1 to +1
      const y = midY - normalized * (midY - pad);
      const x = (i / Math.max(evals.length - 1, 1)) * w;
      return { x, y };
    });

    // White area: from bottom of graph up to eval line
    const whiteAreaPath = pts.map(p => `${p.x},${p.y}`).join(' ')
      + ` ${pts[pts.length - 1].x},${h} ${pts[0].x},${h}`;

    // Black area: from top of graph down to eval line
    const blackAreaPath = pts.map(p => `${p.x},${p.y}`).join(' ')
      + ` ${pts[pts.length - 1].x},0 ${pts[0].x},0`;

    return { whiteArea: whiteAreaPath, blackArea: blackAreaPath, totalWidth: w, sigmoid, pad };
  }, [evals, height]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width * totalWidth;
    const idx = Math.round(clickX / totalWidth * (evals.length - 1));
    setHoverIndex(Math.max(0, Math.min(evals.length - 1, idx)));
  }, [evals.length, totalWidth]);

  if (evals.length === 0) return null;

  const midY = height / 2;
  const markerX = (currentMoveIndex / Math.max(evals.length - 1, 1)) * totalWidth;
  const hoverX = hoverIndex !== null ? (hoverIndex / Math.max(evals.length - 1, 1)) * totalWidth : null;
  const hoverEval = hoverIndex !== null ? evals[hoverIndex] : null;
  const hoverMoveNum = hoverIndex !== null ? Math.ceil(hoverIndex / 2) : null;
  const hoverSide = hoverIndex !== null ? (hoverIndex % 2 === 0 ? 'W' : 'B') : null;

  return (
    <div className={`w-full relative ${className}`}>
      {/* Tooltip */}
      {hoverIndex !== null && hoverEval !== null && (
        <div
          className="absolute z-20 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap border border-border-strong shadow-lg"
          style={{
            left: `${Math.min(85, Math.max(5, (hoverIndex / Math.max(evals.length - 1, 1)) * 100))}%`,
            top: '4px',
            transform: 'translateX(-50%)',
          }}
        >
          {hoverMoveNum}.{hoverSide} {hoverEval >= 0 ? '+' : ''}{(hoverEval / 100).toFixed(2)}
        </div>
      )}
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full cursor-pointer block"
        style={{ height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        onClick={(e) => {
          if (!onMoveClick) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = (e.clientX - rect.left) / rect.width * totalWidth;
          const moveIdx = Math.round(clickX / totalWidth * (evals.length - 1));
          onMoveClick(Math.max(0, Math.min(evals.length - 1, moveIdx)));
        }}
      >
        {/* Rounded clip for entire graph */}
        <defs>
          <clipPath id="graph-round">
            <rect width={totalWidth} height={height} rx="30" ry="30" />
          </clipPath>
        </defs>
        <g clipPath="url(#graph-round)">
          {/* White area: bottom to eval line */}
          <polygon points={whiteArea} fill="#ffffff" />

          {/* Black/dark area: top to eval line */}
          <polygon points={blackArea} fill="#333333" />

          {/* Midline (0.00 reference) */}
          <line x1="0" y1={midY} x2={totalWidth} y2={midY} stroke="#999" strokeWidth="1" />

          {/* Classification dots (only for notable moves) */}
          {classifiedMoves?.map(m => {
            const color = CLASSIFICATION_COLORS[m.classification];
            if (!color) return null;
            const posIndex = m.moveIndex + 1;
            const x = (posIndex / Math.max(evals.length - 1, 1)) * totalWidth;
            const normalized = sigmoid(m.evalAfter);
            const y = midY - normalized * (midY - pad);
            return <circle key={m.moveIndex} cx={x} cy={y} r="4.5" fill={color} stroke="white" strokeWidth="1" />;
          })}

          {/* Hover line */}
          {hoverX !== null && (
            <line x1={hoverX} y1="0" x2={hoverX} y2={height} stroke="white" strokeWidth="1" opacity="0.4" />
          )}

          {/* Current move marker */}
          <line x1={markerX} y1="0" x2={markerX} y2={height} stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.6" />
        </g>
      </svg>
    </div>
  );
};
