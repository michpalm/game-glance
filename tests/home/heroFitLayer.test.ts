import { describe, expect, it } from 'vitest';
import { heroFullStyle } from '../../src/home/HeroBackground';
import { STANDARD_HERO_ASPECT, fitMask } from '../../src/home/heroFit';

describe('heroFullStyle (Home full-art hero in Fill or Fit)', () => {
    const url = 'https://example/hero.jpg';
    it('Fill: the art only, no mask', () => {
        const style = heroFullStyle(url, 'fill', 3.1, 16 / 9) as Record<string, string>;
        expect(style.backgroundImage).toBe(`url("${url}")`);
        expect(style['--gh-hero-mask']).toBeUndefined();
    });
    it("Fit: the art and the fade mask for the art's shape", () => {
        const style = heroFullStyle(url, 'fit', 3.1, 16 / 9) as Record<string, string>;
        expect(style.backgroundImage).toBe(`url("${url}")`);
        expect(style['--gh-hero-mask']).toBe(fitMask(3.1, 16 / 9));
    });
    it("Fit before the art's size is known: the standard hero shape, never no mask", () => {
        expect((heroFullStyle(url, 'fit', null, 16 / 9) as Record<string, string>)['--gh-hero-mask']).toBe(fitMask(STANDARD_HERO_ASPECT, 16 / 9));
    });
});
