/**
 * Deterministic Champion Challenge data for component and visual-state tests.
 *
 * Nothing in the production application imports this module. Keeping the
 * fixtures data-only lets tests drive the real components and mocked service
 * boundary without adding a fixture route or a second session state machine.
 */
import type { Player } from '@/types/chess';
import type { StructuredExplanation } from '@/types/positionExplanation';
import type {
  AnswerVerdict,
  ChampionSummary,
  PublicPosition,
  SessionSummary,
} from './services/ChampionChallengeApi';

export const TEST_CHAMPION = 'Kasparov';

export const championPlayerFixture: Player = {
  fullName: 'Garry Kasparov',
  imagePath: 'assets/players/kasparov.jpg',
  championshipYears: 'World Champion 1985–2000',
  biography: 'Fixture biography used only by Champion Challenge tests.',
};

export const championRosterFixture: ChampionSummary[] = [
  {
    champion: TEST_CHAMPION,
    positionCount: 64,
    difficulties: { easy: 12, medium: 24, hard: 20, master: 8 },
  },
  {
    champion: 'Carlsen',
    positionCount: 72,
    difficulties: { easy: 16, medium: 28, hard: 20, master: 8 },
  },
];

/**
 * The complete shape the browser may receive before the player commits.
 * This object must never grow answer, evaluation or coaching fields.
 */
export const publicPositionFixture: PublicPosition = {
  id: 410,
  champion: TEST_CHAMPION,
  fen: 'r3k2r/pppq1ppp/2n1bn2/3pp3/3PP3/2N1BN2/PPPQ1PPP/R3K2R w KQkq - 0 1',
  sideToMove: 'white',
  moveNumber: 18,
  difficulty: 'hard',
  legalMoves: 37,
};

export const nextPositionFixture: PublicPosition = {
  id: 411,
  champion: TEST_CHAMPION,
  fen: '4rrk1/ppp2ppp/2npb3/8/2P1P3/2N1B3/PP3PPP/R2R2K1 b - - 0 22',
  sideToMove: 'black',
  moveNumber: 22,
  difficulty: 'master',
  legalMoves: 31,
};

export const shortExplanationFixture: StructuredExplanation = {
  verdict: { eval: '+0.42', phase: 'middlegame' },
  action: 'Improve the worst-placed piece before opening the position.',
  sections: {
    threats_and_tactics: {
      summary: 'There is no forcing tactic for either side.',
      items: [{ text: 'Watch the pressure on d4.', side: 'white', priority: 1, tag: 'warning' }],
    },
    plan: {
      summary: 'Prepare the central break.',
      items: [{ text: 'Place a rook on d1 first.', side: 'white', priority: 1 }],
    },
  },
};

export const longExplanationFixture: StructuredExplanation = {
  verdict: { eval: '-0.18', opening: 'Queen’s Gambit Declined', eco: 'D37', phase: 'middlegame' },
  action: 'Hold the centre, improve the passive rook and only then decide which pawn break changes the position in your favour.',
  sections: {
    threats_and_tactics: {
      summary: 'The position contains several tactical ideas, but none works before the pieces are coordinated.',
      lastMoveLeadIn: 'The previous move increased the pressure on the centre.',
      items: [
        { text: 'A premature central capture releases the opponent’s bishops.', side: 'black', priority: 1, tag: 'warning' },
        { text: 'The back rank needs one flight square before the rook leaves it.', side: 'black', priority: 2, tag: 'problem' },
      ],
    },
    king_safety: {
      summary: 'Both kings are safe for now, although the queenside pawns can become hooks.',
      items: [{ text: 'Keep enough control of the dark squares around the king.', side: 'both', priority: 1 }],
    },
    material: {
      summary: 'Material is equal and no exchange is forced.',
      items: [{ text: 'The bishop pair is a long-term asset in an open centre.', side: 'white', priority: 2, tag: 'asset' }],
    },
    pieces: {
      summary: 'The central knight is stable but blocks a rook file.',
      items: [
        { text: 'Improve the rook before relocating the knight.', side: 'black', priority: 1 },
        { text: 'The light-squared bishop controls the intended break.', side: 'white', priority: 2 },
      ],
    },
    pawn_structure: {
      summary: 'The structure can change through either central file.',
      items: [{ text: 'Avoid creating an isolated pawn without active-piece compensation.', side: 'both', priority: 1, tag: 'warning' }],
    },
    plan: {
      summary: 'Coordinate first and transform the position second.',
      items: [
        { text: 'Connect the rooks and contest the open file.', side: 'black', priority: 1 },
        { text: 'Reassess the central break after the opponent responds.', side: 'black', priority: 2 },
      ],
    },
  },
};

const verdictBase: Omit<AnswerVerdict, 'quality' | 'score' | 'feedback'> = {
  encouragement: 'A sound practical choice that keeps the position under control.',
  centipawnLoss: 18,
  matchedChampion: false,
  matchedBest: false,
  beatChampion: false,
  userMove: 'Rad1',
  userEvalCp: 24,
  championMove: 'Rfd1',
  championEvalCp: 38,
  bestMove: 'Rfd1',
  bestEvalCp: 38,
};

export function verdictFixture(
  quality: string = 'good',
  overrides: Partial<AnswerVerdict> = {},
): AnswerVerdict {
  const scoreByQuality: Record<string, number> = {
    excellent: 100,
    great: 92,
    good: 80,
    inaccuracy: 60,
    mistake: 35,
    blunder: 10,
  };
  return {
    ...verdictBase,
    quality,
    score: scoreByQuality[quality] ?? 80,
    feedback: shortExplanationFixture,
    ...overrides,
  };
}

export const matchingBestVerdictFixture = verdictFixture('excellent', {
  score: 100,
  centipawnLoss: 0,
  matchedChampion: true,
  matchedBest: true,
  userMove: 'Rfd1',
});

export const distinctBestVerdictFixture = verdictFixture('inaccuracy', {
  score: 58,
  centipawnLoss: 74,
  championMove: 'Rfd1',
  championEvalCp: 38,
  bestMove: 'Nb5',
  bestEvalCp: 44,
  feedback: longExplanationFixture,
});

export const sessionSummaryFixture: SessionSummary = {
  totalScore: 812,
  positions: 10,
  championMatches: 3,
  bestMoveMatches: 4,
  averageCentipawnLoss: 36,
  moveQuality: {
    excellent: 2,
    great: 2,
    good: 3,
    inaccuracy: 1,
    mistake: 1,
    blunder: 1,
  },
};

export const challengeErrorFixtures = {
  rejectedMove: 'That move was not accepted. Please try another.',
  quota: 'You have reached today’s Champion Challenge limit.',
  unavailable: 'Could not reach the challenge server. Please try again.',
} as const;

export const challengeStateFixtures = {
  loading: { loading: true, submitting: false, index: 0, total: 10 },
  unanswered: {
    loading: false,
    submitting: false,
    index: 0,
    total: 10,
    current: publicPositionFixture,
    currentVerdict: null,
  },
  submitting: {
    loading: false,
    submitting: true,
    index: 0,
    total: 10,
    current: publicPositionFixture,
    currentVerdict: null,
  },
  answered: {
    loading: false,
    submitting: false,
    index: 0,
    total: 10,
    current: publicPositionFixture,
    currentVerdict: distinctBestVerdictFixture,
  },
  resumed: {
    loading: false,
    submitting: false,
    index: 4,
    total: 10,
    current: nextPositionFixture,
    currentVerdict: null,
  },
  summaryLoading: { loading: false, finished: true, summary: null },
  finished: { loading: false, finished: true, summary: sessionSummaryFixture, remaining: 54 },
  empty: { loading: false, finished: false, current: null },
} as const;
