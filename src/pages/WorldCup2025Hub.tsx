/**
 * FIDE World Cup 2025 - Tournament Hub Page
 *
 * Thin wrapper around TournamentHub component
 * Displays all game days for the World Cup 2025
 */

import { TournamentHub } from '@/components/tournament-template/TournamentHub';
import { WORLD_CUP_2025_CONFIG } from '@/config/tournaments/worldcup2025';
import SeoHead from '@/components/SeoHead';

export default function WorldCup2025Hub() {
  return (
    <>
      <SeoHead routeKey="world-cup-2025">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": "FIDE Chess World Cup 2025",
          "description": "The FIDE World Cup 2025 in Goa, India: 206 players competed in a knockout tournament for 3 Candidates spots.",
          "startDate": "2025-10-31",
          "endDate": "2025-11-27",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": { "@type": "Place", "name": "Resort Rio", "address": { "@type": "PostalAddress", "addressLocality": "Goa", "addressCountry": "IN" } },
          "organizer": { "@type": "Organization", "name": "FIDE", "url": "https://www.fide.com" },
          "sport": "Chess",
          "performer": { "@type": "Organization", "name": "206 Elite Chess Players" }
        })}</script>
      </SeoHead>

      <TournamentHub config={WORLD_CUP_2025_CONFIG} />
    </>
  );
}
