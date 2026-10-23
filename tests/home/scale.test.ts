import { describe, expect, it } from 'vitest';
import { canvasStyle, homeCanvas, steamGrowth } from '../../src/home/scale';
import { MIN_LOGICAL_HEIGHT } from '../../src/home/giveWay';

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
    it('a screen wider than 16:9 scales by its height and gets a wider canvas (21:9 was cut off at the bottom)', () => {
        const ultrawide = homeCanvas(2560, 1080);
        expect(ultrawide.scale).toBeCloseTo(1080 / 810, 10);
        expect(ultrawide.logicalWidth).toBeCloseTo(1920, 6);
        expect(ultrawide.logicalHeight).toBe(810);
        expect(homeCanvas(3440, 1440).scale).toBeCloseTo(1440 / 810, 10);
        // The Ally's 1080p TV window emulated at 21:9 (CEF), where the games row and tabs were off-screen.
        const emulated = homeCanvas(1500, 643);
        expect(emulated.scale).toBeCloseTo(643 / 810, 10);
        expect(emulated.logicalWidth).toBeCloseTo(1500 / (643 / 810), 6);
    });
    it('16:9, 16:10 and narrower screens keep the authored width (width is still the limit)', () => {
        expect(homeCanvas(1500, 844)).toEqual({ logicalWidth: 1440, logicalHeight: 810, scale: 1500 / 1440 });
        expect(homeCanvas(828, 466)).toEqual({ logicalWidth: 1440, logicalHeight: 810, scale: 828 / 1440 });
        expect(homeCanvas(1024, 768)).toEqual({ logicalWidth: 1280, logicalHeight: 800, scale: 0.8 });
    });
    it('the scaled canvas always spans the width and never overflows the height', () => {
        for (const [w, h] of [[1920, 1080], [1280, 800], [1500, 844], [1500, 643], [1500, 422], [2560, 1080], [3440, 1440], [1024, 768], [1320, 800]]) {
            const c = homeCanvas(w, h);
            expect(c.logicalWidth * c.scale).toBeCloseTo(w, 6);
            expect(c.logicalHeight * c.scale).toBeLessThanOrEqual(h + 1e-6);
        }
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

describe('canvasStyle', () => {
    it('scales the canvas to its box', () => {
        expect(canvasStyle({ logicalWidth: 1440, scale: 0.575 }, 810, true)).toMatchObject({ width: '1440px', height: '810px', transform: 'scale(0.575)' });
    });
    it("hidden until it has a size; then it inherits (an explicit 'visible' showed Home through Steam's hidden exit, as a ghost)", () => {
        expect(canvasStyle({ logicalWidth: 1440, scale: 1 }, 810, false).visibility).toBe('hidden');
        expect(canvasStyle({ logicalWidth: 1440, scale: 1 }, 810, true).visibility).toBeUndefined();
    });
});

describe('homeCanvas follows Steam\'s display scale (#55)', () => {
    it('is today at Steam 100% and below', () => {
        for (const dpr of [undefined, 0, NaN, 0.8, 1]) expect(homeCanvas(1920, 1080, dpr)).toEqual(homeCanvas(1920, 1080));
    });
    it('grows with Steam at 1.2 on the Ally (1601 x 900 CSS px)', () => {
        const c = homeCanvas(1601, 900, 1.2);
        expect(c.logicalHeight).toBeCloseTo(675, 0);
        expect(c.scale * 1.2).toBeCloseTo(1.6, 2);
    });
    it('caps growth where the stack no longer fits', () => expect(homeCanvas(960, 540, 2).logicalHeight).toBeCloseTo(MIN_LOGICAL_HEIGHT, 5));
    it('grows the Deck shape too', () => expect(homeCanvas(1066.7, 666.7, 1.2).logicalHeight).toBeCloseTo(666.7, 0));
    it('keeps a 21:9 screen at 100% as today', () => expect(homeCanvas(2560, 1080, 1)).toEqual(homeCanvas(2560, 1080)));
    it('names the growth: 1 up to 100%, the scale above, the cap past the fit', () => {
        expect(steamGrowth(1, 810)).toBe(1);
        expect(steamGrowth(1.2, 810)).toBe(1.2);
        expect(steamGrowth(3, 810)).toBeCloseTo(810 / MIN_LOGICAL_HEIGHT, 6);
        expect(steamGrowth(undefined, 810)).toBe(1);
    });
});
