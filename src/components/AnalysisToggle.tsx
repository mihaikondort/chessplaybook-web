/**
 * Analysis Toggle Component
 *
 * Toggle button to enable/disable chess position analysis.
 * Default: OFF to save battery on mobile devices.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { analysisService } from '@/services/AnalysisService';

interface AnalysisToggleProps {
  className?: string;
}

export const AnalysisToggle = ({ className = '' }: AnalysisToggleProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check initial state
    const initialState = analysisService.isAnalysisEnabled();
    setIsEnabled(initialState);

    // Subscribe to enabled state changes to stay in sync
    const unsubscribe = analysisService.subscribeToEnabledState((enabled) => {
      setIsEnabled(enabled);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggle = async () => {
    const newState = !isEnabled;

    if (newState) {
      // Initialize engine when enabling
      try {
        await analysisService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize analysis engine:', error);
        alert('Failed to load chess engine. Please refresh the page and try again.');
        return;
      }
    } else {
      // Clear initialization state when disabling (worker will be terminated)
      setIsInitialized(false);
    }

    // Toggle analysis
    analysisService.setEnabled(newState);
    setIsEnabled(newState);
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isEnabled ? 'default' : 'outline'}
      className={`${className} ${isEnabled ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-control'}`}
      title={isEnabled ? 'Disable analysis (save battery)' : 'Enable analysis'}
    >
      <span className="mr-2">
        {isEnabled ? '⚡' : '🔋'}
      </span>
      <span>
        {isEnabled ? 'Analysis ON' : 'Analysis OFF'}
      </span>
    </Button>
  );
};
