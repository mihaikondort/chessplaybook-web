import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { FilterState, SortState, DEFAULT_FILTER_STATE, DEFAULT_SORT_STATE } from '@/types/filter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SearchInput } from './SearchInput';
import { BasicFilters } from './BasicFilters';
import { AdvancedFilters } from './AdvancedFilters';
import { SortingControls } from './SortingControls';

interface GameFilterPanelProps {
  filters: FilterState;
  sort: SortState;
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortState) => void;
  opponents: string[];
  openings: string[];
  eventTypes: string[];
  dateRange: { min: number; max: number };
  isMobile?: boolean;
}

export function GameFilterPanel({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  opponents,
  openings,
  eventTypes,
  dateRange,
  isMobile = false,
}: GameFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTER_STATE);
    onSortChange(DEFAULT_SORT_STATE);
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Search Input */}
      <SearchInput
        value={filters.searchText}
        onChange={(value) => handleFilterChange({ searchText: value })}
      />

      <Separator />

      {/* Basic Filters */}
      <BasicFilters
        filters={filters}
        onChange={handleFilterChange}
        opponents={opponents}
        dateRange={dateRange}
      />

      <Separator />

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onChange={handleFilterChange}
        openings={openings}
        eventTypes={eventTypes}
      />

      <Separator />

      {/* Sorting Controls */}
      <SortingControls sort={sort} onChange={onSortChange} />

      {/* Reset Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleReset}
        aria-label="Reset all filters"
      >
        Reset All
      </Button>
    </div>
  );

  // Mobile view - use Sheet (bottom drawer)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full">
            <Filter className="mr-2 h-4 w-4" />
            Filters & Sort
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters & Sorting</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{filterContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop view - use Card
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Sorting
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{filterContent}</CardContent>
    </Card>
  );
}
