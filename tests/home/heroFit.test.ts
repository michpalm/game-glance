import { describe, expect, it } from 'vitest';
import { ART_FILL_FILTER, FIT_FADE, HERO_FITS, STANDARD_HERO_ASPECT, fitMask, heroFitOf } from '../../src/home/heroFit';

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
