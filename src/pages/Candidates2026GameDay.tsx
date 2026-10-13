/**
 * FIDE Candidates Tournament 2026 - Game Day Page
 *
 * Thin wrapper around TournamentGameDay component
 * Displays games for a specific round of the Candidates 2026
 */

import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TournamentGameDay } from '@/components/tournament-template/TournamentGameDay';
import { CANDIDATES_2026_CONFIG } from '@/config/tournaments/candidates2026';

export default function Candidates2026GameDay() {
  const { slug } = useParams<{ slug: string }>();

  const gameDay = CANDIDATES_2026_CONFIG.gameDays.find(gd => gd.slug === slug);

  return (
    <>
      <Helmet>
        <title>
          {gameDay
            ? `${gameDay.displayName} - FIDE Candidates 2026 | Chess Playbook`
            : 'FIDE Candidates Tournament 2026 | Chess Playbook'}
        </title>
        <meta
          name="description"
          content={
            gameDay
              ? `Watch ${gameDay.displayName} of the FIDE Candidates 2026 live from Paphos, Cyprus. ${gameDay.metadata?.matchDescription || ''}`
              : 'Live coverage of FIDE Candidates Tournament 2026 from Paphos, Cyprus'
          }
        />
        <link rel="canonical" href={`https://www.chessplaybook.com/candidates-2026/${slug || ''}`} />
        <meta property="og:title" content={gameDay ? `${gameDay.displayName} - FIDE Candidates 2026` : 'FIDE Candidates Tournament 2026'} />
        <meta property="og:description" content={gameDay ? `Live coverage of ${gameDay.displayName}. ${gameDay.metadata?.matchDescription || ''}` : 'Live coverage of FIDE Candidates Tournament 2026'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://www.chessplaybook.com/candidates-2026/${slug || ''}`} />
        <meta property="og:image" content="https://www.chessplaybook.com/assets/og-candidates-2026.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={gameDay ? `${gameDay.displayName} - FIDE Candidates 2026` : 'FIDE Candidates Tournament 2026'} />
        <meta name="twitter:description" content={gameDay ? `Live coverage of ${gameDay.displayName}. ${gameDay.metadata?.matchDescription || ''}` : 'Live coverage of FIDE Candidates Tournament 2026'} />
        <meta name="twitter:image" content="https://www.chessplaybook.com/assets/og-candidates-2026.jpg" />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <TournamentGameDay config={CANDIDATES_2026_CONFIG} slug={slug!} />
    </>
  );
}
