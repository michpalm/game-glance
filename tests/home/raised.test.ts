import { describe, expect, it } from 'vitest';
import { MAX_RAISE_DELTA, raisedMargins, solveRaiseDelta } from '../../src/home/raised';
import { FEED_ROW2_MAX_H } from '../../src/home/feedLayout';
import { titleBlockBottom } from '../../src/home/homeCss';
import { CARD_SCALE_DOCKED, CARD_SCALE_HANDHELD, recentsGeometry, recentsGlowTop } from '../../src/home/recentsLayout';

const SCALES = [CARD_SCALE_HANDHELD, CARD_SCALE_DOCKED];

describe('raised view margins', () => {
    it('without extra rise: top = 688 - card height - 440, bottom = legend top - last row bottom', () => {
        const m = raisedMargins(810, 73, 1.5);
        expect(m.top).toBe(38); // the old handheld (x1.5): 38 above, only 12 below
        expect(m.bottom).toBe(12);
        expect(raisedMargins(810, 73, 1.6).top).toBe(24);
    });
    it('the solver makes the top margin equal the bottom one (within a px) at the Ally, Deck and TV canvases and legends 40/46/73', () => {
        for (const s of SCALES) for (const h of [800, 810, 810.75]) for (const L of [40, 46, 73]) {
            const d = solveRaiseDelta(h, L, s);
            const m = raisedMargins(h, L, s, d);
            expect(Math.abs(m.top - m.bottom)).toBeLessThanOrEqual(1);
            expect(m.top).toBeGreaterThanOrEqual(12);
            expect(d).toBeGreaterThanOrEqual(0);
            expect(d).toBeLessThanOrEqual(MAX_RAISE_DELTA);
        }
    });
    it('the Ally handheld (810.4 logical, legend 73) at x1.6: rise +12, 12 above and 12 below', () => {
        const d = solveRaiseDelta(810.4, 73, CARD_SCALE_HANDHELD);
        expect(d).toBe(12);
        const m = raisedMargins(810.4, 73, CARD_SCALE_HANDHELD, d);
        expect(m.top).toBe(12);
        expect(m.bottom).toBeCloseTo(12.4, 5);
    });
    it('rows grow into the extra rise but the second row stays within its cap (shorter than row 1)', () => {
        for (const d of [0, 12, 40]) expect(raisedMargins(810, 73, 1.6, d).rowsTotal).toBeLessThanOrEqual(308 + FEED_ROW2_MAX_H);
    });
    it('a tall canvas whose rows cannot fill it keeps the base rise (no equal margin is reachable)', () => {
        expect(solveRaiseDelta(960, 46, CARD_SCALE_HANDHELD)).toBe(0);
    });
    it('unraised: the row top stays at least 28 under the tallest action row and its glow tail stays below it', () => {
        for (const s of SCALES) {
            const g = recentsGeometry(s);
            expect(g.top - titleBlockBottom()).toBeGreaterThanOrEqual(28);
            expect(recentsGlowTop(g)).toBeGreaterThan(titleBlockBottom());
        }
    });
});
