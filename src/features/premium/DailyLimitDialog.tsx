/**
 * The one dialog a free-plan daily limit opens (2026-11-14), on every feature that has one: the
 * opening trainer, Champion Challenge, Explain and the game report. Mounted once in the site shell;
 * `reportDailyLimit` (services/freePlanLimit.ts) opens it with a window event, so a feature only
 * reports the limit and never draws its own.
 *
 * It says what ran out and when it is back, in the visitor's own time, and offers the Premium page.
 * The price is named only when Paddle has given the visitor's own (production has none before
 * launch); a price we cannot stand behind is never shown.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logGA4Event } from '@/services/analytics';
import { DAILY_LIMIT_EVENT, dailyLimitBack, dailyLimitTitle, type DailyLimit } from '@/services/freePlanLimit';
import { usePremiumOffer } from './usePremiumOffer';

function PriceLine() {
  const { plans } = usePremiumOffer();
  return (
    <p className="text-sm text-muted-foreground">
      {plans ? `Premium has no daily limits, for ${plans.yearly.total} a year.` : 'Premium has no daily limits.'}
    </p>
  );
}

export function DailyLimitDialog() {
  const [limit, setLimit] = useState<DailyLimit | null>(null);

  useEffect(() => {
    const open = (event: Event) => setLimit((event as CustomEvent<DailyLimit>).detail);
    window.addEventListener(DAILY_LIMIT_EVENT, open);
    return () => window.removeEventListener(DAILY_LIMIT_EVENT, open);
  }, []);

  return (
    <Dialog open={limit !== null} onOpenChange={(next) => { if (!next) setLimit(null); }}>
      {limit && (
        <DialogContent className="max-w-md" data-testid="daily-limit-dialog">
          <DialogHeader>
            <DialogTitle>{dailyLimitTitle(limit)}</DialogTitle>
            <DialogDescription>{dailyLimitBack(limit)}</DialogDescription>
          </DialogHeader>
          <PriceLine />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLimit(null)}>Not now</Button>
            <Button asChild>
              <Link
                to="/premium"
                onClick={() => {
                  logGA4Event({ name: 'premium_link_clicked', params: { from: 'limit_dialog', feature: limit.feature } });
                  setLimit(null);
                }}
              >
                See Premium
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
