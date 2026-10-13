import { describe, expect, it } from 'vitest';
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
    expect(themeColor('dark')).toBe('#0d1421');
    expect(themeColor('dark')).toBe(hslToHex(darkTheme.roles.background));
    expect(themeColor('light')).toBe(hslToHex(lightTheme.roles.background));
  });
});

/** A fresh document holding whatever metas the generated head would add. */
function freshDocument(head: string) {
  const doc = document.implementation.createHTMLDocument('t');
  doc.head.innerHTML = head.replace(/<script>[\s\S]*<\/script>/, '');
  return doc;
}

/** Run the generated script against a document, a store and an OS scheme. */
function runPrePaint(choiceEnabled: boolean, stored: string | null | 'THROW', systemDark: boolean) {
  const head = appThemeHead(choiceEnabled);
  const doc = freshDocument(head);
  const body = head.match(/<script>([\s\S]*)<\/script>/)![1];
  const storage = {
    getItem: () => {
      if (stored === 'THROW') throw new Error('blocked');
      return stored;
    },
  };
  const matchMedia = () => ({ matches: systemDark });
  new Function('localStorage', 'matchMedia', 'document', body)(storage, matchMedia, doc);
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
