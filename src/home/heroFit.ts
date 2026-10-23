/**
 * The hero art's framing (docs/superpowers/specs/2026-10-23-hero-fit-design.md): Fill covers the screen (the sides of
 * wide art are cut off); Fit shows the whole art at the top centre, its edge fading into a blurred copy of it. Shared by
 * Home, the restyled game page and the open transition, so the hand-over keeps the same framing. Pure.
 */

export type HeroFit = 'fill' | 'fit';
export const HERO_FITS: readonly HeroFit[] = ['fill', 'fit'];

export function heroFitOf(value: unknown): HeroFit {
    return value === 'fit' ? 'fit' : 'fill';
}

/** The share of the art's extent, next to the fill, that fades out. */
export const FIT_FADE = 0.22;

/** Steam's library hero shape (3840 x 1240): used until an art's real size is known. */
export const STANDARD_HERO_ASPECT = 3.1;

/** The visual language's `art-fill` token: blurred artwork behind art that does not fill its space. */
export const ART_FILL_FILTER = 'blur(42px) saturate(1.25) brightness(.8)';

/**
 * The screen's shape from the window the hero is drawn in (its element's `ownerDocument.defaultView`): never the
 * plugin's global `window`, which is Steam's shared context (1x1 on the Ally). 16:9 without a real size.
 */
export function windowAspect(win: { innerWidth: number; innerHeight: number } | null | undefined): number {
    return win && win.innerWidth >= 64 && win.innerHeight >= 64 ? win.innerWidth / win.innerHeight : 16 / 9;
}

const round = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number) => `${round(n)}%`;

/**
 * The mask that fades the fitted art into the fill, for art of `artAspect` (width / height) in a box of `boxAspect`, as
 * a CSS gradient over the box: wider art fits the width at the top and its bottom fades; taller art fits the height,
 * centred, and both sides fade. 'none' when the art is the box's shape (within 0.5%).
 */
export function fitMask(artAspect: number, boxAspect: number): string {
    const art = Number.isFinite(artAspect) && artAspect > 0 ? artAspect : STANDARD_HERO_ASPECT;
    if (Math.abs(art / boxAspect - 1) <= 0.005) return 'none';
    if (art > boxAspect) {
        const end = (boxAspect / art) * 100;
        return `linear-gradient(180deg, #000 ${pct(end * (1 - FIT_FADE))}, transparent ${pct(end)})`;
    }
    // Centred: the right side mirrors the left exactly (rounded once, so the two sides never differ by a rounding step).
    const width = (art / boxAspect) * 100;
    const edge = round((100 - width) / 2);
    const solid = round((100 - width) / 2 + width * FIT_FADE);
    return `linear-gradient(90deg, transparent ${edge}%, #000 ${solid}%, #000 ${round(100 - solid)}%, transparent ${round(100 - edge)}%)`;
}
