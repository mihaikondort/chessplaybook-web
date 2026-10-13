import { X } from 'lucide-react';
import { FilterState, DEFAULT_FILTER_STATE } from '@/types/filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ActiveFiltersBarProps {
  filters: FilterState;
  onRemoveFilter: (key: keyof FilterState) => void;
  onClearAll: () => void;
  totalGames: number;
  filteredGames: number;
}

export function ActiveFiltersBar({
  filters,
  onRemoveFilter,
  onClearAll,
  totalGames,
  filteredGames,
}: ActiveFiltersBarProps) {
  const activeFilters: Array<{
    key: keyof FilterState;
    label: string;
    value: string;
  }> = [];

  // Build list of active filters
  if (filters.searchText) {
    activeFilters.push({
      key: 'searchText',
      label: 'Search',
      value: `"${filters.searchText}"`,
    });
  }

  if (filters.result !== DEFAULT_FILTER_STATE.result) {
    const resultLabels = {
      'white-win': 'White Wins',
      'black-win': 'Black Wins',
      draw: 'Draw',
      any: 'Any',
    };
    activeFilters.push({
      key: 'result',
      label: 'Result',
      value: resultLabels[filters.result],
    });
  }

  if (filters.color !== DEFAULT_FILTER_STATE.color) {
    const colorLabels = {
      white: 'As White',
      black: 'As Black',
      any: 'Any',
    };
    activeFilters.push({
      key: 'color',
      label: 'Color',
      value: colorLabels[filters.color],
    });
  }

  if (filters.dateFrom !== null || filters.dateTo !== null) {
    const from = filters.dateFrom ?? '?';
    const to = filters.dateTo ?? '?';
    activeFilters.push({
      key: 'dateFrom', // We'll clear both dateFrom and dateTo
      label: 'Date',
      value: `${from} - ${to}`,
    });
  }

  if (filters.opponent) {
    activeFilters.push({
      key: 'opponent',
      label: 'Opponent',
      value: filters.opponent,
    });
  }

  if (filters.openingFamily) {
    activeFilters.push({
      key: 'openingFamily',
      label: 'Opening',
      value: filters.openingFamily,
    });
  }

  if (filters.eventType) {
    activeFilters.push({
      key: 'eventType',
      label: 'Event',
      value: filters.eventType,
    });
  }

  if (filters.gameLength !== DEFAULT_FILTER_STATE.gameLength) {
    const lengthLabels = {
      short: 'Short',
      medium: 'Medium',
      long: 'Long',
      any: 'Any',
    };
    activeFilters.push({
      key: 'gameLength',
      label: 'Length',
      value: lengthLabels[filters.gameLength],
    });
  }

  if (filters.hasEcoCode !== DEFAULT_FILTER_STATE.hasEcoCode) {
    const ecoLabels = {
      yes: 'Has ECO',
      no: 'No ECO',
      any: 'Any',
    };
    activeFilters.push({
      key: 'hasEcoCode',
      label: 'ECO',
      value: ecoLabels[filters.hasEcoCode],
    });
  }

  if (filters.bestGamesOnly) {
    activeFilters.push({
      key: 'bestGamesOnly',
      label: 'Best Games',
      value: 'Only',
    });
  }

  // Don't show the bar if no filters are active
  if (activeFilters.length === 0) {
    return null;
  }

  const handleRemove = (key: keyof FilterState) => {
    // Special handling for date range - clear both
    if (key === 'dateFrom') {
      onRemoveFilter('dateFrom');
      onRemoveFilter('dateTo');
    } else {
      onRemoveFilter(key);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Showing {filteredGames} of {totalGames} games
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      </div>

      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <Badge
            key={filter.key}
            variant="secondary"
            className="gap-1 pr-1 text-xs"
          >
            <span className="font-medium">{filter.label}:</span>
            <span className="font-normal">{filter.value}</span>
            <button
              onClick={() => handleRemove(filter.key)}
              className="ml-1 rounded-full p-0.5 hover:bg-background"
              aria-label={`Remove ${filter.label} filter`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
