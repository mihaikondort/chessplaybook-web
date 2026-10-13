import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ChessClockProps {
  timeMs: number;       // Server-authoritative snapshot (ms remaining)
  isActive: boolean;    // Is this clock currently ticking?
  isGameOver: boolean;  // Stops all ticking
  className?: string;
}

/**
 * Chess clock display that counts down locally between server updates.
 *
 * The server sends authoritative clock snapshots on every move. Between moves,
 * the active clock ticks down using a local interval. When a new snapshot
 * arrives (timeMs changes), the countdown resets from the new value.
 */
export function ChessClock({ timeMs, isActive, isGameOver, className }: ChessClockProps) {
  const [displayed, setDisplayed] = useState(timeMs);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    // Always show the latest server snapshot immediately
    setDisplayed(timeMs);

    if (!isActive || isGameOver) return;

    // Start counting down from this snapshot
    startedAtRef.current = Date.now();

    const id = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, timeMs - elapsed);
      setDisplayed(remaining);
    }, 100);

    return () => clearInterval(id);
  }, [isActive, isGameOver, timeMs]);
  // ^ deps: restart the countdown whenever the snapshot changes or active side changes

  const isLow = displayed < 30_000;   // < 30s — warn
  const isCritical = displayed < 10_000; // < 10s — urgent

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums rounded px-3 py-1 text-xl transition-colors',
        isActive
          ? isCritical
            ? 'bg-clock-critical text-clock-critical-foreground'
            : isLow
              ? 'bg-clock-low text-clock-low-foreground'
              : 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {formatMs(displayed)}
    </div>
  );
}

export function formatMs(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);

  /*
    HOURS FROM AN HOUR UP (layout redesign E3). A classical broadcast starts at two
    hours, which read "119:58"; the viewers show those clocks. The play pages' longest
    preset is 15+10, so this form never appears there.
  */
  if (totalSec >= 3600) {
    const h = Math.floor(totalSec / 3600);
    return `${h}:${(min % 60).toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  if (ms < 10_000) {
    // Show tenths of seconds when under 10s
    const tenths = Math.floor((ms % 1000) / 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${tenths}`;
  }

  return `${min}:${sec.toString().padStart(2, '0')}`;
}
