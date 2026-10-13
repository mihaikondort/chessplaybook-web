/**
 * The engine state behind an analysis card: the subscriptions to the shared
 * `analysisService`, the PV-count rules and the on/off toggle.
 *
 * Lifted out of `GameAnalysis` (layout redesign D3b) so the viewers' card and
 * `/analysis`'s Workspace card run ONE copy of it. Its rules were each paid for
 * (the lease's return, the cache check, "enabling always starts at one line"),
 * and a second copy is one that drifts.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisService } from '@/services/AnalysisService';
import type { AnalysisResult } from '@/types/analysis';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { logGA4Event } from '@/services/analytics';

interface Options {
  /**
   * One line below 1024px wide, whatever was saved: `GameAnalysis`'s mobile
   * rule (screen space and performance). The Workspace card offers the lines
   * that fit its card instead, so it switches this off.
   */
  singleLineOnNarrowWindows?: boolean;
}

export function useEngineAnalysis(fen: string, { singleLineOnNarrowWindows = true }: Options = {}) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isEnabled, setIsEnabled] = useState(() => analysisService.isAnalysisEnabled());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentRequestedFen, setCurrentRequestedFen] = useState<string>('');
  const currentRequestedFenRef = useRef<string>(''); // Track current FEN in ref for callback access

  // Initialize PV count from localStorage or default to 1 for new users
  // On mobile: always 1 PV line (screen space + performance)
  const getInitialPvCount = (): number => {
    const mobile = singleLineOnNarrowWindows && window.innerWidth < 1024;
    if (mobile) return 1;

    const saved = localStorage.getItem('chessPvCount');
    if (saved) {
      const count = parseInt(saved, 10);
      // Only restore saved value if it's 1, 2, or 3 (not 0)
      // 0 means analysis was disabled, so default to 1 when re-enabling
      if (count >= 1 && count <= 3) return count;
    }
    // Default to 1 line for new users
    return 1;
  };

  const [pvCount, setPvCount] = useState<number>(getInitialPvCount());

  // Handle PV count change
  const handlePvCountChange = useCallback(async (count: number) => {
    // When enabling analysis (going from 0 to non-zero), ALWAYS force it to 1
    // User requested: always start with 1, don't allow jumping from 0 to 2 or 3
    const currentPvCount = pvCount;
    const finalCount = (currentPvCount === 0 && count > 0) ? 1 : count;

    setPvCount(finalCount);

    // Save to localStorage (will be 1 when enabling, or the actual count when adjusting)
    if (finalCount > 0) {
      localStorage.setItem('chessPvCount', finalCount.toString());
      userPreferencesService.save({ pvCount: finalCount });
    }

    if (finalCount === 0) {
      // Disable analysis
      analysisService.setEnabled(false);
      setResult(null);
      setIsAnalyzing(false);
    } else {
      // Enable analysis with specified PV count

      // Initialize engine if needed
      try {
        await analysisService.initialize();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[GameAnalysis] Failed to initialize:', error);
        }
        alert('Failed to load chess engine. Please refresh the page.');
        setPvCount(0);
        return;
      }

      // Set MultiPV count and enable analysis
      analysisService.setMultiPvCount(finalCount);
      const wasEnabled = analysisService.isAnalysisEnabled();
      analysisService.setEnabled(true);
      if (!wasEnabled) {
        logGA4Event({ name: 'analysis_enabled', params: { source: 'gameviewer' } });
      }

      // Restart analysis with new PV count for current position
      // Use ref to get the current FEN (avoids stale closure)
      const currentFen = currentRequestedFenRef.current;
      if (currentFen) {
        setIsAnalyzing(true);

        // Use setTimeout to ensure the MultiPV setting is processed first
        setTimeout(() => {
          analysisService.analyzePosition(currentFen);
        }, 100);
      }
    }
  }, [pvCount]); // Need pvCount as dependency to check current state

  const handleToggle = useCallback(async () => {
    const currentEnabled = analysisService.isAnalysisEnabled();
    const newState = !currentEnabled;

    if (newState) {
      // When enabling via toggle, ALWAYS set PV count to 1
      // Don't use saved value - always start fresh with 1
      setPvCount(1);
      localStorage.setItem('chessPvCount', '1');

      // Initialize engine when enabling
      try {
        await analysisService.initialize();

        // Set MultiPV count to 1
        analysisService.setMultiPvCount(1);

        // Enable analysis
        analysisService.setEnabled(true);
        logGA4Event({ name: 'analysis_enabled', params: { source: 'gameviewer' } });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[GameAnalysis] Failed to initialize analysis engine:', error);
        }
        alert('Failed to load chess engine. Please refresh the page and try again.');
        return;
      }
    } else {
      // When disabling via toggle, set PV count to 0
      setPvCount(0);

      // Disable analysis
      analysisService.setEnabled(false);

      // Clear results when disabling
      setResult(null);
      setIsAnalyzing(false);
    }
  }, []);

  // On mount: sync engine's MultiPV setting with saved preference
  useEffect(() => {
    const savedPvCount = getInitialPvCount();
    if (savedPvCount > 0 && analysisService.isAnalysisEnabled()) {
      // Engine is already enabled, make sure MultiPV is set correctly
      analysisService.setMultiPvCount(savedPvCount);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Check if analysis is enabled
    setIsEnabled(analysisService.isAnalysisEnabled());

    // Subscribe to analysis results
    const unsubscribeResults = analysisService.subscribe((analysisResult) => {
      // Service sends null when analysis is disabled
      if (!analysisResult) {
        setResult(null);
        setIsAnalyzing(false);
        return;
      }

      // Accept all results - AnalysisService handles debouncing/cancellation
      setResult(analysisResult);
      setIsAnalyzing(false);
    });

    // Subscribe to enabled state changes
    const unsubscribeEnabled = analysisService.subscribeToEnabledState((enabled) => {
      setIsEnabled(enabled);
    });

    /*
      THE ENGINE COMING BACK HAS TO REACH THIS PANEL TOO.

      When another tab steals the engine this panel is told (`OTHER_TAB`, in the
      banner below). When the thief closes, the lease returns here — but the
      only consumer of that signal was the puzzle card, so this panel went on
      saying analysis was running elsewhere WHILE HOLDING THE LEASE ITSELF.

      Recovery depended on the FEN changing, which on a free board means the
      visitor making a move: the one thing someone reading a stuck panel is
      least likely to do. Found by an independent review before deploy,
      2026-08-10.

      `currentRequestedFen` is cleared as well as re-requested, because the
      request is skipped when it matches — and it matches, since nothing about
      the position changed.
    */
    const unsubscribeAvailable = analysisService.subscribeEngineAvailable(() => {
      const fenToResume = currentRequestedFenRef.current;
      if (!fenToResume || !analysisService.isAnalysisEnabled()) return;
      setResult(null);
      setCurrentRequestedFen('');
      setIsAnalyzing(true);
      void analysisService.analyzePosition(fenToResume);
    });

    return () => {
      unsubscribeResults();
      unsubscribeEnabled();
      unsubscribeAvailable();
    };
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setResult(null);
      setIsAnalyzing(false);
      setCurrentRequestedFen('');
      return;
    }

    if (!fen) {
      // No FEN yet, wait for it
      return;
    }

    // Check if FEN actually changed (compare position only, ignore move counters)
    const normalizedNewFen = fen.split(' ').slice(0, 4).join(' ');
    const normalizedCurrentFen = currentRequestedFen.split(' ').slice(0, 4).join(' ');

    if (currentRequestedFen && normalizedNewFen === normalizedCurrentFen) {
      return; // Position hasn't changed, skip analysis
    }

    // Check cache first - if we have a cached result, use it immediately
    const cachedResult = analysisService.getCachedResult(fen);
    if (cachedResult) {
      setResult(cachedResult);
      setIsAnalyzing(false);
      setCurrentRequestedFen(fen);
      currentRequestedFenRef.current = fen;
      return;
    }

    setCurrentRequestedFen(fen);
    currentRequestedFenRef.current = fen; // Update ref for callback access

    // Keep previous result visible but mark as analyzing
    // Don't clear result - just show loading indicator
    setIsAnalyzing(true);
    analysisService.analyzePosition(fen);

    // Safety timeout: if no result after 30 seconds, stop showing "analyzing"
    const timeout = setTimeout(() => {
      setIsAnalyzing(false);
    }, 30000);

    return () => clearTimeout(timeout);
  }, [fen, isEnabled, currentRequestedFen]);

  // Derive values from result, using defaults when not yet loaded
  const evaluation = result?.evaluation ?? '+0.00';
  /*
    `OTHER_TAB` is the cross-tab engine lease reporting that another tab took
    the engine (see `engineLease.ts`). It rides the existing error channel on
    purpose: the banner is a box the card already has, so reporting it costs no
    layout change. Going quiet instead was the alternative, and it reads exactly
    like a broken engine — which is worse than the second worker the lease
    exists to prevent, because the player cannot tell it from a bug.
  */
  const isHeldElsewhere = evaluation === 'OTHER_TAB';
  const isError = evaluation === 'ERROR' || evaluation === 'TIMEOUT' || isHeldElsewhere;
  const isPositive = evaluation.startsWith('+') || (evaluation.startsWith('M') && !evaluation.startsWith('M-'));
  const isMate = evaluation.startsWith('M');
  const isWaiting = !result && isEnabled;

  return {
    result, isEnabled, isAnalyzing, isWaiting, pvCount,
    evaluation, isHeldElsewhere, isError, isPositive, isMate,
    setPvCount: handlePvCountChange, toggle: handleToggle,
  };
}
