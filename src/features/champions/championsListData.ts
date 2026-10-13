import type { Player, PlayersMap } from '@/types/chess';
import type { ChampionListEntry } from './components/ChampionChronologyRow';

const countryNames: Record<string, string> = {
  Gukesh: 'India', Ding: 'China', Carlsen: 'Norway', Anand: 'India',
  Kramnik: 'Russia', Kasparov: 'Russia', Karpov: 'Russia', Fischer: 'United States',
  Spassky: 'Russia', Petrosian: 'Armenia/USSR', Tal: 'Latvia/USSR', Smyslov: 'USSR',
  Botvinnik: 'USSR', Euwe: 'Netherlands', Alekhine: 'Russia/France',
  Capablanca: 'Cuba', Lasker: 'Germany', Steinitz: 'Austria',
};

const countryCodes: Record<string, string> = {
  Gukesh: 'in', Ding: 'cn', Carlsen: 'no', Anand: 'in', Kramnik: 'ru',
  Kasparov: 'ru', Karpov: 'ru', Fischer: 'us', Spassky: 'ru', Petrosian: 'am',
  Tal: 'lv', Smyslov: 'ru', Botvinnik: 'ru', Euwe: 'nl', Alekhine: 'ru',
  Capablanca: 'cu', Lasker: 'de', Steinitz: 'at',
};

export const CHAMPIONS_LIST_QUERY_KEY = ['champions-list'] as const;
export const CHAMPIONS_LIST_STALE_TIME = 5 * 60 * 1000;
export const CHAMPIONS_LIST_GC_TIME = 30 * 60 * 1000;

export const parseChampionsList = (data: PlayersMap): ChampionListEntry[] =>
  Object.entries(data).map(([name, info]: [string, Player]) => ({
    name,
    fullName: info.fullName,
    championshipYears: info.championshipYears,
    biography: info.biography,
    countryName: countryNames[name] ?? 'Unknown',
    countryCode: countryCodes[name],
  }));

export const fetchChampionsList = async (): Promise<ChampionListEntry[]> => {
  const response = await fetch('/assets/players/players_list.json');
  if (!response.ok) throw new Error('Failed to load champions data');
  return parseChampionsList(await response.json() as PlayersMap);
};
