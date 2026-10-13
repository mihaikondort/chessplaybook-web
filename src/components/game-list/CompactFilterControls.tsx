import { Filter, SlidersHorizontal } from 'lucide-react';
import { FilterState, SortState } from '@/types/filter';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { SearchInput } from './SearchInput';
import { SortingControls } from './SortingControls';
import { BasicFilters } from './BasicFilters';
import { AdvancedFilters } from './AdvancedFilters';
import { Separator } from '@/components/ui/separator';

interface CompactFilterControlsProps {
  filters: FilterState;
  sort: SortState;
  onFiltersChange: (filters: FilterState) => void;
  onSortChange: (sort: SortState) => void;
  opponents: string[];
  openings: string[];
  eventTypes: string[];
  dateRange: { min: number; max: number };
  isMobile?: boolean;
  activeFilterCount: number;
}

export function CompactFilterControls({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  opponents,
  openings,
  eventTypes,
  dateRange,
  isMobile = false,
  activeFilterCount,
}: CompactFilterControlsProps) {
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...newFilters });
  };

  const filterContent = (
    <div className="space-y-6">
      <BasicFilters
        filters={filters}
        onChange={handleFilterChange}
        opponents={opponents}
        dateRange={dateRange}
      />
      <Separator />
      <AdvancedFilters
        filters={filters}
        onChange={handleFilterChange}
        openings={openings}
        eventTypes={eventTypes}
      />
    </div>
  );

  // Mobile layout - Drawer
  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {/* Search and Buttons Row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              value={filters.searchText}
              onChange={(value) => handleFilterChange({ searchText: value })}
              placeholder="Search games..."
            />
          </div>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="default" className="relative border-2 border-primary/50 hover:border-primary text-link font-normal">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>Filters</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-8">
                {filterContent}
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        {/* Sort Controls Row */}
        <SortingControls sort={sort} onChange={onSortChange} />
      </div>
    );
  }

  // Desktop layout - Inline with dialog for advanced filters
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
      {/* Search */}
      <div className="w-full lg:w-80">
        <SearchInput
          value={filters.searchText}
          onChange={(value) => handleFilterChange({ searchText: value })}
          placeholder="Search games..."
        />
      </div>

      {/* Sort */}
      <div className="w-full lg:w-56">
        <SortingControls sort={sort} onChange={onSortChange} />
      </div>

      {/* Filters Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="relative whitespace-nowrap border-2 border-primary/50 hover:border-primary text-link font-normal">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter Games</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {filterContent}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
