/**
 * PositionExplanationCard — the Position Explainer card (Coach's Briefing).
 *
 * Renders the structured explanation from the backend with a compact verdict
 * hero + vertical evaluation rail, a high-contrast cream "What matters now"
 * action sheet, and calm hairline section rows in one continuous surface.
 * Used everywhere the explainer appears — /explain and the in-game Analysis
 * panel (desktop overlay + mobile).
 *
 * The frontend renders NO chess text of its own — every position-specific
 * word (verdict, action, section items, metadata) is backend-sourced; the
 * eval rail is purely visual (its accessible name is the backend verdict
 * string). Loading / error / missing states share the same shell.
 *
 * Design spec:
 *   docs/Master Plan - Active/M1/POSITION_EXPLAINER_CARD_DESIGN_SPEC.md
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import {
  ScrollText, ArrowLeft, Loader2, AlertCircle, Lightbulb, BookOpen,
  Zap, Shield, Scale, Blocks, Grip, Compass,
} from 'lucide-react';
import { SectionBlock } from './SectionBlock';
import { CoachBriefingEvalRail } from './CoachBriefingEvalRail';
import { classifyVerdict } from './positionVerdictPresentation';
import {
  StructuredExplanation,
  SECTION_DISPLAY_ORDER,
  MAJOR_SECTIONS,
  type SectionContent,
} from '@/types/positionExplanation';

interface PositionExplanationCardProps {
  structured: StructuredExplanation | null;
  loading?: boolean;
  error?: string | null;
  loadingDepth?: number;
  onBackToStats?: () => void;
  isMobile?: boolean;
  className?: string;
}

const SECTION_META: Record<
  keyof StructuredExplanation['sections'],
  { title: string; icon: ReactNode }
> = {
  threats_and_tactics: { title: 'Threats & Tactics', icon: <Zap className="h-4 w-4" /> },
  king_safety:         { title: 'King Safety',       icon: <Shield className="h-4 w-4" /> },
  material:            { title: 'Material',          icon: <Scale className="h-4 w-4" /> },
  pieces:              { title: 'Pieces',            icon: <Blocks className="h-4 w-4" /> },
  pawn_structure:      { title: 'Pawn Structure',    icon: <Grip className="h-4 w-4" /> },
  plan:                { title: 'Plan',              icon: <Compass className="h-4 w-4" /> },
};

function sectionLeadIn(
  key: keyof StructuredExplanation['sections'],
  content?: SectionContent,
): string | undefined {
  return key === 'threats_and_tactics' && content && 'lastMoveLeadIn' in content
    ? (content as { lastMoveLeadIn?: string }).lastMoveLeadIn
    : undefined;
}

function Header({ onBackToStats }: { onBackToStats?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <ScrollText className="h-3.5 w-3.5" aria-hidden />
        Position Evaluation
      </div>
      {onBackToStats && (
        <button
          onClick={onBackToStats}
          className="inline-flex items-center gap-1 min-h-11 px-2 -mr-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          Back
        </button>
      )}
    </div>
  );
}

function CardShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Card className={`overflow-hidden ${className}`}>{children}</Card>;
}

export function PositionExplanationCard({
  structured,
  loading = false,
  error = null,
  loadingDepth = 0,
  onBackToStats,
  isMobile = false,
  className = '',
}: PositionExplanationCardProps) {
  // ── Loading — honest live-depth ──
  if (loading) {
    const searching = loadingDepth > 0;
    return (
      <CardShell className={className}>
        <div className="p-6 min-h-40 h-full flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-link/70 motion-reduce:animate-none" />
            {searching && (
              <span className="absolute text-[11px] font-semibold tabular-nums text-link">{loadingDepth}</span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {searching ? 'Stockfish is analysing the position' : 'Analysing the position…'}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums min-h-4">
              {searching ? `searching — depth ${loadingDepth}` : 'a few seconds on a fresh position'}
            </p>
          </div>
          <div className="w-40 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-primary/60 animate-explain-progress motion-reduce:animate-none motion-reduce:w-full" />
          </div>
        </div>
      </CardShell>
    );
  }

  // ── Error / missing-structured — calm recoverable ──
  if (error || !structured) {
    const msg = error
      ?? 'The explanation didn’t come through. Try again in a moment, or reload the page.';
    return (
      <CardShell className={className}>
        <div className="p-4 flex flex-col gap-3">
          <Header onBackToStats={onBackToStats} />
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${error ? 'text-destructive' : ''}`} aria-hidden />
            <span role={error ? 'alert' : undefined}>{msg}</span>
          </div>
        </div>
      </CardShell>
    );
  }

  // ── Populated ──
  const { verdict, action, sections } = structured;
  const presentation = classifyVerdict(verdict.eval);

  // Disclosure: mobile opens Threats only (compact); desktop opens every
  // populated section so /explain shows the explanation's depth. Empty major
  // sections stay collapsed (their "nothing notable" line adds no value open).
  const openByDefault = (key: keyof StructuredExplanation['sections']): boolean =>
    key === 'threats_and_tactics'
    || (!isMobile && (sections[key]?.items.length ?? 0) > 0);

  return (
    <CardShell className={className}>
      <div className="flex flex-col max-h-full h-full">
        {/* Verdict hero — prose | rail */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-border">
          <div className="p-4 sm:p-5 flex flex-col gap-3">
            <Header onBackToStats={onBackToStats} />
            <h2 className="font-serif text-2xl sm:text-[1.9rem] leading-[1.08] text-foreground">{verdict.eval}</h2>
            {(verdict.opening || verdict.phase) && (
              <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {verdict.opening && (
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-3 w-3" aria-hidden />
                    {verdict.opening}{verdict.eco ? ` · ${verdict.eco}` : ''}
                  </span>
                )}
                {verdict.phase && <span className="capitalize">· {verdict.phase}</span>}
              </div>
            )}
          </div>
          {presentation.magnitude !== 'unknown' && (
            <div className="flex items-center justify-center px-4 border-l border-border bg-[hsl(var(--overlay)/0.15)]">
              <CoachBriefingEvalRail presentation={presentation} verdictText={verdict.eval} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {action && (
            <div className="m-4 mb-2 rounded-lg p-3.5 bg-inverse text-inverse-foreground">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-inverse-accent">
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />What matters now
              </div>
              <p className="mt-1.5 font-serif text-[15.5px] leading-relaxed">{action}</p>
            </div>
          )}
          <div className="px-4 pb-4">
            {SECTION_DISPLAY_ORDER.map((key) => {
              const content = sections[key];
              return (
                <SectionBlock
                  key={key}
                  icon={SECTION_META[key].icon}
                  title={SECTION_META[key].title}
                  content={content}
                  leadIn={sectionLeadIn(key, content)}
                  defaultExpanded={openByDefault(key)}
                  alwaysVisible={MAJOR_SECTIONS.has(key)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </CardShell>
  );
}
