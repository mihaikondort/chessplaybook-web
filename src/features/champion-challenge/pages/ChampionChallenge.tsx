import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RouteHeading from '@/components/RouteHeading';
import { ChampionPicker } from '../components/ChampionPicker';
import { HowItWorks } from '../components/HowItWorks';
import { ChallengeSetupCard } from '../components/ChallengeSetupCard';
import type { SessionLength } from '../services/ChampionChallengeApi';
import SeoHead from '@/components/SeoHead';
import { readLength, type ChallengeNavState } from './challengeNavState';

/**
 * Champion Challenge — the picker, `/champion-challenge`. A DOCUMENT page
 * since #68 (owner, 2026-10-13): it has no board, so it scrolls with the window
 * and has the footer, like every other non-board page. Picking a champion goes
 * to `/champion-challenge/<champion>`, the session, which is a Workspace.
 */
export default function ChampionChallenge() {
  const location = useLocation();
  const navigate = useNavigate();
  /*
    Owned here so the control can render above both grid columns — see the row.

    THE CHOICE SURVIVES A SESSION, KEPT DELIBERATELY (Codex, 2026-08-07): someone
    who picked 20 gets 20 on their next champion, because a player who has just
    told us how long they want to train has not changed their mind by finishing.
    Since #68 the session is another route, so the length travels in navigation
    state: out to the session, and back with "Pick another champion". It is also
    written onto this history entry, so the browser's Back button finds it too.
  */
  const [length, setLength] = useState<SessionLength>(() => readLength(location.state) ?? 10);
  const changeLength = (next: SessionLength) => {
    setLength(next);
    const state: ChallengeNavState = { length: next };
    navigate(location.pathname + location.search, { replace: true, state });
  };

  return (
    <>
      <SeoHead routeKey="champion-challenge">
        {/* Describes the page as a training exercise rather than a generic
            page, and carries the not-a-puzzle framing into the search result. */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LearningResource',
            name: 'Champion Challenge',
            url: 'https://www.chessplaybook.com/champion-challenge',
            description:
              "Chess training on real positions from World Chess Champion games. You play the move you would choose, then see the champion's move and the reasoning behind it. Most positions have no forced win — the exercise is finding a good, patient move.",
            learningResourceType: 'Interactive exercise',
            educationalLevel: 'Beginner to advanced',
            teaches: 'Chess middlegame planning, positional judgement and endgame conversion',
            isAccessibleForFree: true,
            inLanguage: 'en',
            provider: {
              '@type': 'Organization',
              name: 'Chess Playbook',
              url: 'https://www.chessplaybook.com',
            },
          })}
        </script>

        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.chessplaybook.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Champion Challenge',
                item: 'https://www.chessplaybook.com/champion-challenge',
              },
            ],
          })}
        </script>
      </SeoHead>


      <div className="sr-only">
        <RouteHeading routeKey="champion-challenge" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-2 pb-6 pt-2 sm:px-4">
        <ChallengeSetupCard length={length} onLengthChange={changeLength} />

        {/* #68: a strip under setup (one collapsed row on a phone), so the
            champion grid gets the full width instead of sharing it with a
            side column that ended 827px above the cards. */}
        <div className="mb-3">
          <HowItWorks />
        </div>

        <ChampionPicker
          length={length}
          onSelect={(champion, len) => {
            /* The session is its own lazy route (`ChallengeSessionPage`), so
               the board graph stays out of this page's chunk, as before. */
            const state: ChallengeNavState = { length: len };
            navigate(`/champion-challenge/${champion.toLowerCase()}`, { state });
          }}
        />
      </div>
    </>
  );
}
