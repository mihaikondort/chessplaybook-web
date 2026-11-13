import { RouteHeading } from '@/components/RouteHeading';
import { ChooserGrid } from './ChooserGrid';
import { HERO, heroSizes, heroSrc, heroSrcSet } from './homeAssets';

/** The homepage's page width: the nav and footer's 1680px in v2 (index.css). */
export const HOME_WRAP = 'mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-[3.5vw]';

/**
 * ONE STAGE FOR THE HEADLINE AND THE CARDS (analysis §6a, "the chosen combination"): the hero photo runs
 * behind both, darkened toward the text, with a warm key light on its focal piece, a vignette and fine grain;
 * the six cards are glass over it.
 *
 * WHERE THE PHOTO SITS (desktop, owner 2026-11-13): it hangs from the headline block, right-aligned to the
 * window less 9vw (owner: further left), its height the block's divided by `HERO.knightBase` (where the glass knight's base is in the image),
 * so the knight stands on the cards' top edge at every window size instead of behind them. The whole photo
 * shows (no crop) unless it would run wider than 70% of the window; the cards sit lower than before, which
 * also makes the photo larger. On a phone it is the 300px band across the top, as before.
 *
 * The `<h1>` is `RouteHeading`'s, from `route-meta.json`, the one source the `<title>`, the prerender and the
 * ad copy share (§6c); the gold accent is its `headingAccentWords`.
 *
 * The photo is the page's LCP element, and most visitors are on phones: a real `srcset` with
 * width descriptors, so a phone takes the 720 or 1200 and only a wide screen the 2400 (C6a adds the preload).
 */
export function HomeStage() {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ ['--fx' as string]: HERO.lightX, ['--fy' as string]: HERO.lightY }}
    >
      <div className="v2-stage-shade absolute inset-0 -z-10" aria-hidden />
      <div className="v2-stage-light absolute inset-0 -z-10" aria-hidden />
      <div className="v2-stage-vignette absolute inset-0 -z-10" aria-hidden />
      <div className="v2-grain absolute inset-0 -z-10" aria-hidden />

      <div className={`${HOME_WRAP} relative h-[250px] md:h-auto md:pt-[clamp(32px,5.5svh,64px)] flex flex-col justify-end pb-6 md:pb-[clamp(48px,9svh,104px)]`}>
        {/* Under the shade and the light (-z-20): it comes after them in the document. */}
        <div
          className="absolute inset-x-0 top-0 h-[300px] -z-20 overflow-hidden v2-stage-imgwrap md:left-auto md:right-[calc(50%-50vw+9vw)] md:h-[var(--hero-h)] md:w-auto md:aspect-[1200/799] md:max-w-[70vw]"
          style={{ ['--hero-h' as string]: `calc(100% / ${HERO.knightBase})` }}
          aria-hidden
        >
          <img
            src={heroSrc(1200)}
            srcSet={heroSrcSet()}
            sizes={heroSizes()}
            alt=""
            className="v2-stage-img v2-kenburns w-full h-full object-cover"
            style={{ objectPosition: `${HERO.fx * 100}% ${HERO.fy * 100}%` }}
            fetchPriority="high"
          />
        </div>
        <RouteHeading routeKey="" variant="hero" className="flex-1 flex flex-col justify-between pt-1.5 md:block md:flex-none md:pt-0" />
      </div>

      <ChooserGrid className={`${HOME_WRAP} pb-4 md:pb-6`} />
    </section>
  );
}
