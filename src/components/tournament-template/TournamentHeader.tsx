/**
 * Tournament Header Component
 *
 * Main header for tournament hub page showing tournament name, location, and dates
 */

import { MapPin, Calendar } from 'lucide-react';
import type { TournamentConfig } from '@/types/Tournament';
import { format } from 'date-fns';

interface TournamentHeaderProps {
  config: TournamentConfig;
}

export function TournamentHeader({ config }: TournamentHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold mb-4">{config.name}</h1>
      <div className="flex flex-wrap gap-4 text-muted-foreground">
        <div className="flex items-center">
          <MapPin className="mr-2 h-5 w-5 text-muted-foreground" />
          {config.location}
        </div>
        <div className="flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
          {format(config.startDate, 'MMMM d')} - {format(config.endDate, 'MMMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}
