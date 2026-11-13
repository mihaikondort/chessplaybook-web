import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCE,
  THEME_CHOICE_LIVE,
  THEME_STORAGE_KEY,
  applyTheme,
  hslToHex,
  parsePreference,
  readStoredPreference,
  resolveTheme,
  themeColor,
  writeStoredPreference,
} from './theme';
import { appThemeHead } from './themePrePaint';
import { darkTheme, lightTheme } from '@/design/tokens/color.tokens';
import { darkV2Roles } from '@/design/tokens/designV2.tokens';
import { DESIGN_V2_LIVE } from '@/design/designFlags';
import { designV2ForPath, resolveThemeForPath, themeColorFor } from './themeCore';
/*
  The switches pinned OFF, whatever src/design/designFlags.ts commits: these tests call the theme functions with
  their default arguments and mean today's behaviour by them; every v2 case passes the switches explicitly. With
  the committed value on (the staging commit, redesign plan D2), the defaults made `/` always dark and the
  light-theme tests failed for a reason that is the feature, not a defect.
*/
vi.mock('@/design/designFlags', () => ({ DESIGN_V2_LIVE: false, HOME_V2_LIVE: false }));

describe('theme preference', () => {
  it('accepts the three values and nothing else', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
    expect(parsePreference('system')).toBe('system');
    for (const v of [null, undefined, '', 'Light', 'blue', 1, {}]) expect(parsePreference(v)).toBeNull();
  });

  it('resolves system against the operating system, and only system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  /* A browser that throws on storage must still get a page. */
  it('treats a throwing or garbage store as no choice, and never throws on write', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readStoredPreference(throwing)).toBeNull();
    expect(() => writeStoredPreference('light', throwing)).not.toThrow();
    expect(readStoredPreference({ getItem: () => 'sepia' })).toBeNull();
    expect(readStoredPreference({ getItem: (k: string) => (k === THEME_STORAGE_KEY ? 'light' : null) })).toBe('light');
  });

  it('is dark-only until F3', () => {
    expect(THEME_CHOICE_LIVE).toBe(true);
    expect(DEFAULT_PREFERENCE).toBe('dark');
  });
});

describe('theme-color', () => {
  /* The hand-kept meta said #0d1421; the computed one must agree with it. */
  it('is the page background, computed from the tokens', () => {
    expect(themeColorFor('dark', false)).toBe('#0d1421');
    expect(themeColorFor('dark', false)).toBe(hslToHex(darkTheme.roles.background));
    expect(themeColorFor('light', false)).toBe(hslToHex(lightTheme.roles.background));
  });

  /* Redesign plan B3: with design v2 the frame follows v2's page; light is unchanged (v2 is dark only). */
  it('follows design v2 when it is on, and the switch decides which one ships', () => {
    expect(themeColorFor('dark', true)).toBe(hslToHex(darkV2Roles.background!));
    expect(themeColorFor('dark', true)).not.toBe(themeColorFor('dark', false));
    expect(themeColorFor('light', true)).toBe(themeColorFor('light', false));
    expect(themeColor('dark')).toBe(themeColorFor('dark', DESIGN_V2_LIVE));
  });
});

/** A fresh document holding whatever metas the generated head would add. */
function freshDocument(head: string) {
  const doc = document.implementation.createHTMLDocument('t');
  doc.head.innerHTML = head.replace(/<script>[\s\S]*<\/script>/, '');
  return doc;
}

/** Run the generated script against a document, a store and an OS scheme. */
function runPrePaint(choiceEnabled: boolean, stored: string | null | 'THROW', systemDark: boolean, opts: { path?: string; homeV2?: boolean; designV2?: boolean } = {}) {
  const head = appThemeHead(choiceEnabled, opts.homeV2 ?? false, opts.designV2 ?? false);
  const doc = freshDocument(head);
  const body = head.match(/<script>([\s\S]*)<\/script>/)![1];
  const storage = {
    getItem: () => {
      if (stored === 'THROW') throw new Error('blocked');
      return stored;
    },
  };
  const matchMedia = () => ({ matches: systemDark });
  new Function('localStorage', 'matchMedia', 'document', 'location', body)(storage, matchMedia, doc, { pathname: opts.path ?? '/puzzles' });
  return doc;
}

function snapshot(doc: Document) {
  const r = doc.documentElement;
  return {
    theme: r.getAttribute('data-theme'),
    preference: r.getAttribute('data-theme-preference'),
    colorScheme: r.style.colorScheme,
    metas: [...doc.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute('content')),
  };
}

describe('the pre-paint script agrees with applyTheme', () => {
  const stores = ['light', 'dark', 'system', 'garbage', null, 'THROW'] as const;

  it('with choice on, for every stored value and both OS schemes', () => {
    for (const stored of stores) {
      for (const systemDark of [true, false]) {
        const viaScript = snapshot(runPrePaint(true, stored, systemDark));

        const pref = stored === 'THROW' ? DEFAULT_PREFERENCE : parsePreference(stored) ?? DEFAULT_PREFERENCE;
        const expected = freshDocument(appThemeHead(true));
        applyTheme(expected.documentElement, pref, resolveTheme(pref, systemDark));

        expect(viaScript, `${stored} / system dark ${systemDark}`).toEqual(snapshot(expected));
      }
    }
  });

  /*
    The case that matters until F3: a stored `light` must NOT reach a visitor
    while the light theme is unfinished.
  */
  it('with choice off, always dark whatever is stored', () => {
    for (const stored of stores) {
      for (const systemDark of [true, false]) {
        expect(snapshot(runPrePaint(false, stored, systemDark))).toEqual({
          theme: 'dark',
          preference: 'dark',
          colorScheme: 'dark',
          metas: ['#0d1421'],
        });
      }
    }
  });

  /* B0's amendment: the media-keyed metas follow the OS unless overwritten. */
  it('writes the chosen colour into the media-keyed metas, so a light choice on a dark OS gets light chrome', () => {
    const doc = runPrePaint(true, 'light', true);
    expect(snapshot(doc).metas).toEqual([themeColor('light'), themeColor('light')]);
  });
});

/*
  THE HOMEPAGE RULE (redesign plan C3): with the v2 homepage on, `/` draws dark whatever is stored, with design v2
  and its frame colour; every other page is unchanged; the stored preference is never rewritten. The script and
  the runtime (`resolveThemeForPath`, `applyTheme`) must agree, as everywhere else.
*/
describe('the homepage is always dark while the v2 homepage is on', () => {
  const stores = ['light', 'dark', 'system', 'garbage', null, 'THROW'] as const;

  it('the script and the runtime agree, on / and elsewhere, for every stored value and both OS schemes', () => {
    for (const path of ['/', '/puzzles']) {
      for (const stored of stores) {
        for (const systemDark of [true, false]) {
          const viaScript = snapshot(runPrePaint(true, stored, systemDark, { path, homeV2: true }));
          const pref = stored === 'THROW' ? DEFAULT_PREFERENCE : parsePreference(stored) ?? DEFAULT_PREFERENCE;
          const expected = freshDocument(appThemeHead(true, true, false));
          applyTheme(expected.documentElement, pref, resolveThemeForPath(path, pref, systemDark, true), designV2ForPath(path, true, false));
          expect(viaScript, `${path} ${stored} / system dark ${systemDark}`).toEqual(snapshot(expected));
        }
      }
    }
  });

  it('on /, a stored light gives a dark page in design v2, and keeps the preference', () => {
    const doc = runPrePaint(true, 'light', false, { path: '/', homeV2: true });
    expect(snapshot(doc)).toMatchObject({ theme: 'dark', preference: 'light' });
    expect(doc.documentElement.getAttribute('data-design')).toBe('v2');
    expect(snapshot(doc).metas.every((m) => m === themeColorFor('dark', true))).toBe(true);
  });

  it('elsewhere, a stored light stays light and design v2 is not forced', () => {
    const doc = runPrePaint(true, 'light', false, { path: '/puzzles', homeV2: true });
    expect(snapshot(doc).theme).toBe('light');
    expect(doc.documentElement.getAttribute('data-design')).toBeNull();
  });

  it("with the homepage switch off, the script is exactly today's", () => {
    expect(appThemeHead(true, false, false)).not.toContain('location');
    expect(appThemeHead(true, false, false)).toBe(appThemeHead(true));
    const doc = runPrePaint(true, 'light', false, { path: '/', homeV2: false });
    expect(snapshot(doc).theme).toBe('light');
  });
});
