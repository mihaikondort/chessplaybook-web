/**
 * The champion page content around the game tables (2026-11-11 pilot, Gukesh
 * and Tal). Written text comes from src/config/champion-content.json, the
 * facts from src/config/champion-facts.json (a dated snapshot of the CLASSICAL
 * games in our collection; scripts/champion-facts). Both are bundled, so this
 * renders at once, without waiting for the game list (Fable review, M6).
 *
 * Only champions with an entry in champion-content.json get these blocks.
 */
import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { portraitPath } from '@/config/championPortraits';
import content from '@/config/champion-content.json';
import factsFile from '@/config/champion-facts.json';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TitleMatch { year: string; opponent: string; opponentSlug?: string; place: string; score: string; result: string }
interface ChampionContent {
  name: string;
  reign: string;
  intro: string;
  about: string[];
  titleMatches: TitleMatch[];
  faq: { q: string; a: string }[];
  bestGamesNote?: string;
  sameAs?: string[];
}
interface Split { w: number; d: number; l: number; games?: number; scorePct: number | null }
interface OpeningRow extends Split { name: string; games: number }
interface OpponentRow extends Split { name: string; champion: string | null; games: number }
interface ChampionFacts {
  name: string;
  gamesInCollection: number;
  gamesByType: Record<string, number>;
  classicalGames: number;
  years: { from: number; to: number } | null;
  record: Split & { unknown: number };
  asWhite: Split;
  asBlack: Split;
  openings: { white: OpeningRow[]; black: OpeningRow[] };
  topOpponents: OpponentRow[];
  vsChampions: OpponentRow[];
  topEvents: { name: string; games: number }[];
}

const CONTENT = content as unknown as Record<string, ChampionContent>;
const FACTS = (factsFile as unknown as { generatedAt: string; champions: Record<string, ChampionFacts> });

export function getChampionContent(slug?: string): ChampionContent | null {
  return slug && CONTENT[slug] && !slug.startsWith('_') ? CONTENT[slug] : null;
}
export function getChampionFacts(slug?: string): ChampionFacts | null {
  return slug ? FACTS.champions[slug] ?? null : null;
}

/**
 * The champion's portrait, the same file the /champions gallery shows
 * (config/championPortraits.ts). Fixed size so the heading does not move when
 * it loads; hidden if the file fails.
 */
export function ChampionPortrait({ slug, name }: { slug?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!slug || failed) return null;
  const key = slug.charAt(0).toUpperCase() + slug.slice(1);
  return (
    <img
      src={`/${portraitPath(key)}`}
      alt={name}
      width={112}
      height={112}
      onError={() => setFailed(true)}
      className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-full object-contain bg-muted"
    />
  );
}

/** Turns [[game:ID|text]] and [[champion:slug|text]] into links. */
export function RichText({ text, gameHref }: { text: string; gameHref: (id: number) => string | null }) {
  const parts: ReactNode[] = [];
  const re = /\[\[(game|champion):([^|\]]+)\|([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const [, kind, ref, label] = m;
    const href = kind === 'game' ? gameHref(Number(ref)) : `/champions/${ref}/games`;
    parts.push(href
      ? <Link key={m.index} to={href} className="text-link hover:underline">{label}</Link>
      : <Fragment key={m.index}>{label}</Fragment>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
const fmt = (n: number) => n.toLocaleString('en-GB');
const wdl = (s: Split) => `${fmt(s.w)} won, ${fmt(s.d)} drawn, ${fmt(s.l)} lost`;
/** "Gukesh, D" style names in our data read "Gukesh, D"; keep the comma spacing. */
const playerName = (n: string) => n.replace(/,(?!\s)/g, ', ');

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Above the table: the intro and the key facts. */
export function ChampionIntro({ slug }: { slug?: string }) {
  const c = getChampionContent(slug);
  const f = getChampionFacts(slug);
  if (!c || !f) return null;
  return (
    <div className="mb-6">
      <p className="text-lg text-foreground max-w-4xl">{c.intro}</p>
      <JumpLinks name={c.name} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl">
        <Stat label="Classical games" value={fmt(f.classicalGames)}
          sub={f.years ? `${f.years.from} to ${f.years.to}` : undefined} />
        <Stat label="Score" value={pct(f.record.scorePct)} sub={wdl(f.record)} />
        <Stat label="With White" value={pct(f.asWhite.scorePct)} sub={`${fmt(f.asWhite.games ?? 0)} games`} />
        <Stat label="With Black" value={pct(f.asBlack.scorePct)} sub={`${fmt(f.asBlack.games ?? 0)} games`} />
        <Stat label="All games" value={fmt(f.gamesInCollection)} sub="every time control" />
      </div>
    </div>
  );
}

/** The sections below the table, in page order, for the jump links above it. */
const SECTIONS = [
  { id: 'about', label: (name: string) => `About ${name.split(' ')[0]}` },
  { id: 'title-matches', label: () => 'Title matches' },
  { id: 'openings', label: () => 'Openings' },
  { id: 'opponents', label: () => 'Opponents' },
  { id: 'questions', label: () => 'Questions' },
];

function JumpLinks({ name }: { name: string }) {
  return (
    <nav aria-label="On this page" className="mt-4 mb-5 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">Read more below the games:</span>
      {SECTIONS.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={e => {
            // Scroll in place: a hash change would be a route change, and the
            // site scrolls to the top on those.
            e.preventDefault();
            document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm text-link hover:bg-primary/20 transition-colors"
        >
          {s.label(name)}
        </a>
      ))}
    </nav>
  );
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="bg-card border-border mt-6 scroll-mt-24">
      <CardHeader><CardTitle className="text-link text-2xl font-normal">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const cell = 'py-2 px-2 text-sm sm:text-base';
const head = 'text-left py-2 px-2 text-muted-foreground font-semibold text-xs sm:text-sm';

function OpeningsTable({ rows, colour }: { rows: OpeningRow[]; colour: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">With {colour}</h3>
      <table className="w-full">
        <thead><tr className="border-b border-border"><th className={head}>Opening</th><th className={head}>Games</th><th className={head}>Score</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className="border-b border-border/50">
              <td className={cell}>{r.name}</td><td className={cell}>{fmt(r.games)}</td><td className={cell}>{pct(r.scorePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Below the table: who the champion was, and what the games show. */
export function ChampionDetails({ slug, gameHref }: { slug?: string; gameHref: (id: number) => string | null }) {
  const c = getChampionContent(slug);
  const f = getChampionFacts(slug);
  if (!c || !f || !slug) return null;
  const other = (f.gamesByType.fast ?? 0);
  const online = (f.gamesByType.online ?? 0);
  const exhibition = (f.gamesByType.exhibition ?? 0);
  const leftOut = [
    other ? `${fmt(other)} rapid and blitz` : null,
    online ? `${fmt(online)} online` : null,
    exhibition ? `${fmt(exhibition)} simul and exhibition` : null,
  ].filter(Boolean).join(', ');
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: c.name,
    description: c.intro,
    ...(c.sameAs?.length ? { sameAs: c.sameAs } : {}),
  };

  return (
    <div>
      <script type="application/ld+json">{JSON.stringify(personLd)}</script>

      <Section id="about" title={`About ${c.name}`}>
        <div className="space-y-4 max-w-4xl text-foreground">
          {c.about.map((p, i) => <p key={i}><RichText text={p} gameHref={gameHref} /></p>)}
        </div>
      </Section>

      <Section id="title-matches" title="World Championship matches">
        <table className="w-full max-w-3xl">
          <thead><tr className="border-b border-border">
            <th className={head}>Year</th><th className={head}>Opponent</th><th className={head}>Where</th><th className={head}>Score</th>
          </tr></thead>
          <tbody>
            {c.titleMatches.map(m => (
              <tr key={`${m.year}-${m.opponent}`} className="border-b border-border/50">
                <td className={cell}>{m.year}</td>
                <td className={cell}>{m.opponentSlug
                  ? <Link to={`/champions/${m.opponentSlug}/games`} className="text-link hover:underline">{m.opponent}</Link>
                  : m.opponent}</td>
                <td className={cell}>{m.place}</td>
                <td className={cell}>{m.result === 'upcoming' ? `Starts ${m.score.replace(/^from /, '')}` : `${m.score} (${m.result})`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="openings" title="Openings">
        <p className="text-muted-foreground mb-4">His most played openings in classical games, and how he scored with them.</p>
        <div className="grid gap-6 md:grid-cols-2">
          <OpeningsTable rows={f.openings.white} colour="White" />
          <OpeningsTable rows={f.openings.black} colour="Black" />
        </div>
      </Section>

      <Section id="opponents" title="Most frequent opponents">
        <table className="w-full max-w-3xl">
          <thead><tr className="border-b border-border">
            <th className={head}>Opponent</th><th className={head}>Games</th><th className={head}>Won</th><th className={head}>Drawn</th><th className={head}>Lost</th>
          </tr></thead>
          <tbody>
            {f.topOpponents.map(o => (
              <tr key={o.name} className="border-b border-border/50">
                <td className={cell}>{o.champion
                  ? <Link to={`/champions/${o.champion}/games`} className="text-link hover:underline">{o.name}</Link>
                  : playerName(o.name)}</td>
                <td className={cell}>{o.games}</td><td className={cell}>{o.w}</td><td className={cell}>{o.d}</td><td className={cell}>{o.l}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {f.vsChampions.length > 0 && (
          <p className="text-muted-foreground mt-4">
            Against other world champions:{' '}
            {f.vsChampions.map((o, i) => (
              <Fragment key={o.champion}>
                {i > 0 && ', '}
                <Link to={`/champions/${o.champion}/games`} className="text-link hover:underline">{o.name}</Link>
                {` ${o.w} won, ${o.d} drawn, ${o.l} lost`}
              </Fragment>
            ))}.
          </p>
        )}
      </Section>

      <Section title="Events with the most games">
        <ul className="grid gap-1 sm:grid-cols-2 max-w-3xl">
          {f.topEvents.map(e => (
            <li key={e.name} className="text-foreground">{e.name} <span className="text-muted-foreground">({e.games} games)</span></li>
          ))}
        </ul>
      </Section>

      <Section id="questions" title="Questions">
        <div className="space-y-5 max-w-4xl">
          {c.faq.map(item => (
            <div key={item.q}>
              <h3 className="text-lg font-semibold text-foreground mb-1">{item.q}</h3>
              <p className="text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-sm text-muted-foreground mt-6 max-w-4xl">
        These figures count the {fmt(f.classicalGames)} classical games in our collection, not his whole career.
        {leftOut && ` The table above also lists ${leftOut} games, which are left out of the figures.`}
        {` Updated ${new Date(FACTS.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
      </p>
    </div>
  );
}

/** Above the best-games table: what the list is. */
export function BestGamesIntro({ slug, years }: { slug?: string; years: { from: number; to: number } | null }) {
  const c = getChampionContent(slug);
  if (!c) return null;
  return (
    <div className="mb-6 max-w-4xl space-y-2">
      <p className="text-lg text-foreground">
        {`These are ${c.name}'s best games, ranked by an engine's check of how accurately both sides played.`}
      </p>
      <p className="text-muted-foreground">
        {years ? `The ranked games are from ${years.from} to ${years.to}.` : ''}
        {c.bestGamesNote ? ` ${c.bestGamesNote}` : ''}
        {' '}<Link to={`/champions/${slug}/games`} className="text-link hover:underline">{`All of ${c.name}'s games`}</Link> are in the full list, with his record and openings.
      </p>
    </div>
  );
}
