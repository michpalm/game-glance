import { isTvScreen } from '../styles/screenScale';

/**
 * Recents row geometry (handoff "Recents row"), in logical px on the scaled canvas. Pure.
 * Items are the games followed by the "View more in your Library" card (index `count`). The focused game
 * expands from the capsule to the wide card (the landscape art's aspect); the row is scrolled so the focus sits
 * at the left edge. Every size derives from one card scale (recentsGeometry), larger when docked to a TV.
 */

/** Card scale on the handheld: the handoff's sizes (capsule 93x140, gap 12, ghost gap 18) times this. */
export const CARD_SCALE_HANDHELD = 1.6;
/** Card scale docked to a TV (screenScale.isTvScreen), more immersive. */
export const CARD_SCALE_DOCKED = 1.6;
/**
 * Aspect of Steam's landscape art: the library header (460x215) and SteamGridDB "wide" grids (920x430). Probed
 * on the Ally for every recent (custom, Steam and non-Steam): all 2.14. The wide card has it, so `cover` shows it whole.
 */
export const WIDE_ASPECT = 460 / 215;
/** Most games repeated after the Library card as the loop preview. */
export const MAX_GHOSTS = 8;
/**
 * The row's bottom edge from the screen top, at every scale: 12 above the tab strip peeking at 700 (and well
 * above the 46 px legend reserve at 764). A larger scale grows the row upwards, toward the actions (which end
 * near 433 with a two-line title): docked x1.6 starts at 464. These are before the stack shift (homeCss.stackShift),
 * which moves the whole stack down together, so every gap here holds.
 */
export const RECENTS_BOTTOM = 688;

export interface RecentsGeometry {
    scale: number;
    capsuleW: number;
    capsuleH: number;
    /** The expanded card: round(capsuleH x WIDE_ASPECT). */
    wideW: number;
    gap: number;
    /** Extra gap before the loop preview ("ghosts"). */
    ghostGap: number;
    /** capsuleW + gap. */
    step: number;
    /** wideW - capsuleW: how far later items move while a game is expanded. */
    grow: number;
    /** Row top and bottom from the screen top. */
    top: number;
    bottom: number;
    /** A handoff size scaled for CSS details (borders, fonts, shadows, badges), to 0.01 px. */
    fine(px: number): number;
}

/** Handheld or docked card scale. */
export function cardScale(docked: boolean): number {
    return docked ? CARD_SCALE_DOCKED : CARD_SCALE_HANDHELD;
}

/**
 * The card scale for Home's measured box, or null until it is measured. Home mounts its content only once this is
 * known, so the row never first renders at the handheld size and then slides (380 ms) to the docked one.
 */
export function cardScaleFor(size: { width: number; height: number } | null): number | null {
    return size ? cardScale(isTvScreen(size.width, size.height)) : null;
}

/** The focus glow under the expanded card (handoff, times the scale): `0 GLOW.y GLOW.blur GLOW.spread`, plus a 1px ring. */
export const GLOW = { y: 16, blur: 40, spread: -12 } as const;

/** Every recents size for a card scale (an unusable scale gives the handheld one). The CSS reads it too. */
export function recentsGeometry(scale: number): RecentsGeometry {
    const s = Number.isFinite(scale) && scale > 0 ? scale : CARD_SCALE_HANDHELD;
    const whole = (px: number) => Math.round(px * s);
    const capsuleW = whole(93);
    const capsuleH = whole(140);
    const wideW = Math.round(capsuleH * WIDE_ASPECT);
    const gap = whole(12);
    return {
        scale: s,
        capsuleW,
        capsuleH,
        wideW,
        gap,
        ghostGap: whole(18),
        step: capsuleW + gap,
        grow: wideW - capsuleW,
        top: RECENTS_BOTTOM - capsuleH,
        bottom: RECENTS_BOTTOM,
        fine: (px: number) => Math.round(px * s * 100) / 100,
    };
}

/** Topmost logical y the focus glow reaches (from the screen top): the blur rises above the offset, shrunk shadow, plus the ring. */
export function recentsGlowTop(geometry: RecentsGeometry): number {
    const k = geometry.fine;
    return geometry.top + k(GLOW.y) - k(GLOW.spread) - k(GLOW.blur) - 1;
}

/** Ghost opacity: the first at .4 (.55 while the Library card is focused), falling evenly to .08 by the 8th. */
const GHOST_FIRST = 0.4;
const GHOST_FIRST_ON_LIBRARY = 0.55;
const GHOST_LAST = 0.08;

export interface RecentsItem {
    left: number;
    width: number;
    /** Before the focus: drawn at opacity .35. */
    dim: boolean;
}

export interface RecentsLayout {
    /** `count` games, then the Library card. */
    items: RecentsItem[];
    /** translateX of the whole row. */
    scrollX: number;
    /** Left of the first ghost. */
    ghostStart: number;
    /** The loop preview: the first `ghostCount(count)` games again, one step apart, fading to the right. */
    ghosts: Array<{ left: number; opacity: number }>;
}

function safeCount(count: number): number {
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

/** Focus index clamped to 0..count (count = the Library card). */
export function clampFocus(count: number, focused: number): number {
    const n = safeCount(count);
    if (!Number.isFinite(focused)) return 0;
    return Math.min(n, Math.max(0, Math.floor(focused)));
}

export function isLibraryFocus(count: number, focused: number): boolean {
    const n = safeCount(count);
    return n > 0 && clampFocus(n, focused) === n;
}

/** Index of the game the hero, title and accent show: the focused game, or the last one while on the Library card. */
export function heroIndex(count: number, focused: number): number | null {
    const n = safeCount(count);
    if (n === 0) return null;
    return Math.min(n - 1, clampFocus(n, focused));
}

/** The loop preview repeats the first games, at most eight (fewer when the library is small). */
export function ghostCount(count: number): number {
    return Math.min(MAX_GHOSTS, safeCount(count));
}

/** Opacity of ghost `j` (0-based), linear from the first value to .08 at the last possible ghost; to 0.001. */
export function ghostOpacity(j: number, onLibrary: boolean): number {
    const first = onLibrary ? GHOST_FIRST_ON_LIBRARY : GHOST_FIRST;
    const t = Number.isFinite(j) ? Math.min(1, Math.max(0, j / (MAX_GHOSTS - 1))) : 0;
    return Math.round((first + (GHOST_LAST - first) * t) * 1000) / 1000;
}

export function recentsLayout(count: number, focused: number, geometry: RecentsGeometry): RecentsLayout {
    const { capsuleW, wideW, step, grow, ghostGap } = geometry;
    const n = safeCount(count);
    const f = clampFocus(n, focused);
    const onLibrary = f === n;
    const items: RecentsItem[] = [];
    for (let i = 0; i <= n; i++) {
        const expanded = !onLibrary && i === f;
        const after = !onLibrary && i > f;
        items.push({ left: i * step + (after ? grow : 0), width: expanded ? wideW : capsuleW, dim: i < f });
    }
    const ghostStart = (n + 1) * step + (onLibrary ? 0 : grow) + ghostGap;
    const ghosts = Array.from({ length: ghostCount(n) }, (_, j) => ({ left: ghostStart + j * step, opacity: ghostOpacity(j, onLibrary) }));
    return { items, scrollX: 0 - f * step, ghostStart, ghosts };
}
