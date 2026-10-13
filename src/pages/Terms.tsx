/**
 * Terms of Service Page
 *
 * Defines the terms and conditions for using Chess Playbook.
 * Protects the site legally and sets user expectations.
 */

import SeoHead from '@/components/SeoHead';
import { LEGAL_LAST_UPDATED, formatLegalDate } from '@/config/legalDates';

const Terms = () => {
  return (
    <>
      <SeoHead routeKey="terms" />

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">Terms of Service</h1>

            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground mb-6">
                <strong>Last Updated:</strong> {formatLegalDate(LEGAL_LAST_UPDATED.terms)}
              </p>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Agreement to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing and using Chess Playbook ("the Website"), you accept and agree to be bound by
                  these Terms of Service. If you do not agree to these terms, please do not use the Website.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Use of the Website</h2>

                <h3 className="text-xl font-semibold text-link mb-3">Permitted Use</h3>
                <p className="text-muted-foreground mb-4">You may use the Website to:</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>View and study chess games from World Champions</li>
                  <li>Learn chess strategies and tactics</li>
                  <li>Access publicly available chess game data</li>
                </ul>

                <h3 className="text-xl font-semibold text-link mb-3">Prohibited Use</h3>
                <p className="text-muted-foreground mb-4">You may NOT:</p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Use automated tools or bots to scrape or download content in bulk</li>
                  <li>Attempt to hack, disrupt, or damage the Website</li>
                  <li>Use the Website for any illegal purposes</li>
                  <li>Impersonate others or provide false information</li>
                  <li>Redistribute or sell content from the Website without permission</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Content and Intellectual Property</h2>

                <h3 className="text-xl font-semibold text-link mb-3">Chess Game Data</h3>
                <p className="text-muted-foreground mb-4">
                  Chess games displayed on this Website are sourced from publicly available PGN (Portable Game Notation)
                  files. Game moves themselves are factual data and not subject to copyright. However, annotations,
                  commentary, and our presentation are protected.
                </p>

                <h3 className="text-xl font-semibold text-link mb-3">Website Content</h3>
                <p className="text-muted-foreground mb-4">
                  The Website's code is free software. You can use, copy and change it under the GNU General Public
                  License, version 3 or later. The source is at{' '}
                  <a
                    href="https://github.com/mihaikondort/chessplaybook-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline"
                  >
                    github.com/mihaikondort/chessplaybook-web
                  </a>
                  .
                </p>
                <p className="text-muted-foreground mb-4">
                  That licence covers the code only. Our articles and other original content are owned by The Chess
                  Playbook Team. All rights reserved.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-4">
                  The Website is provided "AS IS" and "AS AVAILABLE" without any warranties of any kind, either express or implied.
                  We do not guarantee:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Accuracy or completeness of chess game data</li>
                  <li>Uninterrupted or error-free operation</li>
                  <li>That the Website will meet your specific requirements</li>
                  <li>That all bugs or errors will be corrected</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  To the fullest extent permitted by law, The Chess Playbook Team shall not be liable for:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">
                  <li>Any indirect, incidental, or consequential damages</li>
                  <li>Loss of data or profits arising from use of the Website</li>
                  <li>Errors or inaccuracies in chess game data</li>
                  <li>Interruptions or technical issues</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">External Links</h2>
                <p className="text-muted-foreground mb-4">
                  The Website may contain links to third-party websites. We are not responsible for the
                  content, privacy practices, or terms of service of external sites.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to modify these Terms of Service at any time. Changes will be effective
                  immediately upon posting. Your continued use of the Website constitutes acceptance of the
                  modified terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to terminate or suspend access to the Website at our sole discretion,
                  without notice, for conduct that violates these Terms of Service or is harmful to other users.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Governing Law</h2>
                <p className="text-muted-foreground mb-4">
                  These Terms of Service shall be governed by and construed in accordance with applicable laws,
                  without regard to conflict of law provisions.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about these Terms of Service, please visit our{' '}
                  <a href="/contact" className="text-link hover:underline">Contact page</a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">Severability</h2>
                <p className="text-muted-foreground mb-4">
                  If any provision of these Terms is found to be unenforceable or invalid, that provision
                  shall be limited or eliminated to the minimum extent necessary, and the remaining provisions
                  shall remain in full force and effect.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Terms;
