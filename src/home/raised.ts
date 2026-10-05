import { feedRows, feedSpace } from './feedLayout';
import { FEED_SHEET } from './homeCss';
import { RECENTS_BOTTOM, recentsGeometry } from './recentsLayout';

/**
 * The raised view's two outer margins, in logical px: the recents row's top below the top of the screen, and the
 * last feed row's bottom above the top of Steam's legend. Pure. `raiseDelta` is how much further than FEED_SHEET.raise
 * the page rises (everything in the raised view moves up by it, and the feed rows may use that much more room).
 * Measured for the What's new tab with its second row (the fullest sheet).
 */
export function raisedMargins(logicalHeight: number, legend: number, scale: number, raiseDelta = 0): { top: number; bottom: number; rowsTotal: number } {
    const g = recentsGeometry(scale);
    const feedTop = 756 - (FEED_SHEET.raise + raiseDelta);
    const rows = feedRows('news', feedSpace(logicalHeight, legend, raiseDelta), true);
    return {
        top: RECENTS_BOTTOM - g.capsuleH - (FEED_SHEET.raise + raiseDelta),
        bottom: logicalHeight - legend - (feedTop + rows.total),
        rowsTotal: rows.total,
    };
}

/** The raise may grow by at most this beyond FEED_SHEET.raise. */
export const MAX_RAISE_DELTA = 60;

/**
 * The extra rise (whole px, 0..MAX_RAISE_DELTA) that makes the raised view's top margin equal its bottom margin
 * (closest, the smaller rise on a tie). A taller recents row lowers the top margin; each px of rise lowers it and
 * raises the bottom margin (the feed rows grow into the room up to their cap), so the two meet. Never negative.
 */
export function solveRaiseDelta(logicalHeight: number, legend: number, scale: number): number {
    if (!Number.isFinite(logicalHeight)) return 0;
    let best = 0;
    let bestGap = Infinity;
    for (let d = 0; d <= MAX_RAISE_DELTA; d++) {
        const m = raisedMargins(logicalHeight, legend, scale, d);
        const gap = Math.abs(m.top - m.bottom);
        if (gap < bestGap - 1e-9) {
            best = d;
            bestGap = gap;
        }
    }
    return best;
}
