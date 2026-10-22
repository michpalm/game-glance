import { describe, expect, it } from 'vitest';
import { heroFitVars } from '../../src/components/GameHero';
import { STANDARD_HERO_ASPECT, fitMask } from '../../src/home/heroFit';

describe("heroFitVars (the page's art fill and fade, set on the page's document)", () => {
    const src = 'https://example/hero.jpg';
    it('Fit with the header image: its url for the fill and the fade for its shape', () => {
        expect(heroFitVars('fit', src, 3.1, 16 / 10)).toEqual({ '--gg-hero-fill': `url("${src}")`, '--gg-hero-mask': fitMask(3.1, 16 / 10) });
    });
    it("Fit before the image's size is known: the standard hero shape", () => {
        expect(heroFitVars('fit', src, null, 16 / 9)['--gg-hero-mask']).toBe(fitMask(STANDARD_HERO_ASPECT, 16 / 9));
    });
    it('Fill, or no header image: nothing', () => {
        expect(heroFitVars('fill', src, 3.1, 16 / 9)).toEqual({});
        expect(heroFitVars('fit', null, 3.1, 16 / 9)).toEqual({});
    });
});
