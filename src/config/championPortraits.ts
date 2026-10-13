/**
 * The champion portraits (#68): one studio-style portrait per World Champion,
 * from a Wikimedia Commons photo taken in his prime, aligned on the eyes,
 * cut out, toned to one black and white and set on a navy disc.
 *
 * THE FOLDER IS VERSIONED BECAUSE THE CACHE IS IMMUTABLE. `deploy.sh` uploads
 * everything under `assets/` with `max-age=31536000, immutable` (only `pgn/`,
 * `players/` and `news/` are exempt), so a file replaced under the same name
 * stays in returning visitors' browsers for a year. Changing a portrait means
 * a new folder (`portraits-v2`) and a change here, never an overwrite.
 *
 * Two places name these files: `public/assets/players/players_list.json`
 * (static, cannot import this) and the API fallback in `BackendAPIClient`. A
 * test pins the JSON to `portraitPath` and checks every file exists.
 */
export const PORTRAIT_DIR = 'assets/images/champions/portraits-v1';

/** `Gukesh` -> `assets/images/champions/portraits-v1/Gukesh.webp`. Keys as in players_list.json. */
export function portraitPath(name: string): string {
  return `${PORTRAIT_DIR}/${name}.webp`;
}

export interface PortraitCredit {
  /** Key in players_list.json. */
  champion: string;
  /** Year the photo was taken, or null when the source does not date it. */
  year: number | null;
  /** Photographer, studio or archive, as Commons records it. */
  author: string;
  licence: string;
  /** Licence deed, or null for public domain. */
  licenceUrl: string | null;
  /** The file's Commons page. */
  source: string;
}

/**
 * Credits for the Credits page. CC BY and CC BY-SA require the author and the
 * licence to be shown; the public domain and CC0 ones are credited anyway.
 */
export const PORTRAIT_CREDITS: PortraitCredit[] = [
  { champion: 'Gukesh', year: 2024, author: 'Eldar Azimov', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:Alireza_Firouzja_-_Gukesh_D,_Candidates_Tournament_2024_03_(cropped1).jpg' },
  { champion: 'Ding', year: 2026, author: 'TheBoburshokh', licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Ding_Liren_at_the_46th_FIDE_Chess_Olympiad.jpg' },
  { champion: 'Carlsen', year: 2012, author: 'Autopilot', licence: 'CC BY-SA 3.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0', source: 'https://commons.wikimedia.org/wiki/File:Magnus_Carlsen_(2012)_cropped.jpg' },
  { champion: 'Anand', year: 2008, author: 'Georgios Souleidis', licence: 'CC BY 2.0', licenceUrl: 'https://creativecommons.org/licenses/by/2.0', source: 'https://commons.wikimedia.org/wiki/File:Viswanathan_Anand.jpg' },
  { champion: 'Kramnik', year: 2008, author: 'Ygrek', licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/3.0', source: 'https://commons.wikimedia.org/wiki/File:KramnikWM2008.Presse.Konf.jpg' },
  { champion: 'Kasparov', year: 1987, author: 'Somorjai Zsolt', licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:Garry_Kasparov_-_1987_-_2.jpg' },
  { champion: 'Karpov', year: 1979, author: 'Rob Croes for Anefo, Nationaal Archief', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:4e_Ronde,_Anatoli_Karpov_achter_het_schaakbord,_Bestanddeelnr_930-5266.jpg' },
  { champion: 'Fischer', year: 1972, author: 'Bert Verhoeff for Anefo, Nationaal Archief', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Bobby_Fischer_1972.jpg' },
  { champion: 'Spassky', year: 1956, author: 'Herbert Behrens for Anefo, Nationaal Archief', licence: 'CC BY-SA 3.0 NL', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en', source: 'https://commons.wikimedia.org/wiki/File:Boris_Spasski_(1956)_-_corrected.jpg' },
  { champion: 'Petrosian', year: 1962, author: 'Harry Pot for Anefo, Nationaal Archief', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Tigran_Petrosian_1962.2.jpg' },
  { champion: 'Tal', year: 1962, author: 'Harry Pot for Anefo, Nationaal Archief', licence: 'CC BY-SA 3.0 NL', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en', source: 'https://commons.wikimedia.org/wiki/File:Mikhail_Tal_1962.jpg' },
  { champion: 'Smyslov', year: 1954, author: 'van Duinen for Anefo, Nationaal Archief', licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', source: 'https://commons.wikimedia.org/wiki/File:Vassily_Smyslov_in_1954.jpg' },
  { champion: 'Botvinnik', year: 1936, author: 'Anefo, Nationaal Archief', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Botvinnik_1936.jpg' },
  { champion: 'Euwe', year: 1936, author: 'Atelier Jacob Merkelbach', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Jacob_Merkelbach,_Afb_B00000002108.jpg' },
  { champion: 'Alekhine', year: 1924, author: 'George Grantham Bain Collection, Library of Congress', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Alexandre_Alekhine_01.jpg' },
  { champion: 'Capablanca', year: 1921, author: 'Agence Rol', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Jos%C3%A9_Ra%C3%BAl_Capablanca_1921.jpg' },
  { champion: 'Lasker', year: 1896, author: 'Photographer not recorded', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Lasker,_Emanuel_-3_-_DPLA_-_f013f46242be9148b0dc1480aa6b1455.jpg' },
  { champion: 'Steinitz', year: null, author: 'Dore', licence: 'Public domain', licenceUrl: null, source: 'https://commons.wikimedia.org/wiki/File:Steinitz,_William_-5_-_DPLA_-_e9b896c075dbf5da3e7bade985bfdeaa.jpg' },
];
