/**
 * The way to the contact form from where something went wrong (#44).
 *
 * Before this, reaching us meant already knowing to look in the footer's About
 * column, and few visitors did (#42). Error states are where a visitor has
 * something to report and the least patience for hunting, so the link sits there,
 * with the topic chosen and the page recorded.
 *
 * `surface` says which door it was, on the click and on the message itself, so the
 * doors can be compared. `asAnchor` is for the app-wide error screen, which renders
 * outside the router and so cannot use <Link>.
 */
import { Link } from 'react-router-dom';
import { logGA4Event, type SupportSurface } from '@/services/analytics';

interface Props {
  surface: SupportSurface;
  /** The page the problem happened on. Defaults to the current one. */
  from?: string;
  asAnchor?: boolean;
  label?: string;
  className?: string;
}

export function contactHref(surface: SupportSurface, from?: string, topic: 'problem' | 'account' | null = 'problem'): string {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  const page = from ?? (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '');
  if (page && page !== '/contact') params.set('from', page.slice(0, 300));
  params.set('via', surface);
  return `/contact?${params.toString()}`;
}

export default function ReportProblemLink({ surface, from, asAnchor, label = 'Report a problem', className }: Props) {
  const href = contactHref(surface, from);
  const onClick = () => logGA4Event({ name: 'support_entry_clicked', params: { surface } });
  const classes = className ?? 'inline-flex min-h-11 items-center text-link underline-offset-4 hover:underline';
  return asAnchor
    ? <a href={href} onClick={onClick} className={classes}>{label}</a>
    : <Link to={href} onClick={onClick} className={classes}>{label}</Link>;
}
