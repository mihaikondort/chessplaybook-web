/**
 * FIDE Candidates Tournament 2026 Configuration
 *
 * Location: Paphos, Cyprus (Cap St George's Hotel & Resort)
 * Dates: March 29 - April 16, 2026
 * Format: Double Round-Robin (14 rounds, 8 players)
 * Time Control: 120 min/40 moves + 30 min, 30s increment from move 41
 *
 * Lichess Broadcast (Open): https://lichess.org/broadcast/fide-candidates-2026-open/BLA70Vds
 * Lichess Broadcast (Women): https://lichess.org/broadcast/fide-candidates-2026-women/xj4qM8Nw
 *
 * Open Players: Nakamura, Caruana, Wei Yi, Giri, Sindarov, Praggnanandhaa, Esipenko, Bluebaum
 * Women Players: TBD
 *
 * Rest days: April 2, 6, 10, 13
 */

import type { TournamentConfig } from '@/types/Tournament';

export const CANDIDATES_2026_CONFIG: TournamentConfig = {
  // Basic info
  id: 'candidates-2026',
  name: 'FIDE Candidates Tournament 2026',
  shortName: 'Candidates 2026',
  location: 'Paphos, Cyprus',
  startDate: new Date('2026-03-29'),
  endDate: new Date('2026-04-16'),
  timezone: 'Asia/Nicosia',

  // Format
  format: 'round-robin',
  totalRounds: 14,

  // FIDE official YouTube channel for live commentary embed
  youtubeChannelId: 'UC9B47GnzCRFHTT1BIBWvStQ',

  // Game days - all 14 rounds with Lichess broadcast round IDs
  // Start time: 15:30 local Cyprus time (UTC+2 in March = 13:30 UTC)
  gameDays: [
    {
      slug: 'round-1',
      roundNumber: 1,
      displayName: 'Round 1',
      date: 'March 29, 2026',
      lichessRoundId: 'uLCZwqAK',
      womenLichessRoundId: 'diPdGkEA',
      youtubeVideoId: 'w9x8ddIHRj8',
      womenYoutubeVideoId: 'xO2bRPeGdio',
      startTime: new Date('2026-03-29T13:30:00Z'),
      estimatedEndTime: new Date('2026-03-29T20:00:00Z'),
      metadata: {
        matchDescription: 'Sindarov-Esipenko, Bluebaum-Wei Yi, Pragg-Giri, Caruana-Nakamura',
      },
    },
    {
      slug: 'round-2',
      roundNumber: 2,
      displayName: 'Round 2',
      date: 'March 30, 2026',
      lichessRoundId: 'FRTlzP2X',
      womenLichessRoundId: 'EMkf0c6e',
      youtubeVideoId: 'yTj7pdcdDDQ',
      womenYoutubeVideoId: 'yTj7pdcdDDQ',
      startTime: new Date('2026-03-30T13:30:00Z'),
      estimatedEndTime: new Date('2026-03-30T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Nakamura, Giri-Caruana, Wei Yi-Pragg, Sindarov-Bluebaum',
      },
    },
    {
      slug: 'round-3',
      roundNumber: 3,
      displayName: 'Round 3',
      date: 'March 31, 2026',
      lichessRoundId: 'SDizieNR',
      womenLichessRoundId: '2qEm9CH3',
      youtubeVideoId: 'HSuoogTG-hI',
      womenYoutubeVideoId: 'HSuoogTG-hI',
      startTime: new Date('2026-03-31T13:30:00Z'),
      estimatedEndTime: new Date('2026-03-31T20:00:00Z'),
      metadata: {
        matchDescription: 'Bluebaum-Esipenko, Pragg-Sindarov, Caruana-Wei Yi, Nakamura-Giri',
      },
    },
    {
      slug: 'round-4',
      roundNumber: 4,
      displayName: 'Round 4',
      date: 'April 1, 2026',
      lichessRoundId: '97di6JjX',
      womenLichessRoundId: 'MDv2BlCp',
      youtubeVideoId: 'Ug2Yp4Y6oHM',
      womenYoutubeVideoId: 'Ug2Yp4Y6oHM',
      startTime: new Date('2026-04-01T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-01T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Giri, Wei Yi-Nakamura, Sindarov-Caruana, Bluebaum-Pragg',
      },
    },
    // Rest day: April 2
    {
      slug: 'round-5',
      roundNumber: 5,
      displayName: 'Round 5',
      date: 'April 3, 2026',
      lichessRoundId: 'liBI9Brw',
      womenLichessRoundId: 'VAELuM6E',
      youtubeVideoId: 'DV1t49YFHLY',
      startTime: new Date('2026-04-03T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-03T20:00:00Z'),
      metadata: {
        matchDescription: 'Pragg-Esipenko, Caruana-Bluebaum, Nakamura-Sindarov, Giri-Wei Yi',
      },
    },
    {
      slug: 'round-6',
      roundNumber: 6,
      displayName: 'Round 6',
      date: 'April 4, 2026',
      lichessRoundId: 'WmbQrSNz',
      womenLichessRoundId: 'hmGcNp3P',
      startTime: new Date('2026-04-04T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-04T20:00:00Z'),
      metadata: {
        matchDescription: 'Caruana-Esipenko, Nakamura-Pragg, Giri-Bluebaum, Wei Yi-Sindarov',
      },
    },
    {
      slug: 'round-7',
      roundNumber: 7,
      displayName: 'Round 7',
      date: 'April 5, 2026',
      lichessRoundId: 'aVbIuZ7Q',
      womenLichessRoundId: 'QqBr2Kpr',
      youtubeVideoId: 'ViSAymeoGiU',
      startTime: new Date('2026-04-05T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-05T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Wei Yi, Sindarov-Giri, Bluebaum-Nakamura, Pragg-Caruana',
      },
    },
    // Rest day: April 6
    {
      slug: 'round-8',
      roundNumber: 8,
      displayName: 'Round 8',
      date: 'April 7, 2026',
      lichessRoundId: 'XYRPyV8x',
      womenLichessRoundId: 'R0BP4Jy4',
      youtubeVideoId: 'cGadB2D4UuU',
      startTime: new Date('2026-04-07T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-07T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Sindarov, Wei Yi-Bluebaum, Giri-Pragg, Nakamura-Caruana',
      },
    },
    {
      slug: 'round-9',
      roundNumber: 9,
      displayName: 'Round 9',
      date: 'April 8, 2026',
      lichessRoundId: 'hTVc2Qgj',
      womenLichessRoundId: '6Ukl08Ir',
      youtubeVideoId: 'SDBZJ3i_4fs',
      startTime: new Date('2026-04-08T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-08T20:00:00Z'),
      metadata: {
        matchDescription: 'Nakamura-Esipenko, Caruana-Giri, Pragg-Wei Yi, Bluebaum-Sindarov',
      },
    },
    {
      slug: 'round-10',
      roundNumber: 10,
      displayName: 'Round 10',
      date: 'April 9, 2026',
      lichessRoundId: 'G3oSxPgs',
      womenLichessRoundId: 'Es2IjSwE',
      startTime: new Date('2026-04-09T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-09T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Bluebaum, Sindarov-Pragg, Wei Yi-Caruana, Giri-Nakamura',
      },
    },
    // Rest day: April 10
    {
      slug: 'round-11',
      roundNumber: 11,
      displayName: 'Round 11',
      date: 'April 11, 2026',
      lichessRoundId: 'seMTFSPr',
      womenLichessRoundId: 'fDNFUpG9',
      startTime: new Date('2026-04-11T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-11T20:00:00Z'),
      metadata: {
        matchDescription: 'Giri-Esipenko, Nakamura-Wei Yi, Caruana-Sindarov, Pragg-Bluebaum',
      },
    },
    {
      slug: 'round-12',
      roundNumber: 12,
      displayName: 'Round 12',
      date: 'April 12, 2026',
      lichessRoundId: '9SHysZuu',
      womenLichessRoundId: 'u3pemMHq',
      startTime: new Date('2026-04-12T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-12T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Pragg, Bluebaum-Caruana, Sindarov-Nakamura, Wei Yi-Giri',
      },
    },
    // Rest day: April 13
    {
      slug: 'round-13',
      roundNumber: 13,
      displayName: 'Round 13',
      date: 'April 14, 2026',
      lichessRoundId: 'rFG1W5Tp',
      womenLichessRoundId: 'o7DgltDn',
      startTime: new Date('2026-04-14T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-14T20:00:00Z'),
      metadata: {
        matchDescription: 'Wei Yi-Esipenko, Giri-Sindarov, Nakamura-Bluebaum, Caruana-Pragg',
      },
    },
    {
      slug: 'round-14',
      roundNumber: 14,
      displayName: 'Round 14',
      date: 'April 15, 2026',
      lichessRoundId: 'oBkeHnpi',
      womenLichessRoundId: 'dllZX7eJ',
      startTime: new Date('2026-04-15T13:30:00Z'),
      estimatedEndTime: new Date('2026-04-15T20:00:00Z'),
      metadata: {
        matchDescription: 'Esipenko-Caruana, Pragg-Nakamura, Bluebaum-Giri, Sindarov-Wei Yi',
      },
    },
  ],
};
