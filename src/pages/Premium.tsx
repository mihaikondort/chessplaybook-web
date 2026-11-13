/**
 * The Premium page (/premium, 2026-11-14): what Premium adds, the visitor's own price, and buying.
 * PREMIUM_OFFER_ANALYSIS section 9 item 4; it is what a buyer judges and what Paddle's reviewer reads.
 *
 * Every line is what the code does. Premium today is the free plan without its daily limits
 * (backend FREE_PLAN_LIMITS, mirrored and test-pinned in FREE_PLAN_ALLOWANCE); nothing else is
 * claimed. Prices come from Paddle in the visitor's currency (usePremiumOffer). Where the API has no
 * Paddle settings (production before launch) the page names the US price, says that prices are set
 * per country, sells nothing, and does not name the payment provider. Buying needs an account (owner, 2026-11-13), so a guest is sent
 * to sign in and brought back here.
 *
 * A Document page in the current design system; the visual direction (#186) restyles it later.
 */
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthContext';
import { usePremiumOffer } from '@/features/premium/usePremiumOffer';
import type { PlanPrice } from '@/features/premium/paddleCheckout';
import { FREE_PLAN_ALLOWANCE } from '@/services/freePlanLimit';
import { logGA4Event } from '@/services/analytics';

const H2 = 'text-2xl font-semibold text-foreground mb-4';
const P = 'text-muted-foreground mb-4';
const A = 'text-link hover:underline';

const perDay = (n: number) => `${n} a day`;

/** What each plan gives, row by row. The limited rows read the server's own numbers. */
const ROWS: Array<{ feature: string; free: string; premium: string }> = [
  { feature: 'Opening variations to learn', free: perDay(FREE_PLAN_ALLOWANCE.opening_variation), premium: 'Unlimited' },
  { feature: 'Opening training sessions', free: perDay(FREE_PLAN_ALLOWANCE.opening_session), premium: 'Unlimited' },
  { feature: 'Game reports', free: perDay(FREE_PLAN_ALLOWANCE.game_report), premium: 'Unlimited' },
  { feature: 'Position explanations', free: perDay(FREE_PLAN_ALLOWANCE.explain_position), premium: 'Unlimited' },
  { feature: 'Champion Challenge', free: perDay(FREE_PLAN_ALLOWANCE.challenge_session), premium: 'Unlimited' },
  { feature: 'Puzzles and training plans', free: 'Unlimited', premium: 'Unlimited' },
  { feature: 'Champion games, play and news', free: 'Unlimited', premium: 'Unlimited' },
];

type PlanKey = 'yearly' | 'monthly' | 'one_year';

function PlanRow({ plan, kind, label, note, primary, onBuy, action }: {
  plan: PlanPrice; kind: PlanKey; label: string; note: string; primary: boolean;
  onBuy: (kind: PlanKey, plan: PlanPrice) => void; action: string;
}) {
  return (
    <div className="surface-card flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between" data-plan={kind}>
      <div>
        <p className="text-lg font-semibold text-foreground">{plan.total} <span className="text-base font-normal text-muted-foreground">{label}</span></p>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <Button variant={primary ? 'default' : 'outline'} onClick={() => onBuy(kind, plan)} className="shrink-0">{action}</Button>
    </div>
  );
}

const Premium = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { checked, settings, plans, state, message, buy } = usePremiumOffer();

  const action = user ? 'Buy' : 'Sign in to buy';
  /* A guest signs in first and comes back here (buying needs an account). */
  const onBuy = (kind: PlanKey, plan: PlanPrice) => {
    logGA4Event({ name: 'premium_buy_clicked', params: { plan: kind, signed_in: Boolean(user) } });
    if (user) void buy(plan.priceId);
    else navigate(`/login?returnTo=${encodeURIComponent('/premium')}`);
  };

  const prices = () => {
    if (!checked || isLoading) return <p className={P}>Loading prices…</p>;
    if (!settings) {
      return (
        <>
          <p className={P}>
            In the United States, Premium is US$25 a year or US$5 a month. Prices are set for each country,
            and you see yours in your own currency before you pay.
          </p>
          <p className={P}>You can buy Premium here soon.</p>
        </>
      );
    }
    if (state?.premium) {
      return (
        <p className={P}>
          You have Premium. You can manage it on your <Link to="/profile" className={A}>account page</Link>.
        </p>
      );
    }
    if (!plans) return message ? null : <p className={P}>Loading prices…</p>;
    const go = onBuy;
    return (
      <div className="space-y-3">
        <PlanRow plan={plans.yearly} kind="yearly" label="a year" note="Renews every year. Cancel at any time." primary onBuy={go} action={action} />
        {plans.monthly && (
          <PlanRow plan={plans.monthly} kind="monthly" label="a month" note="Renews every month. Cancel at any time." primary={false} onBuy={go} action={action} />
        )}
        {plans.oneYear && (
          <PlanRow plan={plans.oneYear} kind="one_year" label="once" note="One year of Premium. It does not renew." primary={false} onBuy={go} action={action} />
        )}
        {!user && <p className="text-sm text-muted-foreground">Buying needs a free account, so Premium is yours on every device.</p>}
      </div>
    );
  };

  return (
    <>
      <SeoHead routeKey="premium" />

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Premium</h1>
            <p className="text-lg text-muted-foreground mb-10">Train as much as you want, every day.</p>

            <section className="mb-10" aria-labelledby="premium-plans">
              <h2 id="premium-plans" className={H2}>Free and Premium</h2>
              <div className="surface-card overflow-hidden rounded-lg">
                <table className="w-full text-left text-sm sm:text-base">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="p-3 font-semibold text-foreground"><span className="sr-only">Feature</span></th>
                      <th scope="col" className="p-3 font-semibold text-foreground">Free</th>
                      <th scope="col" className="p-3 font-semibold text-foreground">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => (
                      <tr key={row.feature} className="border-b border-border last:border-b-0">
                        <th scope="row" className="p-3 font-normal text-foreground">{row.feature}</th>
                        <td className="p-3 text-muted-foreground">{row.free}</td>
                        <td className="p-3 text-foreground">
                          {row.premium === 'Unlimited' && row.free !== 'Unlimited' ? (
                            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" aria-hidden />Unlimited</span>
                          ) : row.premium}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-10" aria-labelledby="premium-price">
              <h2 id="premium-price" className={H2}>Price</h2>
              {prices()}
              {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
            </section>

            <section className="mb-10" aria-labelledby="premium-refund">
              <h2 id="premium-refund" className={H2}>Your money back</h2>
              <p className={P}>
                You can have a full refund of any payment within 30 days, for any reason. See the{' '}
                <Link to="/refund-policy" className={A}>Refund Policy</Link>.
              </p>
              {/* The reseller is named here only once checkout is live (owner, 2026-11-14); the Terms always name it. */}
              <p className={P}>
                {settings && 'Our order process is conducted by our online reseller Paddle.com, which is the Merchant of Record for all our orders. '}
                Prices include any sales tax or VAT. See the{' '}
                <Link to="/terms" className={A}>Terms of Service</Link>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default Premium;
