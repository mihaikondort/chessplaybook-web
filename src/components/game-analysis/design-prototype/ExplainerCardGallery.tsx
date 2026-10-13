/**
 * ExplainerCardGallery — DEV-ONLY prototype gallery for the Coach's Briefing
 * Position Explainer card. Renders every required state at fixed widths so
 * the design can be screenshot-QA'd. Never shipped to production: the route
 * that mounts it is gated behind `import.meta.env.DEV` in app/routes.tsx.
 *
 * It used to toggle a `.dark` class to compare the palette against a deeper,
 * drifted copy. That copy was deleted in layout-redesign B1; the light and
 * dark themes are compared on B2's preview page instead.
 */

import { PositionExplanationCard } from '../PositionExplanationCard';
import { RICH, SPARSE, WITH_WARNING, VERDICT_RANGE, withVerdict } from './fixtures';

function Frame({ id, label, width, children }: { id: string; label: string; width: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-mono text-muted-foreground">{label} · {width}px</div>
      <div id={id} style={{ width }} className="shrink-0">
        {children}
      </div>
    </div>
  );
}

export default function ExplainerCardGallery() {
  return (
    <div>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-8">
          <header className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h1 className="font-serif text-2xl text-foreground">Coach’s Briefing — Position Explainer Card</h1>
              <p className="text-sm text-muted-foreground">Design prototype</p>
            </div>
          </header>

          {/* Populated — rich + sparse across widths */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Populated</h2>
            <div className="flex flex-wrap gap-8 items-start">
              <Frame id="rich-320" label="Rich (Rotlewi)" width={320}>
                <PositionExplanationCard structured={RICH} isMobile />
              </Frame>
              <Frame id="rich-375" label="Rich (Rotlewi)" width={375}>
                <PositionExplanationCard structured={RICH} isMobile />
              </Frame>
              <Frame id="rich-414" label="Rich (Rotlewi)" width={414}>
                <PositionExplanationCard structured={RICH} isMobile />
              </Frame>
              <Frame id="rich-desktop" label="Rich desktop col" width={440}>
                <PositionExplanationCard structured={RICH} />
              </Frame>
            </div>
            <div className="flex flex-wrap gap-8 items-start">
              <Frame id="sparse-375" label="Sparse / Equal" width={375}>
                <PositionExplanationCard structured={SPARSE} isMobile />
              </Frame>
              <Frame id="warning-375" label="Warning / problem items" width={375}>
                <PositionExplanationCard structured={WITH_WARNING} isMobile />
              </Frame>
              {/* Fixed-height Analysis-panel context: overflow scrolls inside */}
              <Frame id="analysis-panel" label="Analysis panel (fixed height)" width={380}>
                <div style={{ height: 520 }}>
                  <PositionExplanationCard structured={RICH} onBackToStats={() => {}} className="h-full" />
                </div>
              </Frame>
            </div>
          </section>

          {/* System states */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System states</h2>
            <div className="flex flex-wrap gap-8 items-start">
              <Frame id="loading-0" label="Loading (warmup)" width={375}>
                <PositionExplanationCard structured={null} loading loadingDepth={0} />
              </Frame>
              <Frame id="loading-22" label="Loading (depth 22)" width={375}>
                <PositionExplanationCard structured={null} loading loadingDepth={22} />
              </Frame>
              <Frame id="error" label="Recoverable error" width={375}>
                <PositionExplanationCard structured={null} error="The chess engine isn’t ready yet. Please try again in a moment." />
              </Frame>
              <Frame id="missing" label="Missing structured" width={375}>
                <PositionExplanationCard structured={null} />
              </Frame>
            </div>
          </section>

          {/* Verdict range — the eval indicator across every canonical string */}
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Verdict range (indicator)</h2>
            <div id="verdict-range" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VERDICT_RANGE.map((v) => (
                <div key={v} style={{ width: 340 }}>
                  <PositionExplanationCard structured={withVerdict(RICH, v)} isMobile />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
