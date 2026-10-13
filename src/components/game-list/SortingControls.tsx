import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SortState } from '@/types/filter';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SortingControlsProps {
  sort: SortState;
  onChange: (sort: SortState) => void;
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'opponent', label: 'Opponent' },
  { value: 'opening', label: 'Opening' },
  { value: 'event', label: 'Event' },
  { value: 'moves', label: 'Move Count' },
  { value: 'result', label: 'Result' },
] as const;

export function SortingControls({ sort, onChange }: SortingControlsProps) {
  const toggleOrder = () => {
    onChange({
      ...sort,
      order: sort.order === 'asc' ? 'desc' : 'asc',
    });
  };

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sort.field)?.label || 'Date';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Select
          value={sort.field}
          onValueChange={(value) =>
            onChange({ ...sort, field: value as SortState['field'] })
          }
        >
          <SelectTrigger aria-label="Sort by field" className="h-10 border-2 border-primary/50 focus:border-primary text-link font-normal">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="default"
        onClick={toggleOrder}
        className="h-10 border-2 border-primary/50 hover:border-primary text-link font-normal"
        aria-label={`Sort order: ${sort.order === 'asc' ? 'Ascending' : 'Descending'}`}
        title={`${currentSortLabel}: ${sort.order === 'asc' ? 'Ascending' : 'Descending'}`}
      >
        {sort.order === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span className="ml-2 hidden sm:inline">
          {sort.order === 'asc' ? 'Asc' : 'Desc'}
        </span>
      </Button>
    </div>
  );
}
