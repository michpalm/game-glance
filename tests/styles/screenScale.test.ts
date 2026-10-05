import { describe, expect, it } from 'vitest';
import { buildThemeCss } from '../../src/styles/themeCss';
import { HANDHELD_LAYOUT, isTvScreen, SCALE_UNIT_CSS, screenGrowth, TV_MIN_GROWTH } from '../../src/styles/screenScale';

describe('screenScale', () => {
    it('screenGrowth is 1 on the handheld layout (828x466) and about 1.81 on a 1080p TV (1500x844)', () => {
        expect(HANDHELD_LAYOUT).toEqual({ width: 828, height: 466 });
        expect(screenGrowth(828, 466)).toBe(1);
        expect(screenGrowth(1500, 844)).toBeCloseTo(1.811, 3);
        // The smaller side's growth wins (as min() in the theme's CSS unit).
        expect(screenGrowth(1656, 466)).toBe(1);
    });
    it('screenGrowth is 1 for unusable sizes, never NaN', () => {
        for (const [w, h] of [[0, 0], [NaN, 844], [1500, -1], [Infinity, 844], [1, 1]]) {
            const g = screenGrowth(w, h);
            expect(Number.isFinite(g) && g >= 1, `${w}x${h}`).toBe(true);
        }
        expect(screenGrowth(0, 0)).toBe(1);
        expect(screenGrowth(1, 1)).toBe(1);
    });
    it('isTvScreen: only a 1080p-class TV is docked, threshold TV_MIN_GROWTH', () => {
        expect(TV_MIN_GROWTH).toBe(1.7);
        expect(isTvScreen(828, 466)).toBe(false);
        expect(isTvScreen(1280, 800)).toBe(false); // Steam Deck handheld, growth 1.546
        expect(isTvScreen(1500, 844)).toBe(true);
        expect(isTvScreen(1920, 1080)).toBe(true);
        expect(isTvScreen(0, 0)).toBe(false);
        expect(isTvScreen(NaN, NaN)).toBe(false);
        expect(isTvScreen(1409, 793)).toBe(true); // growth 1.702
        expect(isTvScreen(1400, 788)).toBe(false); // growth 1.691
    });
    it('the theme unit is built from the same layout and share', () => {
        expect(SCALE_UNIT_CSS).toBe('calc(1px + (min(calc(100vh / 466), calc(100vw / 828)) - 1px) * 0.6)');
        const css = buildThemeCss({ header: undefined, details: undefined, overview: undefined, root: undefined, play: undefined });
        expect(css).toContain(`--gg-u: ${SCALE_UNIT_CSS};`);
    });
});
