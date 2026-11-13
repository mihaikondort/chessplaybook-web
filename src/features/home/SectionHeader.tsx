import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { logHomeSection, type HomeSection } from './homeEvents';

/** A homepage section's serif title, its line, and an optional "see all" link (measured with its section). */
export function SectionHeader({ title, sub, link, linkLabel, section }: {
  title: string; sub?: string; link?: string; linkLabel?: string; section?: HomeSection;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="font-playfair font-semibold text-[26px] md:text-[32px] leading-tight">{title}</h2>
        {sub && <p className="text-sm md:text-[15px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {link && (
        <Link
          to={link}
          onClick={section ? () => logHomeSection(section, link, -1) : undefined}
          className="shrink-0 text-[13px] text-link hover:underline inline-flex items-center gap-1 pb-1"
        >
          {linkLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
