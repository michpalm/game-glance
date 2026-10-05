import { describe, expect, it } from 'vitest';
import { FEED_ROW1_MIN_H, FEED_ROW2_MIN_H, FEED_ROW_GAP, FEED_ROW2_HEADER, FEED_TOP_RAISED, feedRows, feedSpace } from '../../src/home/feedLayout';
import { FEED_SHEET, MAX_STACK_SHIFT, MIN_STACK_SHIFT, stackShift } from '../../src/home/homeCss';
import { LEGEND_FALLBACK, legendReserve } from '../../src/home/legend';

const LEGENDS = [40, 46, 71, 90];
const HEIGHTS = [800, 810, 960];
const tabsBottom = FEED_SHEET.tabsTop + FEED_SHEET.tabHeight;

describe('legendReserve', () => {
    it('css px over the canvas scale, rounded up; the Ally handheld legend is about 72 logical', () => {
        expect(legendReserve(41.85, 0.575)).toBe(73);
        expect(legendReserve(41, 1.0417)).toBe(40);
    });
    it('falls back to 46 when missing or unbelievable', () => {
        for (const bad of [null, undefined, 0, -3, NaN, 1, 400]) expect(legendReserve(bad as number, 0.575)).toBe(LEGEND_FALLBACK);
        expect(legendReserve(41, 0)).toBe(LEGEND_FALLBACK);
    });
});

describe('stackShift with a measured legend', () => {
    it('keeps the old results at the 46 reserve', () => {
        expect(stackShift(810.75)).toBe(13);
        expect(stackShift(810)).toBe(12);
        expect(stackShift(800)).toBe(2);
        expect(stackShift(810, 46)).toBe(12);
    });
    it('the tab strip ends 18 above the real legend whenever the shift is not clamped', () => {
        for (const L of LEGENDS) for (const h of HEIGHTS) {
            const shift = stackShift(h, L);
            expect(shift).toBeGreaterThanOrEqual(MIN_STACK_SHIFT);
            expect(shift).toBeLessThanOrEqual(MAX_STACK_SHIFT);
            const gap = h - L - (tabsBottom + shift);
            if (shift > MIN_STACK_SHIFT && shift < MAX_STACK_SHIFT && (shift !== 0 || L > 46)) expect(gap).toBeGreaterThanOrEqual(18);
            if (L > 46 && shift < MAX_STACK_SHIFT) expect(gap).toBeLessThan(19);
        }
    });
    it('a tall legend lifts the stack (negative shift); a short one on a short screen never does', () => {
        expect(stackShift(810, 71)).toBe(-13);
        expect(stackShift(800, 71)).toBe(-23);
        expect(stackShift(800, 90)).toBe(-42);
        expect(stackShift(800, 40)).toBe(8);
        expect(stackShift(700, 40)).toBe(0);
        expect(stackShift(100, 200)).toBe(MIN_STACK_SHIFT);
    });
});

describe('the raised sheet above a measured legend', () => {
    it('row 2 ends at least 12 above the legend line wherever the room allows it, row 1 gives way only below row 2\'s 80', () => {
        for (const tab of ['news', 'friends', 'recommended'] as const) for (const L of LEGENDS) for (const h of HEIGHTS) {
            const rows = feedRows(tab, feedSpace(h, L), true);
            expect(rows.row2).toBeGreaterThanOrEqual(FEED_ROW2_MIN_H);
            expect(rows.row2).toBeLessThan(rows.row1);
            expect(rows.row1).toBeGreaterThanOrEqual(FEED_ROW1_MIN_H);
            expect(rows.row2Top).toBe(rows.row1 + FEED_ROW_GAP + FEED_ROW2_HEADER);
            const bottom = FEED_TOP_RAISED + rows.total;
            expect(bottom).toBeLessThanOrEqual(h - L - 12 + (rows.row1 === FEED_ROW1_MIN_H ? 40 : 0));
            if (L <= 71) expect(bottom).toBeLessThanOrEqual(h - L - 12);
        }
    });
    it('the Ally handheld (810 logical, legend 72): row 2 is 102, ending 12 above the legend (was 128, 13 under it)', () => {
        const rows = feedRows('news', feedSpace(810.4, 72), true);
        expect(rows).toMatchObject({ row1: 270, row2: 102 });
        expect(FEED_TOP_RAISED + rows.total).toBe(726); // the legend line is at 738.4
    });
    it('docked / Deck results do not change at legends of 40 to 46', () => {
        for (const L of [40, 46]) expect(feedRows('news', feedSpace(810.75, L), true).row2).toBe(128);
        expect(feedRows('news', feedSpace(800, 46), true).row2).toBe(118);
        expect(feedRows('news', feedSpace(800), true).row2).toBe(118);
    });
    it('row 1 shrinks to the floor when even the minimum row 2 does not fit, never below it', () => {
        const r = feedRows('news', feedSpace(800, 90), true);
        expect(r.row2).toBe(80);
        expect(r.row1).toBe(264);
        expect(feedRows('news', 260, true).row1).toBe(FEED_ROW1_MIN_H);
        expect(feedRows('friends', feedSpace(800, 90), true).row1).toBe(260);
    });
    it('without a second row nothing shrinks', () => {
        expect(feedRows('news', feedSpace(800, 90), false).row1).toBe(270);
    });
});
