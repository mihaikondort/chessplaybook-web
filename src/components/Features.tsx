/**
 * Features — the homepage chooser grid.
 *
 * This is the homepage's entire job: present six choices and record which one
 * was taken. A visitor who has not said what they want lands here so they can
 * self-select, rather than being guessed at and dropped on /play-online.
 *
 * Layout is a hard requirement, not a preference: **all six cards must fit the
 * first mobile viewport**. That is why the mobile card is a fixed short height
 * rather than `aspect-square` — six square cards are ~570px of grid on their
 * own and push the last row into a second screen, which would turn "News was
 * chosen least" into an artefact of scroll depth.
 *
 * MOTION. No auto-cycling highlight. The grid animates only in response to the
 * user — hover, focus-visible and press — plus a one-time entrance played by
 * all six cards SIMULTANEOUSLY.
 *
 * A clockwise highlight cycling all six cards shipped briefly on 2026-08-02 and
 * was switched off the same day: the owner did not like it, and it carried a
 * real cost — a card that is lit when a visitor looks or taps gets attention it
 * did not earn, and this page exists to measure which of six a cold visitor
 * picks (`home_choice_click { to, position }`). With it gone the `position`
 * read is clean again. To restore it, revert 4a55f1f's rotation hunks; the
 * clockwise-order helper and its tests are in that commit's history.
 *
 * The entrance stays simultaneous, deliberately. A per-card stagger in grid
 * order walks the eye left-to-right and top-to-bottom, which is exactly the
 * position bias `position` exists to measure — it would reintroduce the
 * confound in a quieter form.
 *
 * Press feedback matters most of what remains: on a touch screen hover does
 * not exist, so `active:` is the only feedback those visitors ever get. All transform/opacity only, gated behind `motion-safe`/`motion-reduce`.
 *
 * Card titles are SANS, not the site's Playfair display serif. Playfair is a
 * high-contrast serif — good at hero size, and the wrong thing at ~16px on a
 * dark background, where its thin strokes are the first thing to disappear for
 * a reader with reduced vision. Playfair stays on page H1s.
 *
 * The page heading is NOT rendered here — it comes from `RouteHeading`, which
 * reads route-meta.json, so the homepage's H1 cannot drift from the metadata
 * the ad campaign points at.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { featureCards } from "@/config/featureCards";
import { logGA4Event } from "@/services/analytics";

export const Features = () => {
  return (
    <section className="px-4 pb-8 md:pb-12">
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {featureCards.map((feature, index) => {
            const isSecondary = feature.tier === 'secondary';
            return (
              <Link
                key={feature.href}
                to={feature.href}
                className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() =>
                  logGA4Event({
                    name: 'home_choice_click',
                    params: { to: feature.href, position: index },
                  })
                }
              >
                {/* Card visibility, reported as poor by the owner and confirmed
                    by measurement. In a dark theme no fill reaches the 3:1 WCAG
                    asks of a non-text boundary without going conspicuously
                    light, so the edge is carried by the border rather than by
                    the surface.

                    RE-MEASURED 2026-08-07, when the page darkened from L12% to
                    L9% and `--border` moved to L26%. Every ratio here improved
                    and the conclusion is unchanged, but the old numbers were
                    quoted as fact and would have misled the next reader:

                      bg-muted vs page   1.28 -> 1.37   (still nowhere near 3:1)
                      --border vs page   1.55 -> 1.72   (still far too weak)
                      L48% at 2px        3.69 -> 3.92   (clears 3:1)
                      L42%, the News card 3.1 -> 3.22   (quieter, not invisible)

                    Still scoped to this component rather than moved onto the
                    `--card`/`--border` tokens, which are site-wide. Since B5b
                    the two values are the `--border-strong` (L48%) and
                    `--border-quiet` (L42%) roles, unchanged in dark. */}
                {/*
                    THE CARD WAS 8px SHORT OF ITS OWN CONTENT from `sm` up, which
                    is what the owner reported twice (2026-08-15: *"the links on
                    each card needs to have a bit of the distance to the text
                    above"*, *"needs to be a bit of a distance between the title
                    and the icon"*).

                    Measured at 1898x900: the inner box is 124px and holds an icon
                    row of 48, a text block needing 64, and a CTA of 20 - 132 in
                    124. The text block is `flex-1 justify-center`, so the 8px
                    shortfall was split between its two edges: the title rode 4px
                    up INTO the icon row and the description 4px down UNDER the
                    CTA. One cause, both complaints, and no amount of margin fixes
                    it because there was no space to move.

                    Adding a gap alone made it worse and clipped the titles - the
                    gap came out of the same starved block. The height has to
                    grow, so `sm` and `md` gain 24px, which pays for the missing 8
                    and the two 8px gaps the owner asked for.

                    BELOW `sm` NOTHING CHANGES. The description is `hidden
                    sm:block` there, so the block is a title alone and fits - and
                    those heights are load-bearing: all six cards must fit the
                    first mobile viewport, which is the whole reason this grid is
                    fixed-height rather than square.
                  */}
                <Card
                  className={`relative overflow-hidden h-[158px] xs:max-sm:h-[168px] sm:h-[180px] md:h-[196px] bg-muted rounded-lg border-2 motion-safe:animate-card-enter transition-[transform,border-color,box-shadow] duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 active:translate-y-px active:scale-[0.985] ${
                    isSecondary
                      ? 'border-border-quiet hover:border-border-strong'
                      : 'border-border-strong hover:border-primary/60'
                  }`}
                >
                  {/* Always faintly present, stronger on hover. The tint used
                      to appear only on hover, which left six identical outlined
                      boxes at rest — legible, but wireframe-ish, and it threw
                      away the one thing that gives each card an identity at a
                      glance. The News card carries no tint at all: that, plus a
                      neutral icon and CTA, is how it reads as the quieter
                      choice — NOT a blanket `opacity` fade, which dims its text
                      and its border along with everything else.
                      Its border is a shade dimmer than the interactive cards
                      but still ~3.1:1 against the page. "Quieter" must not mean
                      "invisible": using `--border` here dropped it to 1.55:1,
                      which is precisely the complaint this whole pass set out
                      to fix, reintroduced on one card. */}
                  {!isSecondary && (
                    <div
                      aria-hidden
                      className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} transition-opacity duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none group-hover:opacity-[0.85] group-focus-visible:opacity-[0.85] group-active:opacity-100 opacity-60`}
                    />
                  )}

                  <CardContent className="relative flex flex-col h-full p-2.5 sm:p-4 md:p-5">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-background/60 border border-border flex items-center justify-center transition-transform duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none group-hover:scale-[1.04] group-focus-visible:scale-[1.04] group-active:scale-[0.96]">
                        <feature.icon
                          className={`${feature.iconSize || 'w-5 h-5 md:w-6 md:h-6'} ${
                            isSecondary ? 'text-muted-foreground' : feature.iconColor
                          }`}
                        />
                      </div>
                      {feature.badge && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-background/60 text-muted-foreground border-border">
                          {feature.badge}
                        </span>
                      )}
                    </div>

                    {/* Centred between the icon and the CTA, so on mobile —
                        where the description is hidden — the title sits toward
                        the middle of the card instead of crowding the icon. */}
                    <div className="flex-1 flex flex-col justify-center min-h-0">
                      <h3 className="font-sans font-semibold text-[15px] xs:text-[17px] sm:text-lg md:text-xl text-foreground leading-tight">
                        {/* Short title below `md`: the card is fixed-height with
                            overflow-hidden, so a title wrapping to two lines eats
                            the description ("Champion Challenge" did exactly
                            that). */}
                        <span className="md:hidden">{feature.shortTitle ?? feature.title}</span>
                        <span className="hidden md:inline">{feature.title}</span>
                      </h3>

                      <p className="hidden sm:block text-muted-foreground text-xs md:text-sm leading-snug mt-1">
                        {feature.description}
                      </p>
                    </div>

                    {/* Sized down hard below `sm`. At 320px each card is only
                        ~138px wide, and the CTA is the only supporting text
                        there (the description is `hidden sm:block`), so it has
                        to survive: 11px type, and the arrow drops out to give
                        the label back ~18px. */}
                    <div
                      className={`mt-auto flex items-center gap-1 font-medium text-[11px] sm:text-xs md:text-sm ${
                        isSecondary ? 'text-muted-foreground' : 'text-link'
                      }`}
                    >
                      <span className="truncate">{feature.cta}</span>
                      <ArrowRight
                        aria-hidden
                        className="hidden sm:block w-3.5 h-3.5 shrink-0 transition-transform duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none group-hover:translate-x-1 group-focus-visible:translate-x-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
