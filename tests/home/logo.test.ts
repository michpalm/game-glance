import { afterEach, describe, expect, it } from 'vitest';
import { logoUrls, SteamStores } from '../../src/home/artwork';
import { alphaBounds, knownLogo, lastLogo, LOGO_AREA, logoFit, MEASURE_MAX, measureSize, rememberLogo, resetLogoMemo, scaleTrim } from '../../src/home/logo';
import { LOGO_BOX } from '../../src/styles/logoBox';

const host = 'https://steamloopback.host';
const cdn = (id: number) => `https://shared.steamstatic.com/store_item_assets/steam/apps/${id}/logo.png`;

describe('logoUrls', () => {
    const game: SteamStores = {
        details: () => ({ libraryAssets: { strLogoImage: 'abc/logo.png' } }),
        overview: () => ({ app_type: 1 }),
    };
    it('a Steam game: its local logo (hashed folder), then Steam\'s image server', () => {
        expect(logoUrls(42, game)).toEqual([`${host}/assets/42/abc/logo.png`, cdn(42)]);
    });
    it('custom (SteamGridDB) logo first, made absolute', () => {
        const custom: SteamStores = { ...game, customLogo: () => ['/customimages/42_logo.png?v=1'] };
        expect(logoUrls(42, custom)).toEqual([`${host}/customimages/42_logo.png?v=1`, `${host}/assets/42/abc/logo.png`, cdn(42)]);
    });
    it('a Steam game whose logo file name is not known yet still gets the image server', () => {
        expect(logoUrls(7, { details: () => undefined, overview: () => ({ app_type: 1 }) })).toEqual([cdn(7)]);
    });
    it('a shortcut (Unifideck, non-Steam) has only its custom logo, never the image server', () => {
        expect(logoUrls(9, { details: () => undefined, overview: () => ({ app_type: 1073741824 }) })).toEqual([]);
        expect(logoUrls(9, { details: () => undefined, overview: () => ({ app_type: 1073741824 }), customLogo: () => ['/customimages/9_logo.png'] })).toEqual([
            `${host}/customimages/9_logo.png`,
        ]);
    });
    it('survives throwing stores and garbage', () => {
        const boom = () => {
            throw new Error('nope');
        };
        expect(logoUrls(5, { details: boom, overview: boom, customLogo: boom })).toEqual([]);
        expect(logoUrls(5, { details: boom, overview: boom, customLogo: () => 7 as unknown as string[] })).toEqual([]);
    });
});

describe('logo size', () => {
    it('about 56,000 canvas px of logo, in a box as wide as a long title line and as tall as three title lines (Home\'s room)', () => {
        expect(LOGO_AREA).toBe(56_000);
        expect(LOGO_BOX).toEqual({ width: 560, height: 180 });
    });
    it('compact logos (most of them) come out close to the wide ones: the smallest at least three quarters of the largest', () => {
        // Visible-part ratios measured on the Ally's games row (2026-10-09): Ori 1.30 ... Milk outside a bag of milk 6.27.
        const ratios = [1.3, 1.47, 1.51, 1.53, 1.78, 1.8, 1.86, 1.9, 2.07, 2.77, 2.81, 3.59, 5, 6.27];
        const areas = ratios.map((r) => {
            const f = logoFit(null, { width: Math.round(360 * r), height: 360 });
            return f.width * f.height;
        });
        expect(Math.min(...areas) / Math.max(...areas)).toBeGreaterThanOrEqual(0.74);
        expect(Math.min(...areas)).toBeGreaterThan(40_000);
    });
});

describe('logo choice', () => {
    afterEach(resetLogoMemo);
    it('remembers what each game ended on (a logo and its trim, or the title) for the list it tried', () => {
        expect(knownLogo(1, 'a|b')).toBeUndefined();
        rememberLogo(1, 'a|b', { url: 'b', trim: null, natural: { width: 640, height: 360 } });
        rememberLogo(2, 'c', null);
        expect(knownLogo(1, 'a|b')).toEqual({ url: 'b', trim: null, natural: { width: 640, height: 360 } });
        expect(knownLogo(2, 'c')).toBeNull();
    });
    it('a game that ended on its title is tried again once its list changes (Steam loaded its logo file name)', () => {
        rememberLogo(3, 'cdn', null);
        expect(knownLogo(3, 'local|cdn')).toBeUndefined();
    });
    it('a remembered logo holds while nothing better shows up ahead of it; a new source ahead (the local file) is tried', () => {
        const nat = { width: 640, height: 360 };
        // Resolved from Steam's image server before Steam had loaded the game (pre-load); then its local file became known.
        rememberLogo(4, 'cdn', { url: 'cdn', trim: null, natural: nat });
        expect(knownLogo(4, 'local|cdn')).toBeUndefined();
        // The urls ahead of it were tried already and failed (the custom file listed but missing): keep it.
        rememberLogo(5, 'custom|cdn', { url: 'cdn', trim: null, natural: nat });
        expect(knownLogo(5, 'custom|cdn')?.url).toBe('cdn');
        expect(knownLogo(5, 'custom|cdn|other')?.url).toBe('cdn');
        // Its url no longer listed: look again.
        expect(knownLogo(5, 'custom|other')).toBeUndefined();
        // Meanwhile the logo it had stays on screen (no blank frame while the better one loads).
        expect(lastLogo(4)?.url).toBe('cdn');
        expect(lastLogo(99)).toBeNull();
    });
});

describe('logo box (the same on Home and the game page)', () => {
    it('Home: at most 560 x 180 canvas px, bottom-left in the title slot', async () => {
        const { homeCss } = await import('../../src/home/homeCss');
        const css = homeCss();
        expect(css).toMatch(/\.gh-logo \{[^}]*max-width: 560px !important; max-height: 180px !important/);
        expect(css).toMatch(/\.gh-logo \{[^}]*object-position: left bottom/);
    });
});

describe('alphaBounds (the visible part of a logo file)', () => {
    // RGBA pixels, w x h; `on` lists the opaque pixels.
    const pixels = (w: number, h: number, on: Array<[number, number, number?]>) => {
        const d = new Uint8ClampedArray(w * h * 4);
        for (const [x, y, a = 255] of on) d[(y * w + x) * 4 + 3] = a;
        return d;
    };
    it('finds the box around the pixels that show, ignoring near-transparent ones', () => {
        expect(alphaBounds(pixels(10, 6, [[2, 1], [7, 4], [9, 0, 10]]), 10, 6)).toEqual({ x: 2, y: 1, width: 6, height: 4 });
    });
    it('is null for an empty image or a size that does not match', () => {
        expect(alphaBounds(pixels(4, 4, []), 4, 4)).toBeNull();
        expect(alphaBounds(new Uint8ClampedArray(8), 4, 4)).toBeNull();
    });
});

describe('logoFit (every logo about the same visual weight)', () => {
    const file = { width: 640, height: 360 };
    it('crops to the visible part and sizes by area, within the 560 x 180 box', () => {
        // Control: a thin strip across the whole file.
        const control = logoFit({ x: 0, y: 120, width: 640, height: 119 }, file);
        expect(control.width / control.height).toBeCloseTo(640 / 119, 2);
        expect(control.width).toBeLessThanOrEqual(LOGO_BOX.width);
        expect(control.width * control.height).toBeCloseTo(LOGO_AREA, -2);
        expect(control.viewBox).toBe('inset(120px 0px 121px 0px)');
        // The Witcher 3: a block in the middle, now as heavy as Control instead of a third of it.
        const witcher = logoFit({ x: 163, y: 78, width: 314, height: 204 }, file);
        expect(witcher.height).toBeLessThanOrEqual(LOGO_BOX.height);
        expect(witcher.width * witcher.height / (control.width * control.height)).toBeGreaterThan(0.7);
    });
    it('a tall logo stops at the box height, a very wide one at its width', () => {
        const tall = logoFit({ x: 0, y: 0, width: 300, height: 360 }, file);
        expect(tall.height).toBe(LOGO_BOX.height);
        const wide = logoFit({ x: 0, y: 0, width: 640, height: 40 }, file);
        expect(wide.width).toBe(LOGO_BOX.width);
    });
    it('without a trim (the pixels could not be read) the whole file is sized the same way', () => {
        const whole = logoFit(null, file);
        expect(whole.viewBox).toBeNull();
        expect(whole.width / whole.height).toBeCloseTo(640 / 360, 2);
        expect(whole.height).toBeLessThanOrEqual(LOGO_BOX.height);
    });
});

describe('measuring on a smaller copy', () => {
    it('reads the pixels at most MEASURE_MAX wide, keeping the aspect', () => {
        expect(MEASURE_MAX).toBe(160);
        expect(measureSize({ width: 640, height: 360 })).toEqual({ width: 160, height: 90, scale: 0.25 });
        expect(measureSize({ width: 100, height: 50 })).toEqual({ width: 100, height: 50, scale: 1 });
        expect(measureSize({ width: 0, height: 50 })).toBeNull();
    });
    it('scales the crop back to the file\'s pixels, never cutting into the artwork or past the file', () => {
        // Control's strip, found at a quarter size: rows 30..59 of 90.
        expect(scaleTrim({ x: 0, y: 30, width: 160, height: 30 }, 0.25, { width: 640, height: 360 })).toEqual({ x: 0, y: 120, width: 640, height: 120 });
        // An odd edge rounds outward, and stays inside the file.
        expect(scaleTrim({ x: 41, y: 19, width: 78, height: 51 }, 0.25, { width: 640, height: 360 })).toEqual({ x: 164, y: 76, width: 312, height: 204 });
        expect(scaleTrim({ x: 150, y: 80, width: 10, height: 10 }, 0.25, { width: 640, height: 360 })).toEqual({ x: 600, y: 320, width: 40, height: 40 });
        expect(scaleTrim(null, 0.25, { width: 640, height: 360 })).toBeNull();
    });
});
