import { describe, expect, it } from 'vitest';
import { heroFitVars, removeOwnVars } from '../../src/components/GameHero';
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

describe('removeOwnVars (a leaving page never clears the next page\'s art)', () => {
    const style = (values: Record<string, string>) => ({
        values,
        getPropertyValue: (name: string) => values[name] ?? '',
        removeProperty: (name: string) => {
            delete values[name];
            return '';
        },
    });
    it('removes the variables this page set', () => {
        const s = style({ '--gg-hero-fill': 'url("a")', '--gg-hero-mask': 'm' });
        removeOwnVars(s, { '--gg-hero-fill': 'url("a")', '--gg-hero-mask': 'm' });
        expect(s.values).toEqual({});
    });
    it("keeps the ones another page has set since", () => {
        const s = style({ '--gg-hero-fill': 'url("b")', '--gg-hero-mask': 'm' });
        removeOwnVars(s, { '--gg-hero-fill': 'url("a")', '--gg-hero-mask': 'm' });
        expect(s.values).toEqual({ '--gg-hero-fill': 'url("b")' });
    });
});
