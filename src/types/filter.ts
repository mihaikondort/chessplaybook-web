/**
 * Filter and Sort Types for Game List
 *
 * Defines the shape of filter state and sort state used throughout
 * the game search and filter system.
 */

/**
 * FilterState - All possible filter criteria
 */
export interface FilterState {
  // Search
  searchText: string;

  // Basic filters
  result: 'any' | 'white-win' | 'black-win' | 'draw';
  color: 'any' | 'white' | 'black';
  dateFrom: number | null;  // Year (e.g., 1985)
  dateTo: number | null;    // Year (e.g., 2000)
  opponent: string;

  // Advanced filters
  openingFamily: string;
  eventType: string;
  gameLength: 'any' | 'short' | 'medium' | 'long';
  hasEcoCode: 'any' | 'yes' | 'no';

  // Future filters (not yet implemented)
  bestGamesOnly: boolean;
  minQuality: number | null;
}

/**
 * SortState - Sorting configuration
 */
export interface SortState {
  field: 'date' | 'opponent' | 'opening' | 'event' | 'moves' | 'result';
  order: 'asc' | 'desc';
}

/**
 * Default filter state - all filters disabled
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  searchText: '',
  result: 'any',
  color: 'any',
  dateFrom: null,
  dateTo: null,
  opponent: '',
  openingFamily: '',
  eventType: '',
  gameLength: 'any',
  hasEcoCode: 'any',
  bestGamesOnly: false,
  minQuality: null,
};

/**
 * Default sort state - newest games first
 */
export const DEFAULT_SORT_STATE: SortState = {
  field: 'date',
  order: 'desc',
};

/**
 * Helper type for filter counts
 */
export interface FilterCounts {
  total: number;
  filtered: number;
  activeFilters: number;
}
