/**
 * Tournament Hub Component
 *
 * Generic tournament hub page that displays all game days
 * Works for any tournament format (Swiss, Elimination, Round Robin)
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TournamentHeader } from './TournamentHeader';
import { GameDayCard } from './GameDayCard';
import type { TournamentConfig } from '@/types/Tournament';
import { computeGameDayStatus, getFormatDisplayName } from '@/types/Tournament';
import { format } from 'date-fns';

interface TournamentHubProps {
  config: TournamentConfig;
}

export function TournamentHub({ config }: TournamentHubProps) {
  // Compute statuses for all game days
  const gameDaysWithStatus = config.gameDays.map(gameDay => ({
    gameDay,
    status: computeGameDayStatus(gameDay),
  }));

  // Find the next upcoming game day (earliest start time among upcoming games)
  const upcomingGameDays = gameDaysWithStatus.filter(({ status }) => status === 'upcoming');
  const nextGameDay = upcomingGameDays.length > 0
    ? upcomingGameDays.reduce((earliest, current) =>
        current.gameDay.startTime < earliest.gameDay.startTime ? current : earliest
      ).gameDay
    : null;

  return (
    <div className="bg-background flex flex-col">

      <div className="flex-grow container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <TournamentHeader config={config} />

        {/* Format Badge */}
        <div className="mb-6">
          <Badge variant="outline" className="text-sm">
            {getFormatDisplayName(config.format, config.totalRounds)}
          </Badge>
        </div>

        {/* Game Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {gameDaysWithStatus.map(({ gameDay, status }) => {
            // Mark the next upcoming game as 'upcoming-next'
            const effectiveStatus = status === 'upcoming' && nextGameDay?.slug === gameDay.slug
              ? 'upcoming-next'
              : status;

            return (
              <GameDayCard
                key={gameDay.slug}
                tournamentId={config.id}
                gameDay={gameDay}
                status={effectiveStatus}
              />
            );
          })}
        </div>

        {/* Tournament Information Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Tournament Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Format:</span>
              <span className="capitalize">{config.format.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rounds:</span>
              <span>{config.totalRounds}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{config.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dates:</span>
              <span>
                {format(config.startDate, 'MMM d')} - {format(config.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timezone:</span>
              <span>{config.timezone}</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
