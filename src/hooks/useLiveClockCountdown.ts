/**
 * Shared clock countdown hook for live games
 *
 * Performance-optimized with a single shared timer for all game cards.
 * Updates clock times every second for the player to move.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LiveGame } from '@/types/LiveBroadcast';

interface ClockState {
  whiteClock: string;
  blackClock: string;
  lastUpdate: number; // Timestamp of last PGN update
}

// Shared state for all game clocks
const clockStates = new Map<string, ClockState>();

// Parse clock time string to total seconds
function parseClockToSeconds(clock: string): number {
  const parts = clock.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to H:MM:SS string
function formatSecondsToClockTime(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Determine which player is to move based on move count
function getPlayerToMove(moveCount: number): 'white' | 'black' {
  // If odd number of moves, white just moved, so black is to move
  // If even number of moves, black just moved, so white is to move
  return moveCount % 2 === 0 ? 'white' : 'black';
}

let timerInterval: NodeJS.Timeout | null = null;
let subscriberCount = 0;

// Start the shared timer (called when first component mounts)
function startSharedTimer() {
  if (timerInterval) return; // Already running

  timerInterval = setInterval(() => {
    const now = Date.now();

    // Update all active clocks
    clockStates.forEach((state, gameId) => {
      // Only update if game data hasn't changed recently (within last 100ms)
      if (now - state.lastUpdate < 100) return;

      // Trigger re-renders by updating the Map
      clockStates.set(gameId, { ...state });
    });
  }, 1000); // Tick every second
}

// Stop the shared timer (called when last component unmounts)
function stopSharedTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

export function useLiveClockCountdown(game: LiveGame) {
  const [, setTick] = useState(0); // Force re-render on clock update

  // Initialize or update clock state when game data changes
  useEffect(() => {
    const state = clockStates.get(game.id);
    const newState: ClockState = {
      whiteClock: game.white.clock || '0:00:00',
      blackClock: game.black.clock || '0:00:00',
      lastUpdate: Date.now(),
    };

    // Only update if PGN actually changed (different move count or clock times)
    if (!state ||
        state.whiteClock !== newState.whiteClock ||
        state.blackClock !== newState.blackClock) {
      clockStates.set(game.id, newState);
      setTick(t => t + 1); // Force re-render
    }
  }, [game.id, game.white.clock, game.black.clock, game.moveCount]);

  // Subscribe to timer on mount, unsubscribe on unmount
  useEffect(() => {
    subscriberCount++;
    if (subscriberCount === 1) {
      startSharedTimer();
    }

    // Listen for clock updates
    const checkInterval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => {
      subscriberCount--;
      if (subscriberCount === 0) {
        stopSharedTimer();
      }
      clearInterval(checkInterval);
    };
  }, []);

  // Get current clock times with countdown
  const getCurrentClockTimes = useCallback(() => {
    const state = clockStates.get(game.id);
    if (!state) {
      return {
        whiteClock: game.white.clock || '0:00:00',
        blackClock: game.black.clock || '0:00:00',
        whiteIsActive: false,
        blackIsActive: false,
      };
    }

    // Don't countdown if game is finished
    if (!game.isOngoing) {
      return {
        whiteClock: state.whiteClock,
        blackClock: state.blackClock,
        whiteIsActive: false,
        blackIsActive: false,
      };
    }

    const playerToMove = getPlayerToMove(game.moveCount);
    const elapsedSeconds = Math.floor((Date.now() - state.lastUpdate) / 1000);

    let whiteClock = state.whiteClock;
    let blackClock = state.blackClock;

    if (playerToMove === 'white') {
      const whiteSeconds = parseClockToSeconds(state.whiteClock) - elapsedSeconds;
      whiteClock = formatSecondsToClockTime(whiteSeconds);
    } else {
      const blackSeconds = parseClockToSeconds(state.blackClock) - elapsedSeconds;
      blackClock = formatSecondsToClockTime(blackSeconds);
    }

    return {
      whiteClock,
      blackClock,
      whiteIsActive: playerToMove === 'white' && game.isOngoing,
      blackIsActive: playerToMove === 'black' && game.isOngoing,
    };
  }, [game.id, game.isOngoing, game.moveCount, game.white.clock, game.black.clock]);

  return getCurrentClockTimes();
}
