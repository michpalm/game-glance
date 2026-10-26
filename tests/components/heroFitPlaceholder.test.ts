import { describe, expect, it } from 'vitest';
import { pageHeroFitVars } from '../../src/components/GameHero';

const loaded = { src: 'https://steamloopback.host/library_hero.jpg', currentSrc: 'https://steamloopback.host/library_hero.jpg', complete: true, naturalWidth: 1920, naturalHeight: 620 };

describe('Fit hero loading fallback', () => {
    it('hides the native blur only after the full image has loaded', () => {
        expect(pageHeroFitVars('fit', loaded, 16 / 9)['--gg-hero-placeholder']).toBe('hidden');
    });
    it('keeps the fallback during initial loading and a new source loading over an old image', () => {
        for (const image of [{ ...loaded, complete: false, naturalWidth: 0, naturalHeight: 0 }, { ...loaded, complete: false, src: 'https://steamloopback.host/new-hero.jpg' }]) {
            expect(pageHeroFitVars('fit', image, 16 / 9)['--gg-hero-placeholder']).toBe('visible');
        }
    });
    it('keeps the fallback after a failed image (complete without dimensions)', () => {
        expect(pageHeroFitVars('fit', { ...loaded, naturalWidth: 0, naturalHeight: 0 }, 16 / 9)['--gg-hero-placeholder']).toBe('visible');
    });
    it('leaves Fill and a missing hero untouched', () => {
        expect(pageHeroFitVars('fill', loaded, 16 / 9)).toEqual({});
        expect(pageHeroFitVars('fit', null, 16 / 9)).toEqual({});
    });
});
