import { FilterState } from '@/types/filter';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface BasicFiltersProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  opponents: string[];
  dateRange: { min: number; max: number };
}

export function BasicFilters({
  filters,
  onChange,
  opponents,
  dateRange,
}: BasicFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Result Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Result</Label>
        <ToggleGroup
          type="single"
          value={filters.result}
          onValueChange={(value) => {
            if (value) onChange({ result: value as FilterState['result'] });
          }}
          className="justify-start flex-wrap"
        >
          <ToggleGroupItem value="any" aria-label="Any result">
            Any
          </ToggleGroupItem>
          <ToggleGroupItem value="white-win" aria-label="White wins">
            White Wins
          </ToggleGroupItem>
          <ToggleGroupItem value="draw" aria-label="Draw">
            Draw
          </ToggleGroupItem>
          <ToggleGroupItem value="black-win" aria-label="Black wins">
            Black Wins
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Color Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Champion Played As</Label>
        <ToggleGroup
          type="single"
          value={filters.color}
          onValueChange={(value) => {
            if (value) onChange({ color: value as FilterState['color'] });
          }}
          className="justify-start"
        >
          <ToggleGroupItem value="any" aria-label="Any color">
            Any
          </ToggleGroupItem>
          <ToggleGroupItem value="white" aria-label="White pieces">
            White
          </ToggleGroupItem>
          <ToggleGroupItem value="black" aria-label="Black pieces">
            Black
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Date Range Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Date Range</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="From"
            value={filters.dateFrom ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              onChange({ dateFrom: value });
            }}
            min={dateRange.min}
            max={dateRange.max}
            className="w-24"
            aria-label="From year"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="To"
            value={filters.dateTo ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              onChange({ dateTo: value });
            }}
            min={dateRange.min}
            max={dateRange.max}
            className="w-24"
            aria-label="To year"
          />
        </div>
        {dateRange.min && dateRange.max && (
          <p className="text-xs text-muted-foreground">
            Available: {dateRange.min} - {dateRange.max}
          </p>
        )}
      </div>

      {/* Opponent Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Opponent</Label>
        <Select
          value={filters.opponent || 'all'}
          onValueChange={(value) => onChange({ opponent: value === 'all' ? '' : value })}
        >
          <SelectTrigger aria-label="Select opponent">
            <SelectValue placeholder="Any opponent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any opponent</SelectItem>
            {opponents.map((opponent) => (
              <SelectItem key={opponent} value={opponent.toLowerCase()}>
                {opponent}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
