import { TournamentHub } from '@/components/tournament-template/TournamentHub';
import { CANDIDATES_2026_CONFIG } from '@/config/tournaments/candidates2026';
import SeoHead from '@/components/SeoHead';

export default function Candidates2026Hub() {
  return (
    <>
      <SeoHead routeKey="candidates-2026">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          "name": "FIDE Candidates Tournament 2026",
          "description": "Eight elite grandmasters competed in Paphos for the right to challenge World Champion Gukesh; Javokhir Sindarov won with a record 10/14.",
          "startDate": "2026-03-29",
          "endDate": "2026-04-16",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
          "location": { "@type": "Place", "name": "Cap St George's Hotel & Resort", "address": { "@type": "PostalAddress", "addressLocality": "Paphos", "addressCountry": "CY" } },
          "organizer": { "@type": "Organization", "name": "FIDE", "url": "https://www.fide.com" },
          "performer": [
            { "@type": "Person", "name": "Fabiano Caruana" },
            { "@type": "Person", "name": "Hikaru Nakamura" },
            { "@type": "Person", "name": "Praggnanandhaa Rameshbabu" },
            { "@type": "Person", "name": "Wei Yi" },
            { "@type": "Person", "name": "Anish Giri" },
            { "@type": "Person", "name": "Javokhir Sindarov" },
            { "@type": "Person", "name": "Matthias Bluebaum" },
            { "@type": "Person", "name": "Andrey Esipenko" }
          ],
          "image": "https://www.chessplaybook.com/assets/og-candidates-2026.jpg",
          "url": "https://www.chessplaybook.com/candidates-2026",
          "sport": "Chess",
          "competitor": [
            { "@type": "Person", "name": "Fabiano Caruana" },
            { "@type": "Person", "name": "Hikaru Nakamura" },
            { "@type": "Person", "name": "Praggnanandhaa Rameshbabu" },
            { "@type": "Person", "name": "Wei Yi" },
            { "@type": "Person", "name": "Anish Giri" },
            { "@type": "Person", "name": "Javokhir Sindarov" },
            { "@type": "Person", "name": "Matthias Bluebaum" },
            { "@type": "Person", "name": "Andrey Esipenko" }
          ],
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2026-03-01",
            "url": "https://www.chessplaybook.com/candidates-2026"
          }
        })}</script>
      </SeoHead>
      <TournamentHub config={CANDIDATES_2026_CONFIG} />
    </>
  );
}
