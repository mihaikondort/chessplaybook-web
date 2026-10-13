import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/*
  NO RAW COLOUR (layout redesign B6). After the B5 sweep every colour in the
  app is a role from `color.tokens.ts`, so it changes with the theme. This
  holds that: a raw Tailwind palette class, a raw `white`/`black`, a
  hand-written colour inside a class (`bg-[#05070c]`), or a `dark:` variant in
  a component fails here, with the file and line.

  SCOPED BY RULE, not by a growing allowlist. Each exemption below names WHY,
  and an exemption whose file no longer exists fails the test, so the Phase E
  exemptions disappear on their own when E deletes those files.
*/

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PREFIX = 'bg|text|border|from|to|via|ring|ring-offset|fill|stroke|outline|divide|placeholder|decoration|accent|caret';
const RULES: [string, RegExp][] = [
  ['raw palette colour', new RegExp(`\\b(?:[a-z-]+:)*(?:${PREFIX})-(?:${PALETTE})-\\d{2,3}\\b`, 'g')],
  ['raw white/black', new RegExp(`\\b(?:[a-z-]+:)*(?:${PREFIX})-(?:white|black)\\b`, 'g')],
  ['hand-written colour in a class', /-\[(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(\d)/g],
  ['dark: variant (a colour that differs by theme is a token)', /\bdark:[a-z]/g],
  /*
    F4 (2026-10-12), three ways a colour went wrong in light that the rules above
    could not see, each found on the owner's screen in F1:
    - an inline style literal: "What matters now" drew its label in
      `style={{ color: 'hsl(38 70% 28%)' }}`, 2.57:1 on the light sheet;
    - `text-primary` as text: the button FILL as text is 2:1 in light, and 343
      uses had it; gold text is `text-link`;
    - an opacity on a text role (D18): `text-muted-foreground/60` dims a valid
      colour under AA. Icons are exempt (3:1, see TEXT_DIM_EXEMPT_LINE).
  */
  ['inline colour literal (use a role)', /\b(?:color|backgroundColor|background|borderColor|fill|stroke|outlineColor)\s*:\s*['"`](?:#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(\d)/g],
  ['text-primary as text (gold text is text-link)', /(?<![\w-])(?:[\w[\]&:\-/.]*:)?text-primary(?![\w-])/g],
];
/* An opacity on a text role, unless the line draws an icon (a capitalised
   component, or `aria-hidden`): icons need 3:1, and keep it at 70-80%. */
const TEXT_DIM = /(?<![\w-])(?:[\w[\]&:\-/.]*:)?text-(?:muted-foreground|link)\/\d+/g;
const TEXT_DIM_EXEMPT_LINE = /<[A-Z]\w*[\s>]|aria-hidden/;

/*
  WHOLE-FILE EXEMPTIONS, each a rule with a reason and an end.
*/
const EXEMPT_FILES: Record<string, string> = {
  // Owner, 2026-10-03: keep the live-event banner as it is for now (D17).
  'src/components/LiveEventBanner.tsx': 'D17, owner decision',
};
const EXEMPT_DIRS: Record<string, string> = {
};

/* Theme-neutral uses that are allowed anywhere. */
const ALLOWED = [
  /\bshadow-black(?:\/\d+)?\b/, // a black shadow is a shadow in both themes
];

function stripComments(src: string): string {
  // Block and JSX comments, then line comments not inside a URL.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name).replace(/\\/g, '/');
    if (e.isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });

describe('no raw colour in app code', () => {
  const files = walk('src');

  it('looked at the tree', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('every exemption still names a file or folder that exists', () => {
    for (const f of [...Object.keys(EXEMPT_FILES), ...Object.keys(EXEMPT_DIRS)]) {
      expect(existsSync(f), `${f} is exempt but gone: remove the exemption`).toBe(true);
    }
  });

  it('finds no raw colour outside the exemptions', () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (f in EXEMPT_FILES || Object.keys(EXEMPT_DIRS).some((d) => f.startsWith(d))) continue;
      const lines = stripComments(readFileSync(f, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        let text = line;
        for (const a of ALLOWED) text = text.replace(new RegExp(a.source, 'g'), '');
        for (const [rule, re] of RULES) {
          for (const m of text.match(re) ?? []) offenders.push(`${f}:${i + 1}  ${rule}: ${m}`);
        }
        if (!TEXT_DIM_EXEMPT_LINE.test(text)) {
          for (const m of text.match(TEXT_DIM) ?? []) offenders.push(`${f}:${i + 1}  dimmed text role (D18; use the role at full strength): ${m}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('the F4 rules catch what they name', () => {
  const hit = (rule: string, sample: string) => {
    const re = RULES.find(([name]) => name.startsWith(rule))![1];
    return new RegExp(re.source).test(sample);
  };
  it('an inline colour literal', () => {
    expect(hit('inline colour literal', "style={{ color: 'hsl(38 70% 28%)' }}")).toBe(true);
    expect(hit('inline colour literal', "style={{ backgroundColor: '#05070c' }}")).toBe(true);
    expect(hit('inline colour literal', "style={{ color: 'hsl(var(--link))' }}")).toBe(false);
  });
  it('text-primary as text, not its foreground', () => {
    expect(hit('text-primary as text', 'className="hover:text-primary"')).toBe(true);
    expect(hit('text-primary as text', 'className="text-primary-foreground"')).toBe(false);
  });
  it('a dimmed text role, except on an icon', () => {
    expect(new RegExp(TEXT_DIM.source).test('<p className="text-muted-foreground/60 text-sm">')).toBe(true);
    expect(TEXT_DIM_EXEMPT_LINE.test('<Cloud className="text-muted-foreground/70" />')).toBe(true);
    expect(TEXT_DIM_EXEMPT_LINE.test('<p className="text-muted-foreground/60">')).toBe(false);
  });
});
