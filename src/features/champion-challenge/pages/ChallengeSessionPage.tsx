import { useEffect, useState } from 'react';
import ReportProblemLink from '@/components/support/ReportProblemLink';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import RouteHeading from '@/components/RouteHeading';
import SeoHead from '@/components/SeoHead';
import { WorkspaceCard } from '@/components/chess/WorkspaceCard';
import { chessDataService } from '@/services/ChessDataService';
import type { PlayersMap } from '@/types/chess';
import { ChallengeSession } from '../components/ChallengeSession';
import type { SessionLength } from '../services/ChampionChallengeApi';
import { readLength, type ChallengeNavState } from './challengeNavState';

const DEFAULT_LENGTH: SessionLength = 10;

/**
 * ONE SESSION, `/champion-challenge/:champion` (#68). A WORKSPACE page.
 *
 * The session used to share `/champion-challenge` with the picker, swapped in
 * by component state. A route's kind is static (the layout group it sits in),
 * so one route could not be a Document for the picker and a Workspace for the
 * board; the owner made the picker a Document page, and the session moved here.
 *
 * THE URL CARRIES THE CHAMPION, NOT THE SESSION. Sessions are already
 * remembered per champion (`useChampionChallenge`), so a reload resumes the
 * one in progress and a shared link starts the reader's own. The length is
 * navigation state: it only matters when a NEW session is dealt, and a direct
 * visit gets the picker's default.
 *
 * The slug is lowercase, like `/champions/:name`; the API and the roster key
 * champions by their capitalised name ("Gukesh"), so the slug is resolved
 * against the roster. An unknown name goes back to the picker.
 */
export default function ChallengeSessionPage() {
  const { champion: slug = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayersMap | null>(null);
  const [rosterFailed, setRosterFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    chessDataService
      .loadPlayers()
      .then((map) => { if (!cancelled) setPlayers(map); })
      .catch(() => { if (!cancelled) setRosterFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const length = readLength(location.state) ?? DEFAULT_LENGTH;

  if (slug !== slug.toLowerCase()) {
    return (
      <Navigate
        to={`/champion-challenge/${slug.toLowerCase()}`}
        replace
        state={location.state}
      />
    );
  }

  const seo = (
    <>
      {/* Canonical is the picker: a session is not a page of its own to index. */}
      <SeoHead routeKey="champion-challenge" />
      <div className="sr-only">
        <RouteHeading routeKey="champion-challenge" />
      </div>
    </>
  );

  if (rosterFailed) {
    return (
      <>
        {seo}
        <div className="mx-auto w-full max-w-xl px-2 pt-2 sm:px-4">
          <WorkspaceCard title="Challenge unavailable">
            <p className="text-sm text-destructive" role="alert">
              Could not load the champions. Please try again.
            </p>
            <ReportProblemLink surface="load_error" className="mt-2 inline-flex min-h-11 items-center text-sm text-link underline-offset-4 hover:underline" />
          </WorkspaceCard>
        </div>
      </>
    );
  }

  if (!players) {
    return (
      <>
        {seo}
        <div className="mx-auto w-full max-w-xl px-2 pt-2 sm:px-4">
          <WorkspaceCard title="Setting up the board">
            <div className="flex min-h-28 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" aria-hidden />
              Setting up the board…
            </div>
          </WorkspaceCard>
        </div>
      </>
    );
  }

  const champion = Object.keys(players).find((name) => name.toLowerCase() === slug);
  if (!champion) {
    return <Navigate to="/champion-challenge" replace />;
  }

  const exit = () => {
    const state: ChallengeNavState = { length };
    navigate('/champion-challenge', { state });
  };

  return (
    <>
      {seo}
      {/* `key` so moving between two champions' URLs starts the other session
          rather than reusing this one's state. */}
      <ChallengeSession
        key={champion}
        champion={champion}
        length={length}
        player={players[champion]}
        onExit={exit}
      />
    </>
  );
}
