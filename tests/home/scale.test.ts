import { describe, expect, it } from 'vitest';
import { homeCanvas } from '../../src/home/scale';

describe('homeCanvas', () => {
    it('homeCanvas picks 1440x810 for 1920x1080 with scale 4/3', () => {
        const c = homeCanvas(1920, 1080);
        expect(c.logicalWidth).toBe(1440);
        expect(c.logicalHeight).toBe(810);
        expect(c.scale).toBeCloseTo(4 / 3, 10);
    });
    it('homeCanvas picks 1280x800 for 1280x800 with scale 1', () => {
        expect(homeCanvas(1280, 800)).toEqual({ logicalWidth: 1280, logicalHeight: 800, scale: 1 });
    });
    it('homeCanvas handles zero size without NaN', () => {
        for (const [w, h] of [[0, 0], [0, 800], [1280, 0], [NaN, NaN], [-5, 10], [Infinity, 1080]]) {
            const c = homeCanvas(w, h);
            expect(Number.isFinite(c.scale) && c.scale > 0).toBe(true);
            expect([1280, 1440]).toContain(c.logicalWidth);
            expect([800, 810]).toContain(c.logicalHeight);
        }
    });
});
