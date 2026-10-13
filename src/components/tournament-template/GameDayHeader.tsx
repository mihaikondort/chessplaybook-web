/**
 * Game Day Header Component
 *
 * Header for individual game day page showing tournament name, round info, date, status, and navigation
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Info, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GameDay } from '@/types/Tournament';
import { computeGameDayStatus } from '@/types/Tournament';
import { boardThemes } from '@/config/boardThemes';
import { useBoardTheme } from '@/hooks/useBoardTheme';
import { useState } from 'react';

interface GameDayHeaderProps {
  tournamentName: string;
  gameDay: GameDay;
  gamesCount?: number;
  currentPageStart?: number;
  currentPageEnd?: number;
  currentPage?: number;
  totalPages?: number;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
}

export function GameDayHeader({
  tournamentName,
  gameDay,
  gamesCount,
  currentPageStart,
  currentPageEnd,
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
}: GameDayHeaderProps) {
  const status = computeGameDayStatus(gameDay);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { currentTheme, changeTheme } = useBoardTheme();

  const statusColors = {
    finished: 'bg-secondary text-secondary-foreground',
    live: 'bg-live-fill text-live-fill-foreground animate-pulse',
    upcoming: 'bg-secondary text-secondary-foreground',
  };

  const statusLabels = {
    finished: 'Finished',
    live: 'Live Now',
    upcoming: 'Upcoming',
  };

  return (
    <Card className="bg-card border-border mb-6">
      <CardContent className="p-4">
        {/* Single-line compact header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Round Name + Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold">{gameDay.displayName}</h1>
            <Badge className={`${statusColors[status]} flex-shrink-0`}>
              {statusLabels[status]}
            </Badge>
          </div>

          {/* Right: Date, Time, Match Description, Game Count, Settings */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {gameDay.date}
            </div>
            <div className="flex items-center">
              <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {gameDay.startTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Kolkata',
              })} IST
            </div>
            {gameDay.metadata?.matchDescription && (
              <div className="flex items-center">
                <Info className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                {gameDay.metadata.matchDescription}
              </div>
            )}

            {/* Game count (only show pagination text when multiple pages exist) */}
            {gamesCount !== undefined && gamesCount > 0 && totalPages !== undefined && totalPages > 1 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                Showing {currentPageStart}-{currentPageEnd} of {gamesCount} games
              </span>
            )}
            {/* Simple game count when only one page */}
            {gamesCount !== undefined && gamesCount > 0 && (totalPages === undefined || totalPages <= 1) && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {gamesCount} games
              </span>
            )}

            {/* Pagination buttons (show when multiple pages) */}
            {totalPages !== undefined && totalPages > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPreviousPage}
                  disabled={currentPage === 1}
                  className="gap-1 h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>

                <span className="text-xs sm:text-sm text-muted-foreground font-mono">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                  className="gap-1 h-8"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Settings Button (show when games are loaded) */}
            {gamesCount !== undefined && gamesCount > 0 && (
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-card border-border hover:bg-control"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border text-foreground">
                  <DialogHeader>
                    <DialogTitle>Board Settings</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Customize your chess board appearance
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">Board Theme</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {boardThemes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => changeTheme(theme.id)}
                          className={`
                            group relative p-2 rounded-lg border-2 transition-all text-left
                            ${
                              currentTheme.id === theme.id
                                ? 'border-primary bg-card'
                                : 'border-border hover:border-border-strong bg-card/50'
                            }
                          `}
                        >
                          <div className="mb-1.5 rounded overflow-hidden shadow-md" style={{ width: '70px', height: '70px' }}>
                            <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
                              {[...Array(16)].map((_, i) => {
                                const row = Math.floor(i / 4);
                                const col = i % 4;
                                const isLight = (row + col) % 2 === 0;
                                return (
                                  <div
                                    key={i}
                                    style={{
                                      backgroundColor: isLight
                                        ? theme.colors.lightSquare
                                        : theme.colors.darkSquare,
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>

                          <div className="text-[10px] font-semibold text-foreground leading-tight">
                            {theme.name}
                          </div>

                          {currentTheme.id === theme.id && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                              <svg
                                className="w-2 h-2 text-primary-foreground"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
