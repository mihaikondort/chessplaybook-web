/**
 * FIDE World Cup 2025 Tournament Configuration
 *
 * Location: Goa, India
 * Dates: October 31 - November 27, 2025
 * Format: Single Elimination (128 players → 1 winner)
 * Structure: 7 rounds, each with 2 classical games + tiebreaks if needed
 */

import type { TournamentConfig } from '@/types/Tournament';

export const WORLD_CUP_2025_CONFIG: TournamentConfig = {
  // Basic info
  id: 'world-cup-2025',
  name: 'FIDE World Cup 2025',
  shortName: 'World Cup 2025',
  location: 'Goa, India',
  startDate: new Date('2025-10-31'),
  endDate: new Date('2025-11-27'),
  timezone: 'Asia/Kolkata',

  // Format
  format: 'elimination',
  totalRounds: 7,

  // Dynamic tiebreak discovery
  // Maps round numbers to Lichess broadcast tournament IDs for automatic tiebreak detection
  lichessRoundMappings: [
    { roundNumber: 1, lichessTournamentId: 'CBWLKDSY' },
    { roundNumber: 2, lichessTournamentId: 'C8xGMEpX' },
    { roundNumber: 3, lichessTournamentId: 'sOK6GBCf' },
    { roundNumber: 4, lichessTournamentId: 'xLyRWYPA' },
    { roundNumber: 5, lichessTournamentId: 'zb9ruNEJ' },
    { roundNumber: 6, lichessTournamentId: '4Zfj97D4' },  // Quarterfinals
    { roundNumber: 7, lichessTournamentId: '25zoKzpI' },  // Semifinals
    // Note: Finals might have a different ID if structured differently
  ],

  // Game days
  gameDays: [
    // Round 1 (128 → 64)
    {
      slug: 'round-1-game-1',
      roundNumber: 1,
      gameNumber: 1,
      displayName: 'Round 1 - Game 1',
      date: 'November 1, 2025',
      lichessRoundId: 't8DzIZPc',
      startTime: new Date('2025-11-01T09:30:00Z'), // 3:00 PM IST
      estimatedEndTime: new Date('2025-11-01T16:30:00Z'), // 10:00 PM IST
      metadata: {
        matchDescription: 'Round of 128',
      },
    },
    {
      slug: 'round-1-game-2',
      roundNumber: 1,
      gameNumber: 2,
      displayName: 'Round 1 - Game 2',
      date: 'November 2, 2025',
      lichessRoundId: 'NUcmLDqC', // Today's games
      startTime: new Date('2025-11-02T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-02T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 128',
      },
    },
    {
      slug: 'round-1-tiebreaks',
      roundNumber: 1,
      gameNumber: 3,
      displayName: 'Round 1 - Tiebreaks',
      date: 'November 3, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-03T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-03T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 128 - Tiebreaks',
      },
    },

    // Round 2 (64 → 32)
    {
      slug: 'round-2-game-1',
      roundNumber: 2,
      gameNumber: 1,
      displayName: 'Round 2 - Game 1',
      date: 'November 4, 2025',
      lichessRoundId: 'TxNRmm3q',
      startTime: new Date('2025-11-04T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-04T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 64',
      },
    },
    {
      slug: 'round-2-game-2',
      roundNumber: 2,
      gameNumber: 2,
      displayName: 'Round 2 - Game 2',
      date: 'November 5, 2025',
      lichessRoundId: 'g62M1Tov',
      startTime: new Date('2025-11-05T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-05T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 64',
      },
    },
    {
      slug: 'round-2-tiebreaks',
      roundNumber: 2,
      gameNumber: 3,
      displayName: 'Round 2 - Tiebreaks',
      date: 'November 6, 2025',
      lichessRoundId: '5xGjteDw',
      startTime: new Date('2025-11-06T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-06T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 64 - Tiebreaks',
      },
    },

    // Round 3 (32 → 16)
    {
      slug: 'round-3-game-1',
      roundNumber: 3,
      gameNumber: 1,
      displayName: 'Round 3 - Game 1',
      date: 'November 9, 2025',
      lichessRoundId: '14d7M4pI',
      startTime: new Date('2025-11-07T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-07T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 32',
      },
    },
    {
      slug: 'round-3-game-2',
      roundNumber: 3,
      gameNumber: 2,
      displayName: 'Round 3 - Game 2',
      date: 'November 10, 2025',
      lichessRoundId: 'ARRfhqqa',
      startTime: new Date('2025-11-08T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-08T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 32',
      },
    },
    {
      slug: 'round-3-tiebreaks',
      roundNumber: 3,
      gameNumber: 3,
      displayName: 'Round 3 - Tiebreaks',
      date: 'November 11, 2025',
      lichessRoundId: 'GFktTFsa',
      startTime: new Date('2025-09-09T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-09T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 32 - Tiebreaks',
      },
    },

    // Rest day: November 10

    // Round 4 (16 → 8)
    {
      slug: 'round-4-game-1',
      roundNumber: 4,
      gameNumber: 1,
      displayName: 'Round 4 - Game 1',
      date: 'November 13, 2025',
      lichessRoundId: 'JKQGyfeO',
      startTime: new Date('2025-11-11T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-11T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 16',
      },
    },
    {
      slug: 'round-4-game-2',
      roundNumber: 4,
      gameNumber: 2,
      displayName: 'Round 4 - Game 2',
      date: 'November 14, 2025',
      lichessRoundId: 'XOuEW2Zp',
      startTime: new Date('2025-11-12T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-12T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 16',
      },
    },
    {
      slug: 'round-4-tiebreaks',
      roundNumber: 4,
      gameNumber: 3,
      displayName: 'Round 4 - Tiebreaks',
      date: 'November 15, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-13T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-13T16:30:00Z'),
      metadata: {
        matchDescription: 'Round of 16 - Tiebreaks',
      },
    },

    // Rest day: November 16

    // Round 5 - Quarterfinals (8 → 4)
    {
      slug: 'round-5-game-1',
      roundNumber: 5,
      gameNumber: 1,
      displayName: 'Quarterfinals - Game 1',
      date: 'November 17, 2025',
      lichessRoundId: 'GpOvJxdc',
      startTime: new Date('2025-11-14T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-14T16:30:00Z'),
      metadata: {
        matchDescription: 'Quarterfinals',
      },
    },
    {
      slug: 'round-5-game-2',
      roundNumber: 5,
      gameNumber: 2,
      displayName: 'Quarterfinals - Game 2',
      date: 'November 18, 2025',
      lichessRoundId: 'rTASPfGE',
      startTime: new Date('2025-11-15T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-15T16:30:00Z'),
      metadata: {
        matchDescription: 'Quarterfinals',
      },
    },
    {
      slug: 'round-5-tiebreaks',
      roundNumber: 5,
      gameNumber: 3,
      displayName: 'Quarterfinals - Tiebreaks',
      date: 'November 19, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-16T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-16T16:30:00Z'),
      metadata: {
        matchDescription: 'Quarterfinals - Tiebreaks',
      },
    },

    // Rest day: November 20

    // Round 6 - Semifinals (4 → 2)
    {
      slug: 'round-6-game-1',
      roundNumber: 6,
      gameNumber: 1,
      displayName: 'Quarterfinals - Game 1',
      date: 'November 21, 2025',
      lichessRoundId: '5vdfH3Tr',
      startTime: new Date('2025-11-17T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-17T16:30:00Z'),
      metadata: {
        matchDescription: 'Semifinals',
      },
    },
    {
      slug: 'round-6-game-2',
      roundNumber: 6,
      gameNumber: 2,
      displayName: 'Quarterfinals - Game 2',
      date: 'November 22, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-18T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-18T16:30:00Z'),
      metadata: {
        matchDescription: 'Semifinals',
      },
    },
    {
      slug: 'round-6-tiebreaks',
      roundNumber: 6,
      gameNumber: 3,
      displayName: 'Quarterfinals - Tiebreaks',
      date: 'November 23, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-19T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-19T16:30:00Z'),
      metadata: {
        matchDescription: 'Semifinals - Tiebreaks',
      },
    },

    // Rest day: November 24

    // Round 7 - Finals (2 → 1)
    {
      slug: 'round-7-game-1',
      roundNumber: 7,
      gameNumber: 1,
      displayName: 'Finals - Game 1',
      date: 'November 25, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-25T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-25T16:30:00Z'),
      metadata: {
        matchDescription: 'Finals',
      },
    },
    {
      slug: 'round-7-game-2',
      roundNumber: 7,
      gameNumber: 2,
      displayName: 'Finals - Game 2',
      date: 'November 26, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-26T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-26T16:30:00Z'),
      metadata: {
        matchDescription: 'Finals',
      },
    },
    {
      slug: 'round-7-tiebreaks',
      roundNumber: 7,
      gameNumber: 3,
      displayName: 'Finals - Tiebreaks',
      date: 'November 27, 2025',
      lichessRoundId: null,
      startTime: new Date('2025-11-27T09:30:00Z'),
      estimatedEndTime: new Date('2025-11-27T16:30:00Z'),
      metadata: {
        matchDescription: 'Finals - Tiebreaks',
      },
    },
  ],
};
