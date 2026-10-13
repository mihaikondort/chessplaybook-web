/**
 * Game Day Card Component
 *
 * Card displayed on tournament hub page linking to individual game day
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import type { GameDay, GameDayStatus } from '@/types/Tournament';

interface GameDayCardProps {
  tournamentId: string;
  gameDay: GameDay;
  status: GameDayStatus;
}

export function GameDayCard({ tournamentId, gameDay, status }: GameDayCardProps) {
  const statusColors = {
    finished: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    live: 'bg-live-fill text-live-fill-foreground hover:bg-live',
    'upcoming-next': 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    upcoming: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };

  const statusLabels = {
    finished: 'Replay',
    live: 'Live Now',
    'upcoming-next': 'Starts Soon',
    upcoming: 'Upcoming',
  };

  return (
    <Link to={`/${tournamentId}/${gameDay.slug}`}>
      <Card className="bg-card border-border hover:border-border-strong transition-colors h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{gameDay.displayName}</CardTitle>
            <Badge className={statusColors[status]}>
              {statusLabels[status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            {gameDay.date}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            {gameDay.startTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Kolkata', // Will be made dynamic later
            })} IST
          </div>
          {gameDay.metadata?.matchDescription && (
            <div className="text-sm text-muted-foreground mt-2">
              {gameDay.metadata.matchDescription}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
