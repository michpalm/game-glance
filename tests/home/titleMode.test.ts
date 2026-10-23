import { describe, expect, it } from 'vitest';
import { pageTitleSizes, titleOneLine } from '../../src/home/titleMode';
import { homeCanvas } from '../../src/home/scale';
import { homeStack } from '../../src/home/homeCss';
import { legendReserve } from '../../src/home/legend';

describe('titleOneLine (Home and the game page decide the title\'s slot alike, #55)', () => {
    it('keeps two lines at Steam 100%', () => {
        expect(titleOneLine(1920, 1080, 1, 46)).toBe(false);
        expect(titleOneLine(1280, 800, 1, null)).toBe(false);
    });
    it('goes to one line at Steam 1.2 on the Ally', () => expect(titleOneLine(1601, 900, 1.2, 40)).toBe(true));
    it('is Home\'s own decision for the same window and legend', () => {
        for (const [w, h, dpr, legend] of [[1601, 900, 1.2, 40], [1424, 800, 1.35, 50], [1700, 956, 1.13, 44]] as const) {
            const c = homeCanvas(w, h, dpr);
            expect(titleOneLine(w, h, dpr, legend)).toBe(homeStack(c.logicalHeight, legendReserve(legend, c.scale), false).give.titleLines === 1);
        }
    });
});

describe('pageTitleSizes (the page\'s one-line title steps)', () => {
    it('are Home\'s steps at the page\'s title ratio, in CSS px', () => {
        expect(pageTitleSizes(1)).toEqual([58, 46, 36, 29].map((s) => (s * 64) / 58));
        expect(pageTitleSizes(1.25)[0]).toBeCloseTo(64 * 1.25, 6);
    });
});
