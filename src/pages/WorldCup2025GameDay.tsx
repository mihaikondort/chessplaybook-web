/**
 * FIDE World Cup 2025 - Game Day Page
 *
 * Thin wrapper around TournamentGameDay component
 * Displays games for a specific day of the World Cup 2025
 */

import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TournamentGameDay } from '@/components/tournament-template/TournamentGameDay';
import { WORLD_CUP_2025_CONFIG } from '@/config/tournaments/worldcup2025';

export default function WorldCup2025GameDay() {
  const { slug } = useParams<{ slug: string }>();

  // Find game day for SEO
  const gameDay = WORLD_CUP_2025_CONFIG.gameDays.find(gd => gd.slug === slug);

  return (
    <>
      <Helmet>
        <title>
          {gameDay
            ? `${gameDay.displayName} - FIDE World Cup 2025 | Chess Playbook`
            : 'FIDE World Cup 2025 | Chess Playbook'}
        </title>
        <meta
          name="description"
          content={
            gameDay
              ? `Watch ${gameDay.displayName} of the FIDE World Cup 2025 live with real-time updates. ${gameDay.metadata?.matchDescription || ''}`
              : 'Live coverage of FIDE World Cup 2025 from Goa, India'
          }
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <TournamentGameDay config={WORLD_CUP_2025_CONFIG} slug={slug!} />
    </>
  );
}
