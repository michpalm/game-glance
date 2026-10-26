import { describe, expect, it } from 'vitest';
import { defaultGrowth } from '../../src/home/scale';
import { cardScale, CARD_MIN_SCALE, screensaverBaseCanvas, screensaverCanvas, screensaverCss, shuffled, SS_CANVAS, SS_MIN_WIDTH } from '../../src/screensaver/screensaverCss';

describe('screensaverBaseCanvas (before the default growth)', () => {
    it('16:9 is the canvas, scaled', () => {
        expect(screensaverBaseCanvas(1920, 1080)).toEqual({ logicalWidth: 1440, logicalHeight: 810, scale: 4 / 3 });
    });
    it('21:9 keeps the height and grows the width, so nothing is cut', () => {
        const c = screensaverBaseCanvas(2560, 1080);
        expect(c.logicalHeight).toBeCloseTo(810, 6);
        expect(c.logicalWidth).toBeCloseTo(1920, 6);
        expect(c.scale).toBeCloseTo(4 / 3, 6);
    });
    it('16:10 (Steam Deck) keeps the height: the same size as at 16:9, the width grows', () => {
        const c = screensaverBaseCanvas(1280, 800);
        expect(c.logicalHeight).toBeCloseTo(810, 6);
        expect(c.logicalWidth).toBeCloseTo(1296, 6);
    });
    it('a square screen scales by width only below the bottom row\'s width, so the text stays readable', () => {
        const c = screensaverBaseCanvas(845, 845);
        expect(c.logicalWidth).toBeCloseTo(SS_MIN_WIDTH, 6);
        expect(c.scale).toBeCloseTo(845 / SS_MIN_WIDTH, 6);
        expect(c.scale).toBeGreaterThan(845 / 1440);
    });
    it('a bad size gives the canvas at scale 1', () => {
        expect(screensaverBaseCanvas(0, 0)).toEqual({ logicalWidth: SS_CANVAS.width, logicalHeight: SS_CANVAS.height, scale: 1 });
        expect(screensaverBaseCanvas(NaN, 800).scale).toBe(1);
    });
});

describe('shuffled', () => {
    it('keeps every item once and leaves the input alone', () => {
        const input = [1, 2, 3, 4, 5];
        let seed = 0.37;
        const out = shuffled(input, () => (seed = (seed * 9301 + 0.49297) % 1));
        expect([...out].sort()).toEqual(input);
        expect(input).toEqual([1, 2, 3, 4, 5]);
    });
    it('empty and single lists', () => {
        expect(shuffled([])).toEqual([]);
        expect(shuffled([7])).toEqual([7]);
    });
});

describe('screensaverCss', () => {
    it("hides Steam's slideshow when its class is known", () => {
        expect(screensaverCss('abc')).toContain('.abc { display: none !important; }');
        expect(screensaverCss(null)).not.toContain('display: none !important');
    });
    it('the art fills the screen, without black bars', () => {
        expect(screensaverCss(null)).toContain('.ggs-frame { position: absolute; inset: 0; overflow: hidden; }');
        expect(screensaverCss(null)).not.toContain('80vh');
    });
    it("the card's blur grows with its fade (no pop: never a fading parent around it)", () => {
        const css = screensaverCss(null);
        expect(css).toMatch(/@keyframes ggs-glass-in \{ from \{ opacity: 0; backdrop-filter: blur\(0px\); \}/);
        expect(css).not.toMatch(/\.ggs-(leaving|entering|first) \{[^}]*animation/);
        expect(css).not.toMatch(/\.ggs-overlay \{[^}]*animation/);
    });
});

describe('cardScale', () => {
    it('leaves the card alone from its smallest scale up', () => {
        expect(cardScale(1)).toBe(1);
        expect(cardScale(4 / 3)).toBe(1);
        expect(cardScale(CARD_MIN_SCALE)).toBe(1);
    });
    it('enlarges it on a small screen to that smallest size', () => {
        expect(0.4 * cardScale(0.4)).toBeCloseTo(CARD_MIN_SCALE, 3);
        expect(cardScale(0.575)).toBeCloseTo(1.391, 3);
    });
    it('a bad scale changes nothing', () => {
        expect(cardScale(0)).toBe(1);
        expect(cardScale(NaN)).toBe(1);
    });
});

describe('screensaverCanvas: the default growth (#55)', () => {
    it('grows by the same factor as Home', () => {
        const c = screensaverCanvas(1920, 1080);
        expect(c.scale).toBeCloseTo((4 / 3) * defaultGrowth(810), 6);
        expect(c.logicalHeight).toBeCloseTo(810 / defaultGrowth(810), 6);
    });
});
