/**
 * useFilterUrlState Hook
 *
 * Manages synchronization between filter/sort state and URL query parameters.
 * Enables shareable filtered views and browser back/forward navigation.
 *
 * URL Format Example:
 * /champions/Kasparov/games?search=sicilian&result=white-win&color=white&date-from=1985&date-to=2000&sort=date&order=desc
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterState, SortState, DEFAULT_FILTER_STATE, DEFAULT_SORT_STATE } from '@/types/filter';

/**
 * Custom hook for managing filter and sort state in URL
 */
export function useFilterUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * Parse URL query parameters into FilterState and SortState
   */
  const parseUrlToState = useCallback((): { filters: FilterState; sort: SortState } => {
    const filters: FilterState = {
      // Search
      searchText: searchParams.get('search') || DEFAULT_FILTER_STATE.searchText,

      // Basic filters
      result: (searchParams.get('result') as FilterState['result']) || DEFAULT_FILTER_STATE.result,
      color: (searchParams.get('color') as FilterState['color']) || DEFAULT_FILTER_STATE.color,
      dateFrom: searchParams.get('date-from') ? parseInt(searchParams.get('date-from')!) : DEFAULT_FILTER_STATE.dateFrom,
      dateTo: searchParams.get('date-to') ? parseInt(searchParams.get('date-to')!) : DEFAULT_FILTER_STATE.dateTo,
      opponent: searchParams.get('opponent') || DEFAULT_FILTER_STATE.opponent,

      // Advanced filters
      openingFamily: searchParams.get('opening') || DEFAULT_FILTER_STATE.openingFamily,
      eventType: searchParams.get('event') || DEFAULT_FILTER_STATE.eventType,
      gameLength: (searchParams.get('length') as FilterState['gameLength']) || DEFAULT_FILTER_STATE.gameLength,
      hasEcoCode: (searchParams.get('eco') as FilterState['hasEcoCode']) || DEFAULT_FILTER_STATE.hasEcoCode,

      // Future filters
      bestGamesOnly: searchParams.get('best') === 'true',
      minQuality: searchParams.get('quality') ? parseInt(searchParams.get('quality')!) : DEFAULT_FILTER_STATE.minQuality,
    };

    const sort: SortState = {
      field: (searchParams.get('sort') as SortState['field']) || DEFAULT_SORT_STATE.field,
      order: (searchParams.get('order') as SortState['order']) || DEFAULT_SORT_STATE.order,
    };

    return { filters, sort };
  }, [searchParams]);

  /**
   * Serialize FilterState and SortState into URL query parameters
   */
  const updateUrl = useCallback((filters: FilterState, sort: SortState, replace: boolean = false) => {
    const params = new URLSearchParams();

    // Only add non-default values to keep URL clean
    if (filters.searchText) {
      params.set('search', filters.searchText);
    }

    if (filters.result !== 'any') {
      params.set('result', filters.result);
    }

    if (filters.color !== 'any') {
      params.set('color', filters.color);
    }

    if (filters.dateFrom !== null) {
      params.set('date-from', filters.dateFrom.toString());
    }

    if (filters.dateTo !== null) {
      params.set('date-to', filters.dateTo.toString());
    }

    if (filters.opponent) {
      params.set('opponent', filters.opponent);
    }

    if (filters.openingFamily) {
      params.set('opening', filters.openingFamily);
    }

    if (filters.eventType) {
      params.set('event', filters.eventType);
    }

    if (filters.gameLength !== 'any') {
      params.set('length', filters.gameLength);
    }

    if (filters.hasEcoCode !== 'any') {
      params.set('eco', filters.hasEcoCode);
    }

    if (filters.bestGamesOnly) {
      params.set('best', 'true');
    }

    if (filters.minQuality !== null) {
      params.set('quality', filters.minQuality.toString());
    }

    // Sort parameters (only if not default)
    if (sort.field !== DEFAULT_SORT_STATE.field) {
      params.set('sort', sort.field);
    }

    if (sort.order !== DEFAULT_SORT_STATE.order) {
      params.set('order', sort.order);
    }

    // Update URL (replace = true prevents adding to history)
    setSearchParams(params, { replace });
  }, [setSearchParams]);

  /**
   * Clear all filters and reset to defaults
   */
  const clearUrl = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  /**
   * Check if any filters are active (different from defaults)
   */
  const hasActiveFilters = useCallback((): boolean => {
    return searchParams.toString().length > 0;
  }, [searchParams]);

  return {
    parseUrlToState,
    updateUrl,
    clearUrl,
    hasActiveFilters,
  };
}

/**
 * Helper function to validate filter values from URL
 * (Can be extended to sanitize/validate URL parameters)
 */
export function validateFilterValue<T>(
  value: string | null,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  if (!value) return defaultValue;
  if (allowedValues.includes(value as T)) return value as T;
  return defaultValue;
}
