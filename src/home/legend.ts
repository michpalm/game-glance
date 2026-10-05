/**
 * Steam's bottom button legend (MENU / SELECT / BACK) is a fixed CSS height, so on the handheld (canvas scale 0.575)
 * it is about 41 css px = 72 logical px of Home's 1440 canvas, while docked it is about 40 logical. The layout
 * measures it live and reserves that much (stackShift, feedSpace); 46 (the handoff's) is the fallback.
 */
export const LEGEND_FALLBACK = 46;
/** A measured legend outside this range (logical px) is not believed. */
const LEGEND_MIN = 20;
const LEGEND_MAX = 140;

/** The legend's reserve in logical px for a footer `cssHeight` tall (css px) on a canvas scaled by `scale`; the fallback when unusable. Pure. */
export function legendReserve(cssHeight: number | null | undefined, scale: number): number {
    if (typeof cssHeight !== 'number' || !Number.isFinite(cssHeight) || cssHeight <= 0 || !Number.isFinite(scale) || scale <= 0) return LEGEND_FALLBACK;
    const logical = Math.ceil(cssHeight / scale);
    return logical < LEGEND_MIN || logical > LEGEND_MAX ? LEGEND_FALLBACK : logical;
}

/**
 * The footer's layout height (css px; offsetHeight, so no transform counts), or null when it is not found. Language
 * independent: walking up from Home's root, a sibling subtree holds an absolutely positioned, full-width element whose
 * bottom edge is the window's bottom and that does not contain Home. The tallest such element wins.
 */
export function findLegendHeight(root: HTMLElement): number | null {
    try {
        const view = root.ownerDocument?.defaultView;
        let best: number | null = null;
        let climbed: HTMLElement = root;
        for (let depth = 0; depth < 14 && climbed.parentElement; depth++) {
            const parent: HTMLElement = climbed.parentElement;
            const parentBox = parent.getBoundingClientRect();
            const wide = root.offsetWidth * 0.9;
            for (const sibling of Array.from(parent.children) as HTMLElement[]) {
                if (sibling === climbed) continue;
                for (const el of [sibling, ...(Array.from(sibling.children) as HTMLElement[])]) {
                    if (!(el instanceof (view?.HTMLElement ?? HTMLElement)) || view?.getComputedStyle(el).position !== 'absolute') continue;
                    const box = el.getBoundingClientRect();
                    const h = el.offsetHeight;
                    if (h > 0 && el.offsetWidth >= wide && Math.abs(box.bottom - parentBox.bottom) <= 1.5 && h <= root.offsetHeight * 0.3 && (el.textContent ?? '').trim() !== '') {
                        if (best === null || h > best) best = h;
                    }
                }
            }
            climbed = parent;
        }
        return best;
    } catch {
        return null;
    }
}
