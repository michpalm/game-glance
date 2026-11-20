import { describe, expect, it } from 'vitest';
import { ART_FILL_FILTER, EXPANDED_INSET, EXPANDED_MASK, fitMask } from '../../src/home/heroFit';
import { launchArtLayers } from '../../src/styles/launchArt';

const SRC = 'https://steamloopback.host/assets/292030/library_hero.jpg';

describe('launchArtLayers (Home’s hero, kept on the page while a game launched from Home starts)', () => {
    it('Fill: the art alone, covering the screen at Home’s 30% from the top', () => {
        const { fill, art } = launchArtLayers(SRC, 'fill', 3.1, 16 / 9);
        expect(fill).toBeNull();
        expect(art).toContain(`background-image: url("${SRC}")`);
        expect(art).toContain('inset: 0;');
        expect(art).toContain('background-size: cover; background-position: center 30%;');
    });
    it('Expanded: the blurred fill, and the art covering the top 70% with Home’s fade', () => {
        const { fill, art } = launchArtLayers(SRC, 'expanded', 3.1, 16 / 9);
        expect(fill).toContain(`filter: ${ART_FILL_FILTER}`);
        expect(fill).toContain('inset: -120px;');
        expect(art).toContain(`inset: ${EXPANDED_INSET}; background-size: cover; background-position: center;`);
        expect(art).toContain(`mask-image: ${EXPANDED_MASK};`);
    });
    it('Fit: the whole art at the top with the fade for its shape, the standard hero’s until known', () => {
        expect(launchArtLayers(SRC, 'fit', 2, 16 / 10).art).toContain(`mask-image: ${fitMask(2, 16 / 10)};`);
        expect(launchArtLayers(SRC, 'fit', null, 16 / 9).art).toContain(`mask-image: ${fitMask(3.1, 16 / 9)};`);
        expect(launchArtLayers(SRC, 'fit', 16 / 9, 16 / 9).art).not.toContain('mask-image');
        expect(launchArtLayers(SRC, 'fit', 3.1, 16 / 9).art).toContain('background-size: contain; background-position: center top;');
    });
    it('quotes in the url cannot break out of it', () => {
        expect(launchArtLayers('a"b', 'fill', null, 16 / 9).art).toContain('url("a%22b")');
    });
});
