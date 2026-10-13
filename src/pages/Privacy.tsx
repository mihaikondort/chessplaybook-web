/**
 * Privacy Policy Page
 *
 * Discloses data collection practices including Google Analytics and CloudFront logs.
 * Required for GDPR compliance.
 */

import SeoHead from '@/components/SeoHead';
import { LEGAL_LAST_UPDATED, formatLegalDate } from '@/config/legalDates';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <>
      <SeoHead routeKey="privacy" />

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">Privacy Policy</h1>

            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground mb-6">
                <strong>Last Updated:</strong> {formatLegalDate(LEGAL_LAST_UPDATED.privacy)}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  Chess Playbook ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
                  explains how we collect, use, and safeguard your information when you visit our website.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>

                <h3 className="text-xl font-semibold text-link mb-3">Analytics Data</h3>
                <p className="text-muted-foreground mb-4">
                  We use Google Analytics to understand how visitors interact with our website. This service collects:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Pages visited and time spent on each page</li>
                  <li>Geographic location (city/country level)</li>
                  <li>Browser type and device information</li>
                  <li>Referral sources (how you found our site)</li>
                  <li>IP address (anonymized)</li>
                </ul>

                <h3 className="text-xl font-semibold text-link mb-3">First-Party Engagement Measurement</h3>
                <p className="text-muted-foreground mb-4">
                  We use a random first-party browser identifier to measure visible active time on the website
                  and in product areas such as puzzles. This lets separate visits from the same browser be added
                  together for daily aggregate reporting. The identifier contains no account, advertising, device,
                  or contact information. Our server stores only a one-way hash of it, does not retain page history,
                  and removes the daily engagement rows when the next reporting day begins. Time in hidden tabs and
                  long gaps between heartbeats are not counted.
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Server Logs</h3>
                <p className="text-muted-foreground mb-4">
                  Our hosting provider (AWS CloudFront) automatically collects standard server log information:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>IP addresses</li>
                  <li>Browser type and version</li>
                  <li>Date and time of visits</li>
                  <li>Pages accessed</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies for the following purposes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li><strong>Google Analytics Cookies:</strong> Track website usage and performance</li>
                  <li><strong>Google Ads Cookies:</strong> Measure ad performance and conversions</li>
                  <li><strong>Meta Pixel Cookies:</strong> Measure ad performance on Facebook and Instagram, and build audiences for retargeting</li>
                  <li><strong>Essential Cookies:</strong> Enable basic website functionality</li>
                  <li><strong>First-party browser storage:</strong> Retains a random identifier used for privacy-minimized daily engagement totals</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  You can control cookies through your browser settings. However, disabling cookies may affect
                  website functionality.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">We use collected information to:</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Improve website performance and user experience</li>
                  <li>Analyze website traffic and usage patterns</li>
                  <li>Identify and fix technical issues</li>
                  <li>Understand which content is most valuable to visitors</li>
                  <li>Measure the effectiveness of our advertising campaigns</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Advertising</h2>
                <p className="text-muted-foreground mb-4">
                  We use Google Ads to promote our services. This involves the following data practices:
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Conversion Tracking</h3>
                <p className="text-muted-foreground mb-4">
                  We use Google Ads conversion tracking to measure the effectiveness of our advertising campaigns.
                  When you interact with our ads and subsequently take an action on our website (such as creating
                  an account), Google may collect data including your IP address, browser information, and the
                  pages you visit. This data is used to attribute conversions to specific ad campaigns and is
                  processed in accordance with{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Google's Privacy Policy
                  </a>.
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Customer Match</h3>
                <p className="text-muted-foreground mb-4">
                  We may use Google's Customer Match feature to create audience lists based on information you
                  have provided to us (such as your email address). This data is hashed and shared securely with
                  Google solely for the purpose of matching with Google accounts to serve relevant ads. Google
                  processes this data in compliance with its{' '}
                  <a href="https://support.google.com/google-ads/answer/6334160" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Customer Match policies
                  </a>
                  {' '}and the{' '}
                  <a href="https://privacy.google.com/businesses/processorterms/" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Google Ads Data Processing Terms
                  </a>.
                  You can opt out of personalized advertising by visiting{' '}
                  <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Google's Ad Settings
                  </a>.
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Meta Pixel</h3>
                <p className="text-muted-foreground mb-4">
                  We use Meta Pixel (provided by Meta Platforms, Inc.) to measure the effectiveness of advertising
                  on Facebook and Instagram and to build audiences for future campaigns. Meta Pixel collects
                  information about your interactions with our website — pages visited, account creation, and
                  similar standard events — and associates them with your Meta account if you are logged in to
                  Facebook or Instagram. Meta may use this information to show you relevant ads on its platforms.
                  Meta processes this data in accordance with{' '}
                  <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Meta's Privacy Policy
                  </a>.
                  You can manage how Meta personalizes ads in your{' '}
                  <a href="https://accountscenter.facebook.com/ad_preferences" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Meta Ad Preferences
                  </a>.
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Opting Out of Advertising</h3>
                <p className="text-muted-foreground mb-4">
                  You can opt out of Google's use of cookies for advertising by visiting{' '}
                  <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Google Ad Settings
                  </a>. You can also opt out of third-party cookies by visiting the{' '}
                  <a href="https://optout.networkadvertising.org" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                    Network Advertising Initiative opt-out page
                  </a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Data Sharing</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell, trade, or rent your personal information to third parties. Data is shared only
                  with the following service providers for the purposes described in this policy:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li><strong>Google Analytics:</strong> For website analytics (subject to Google's privacy policy)</li>
                  <li><strong>Google Ads:</strong> For advertising, conversion tracking, and Customer Match (subject to Google's advertising policies)</li>
                  <li><strong>Meta Platforms (Facebook / Instagram):</strong> For advertising measurement and audience building via Meta Pixel (subject to Meta's privacy policy)</li>
                  <li><strong>AWS (Amazon Web Services):</strong> For content delivery, hosting, and authentication</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">You have the right to:</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Access the personal information we hold about you</li>
                  <li>Request correction of inaccurate information</li>
                  <li>
                    <strong>Delete your account and its data</strong> — from your{' '}
                    <Link to="/profile" className="text-link hover:underline">account page</Link>,
                    at any time, without asking us. It removes your login, your puzzle and
                    Champion Challenge history, your ratings and your preferences. Games you
                    played against other people are kept with your name replaced by
                    &ldquo;Deleted player&rdquo;, because they are part of your opponent&rsquo;s
                    record too; backups are removed within 30 days.
                  </li>
                  <li>Opt-out of analytics tracking</li>
                  <li>Opt-out of personalized advertising via Google Ad Settings or Meta Ad Preferences</li>
                  <li>Disable cookies in your browser</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Third-Party Links</h2>
                <p className="text-muted-foreground mb-4">
                  Our website may contain links to external sites. We are not responsible for the privacy
                  practices of these third-party websites.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Children's Privacy</h2>
                <p className="text-muted-foreground mb-4">
                  Our website is not directed to children under 13. We do not knowingly collect information
                  from children under 13 years of age.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We may update this Privacy Policy from time to time. The "Last Updated" date at the top
                  indicates when this policy was last revised.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy, please visit our{' '}
                  <a href="/contact" className="text-link hover:underline">Contact page</a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Privacy;
