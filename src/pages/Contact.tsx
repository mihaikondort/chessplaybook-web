/**
 * Contact Page
 *
 * The contact form (#43), with the address as the alternative, the company behind the site
 * (Paddle's review checks it is named, PREMIUM_OFFER_ANALYSIS section 7), and the FAQ.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SeoHead from '@/components/SeoHead';
import { logGA4Event } from '@/services/analytics';
import ContactForm from '@/components/support/ContactForm';
import { Link } from 'react-router-dom';
import { COMPANY } from '@/config/company';

const Contact = () => {
  return (
    <>
      <SeoHead routeKey="contact">
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "Where does the game data come from?", "acceptedAnswer": { "@type": "Answer", "text": "All chess games are sourced from publicly available PGN (Portable Game Notation) files containing historical games from World Chess Champions." } },
            { "@type": "Question", "name": "Is Chess Playbook free to use?", "acceptedAnswer": { "@type": "Answer", "text": "Most of it is. Puzzles, training plans, champion games, news and play are free. Premium has no daily limits on the game report, position explanations or Champion Challenge." } },
            { "@type": "Question", "name": "Can I download the games?", "acceptedAnswer": { "@type": "Answer", "text": "Currently, games can be viewed online. We're considering adding download functionality in the future." } },
            { "@type": "Question", "name": "Will you add more champions or games?", "acceptedAnswer": { "@type": "Answer", "text": "We regularly update our database with new games and may add more historical content over time." } }
          ]
        })}</script>
      </SeoHead>

      <div className="bg-background flex flex-col">
        <div className="py-12 px-4 sm:px-6 lg:px-8 flex-grow">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">Contact Us</h1>

            <div className="space-y-6">
              <p className="text-lg text-muted-foreground mb-8">
                Found a problem, or have an idea? Tell us here.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground text-2xl">Send us a message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ContactForm />
                  <p className="text-muted-foreground border-t border-border pt-4">
                    Or email us at{' '}
                    <a
                      href="mailto:contact@chessplaybook.com"
                      onClick={() => logGA4Event({ name: 'contact_email_clicked', params: { surface: 'contact_page' } })}
                      className="text-link hover:underline"
                    >
                      contact@chessplaybook.com
                    </a>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground text-2xl">Who runs Chess Playbook</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                  <p className="text-foreground font-semibold">{COMPANY.legalName}</p>
                  <p>Registration number (CUI): {COMPANY.registrationNumber}</p>
                  <p>{COMPANY.address}, {COMPANY.country}</p>
                  <p>
                    <a href={`mailto:${COMPANY.email}`} className="text-link hover:underline">{COMPANY.email}</a>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-2xl">Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Where does the game data come from?</h4>
                    <p className="text-muted-foreground">
                      All chess games are sourced from publicly available PGN (Portable Game Notation) files
                      containing historical games from World Chess Champions.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Is Chess Playbook free to use?</h4>
                    <p className="text-muted-foreground">
                      Most of it is. Puzzles, training plans, champion games, news and play are free. Premium has no
                      daily limits on the game report, position explanations or Champion Challenge. Its refunds are in our <Link to="/refund-policy" className="text-link hover:underline">Refund Policy</Link>.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Can I download the games?</h4>
                    <p className="text-muted-foreground">
                      Currently, games can be viewed online. We're considering adding download functionality in the future.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Will you add more champions or games?</h4>
                    <p className="text-muted-foreground">
                      We regularly update our database with new games and may add more historical content over time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Contact;
