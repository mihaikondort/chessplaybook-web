/**
 * Where the design v2 homepage's pictures live (visual redesign plan C1, C6, C7).
 *
 * SHIPPING FOLDERS, never `preview-assets/` (that one is DEV only; the build fails on any reference to it).
 * `assets/` is cached immutable for a year, so a changed picture gets a new folder or name, never an overwrite.
 */

export type HeroId = 'sunset-glass' | 'ivory-black';

/**
 * The hero photo: `fx`/`fy` where the photo is cropped from when it must be (a phone's band, or a desktop
 * window where the photo would run past 70% of the width); `knightBase`, how far down the image the glass
 * knight's base is, which HomeStage uses to stand the knight on the cards' top edge (owner, 2026-11-13);
 * `lightX`/`lightY`, where the stage's key light aims, on the king (measured at 1366-2560 wide). Widths are the
 * files that exist (`<id>-<w>.webp`).
 *
 * "Sunset castle, glass knight": an AI-made image by our co-founder (made with ChatGPT), the owner's
 * choice (Q6). He is a co-founder, so no separate written OK is needed (owner, 2026-11-13, plan O1). It is
 * credited on /credits as AI-made. The "2400" file is an upscale of the 1264px original (the only one there is),
 * as the owner judged it.
 *
 * FALLBACK, one entry away: "Ivory on black" (carved ivory set, Auckland Museum, CC BY 2.0; its files stay in
 * hero-v2/): { id: 'ivory-black', fx: 0.5, fy: 0.5 } (its knightBase and light to be measured). If it is ever
 * used, /credits must name it.
 */
export const HERO = {
  id: 'sunset-glass' as HeroId,
  base: '/assets/images/hero-v2',
  fx: 0.51,
  fy: 0.5,
  knightBase: 0.75,
  lightX: '71%',
  lightY: '31%',
  widths: [720, 1200, 2400],
};

export const heroSrc = (w: number) => `${HERO.base}/${HERO.id}-${w}.webp`;
export const heroSrcSet = () => HERO.widths.map((w) => `${heroSrc(w)} ${w}w`).join(', ');
/** The hero's rendered width: the full phone width, or on desktop about half the window (1.5 times a height
    that follows the headline block; 924px at 1903x914, measured). Shared by the <img> and the head preload
    (vite.config.ts): if they differed, the browser would fetch the hero twice. */
export const heroSizes = () => '(max-width: 767px) 100vw, 55vw';

/** The studio portraits (toned) and their colour versions for hover, same crop and light. */
const PORTRAITS = '/assets/images/champions/portraits-v2';
export const portraitSrc = (name: string) => `${PORTRAITS}/${name}.webp`;
export const portraitColorSrc = (name: string) => `${PORTRAITS}/color/${name}.webp`;
