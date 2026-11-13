/**
 * Refund Policy Page
 *
 * The owner's rule (2026-11-13): a full refund within 30 days of a payment, for any reason, then
 * none, for subscriptions and the one-year pass alike. Paddle's review wants a refund policy of its
 * own, reachable from the navigation, unconditional, 14-90 days (PREMIUM_OFFER_ANALYSIS section 7).
 * Every step described here is what /profile and the refund route actually do
 * (backend/src/routes/paddle.ts, PremiumCard).
 */

import { Link } from 'react-router-dom';
import SeoHead from '@/components/SeoHead';
import { LEGAL_LAST_UPDATED, formatLegalDate } from '@/config/legalDates';
import { COMPANY } from '@/config/company';

const H2 = 'text-2xl font-semibold text-foreground mb-4';
const P = 'text-muted-foreground mb-4';
const UL = 'list-disc list-inside text-muted-foreground mb-4 space-y-2';
const A = 'text-link hover:underline';

const RefundPolicy = () => {
  return (
    <>
      <SeoHead routeKey="refund-policy" />

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">Refund Policy</h1>

            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground mb-6">
                <strong>Last Updated:</strong> {formatLegalDate(LEGAL_LAST_UPDATED.refund)}
              </p>

              <section className="mb-8">
                <h2 className={H2}>30 Days, Any Reason</h2>
                <p className={P}>
                  You can have a full refund of any Premium payment within 30 days of that payment. You do not
                  need to give a reason.
                </p>
                <ul className={UL}>
                  <li>It applies to every subscription payment, renewals included, and to the one-year pass.</li>
                  <li>After 30 days, that payment is not refunded.</li>
                  <li>
                    You can still cancel a subscription at any time in Paddle's billing portal, which you open
                    from your account page, so you are not charged again.
                  </li>
                </ul>
                <p className={P}>
                  If you live in the EU or the UK, this gives you more time than your 14-day legal right to
                  withdraw.
                </p>
              </section>

              <section className="mb-8">
                <h2 className={H2}>How to Ask</h2>
                <ul className={UL}>
                  <li>
                    On your <Link to="/profile" className={A}>account page</Link>, choose "Cancel and get a full
                    refund". It refunds your latest payment, and the page shows the last day you can do it.
                  </li>
                  <li>
                    For any other payment, or if you prefer, write to{' '}
                    <a href={`mailto:${COMPANY.email}`} className={A}>{COMPANY.email}</a>. Tell us the email address
                    of your account so we can find the payment.
                  </li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className={H2}>What Happens Next</h2>
                <p className={P}>
                  Paddle, our reseller and the Merchant of Record for all our orders, returns the full amount to
                  the payment method you used. Your bank may take a few business days to show it.
                </p>
                <p className={P}>
                  The Premium that payment paid for ends once Paddle confirms the refund. If it was your
                  subscription's latest payment, the subscription is cancelled too. A refund you asked for goes
                  ahead even if you delete your account before it is confirmed.
                </p>
              </section>

              <section className="mb-8">
                <h2 className={H2}>Questions</h2>
                <p className={P}>
                  Write to <a href={`mailto:${COMPANY.email}`} className={A}>{COMPANY.email}</a>. Chess Playbook
                  is run by {COMPANY.legalName}, registration number (CUI) {COMPANY.registrationNumber},{' '}
                  {COMPANY.address}, {COMPANY.country}. See also our{' '}
                  <Link to="/terms" className={A}>Terms of Service</Link>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RefundPolicy;
