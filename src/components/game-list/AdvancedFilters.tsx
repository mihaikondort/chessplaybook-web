import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FilterState } from '@/types/filter';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AdvancedFiltersProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  openings: string[];
  eventTypes: string[];
}

export function AdvancedFilters({
  filters,
  onChange,
  openings,
  eventTypes,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-0 hover:bg-transparent"
        >
          <span className="text-sm font-medium">Advanced Filters</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-6 pt-6">
        {/* Opening Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Opening</Label>
          <Select
            value={filters.openingFamily || 'all'}
            onValueChange={(value) => onChange({ openingFamily: value === 'all' ? '' : value })}
          >
            <SelectTrigger aria-label="Select opening">
              <SelectValue placeholder="Any opening" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">Any opening</SelectItem>
              {openings.map((opening) => (
                <SelectItem key={opening} value={opening.toLowerCase()}>
                  {opening}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event Type Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Event Type</Label>
          <Select
            value={filters.eventType || 'all'}
            onValueChange={(value) => onChange({ eventType: value === 'all' ? '' : value })}
          >
            <SelectTrigger aria-label="Select event type">
              <SelectValue placeholder="Any event" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any event</SelectItem>
              {eventTypes.map((eventType) => (
                <SelectItem key={eventType} value={eventType.toLowerCase()}>
                  {eventType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Game Length Filter - HIDDEN until move count parsing is implemented
            TODO: Implement PGN parsing to count actual moves, then uncomment this filter
            Current issue: estimateMoveCount() always returns 40, making this filter non-functional
        */}
        {/*
        <div className="space-y-3">
          <Label className="text-sm font-medium">Game Length</Label>
          <RadioGroup
            value={filters.gameLength}
            onValueChange={(value) =>
              onChange({ gameLength: value as FilterState['gameLength'] })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="any" id="length-any" />
              <Label htmlFor="length-any" className="font-normal cursor-pointer">
                Any length
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="short" id="length-short" />
              <Label htmlFor="length-short" className="font-normal cursor-pointer">
                Short (&lt; 30 moves)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="length-medium" />
              <Label htmlFor="length-medium" className="font-normal cursor-pointer">
                Medium (30-60 moves)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="long" id="length-long" />
              <Label htmlFor="length-long" className="font-normal cursor-pointer">
                Long (&gt; 60 moves)
              </Label>
            </div>
          </RadioGroup>
        </div>
        */}

        {/* ECO Code Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">ECO Classification</Label>
          <RadioGroup
            value={filters.hasEcoCode}
            onValueChange={(value) =>
              onChange({ hasEcoCode: value as FilterState['hasEcoCode'] })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="any" id="eco-any" />
              <Label htmlFor="eco-any" className="font-normal cursor-pointer">
                Any
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="eco-yes" />
              <Label htmlFor="eco-yes" className="font-normal cursor-pointer">
                Has ECO code
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="eco-no" />
              <Label htmlFor="eco-no" className="font-normal cursor-pointer">
                No ECO code
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
