/**
 * SectionBlock — one titled, collapsible teaching section of the Position
 * Explainer card: a hairline disclosure row in one continuous surface, with a
 * monochrome-gold icon, the section title, a humanised "N notes" count, and a
 * chevron. Expanding reveals the items directly below.
 *
 * Item rendering: non-colour W/B letter chips for sided notes, and a contained
 * CAUTION PANEL (amber "Watch out" / rose "Weak point") for warning/problem
 * items. The card renders no chess text of its own — item text, lead-in, and
 * side all come from the backend; the only authored strings are UI chrome (the
 * caution labels, "N notes", the empty-major placeholder).
 *
 * Spec: docs/Master Plan - Active/M1/POSITION_EXPLAINER_CARD_DESIGN_SPEC.md
 */

import { ReactNode, useState } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SectionContent, SectionItem } from '@/types/positionExplanation';

interface SectionBlockProps {
  icon: ReactNode;
  title: string;
  content?: SectionContent;
  /** For Threats & Tactics — the italic last-move intro line (if present). */
  leadIn?: string;
  /** Whether the section is expanded by default. */
  defaultExpanded: boolean;
  /** When true, render a neutral empty-state line instead of hiding. */
  alwaysVisible?: boolean;
}

/** Capitalise the first alphabetic character of a rendered item. */
function capitaliseFirst(text: string): string {
  if (!text) return text;
  const i = text.search(/[a-zA-Z]/);
  return i === -1 ? text : text.slice(0, i) + text.charAt(i).toUpperCase() + text.slice(i + 1);
}

/** UI chrome — labels the count of backend items, not chess content. */
function formatNoteCount(n: number): string {
  return `${n} ${n === 1 ? 'note' : 'notes'}`;
}

/**
 * Non-colour side marker: a letter chip. White = outline, Black = solid, and a muted "=" for a
 * line about both sides (an open centre, an open file). Every line carries one, so every line's
 * text starts at the same place (owner, 2026-10-26: neutral lines had none and sat 23px left).
 */
function SideChip({ side }: { side: SectionItem['side'] }) {
  if (side !== 'white' && side !== 'black') {
    return (
      <span
        className="mt-0.5 flex-shrink-0 grid place-items-center h-4 w-4 rounded-[3px] border border-border text-[11px] font-bold leading-none text-muted-foreground"
        aria-label="Both sides"
      >
        =
      </span>
    );
  }
  const tone = side === 'white'
    ? 'border-foreground/50 text-foreground/80'
    : 'border-foreground/50 bg-foreground/70 text-card';
  return (
    <span
      className={`mt-0.5 flex-shrink-0 grid place-items-center h-4 w-4 rounded-[3px] border text-[10px] font-bold leading-none ${tone}`}
      aria-label={side === 'white' ? 'White' : 'Black'}
    >
      {side === 'white' ? 'W' : 'B'}
    </span>
  );
}

function Item({ item }: { item: SectionItem }) {
  // Warning/problem → contained caution panel (icon + label + text), colour
  // paired with icon + label so meaning never rides on colour alone.
  if (item.tag === 'warning' || item.tag === 'problem') {
    const rose = item.tag === 'problem';
    const ring = rose ? 'border-destructive/30 bg-destructive/[0.08]' : 'border-warning/30 bg-warning/[0.09]';
    const label = rose ? 'text-destructive' : 'text-warning';
    return (
      <li className={`rounded-lg border ${ring} p-2.5`}>
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${label}`}>
          <AlertTriangle className="h-3 w-3" aria-hidden />{rose ? 'Weak point' : 'Watch out'}
        </span>
        <span className="mt-1 block text-foreground/90">{capitaliseFirst(item.text)}</span>
      </li>
    );
  }
  return (
    <li className="flex gap-2">
      <SideChip side={item.side} />
      <span className="text-foreground/90">{capitaliseFirst(item.text)}</span>
    </li>
  );
}

export function SectionBlock({
  icon,
  title,
  content,
  leadIn,
  defaultExpanded,
  alwaysVisible,
}: SectionBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const items = content?.items ?? [];
  const hasContent = items.length > 0 || Boolean(leadIn);
  if (!hasContent && !alwaysVisible) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="border-t border-border/50 first:border-t-0">
      <CollapsibleTrigger className="w-full min-h-[52px] flex items-center gap-2.5 py-3 text-left hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70 transition-colors cursor-pointer">
        <span className="flex-shrink-0 text-link/80" aria-hidden>{icon}</span>
        <h3 className="flex-1 text-sm font-semibold text-foreground">{title}</h3>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">{formatNoteCount(items.length)}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3 pl-[26px] pr-1">
        {leadIn && (
          <p className="mb-2 text-xs italic text-muted-foreground leading-relaxed">{capitaliseFirst(leadIn)}</p>
        )}
        {items.length > 0 ? (
          <ul className="space-y-1.5 text-sm leading-relaxed">
            {items.map((it, i) => <Item key={`${it.side}:${it.text}:${i}`} item={it} />)}
          </ul>
        ) : !leadIn ? (
          <p className="text-xs italic text-muted-foreground">Nothing notable here.</p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}
