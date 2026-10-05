/**
 * How much larger than the handheld the screen is, shared by the game page theme (`--gg-u`) and Spotlight Home.
 * Sizes are CSS px of Steam's Big Picture window: the Ally's own screen lays out at 828x466, a 1080p TV
 * (docked) at 1500x844. Pure.
 */

/** The handheld's layout in CSS px. */
export const HANDHELD_LAYOUT = { width: 828, height: 466 } as const;
/** Share of the screen's growth the theme unit follows ("larger on a TV, by 60% of the screen's growth"). */
export const TV_GROWTH_SHARE = 0.6;
/**
 * Growth from which the screen counts as a TV (docked): only a 1080p-class TV (1.81). Between the Steam Deck's
 * 1280x800 handheld (1.546) and the TV, so the Deck never counts as docked; the Ally handheld is 1.
 */
export const TV_MIN_GROWTH = 1.7;

/** The theme's scale unit in CSS: 1px on the handheld layout, growing by TV_GROWTH_SHARE of the screen's growth. */
export const SCALE_UNIT_CSS =
    `calc(1px + (min(calc(100vh / ${HANDHELD_LAYOUT.height}), calc(100vw / ${HANDHELD_LAYOUT.width})) - 1px) * ${TV_GROWTH_SHARE})`;

/** The screen's growth over the handheld layout (the smaller side's, as min() in SCALE_UNIT_CSS); 1 when unusable or smaller. */
export function screenGrowth(width: number, height: number): number {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
    return Math.max(1, Math.min(width / HANDHELD_LAYOUT.width, height / HANDHELD_LAYOUT.height));
}

/** True on a TV-sized screen (docked); the size is the measured Big Picture box, never SharedJSContext's 1x1 window. */
export function isTvScreen(width: number, height: number): boolean {
    return screenGrowth(width, height) >= TV_MIN_GROWTH;
}
