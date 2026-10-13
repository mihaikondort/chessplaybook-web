import { useEffect, useState } from 'react';

/**
 * The solving preferences, persisted exactly as `PuzzleTrainer` persists them.
 *
 * SAME KEY, SAME SCHEMA, deliberately. A player who has used the current page
 * has these values in their browser already, and a second key would silently
 * reset their settings the first time they landed on the rebuilt layout — and
 * then diverge from that point on, so the two pages would disagree about
 * something the player set once.
 */
export const FILTERS_KEY = 'chessplaybook_puzzle_filters';

/** The theme list the current page offers, in its order. */
export const PUZZLE_THEMES = [
  { value: '', label: 'All Themes' },
  { value: 'mateIn1', label: 'Mate in 1' },
  { value: 'mateIn2', label: 'Mate in 2' },
  { value: 'mateIn3', label: 'Mate in 3' },
  { value: 'fork', label: 'Fork' },
  { value: 'pin', label: 'Pin' },
  { value: 'skewer', label: 'Skewer' },
  { value: 'discoveredAttack', label: 'Discovered Attack' },
  { value: 'sacrifice', label: 'Sacrifice' },
  { value: 'deflection', label: 'Deflection' },
  { value: 'clearance', label: 'Clearance' },
  { value: 'endgame', label: 'Endgame' },
  { value: 'middlegame', label: 'Middlegame' },
  { value: 'opening', label: 'Opening' },
  { value: 'crushing', label: 'Crushing' },
  { value: 'hangingPiece', label: 'Hanging Piece' },
  { value: 'trappedPiece', label: 'Trapped Piece' },
  { value: 'backRankMate', label: 'Back Rank Mate' },
];

/** Manual-mode bands. Auto derives the window from the player's own record. */
export const RATING_PRESETS = [
  { label: 'Beginner', min: 400, max: 1000 },
  { label: 'Intermediate', min: 1000, max: 1500 },
  { label: 'Advanced', min: 1500, max: 2000 },
  { label: 'Expert', min: 2000, max: 2500 },
  { label: 'Master', min: 2500, max: 3200 },
];

function saved(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(FILTERS_KEY) || '{}'); } catch { return {}; }
}

export function usePuzzleSettings() {
  /*
    RATED DEFAULTS ON, AUTO-START DEFAULTS OFF, and both defaults are decisions.

    Rated is what the trainer is for. Auto-start is off because the owner's own
    reading after trying it on Lichess was *"I'm not that thrilled about this
    feature, I don't really like it, but maybe there are players who do"* — a
    preference one person in ten wants is a preference, not a default.
  */
  const [rated, setRated] = useState<boolean>(() => saved().rated !== false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => saved().autoAdvance === true);
  const [theme, setTheme] = useState<string>(() => String(saved().theme ?? ''));
  /*
    THE PREVIOUS SCHEMA IS STILL IN PEOPLE'S BROWSERS, and this hook did not read
    it - so anyone who had pinned a difficulty on the old page arrived here in
    auto at the default band, their choice silently dropped. The old page has
    carried this migration since 2026-05-05 (PuzzleTrainer.tsx:709). Same rule,
    same two keys: the OLD default {1000, 2000} was never customised and becomes
    auto; any other saved pair is a deliberate manual choice.
  */
  const [filterMode, setFilterMode] = useState<'auto' | 'manual'>(() => {
    const s = saved();
    if (s.mode === 'auto' || s.mode === 'manual') return s.mode;
    if (s.minRating === 1000 && s.maxRating === 2000) return 'auto';
    if (s.minRating != null && s.maxRating != null) return 'manual';
    return 'auto';
  });
  const [ratingRange, setRatingRange] = useState<{ min: number; max: number }>(() => {
    const s = saved();
    if (typeof s.manualMinRating === 'number' && typeof s.manualMaxRating === 'number') {
      return { min: s.manualMinRating, max: s.manualMaxRating };
    }
    /* Legacy keys, for a browser that has not written this page's shape yet. */
    if (typeof s.minRating === 'number' && typeof s.maxRating === 'number') {
      return { min: s.minRating, max: s.maxRating };
    }
    return { min: 1000, max: 1500 };
  });

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({
        theme,
        mode: filterMode,
        manualMinRating: ratingRange.min,
        manualMaxRating: ratingRange.max,
        rated,
        autoAdvance,
      }));
    } catch { /* a full quota must never break solving */ }
  }, [theme, filterMode, ratingRange, rated, autoAdvance]);

  return {
    rated, setRated,
    autoAdvance, setAutoAdvance,
    theme, setTheme,
    filterMode, setFilterMode,
    ratingRange, setRatingRange,
  };
}
