import { describe, expect, it } from 'vitest';
import { ART_FILL_FILTER, FIT_FADE, HERO_FITS, STANDARD_HERO_ASPECT, fitMask, heroFitOf, windowAspect } from '../../src/home/heroFit';

describe('heroFitOf', () => {
    it('reads fill and fit, anything else as fill', () => {
        expect(heroFitOf('fit')).toBe('fit');
        for (const v of ['fill', 'whole', undefined, null, 3]) expect(heroFitOf(v)).toBe('fill');
        expect(HERO_FITS).toEqual(['fill', 'fit']);
    });
});

describe('fitMask (the fade where the whole art meets the art fill)', () => {
    it('wide art: the bottom 22% of the art fades (16:9 and 16:10)', () => {
        expect(FIT_FADE).toBe(0.22);
        expect(fitMask(3.1, 16 / 9)).toBe('linear-gradient(180deg, #000 44.73%, transparent 57.35%)');
        expect(fitMask(3.1, 16 / 10)).toBe('linear-gradient(180deg, #000 40.26%, transparent 51.61%)');
    });
    it('tall art: centred, both sides fade', () => {
        expect(fitMask(1, 16 / 9)).toBe('linear-gradient(90deg, transparent 21.88%, #000 34.25%, #000 65.75%, transparent 78.12%)');
    });
    it('art the shape of the box needs no fade; unusable sizes use the standard hero shape', () => {
        expect(fitMask(16 / 9, 16 / 9)).toBe('none');
        expect(fitMask(NaN, 16 / 9)).toBe(fitMask(STANDARD_HERO_ASPECT, 16 / 9));
        expect(fitMask(0, 16 / 9)).toBe(fitMask(STANDARD_HERO_ASPECT, 16 / 9));
    });
    it("the art fill is the visual language's art-fill token", () => {
        expect(ART_FILL_FILTER).toBe('blur(42px) saturate(1.25) brightness(.8)');
    });
});

describe("windowAspect (the screen's shape, from the window the hero is drawn in)", () => {
    it("the window's width / height", () => {
        expect(windowAspect({ innerWidth: 828, innerHeight: 466 })).toBeCloseTo(828 / 466, 6);
        expect(windowAspect({ innerWidth: 1280, innerHeight: 800 })).toBe(1.6);
    });
    it("16:9 without a window or a real size: the plugin's own context window is 1x1 or 0x0, never the screen", () => {
        expect(windowAspect(null)).toBe(16 / 9);
        expect(windowAspect({ innerWidth: 0, innerHeight: 0 })).toBe(16 / 9);
        expect(windowAspect({ innerWidth: 1, innerHeight: 1 })).toBe(16 / 9);
    });
});
