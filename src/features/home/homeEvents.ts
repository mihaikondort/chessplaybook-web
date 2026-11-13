import { logGA4Event } from '@/services/analytics';

/**
 * Every link below the chooser reports here (owner D1, 2026-11-13: every new homepage link is measured).
 * The six chooser cards keep `home_choice_click` exactly as before, so its series stays comparable.
 */
export type HomeSection = 'journey' | 'featured' | 'strip' | 'news';

export function logHomeSection(section: HomeSection, to: string, position: number): void {
  logGA4Event({ name: 'home_section_click', params: { section, to, position } });
}
