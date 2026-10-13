import type { PlayersMap } from '@/types/chess';

const roster = [
  ['Gukesh', 'Dommaraju Gukesh', 'World Champion 2024-Present'], ['Ding', 'Ding Liren', 'World Champion 2023-2024'],
  ['Carlsen', 'Magnus Carlsen', 'World Champion 2013-2023'], ['Anand', 'Viswanathan Anand', 'World Champion 2000-2002, 2007-2013'],
  ['Kramnik', 'Vladimir Kramnik', 'World Champion 2000-2007'], ['Kasparov', 'Garry Kasparov', 'World Champion 1985-2000'],
  ['Karpov', 'Anatoly Karpov', 'World Champion 1975-1985'], ['Fischer', 'Bobby Fischer', 'World Champion 1972-1975'],
  ['Spassky', 'Boris Spassky', 'World Champion 1969-1972'], ['Petrosian', 'Tigran Petrosian', 'World Champion 1963-1969'],
  ['Tal', 'Mikhail Tal', 'World Champion 1960-1961'], ['Smyslov', 'Vasily Smyslov', 'World Champion 1957-1958'],
  ['Botvinnik', 'Mikhail Botvinnik', 'World Champion 1948-1957, 1958-1960, 1961-1963'], ['Euwe', 'Max Euwe', 'World Champion 1935-1937'],
  ['Alekhine', 'Alexander Alekhine', 'World Champion 1927-1935, 1937-1946'], ['Capablanca', 'José Raúl Capablanca', 'World Champion 1921-1927'],
  ['Lasker', 'Emanuel Lasker', 'World Champion 1894-1921'], ['Steinitz', 'Wilhelm Steinitz', 'World Champion 1886-1894'],
] as const;

export const championsListPlayersFixture = Object.fromEntries(roster.map(([name, fullName, championshipYears]) => [name, {
  fullName, championshipYears, biography: `${fullName} biography`, imagePath: `assets/players/${name}.jpg`,
}])) as PlayersMap;
