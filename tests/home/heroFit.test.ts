import { describe, expect, it } from 'vitest';
import { ART_FILL_FILTER, EXPANDED_HEIGHT, EXPANDED_INSET, EXPANDED_MASK, FIT_FADE, HERO_FIT_LABELS, HERO_FITS, STANDARD_HERO_ASPECT, fitMask, heroFitOf, overFill, windowAspect } from '../../src/home/heroFit';

describe('heroFitOf', () => {
    it('reads fill, expanded and fit, anything else as fill', () => {
        expect(heroFitOf('fit')).toBe('fit');
        expect(heroFitOf('expanded')).toBe('expanded');
        for (const v of ['fill', 'whole', undefined, null, 3]) expect(heroFitOf(v)).toBe('fill');
        expect(HERO_FITS).toEqual(['fill', 'expanded', 'fit']);
        expect(HERO_FITS.map((f) => HERO_FIT_LABELS[f])).toEqual(['Fill', 'Expanded', 'Fit']);
    });
    it('Expanded and Fit draw the art over the fill; Fill alone covers the screen', () => {
        expect(HERO_FITS.map(overFill)).toEqual([false, true, true]);
    });
});

describe('Expanded (the art covering the top 70%, fading into the fill)', () => {
    it("its box is the screen's top 70%, and its fade the box's last 22%, as Fit fades the art", () => {
        expect(EXPANDED_HEIGHT).toBe(0.7);
        expect(EXPANDED_INSET).toBe('0 0 30% 0');
        expect(EXPANDED_MASK).toBe('linear-gradient(180deg, #000 78%, transparent 100%)');
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
