import type { Player, PlayersMap } from '@/types/chess';
import type { Champion } from '@/pages/Champions';

export const championGalleryPlayersFixture: PlayersMap = {
  Gukesh: {
    fullName: 'Dommaraju Gukesh',
    imagePath: 'assets/images/champions/Gukesh.webp',
    championshipYears: 'World Champion 2024-Present',
    biography: 'The youngest world chess champion in history.',
  },
  Capablanca: {
    fullName: 'José Raúl Capablanca',
    imagePath: 'assets/images/champions/Capablanca.webp',
    championshipYears: 'World Champion 1921-1927',
    biography: 'A long fixture biography that reserves enough content to exercise the final three-line gallery-card rhythm without introducing production-only fixture data.',
  },
};

export const championGalleryApiUpgradeFixture: PlayersMap = {
  ...championGalleryPlayersFixture,
  Gukesh: {
    ...championGalleryPlayersFixture.Gukesh,
    biography: 'API-upgraded champion biography.',
  },
};

export const championGalleryFixture: Champion[] = Object.entries(
  championGalleryPlayersFixture,
).map(([name, player]) => ({ name, ...player }));

export const longChampionFixture: Champion = {
  name: 'Botvinnik',
  fullName: 'Mikhail Moiseyevich Botvinnik',
  imagePath: 'assets/images/champions/Botvinnik.webp',
  championshipYears: 'World Champion 1948-1957, 1958-1960, 1961-1963',
  biography: 'A deliberately long deterministic biography used to test stable card height, wrapping and clamping across every acceptance viewport without altering the production roster.',
};

export const failedPortraitPlayerFixture: Player = {
  fullName: 'Portrait Failure Fixture',
  imagePath: 'assets/images/champions/missing.webp',
  championshipYears: 'World Champion 1900-1901',
  biography: 'Fixture used to exercise the image error boundary.',
};
