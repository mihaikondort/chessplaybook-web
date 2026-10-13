import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Clock } from 'lucide-react';
import { WORLD_CUP_2025_CONFIG } from '@/config/tournaments/worldcup2025';

interface EventStatus {
  isLive: boolean;
  message: string;
  countdown?: string;
  currentRound?: string;
  liveGameDaySlug?: string;
}

export const LiveEventBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [eventStatus, setEventStatus] = useState<EventStatus>({
    isLive: false,
    message: 'FIDE World Cup 2025',
  });

  // FIDE World Cup 2025 Schedule
  // First games: November 1, 2025, afternoon (3:00 PM IST / 9:30 AM UTC)
  // Rounds run: 2 days of classical games, 1 rest day pattern
  const getEventStatus = (): EventStatus => {
    const now = new Date();

    // Tournament dates
    const tournamentStart = new Date('2025-11-01T09:30:00Z'); // Nov 1, 3:00 PM IST
    const tournamentEnd = new Date('2025-11-27T18:00:00Z');   // Nov 27, end of day

    // If tournament hasn't started yet
    if (now < tournamentStart) {
      const timeUntilStart = tournamentStart.getTime() - now.getTime();
      const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

      let countdown = '';
      if (days > 0) {
        countdown = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        countdown = `${hours}h ${minutes}m`;
      } else {
        countdown = `${minutes}m`;
      }

      return {
        isLive: false,
        message: 'FIDE World Cup 2025 - Starting Soon',
        countdown: countdown,
      };
    }

    // If tournament has ended
    if (now > tournamentEnd) {
      return {
        isLive: false,
        message: 'FIDE World Cup 2025 - Tournament Ended',
      };
    }

    // Tournament is ongoing - find current game day
    const currentGameDay = WORLD_CUP_2025_CONFIG.gameDays.find(gd => {
      const start = gd.startTime;
      const end = gd.estimatedEndTime;
      return now >= start && now <= end;
    });

    if (currentGameDay) {
      // We're during a scheduled game day
      return {
        isLive: true,
        message: 'LIVE NOW: FIDE World Cup 2025',
        currentRound: currentGameDay.displayName,
        liveGameDaySlug: currentGameDay.slug,
      };
    } else {
      // Between game days - find next upcoming game day
      const nextGameDay = WORLD_CUP_2025_CONFIG.gameDays.find(gd =>
        gd.startTime > now
      );

      if (nextGameDay) {
        const timeUntilNext = nextGameDay.startTime.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));

        return {
          isLive: false,
          message: 'FIDE World Cup 2025 - Next Round Soon',
          countdown: `${hoursUntil}h ${minutesUntil}m`,
          currentRound: nextGameDay.displayName,
        };
      } else {
        // No more game days scheduled
        return {
          isLive: false,
          message: 'FIDE World Cup 2025 - Tournament Ending Soon',
        };
      }
    }
  };

  useEffect(() => {
    // Check if banner was dismissed today
    const dismissedUntil = localStorage.getItem('worldcup2025-banner-dismissed-until');
    const now = new Date().getTime();

    if (!dismissedUntil || now > parseInt(dismissedUntil)) {
      // Either never dismissed, or dismissal expired - show banner
      setIsVisible(true);
      // Clean up old dismissal if expired
      if (dismissedUntil && now > parseInt(dismissedUntil)) {
        localStorage.removeItem('worldcup2025-banner-dismissed-until');
      }
    }

    // Update status immediately
    setEventStatus(getEventStatus());

    // Update countdown every minute
    const interval = setInterval(() => {
      setEventStatus(getEventStatus());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss until tomorrow (24 hours from now)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Set to midnight
    localStorage.setItem('worldcup2025-banner-dismissed-until', tomorrow.getTime().toString());
  };

  if (!isVisible) return null;

  return (
    /*
      RAW COLOURS KEPT ON PURPOSE (owner, 2026-10-03, layout redesign B5c).
      White on amber-500 is 2.15:1 and fails WCAG AA; the owner chose to keep
      the banner as it is for now. Logged as D17, to be decided when the light
      theme is judged on real pages. The raw-colour guard (B6) exempts this file
      by name until then.
    */
    <div className="bg-amber-500 border-amber-600 border-b-2 py-3 px-4 relative animate-fade-in">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {eventStatus.isLive ? (
            <div className="w-3 h-3 bg-white rounded-full animate-pulse flex-shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-white flex-shrink-0" />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <span className="text-white font-semibold text-sm sm:text-base truncate">
              {eventStatus.message}
            </span>
            {eventStatus.countdown && (
              <span className="text-white text-xs sm:text-sm opacity-90">
                Starts in: <span className="font-mono font-bold">{eventStatus.countdown}</span>
              </span>
            )}
            {eventStatus.currentRound && (
              <span className="text-white text-xs sm:text-sm opacity-90">
                {eventStatus.currentRound} | Goa, India
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={eventStatus.isLive && eventStatus.liveGameDaySlug ? `/world-cup-2025/${eventStatus.liveGameDaySlug}` : '/world-cup-2025'}>
            <Button size="sm" className="bg-white text-amber-600 hover:bg-gray-100 text-sm">
              {eventStatus.isLive ? 'Watch Live' : 'View Event'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 p-1 flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
