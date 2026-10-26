import { describe, expect, it } from 'vitest';
import { AIR_ONLY_MIN_HEIGHT, baseCanvas, canvasStyle, defaultGrowth, homeCanvas } from '../../src/home/scale';

describe('baseCanvas (the authored canvas fitted to the window, before the default growth)', () => {
    it('homeCanvas picks 1440x810 for 1920x1080 with scale 4/3', () => {
        const c = baseCanvas(1920, 1080);
        expect(c.logicalWidth).toBe(1440);
        expect(c.logicalHeight).toBe(810);
        expect(c.scale).toBeCloseTo(4 / 3, 10);
    });
    it('homeCanvas picks 1280x800 for 1280x800 with scale 1', () => {
        expect(baseCanvas(1280, 800)).toEqual({ logicalWidth: 1280, logicalHeight: 800, scale: 1 });
    });
    it('a screen wider than 16:9 scales by its height and gets a wider canvas (21:9 was cut off at the bottom)', () => {
        const ultrawide = baseCanvas(2560, 1080);
        expect(ultrawide.scale).toBeCloseTo(1080 / 810, 10);
        expect(ultrawide.logicalWidth).toBeCloseTo(1920, 6);
        expect(ultrawide.logicalHeight).toBe(810);
        expect(baseCanvas(3440, 1440).scale).toBeCloseTo(1440 / 810, 10);
        // The Ally's 1080p TV window emulated at 21:9 (CEF), where the games row and tabs were off-screen.
        const emulated = baseCanvas(1500, 643);
        expect(emulated.scale).toBeCloseTo(643 / 810, 10);
        expect(emulated.logicalWidth).toBeCloseTo(1500 / (643 / 810), 6);
    });
    it('16:9, 16:10 and narrower screens keep the authored width (width is still the limit)', () => {
        expect(baseCanvas(1500, 844)).toEqual({ logicalWidth: 1440, logicalHeight: 810, scale: 1500 / 1440 });
        expect(baseCanvas(828, 466)).toEqual({ logicalWidth: 1440, logicalHeight: 810, scale: 828 / 1440 });
        expect(baseCanvas(1024, 768)).toEqual({ logicalWidth: 1280, logicalHeight: 800, scale: 0.8 });
    });
    it('the scaled canvas always spans the width and never overflows the height', () => {
        for (const [w, h] of [[1920, 1080], [1280, 800], [1500, 844], [1500, 643], [1500, 422], [2560, 1080], [3440, 1440], [1024, 768], [1320, 800]]) {
            const c = baseCanvas(w, h);
            expect(c.logicalWidth * c.scale).toBeCloseTo(w, 6);
            expect(c.logicalHeight * c.scale).toBeLessThanOrEqual(h + 1e-6);
        }
    });
    it('homeCanvas handles zero size without NaN', () => {
        for (const [w, h] of [[0, 0], [0, 800], [1280, 0], [NaN, NaN], [-5, 10], [Infinity, 1080]]) {
            const c = baseCanvas(w, h);
            expect(Number.isFinite(c.scale) && c.scale > 0).toBe(true);
            expect([1280, 1440]).toContain(c.logicalWidth);
            expect([800, 810]).toContain(c.logicalHeight);
        }
    });
});


describe('homeCanvas: the default growth (#55)', () => {
    it('grows the authored canvas as far as only the air above the title gives way', () => {
        expect(defaultGrowth(810)).toBeCloseTo(810 / AIR_ONLY_MIN_HEIGHT, 10);
        expect(defaultGrowth(800)).toBeCloseTo(800 / AIR_ONLY_MIN_HEIGHT, 10);
        expect(AIR_ONLY_MIN_HEIGHT).toBeCloseTo(745.6, 6);
    });
    it('is about 8.6% on 16:9 and 7.3% on 16:10, never more than 10%', () => {
        expect(defaultGrowth(810)).toBeCloseTo(1.086, 3);
        expect(defaultGrowth(800)).toBeCloseTo(1.073, 3);
        expect(defaultGrowth(2000)).toBe(1.1);
    });
    it('draws the 16:9 canvas that much larger: a shorter logical canvas, a larger scale', () => {
        const b = baseCanvas(1920, 1080);
        const c = homeCanvas(1920, 1080);
        const g = defaultGrowth(810);
        expect(c.logicalHeight).toBeCloseTo(810 / g, 6);
        expect(c.logicalWidth).toBeCloseTo(1440 / g, 6);
        expect(c.scale).toBeCloseTo(b.scale * g, 10);
    });
    it('grows the Deck and an ultrawide screen too, keeping their shapes', () => {
        expect(homeCanvas(1280, 800).logicalHeight).toBeCloseTo(800 / defaultGrowth(800), 6);
        const wide = homeCanvas(2560, 1080);
        expect(wide.logicalWidth * wide.scale).toBeCloseTo(2560, 6);
        expect(wide.logicalHeight).toBeCloseTo(810 / defaultGrowth(810), 6);
    });
    it('does not grow a window of unknown size', () => {
        for (const [w, h] of [[0, 0], [NaN, NaN], [-5, 10]]) expect(homeCanvas(w, h)).toEqual(baseCanvas(w, h));
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
