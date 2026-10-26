
import { defaultGrowth } from '../home/scale';

/**
 * Game Glance's screensaver: its timings, its canvas and its stylesheet. Pure. Steam's Game Slideshow (probed on the
 * Ally, 2026-10-16) shows a slide for 20 s, crossfades over 2 s, drifts the art over 30 s (scale 1.035) and draws it in
 * a frame 100vw x 80vh with black bars; ours keeps the timings and drift, with Home's games, art and logo, the art filling
 * the whole screen.
 */
export const SLIDE_MS = 20_000;
export const CROSSFADE_MS = 2_000;
export const DRIFT_MS = 30_000;
/** The old logo and card fade out within OVERLAY_OUT_MS; the new ones fade in over OVERLAY_IN_MS from OVERLAY_IN_DELAY_MS, as the old are nearly gone. */
export const OVERLAY_OUT_MS = 450;
export const OVERLAY_IN_DELAY_MS = 350;
export const OVERLAY_IN_MS = 800;
/** The card's glass blur, px. */
const CARD_BLUR = 16;

/** The canvas the logo, card and status bar are laid out on (Home's 1440 x 810), scaled to fit the screen whatever its shape. */
export const SS_CANVAS = { width: 1440, height: 810 } as const;

/** Margin of the logo and the card from the screen's edges, in canvas px: Steam's 3.5vw at 16:9. */
export const SS_SIDE = 50;

export interface ScreensaverCanvas { logicalWidth: number; logicalHeight: number; scale: number }

/**
 * The narrowest canvas the bottom row needs: both margins, the largest logo (LOGO_BOX, 560), a gap and the stats card
 * (about 300). Narrower screens (4:3, 1:1) are scaled down by width only below it; above it the height sets the scale, so
 * the text stays as big as at 16:9 (scaling by width alone drew the card's labels at about 5 px on a square screen).
 */
export const SS_MIN_WIDTH = 1040;

/** The canvas scaled by the screen's height (SS_CANVAS.height tall), or by its width when narrower than SS_MIN_WIDTH; the other side grown to fill the screen. Scale 1 for a bad size. */
export function screensaverBaseCanvas(width: number, height: number): ScreensaverCanvas {
    if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) {
        return { logicalWidth: SS_CANVAS.width, logicalHeight: SS_CANVAS.height, scale: 1 };
    }
    const scale = Math.min(height / SS_CANVAS.height, width / SS_MIN_WIDTH);
    return { logicalWidth: width / scale, logicalHeight: height / scale, scale };
}

/** The screensaver's canvas grown by Home's default growth (home/scale defaultGrowth, #55); a window of unknown size is not grown. */
export function screensaverCanvas(width: number, height: number): ScreensaverCanvas {
    const base = screensaverBaseCanvas(width, height);
    if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) return base;
    const g = defaultGrowth(SS_CANVAS.height);
    return { logicalWidth: base.logicalWidth / g, logicalHeight: base.logicalHeight / g, scale: base.scale * g };
}

/**
 * The stats card's smallest size, as a canvas scale: on a small screen (the handheld, a short ultrawide window) it is
 * enlarged so its text is never smaller than at this scale, like the status bar (home/statusItems.statusScale).
 */
export const CARD_MIN_SCALE = 0.8;

/** How much the card is enlarged beyond its canvas scale (1 from CARD_MIN_SCALE up). */
export function cardScale(canvasScale: number): number {
    return Number.isFinite(canvasScale) && canvasScale > 0 && canvasScale < CARD_MIN_SCALE ? Math.round((CARD_MIN_SCALE / canvasScale) * 1000) / 1000 : 1;
}

/** Fisher-Yates over a copy (Steam shuffles its slides too); `random` returns [0, 1). */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}


/**
 * The stylesheet, put in the screensaver's window. Every class starts with `ggs-`. `steamSlideshow`: Steam's slideshow
 * class, hidden under ours (it keeps running, unseen); null when Steam renamed it (ours is opaque and on top anyway).
 */
export function screensaverCss(steamSlideshow: string | null): string {
    return [
        steamSlideshow ? `.${steamSlideshow} { display: none !important; }` : '',
        `@keyframes ggs-fade-in { from { opacity: 0; } to { opacity: 1; } }`,
        `@keyframes ggs-drift { 0% { transform: scale(1) translate3d(0, 0, 0); } 50% { transform: scale(1.035) translate3d(0.75%, -1.5%, 0); } 100% { transform: scale(1) translate3d(0, 0, 0); } }`,
        `.ggs-root { position: fixed; inset: 0; z-index: 10; background: #000; overflow: hidden; pointer-events: none; color: #fff; }`,
        `@keyframes ggs-fade-out { from { opacity: 1; } to { opacity: 0; } }`,
        // As Steam's: the old slide fades out over the new one (slideStack). The logo and card hand over in turn, never
        // both at once: the old ones are gone before the new ones come in. Each part fades on its own, never a whole slide
        // or the overlay: a backdrop blur under a fading parent has nothing to blur until the fade ends, so the card's
        // glass popped in. The card's blur grows with its fade instead (ggs-glass-in / -out).
        `@keyframes ggs-glass-in { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(${CARD_BLUR}px); } }`,
        `@keyframes ggs-glass-out { from { opacity: 1; backdrop-filter: blur(${CARD_BLUR}px); } to { opacity: 0; backdrop-filter: blur(0px); } }`,
        `.ggs-slide { position: absolute; inset: 0; }`,
        `.ggs-first .ggs-frame { animation: ggs-fade-in ${CROSSFADE_MS}ms ease-in-out both; }`,
        `.ggs-leaving .ggs-frame { animation: ggs-fade-out ${CROSSFADE_MS}ms ease-in-out both; }`,
        `.ggs-first :is(.ggs-scrim, .ggs-titlebox) { animation: ggs-fade-in ${CROSSFADE_MS}ms ease-in-out both; }`,
        `.ggs-first .ggs-card { animation: ggs-glass-in ${CROSSFADE_MS}ms ease-in-out both; }`,
        `.ggs-leaving :is(.ggs-scrim, .ggs-titlebox) { animation: ggs-fade-out ${OVERLAY_OUT_MS}ms ease both; }`,
        `.ggs-leaving .ggs-card { animation: ggs-glass-out ${OVERLAY_OUT_MS}ms ease both; }`,
        `.ggs-entering :is(.ggs-scrim, .ggs-titlebox) { animation: ggs-fade-in ${OVERLAY_IN_MS}ms ease ${OVERLAY_IN_DELAY_MS}ms both; }`,
        `.ggs-entering .ggs-card { animation: ggs-glass-in ${OVERLAY_IN_MS}ms ease ${OVERLAY_IN_DELAY_MS}ms both; }`,
        `.ggs-overlay { position: absolute; inset: 0; }`,
        `.ggs-frame { position: absolute; inset: 0; overflow: hidden; }`,
        `.ggs-art { position: absolute; inset: 0; background-size: cover; background-position: center; background-repeat: no-repeat;
            will-change: transform; animation: ggs-drift ${DRIFT_MS}ms ease-in-out infinite; }`,
        `.ggs-art.ggs-blur { inset: -60px; filter: blur(42px) saturate(1.25) brightness(.8); animation: none; }`,
        `@media (prefers-reduced-motion: reduce) { .ggs-art { animation: none; } }`,
        // A soft dark rise at the bottom, so the logo and the card read on bright art (only with either of them).
        `.ggs-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; background: linear-gradient(to top, rgba(0,0,0,.55), transparent); }`,
        `.ggs-canvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; }`,
        // The logo as on Home (GameTitle sizes it inline), bottom-left; a game without one shows its name in Home's title style.
        `.ggs-titlebox { position: absolute; left: ${SS_SIDE}px; bottom: ${SS_SIDE}px; width: 620px; display: flex; flex-direction: column; justify-content: flex-end; }`,
        `.ggs-logo { display: block; object-fit: contain; object-position: left bottom; filter: drop-shadow(0 4px 24px rgba(0,0,0,.45)); }`,
        `.ggs-title { font-size: 58px; line-height: 1; font-weight: 800; letter-spacing: -.02em; text-wrap: balance; text-shadow: 0 4px 30px rgba(0,0,0,.4);
            overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }`,
        // The HowLongToBeat card: the Clean look's glass, bottom-right, its bottom on the logo's.
        `.ggs-card { position: absolute; right: ${SS_SIDE}px; bottom: ${SS_SIDE}px; display: flex; gap: 18px; align-items: flex-start; padding: 9px 16px;
            border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(12,16,22,.38); backdrop-filter: blur(${CARD_BLUR}px);
            transform: scale(var(--ggs-card-k, 1)); transform-origin: 100% 100%; }`,
        `.ggs-card > div { display: flex; flex-direction: column; gap: 2px; }`,
        `.ggs-label { font-size: 9px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: rgba(255,255,255,.62); white-space: nowrap; }`,
        `.ggs-value { font-size: 17px; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: nowrap; }`,
        `.ggs-bar { width: 100%; min-width: 56px; height: 3px; margin-top: 2px; border-radius: 2px; background: rgba(255,255,255,.14); overflow: hidden; }`,
        `.ggs-bar > div { height: 100%; background: #fff; }`,
        `.ggs-status { position: absolute; top: 0; right: 0; height: 0; transform-origin: top right; }`,
    ].filter((r) => r.length > 0).join('\n');
}
