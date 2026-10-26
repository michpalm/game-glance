import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyPlan, createCopyCache, displayInfo, isPngUrl, keepIfDecoded, logoCopy, logoWorkSize, noteDisplay, resetDisplay } from '../../src/home/artShrink';
import { logoFit } from '../../src/home/logo';

describe('copyPlan (art drawn with background-size: cover in `box`, device px)', () => {
    const screen = { width: 1920, height: 1082 };
    it('a file much bigger than it is drawn gets a copy at the size it is drawn', () => {
        expect(copyPlan({ width: 3840, height: 2160 }, screen, false)).toEqual({ width: 1924, height: 1082 });
    });
    it('cover keeps the side that limits it: a wide hero is sized by the screen height', () => {
        // 3840x1240 on 1920x1082: drawn at 3351x1082, only 1.15x smaller: not worth a JPEG copy of a JPEG.
        expect(copyPlan({ width: 3840, height: 1240 }, screen, false)).toBeNull();
    });
    it('a big PNG gets a (JPEG) copy even when it is barely bigger: decoding the PNG is what costs (227 ms on the Ally)', () => {
        expect(copyPlan({ width: 3840, height: 1240 }, screen, true)).toEqual({ width: 3351, height: 1082 });
    });
    it('a small file is drawn as it is, PNG or not', () => {
        expect(copyPlan({ width: 920, height: 430 }, screen, true)).toBeNull();
        expect(copyPlan({ width: 1920, height: 1080 }, screen, false)).toBeNull();
    });
    it('nothing for sizes that are not sizes', () => {
        expect(copyPlan({ width: 0, height: 10 }, screen, true)).toBeNull();
        expect(copyPlan({ width: 100, height: 100 }, { width: 0, height: 0 }, true)).toBeNull();
    });
});

describe('logoCopy', () => {
    const per = 4 / 3; // the Ally: 1920 device px over Home's 1440 canvas px
    it('a huge logo is copied at what its visible part is drawn at (LOGO_BOX, logoFit), with room to spare', () => {
        const natural = { width: 3841, height: 5405 };
        const trim = { x: 0, y: 0, width: 3841, height: 5405 };
        const copy = logoCopy({ url: 'u', trim, natural }, per)!;
        const fit = logoFit(trim, natural);
        expect(copy.natural.width).toBe(Math.ceil(3841 * (fit.width * per * 1.5) / 3841));
        expect(copy.natural.height / copy.natural.width).toBeCloseTo(5405 / 3841, 2);
        expect(copy.trim).toEqual({ x: 0, y: 0, width: copy.natural.width, height: copy.natural.height });
    });
    it('the visible part keeps its place in the smaller copy, rounded outward', () => {
        const natural = { width: 4000, height: 2000 };
        const choice = { url: 'u', trim: { x: 1000, y: 500, width: 2000, height: 1000 }, natural };
        const copy = logoCopy(choice, per)!;
        const s = copy.natural.width / 4000;
        expect(copy.trim!.x).toBeLessThanOrEqual(1000 * s);
        expect(copy.trim!.x + copy.trim!.width).toBeGreaterThanOrEqual(3000 * s - 1);
        expect(copy.url).toBe('u');
    });
    it("Steam's own 640 px logo files are left as they are", () => {
        expect(logoCopy({ url: 'u', trim: { x: 0, y: 100, width: 640, height: 119 }, natural: { width: 640, height: 360 } }, per)).toBeNull();
    });
    it('without a trim the whole file is what is drawn', () => {
        const copy = logoCopy({ url: 'u', trim: null, natural: { width: 3495, height: 677 } }, per)!;
        expect(copy.natural.width).toBeLessThan(3495);
        expect(copy.trim).toBeNull();
    });
});

describe('logoWorkSize (a huge logo is decoded once, straight to this size)', () => {
    it('the #31 logo (6790 x 3213) on the Ally: room for a copy of a visible part at least half the file wide', () => {
        expect(logoWorkSize({ width: 6790, height: 3213 }, 4 / 3)).toEqual({ width: 2240, height: 1060 });
    });
    it('a tall logo is sized by the box width too, the side that limits it least', () => {
        expect(logoWorkSize({ width: 3841, height: 5405 }, 4 / 3)).toEqual({ width: 2240, height: 3153 });
    });
    it('the work copy covers any logoCopy of a visible part at least half the file', () => {
        const natural = { width: 6790, height: 3213 };
        const work = logoWorkSize(natural, 4 / 3)!;
        const copy = logoCopy({ url: 'u', trim: { x: 0, y: 0, width: natural.width / 2, height: 300 }, natural }, 4 / 3)!;
        expect(copy.natural.width).toBeLessThanOrEqual(work.width);
        expect(copy.natural.height).toBeLessThanOrEqual(work.height);
    });
    it("null for a file not worth it (Steam's 640 px logos) or no size", () => {
        expect(logoWorkSize({ width: 640, height: 360 }, 4 / 3)).toBeNull();
        expect(logoWorkSize({ width: 0, height: 360 }, 4 / 3)).toBeNull();
        expect(logoWorkSize({ width: 6790, height: 3213 }, 0)).toBeNull();
    });
});

describe('displayInfo', () => {
    afterEach(() => resetDisplay());
    it("an Ally until Home has measured: 1920x1080, 4/3 device px per canvas px", () => {
        expect(displayInfo()).toEqual({ width: 1920, height: 1080, perCanvas: 4 / 3 });
    });
    it("Home's measure: its css box times the device pixel ratio, and the canvas scale times it", () => {
        noteDisplay(828, 466, 2.32, 828 / 1440);
        expect(displayInfo()).toEqual({ width: Math.round(828 * 2.32), height: Math.round(466 * 2.32), perCanvas: (828 / 1440) * 2.32 });
    });
    it('ignores a measure that is not one', () => {
        noteDisplay(0, 466, 2.32, 1);
        noteDisplay(828, 466, Number.NaN, 1);
        expect(displayInfo().width).toBe(1920);
    });
});

describe('isPngUrl', () => {
    it('reads the extension before any query', () => {
        expect(isPngUrl('https://steamloopback.host/customimages/1_hero.png?v=2')).toBe(true);
        expect(isPngUrl('https://x/1_logo.PNG')).toBe(true);
        expect(isPngUrl('https://x/library_hero.jpg?c=1')).toBe(false);
        expect(isPngUrl('https://x/png/a.jpg')).toBe(false);
    });
});

describe('createCopyCache', () => {
    const size = { width: 100, height: 50 };
    it('makes a copy of a file at a size once; asking again (another visit, at once) hands back the same', async () => {
        let n = 0;
        const make = vi.fn(async () => `blob:${++n}`);
        const cache = createCopyCache(make, 8);
        const [a, b] = [cache('u', size, 'image/jpeg'), cache('u', size, 'image/jpeg')];
        expect(await a).toBe('blob:1');
        expect(await b).toBe('blob:1');
        expect(await cache('u', size, 'image/jpeg')).toBe('blob:1');
        expect(make).toHaveBeenCalledTimes(1);
    });
    it('another size or type is another copy', async () => {
        const make = vi.fn(async (url: string, s: { width: number }, type: string) => `${url}:${s.width}:${type}`);
        const cache = createCopyCache(make, 8);
        await cache('u', size, 'image/jpeg');
        expect(await cache('u', { width: 200, height: 100 }, 'image/jpeg')).toBe('u:200:image/jpeg');
        expect(await cache('u', size, 'image/png')).toBe('u:100:image/png');
        expect(make).toHaveBeenCalledTimes(3);
    });
    it('a failed copy is tried again next time', async () => {
        const make = vi.fn(async () => null as string | null);
        const cache = createCopyCache(make, 8);
        await cache('u', size, 'image/jpeg');
        await cache('u', size, 'image/jpeg');
        expect(make).toHaveBeenCalledTimes(2);
    });
    it('hands the source to make (a decoded copy to shrink instead of the file); a hit does not need it', async () => {
        const make = vi.fn(async (_u: string, _s: unknown, _t: string, source?: unknown) => (source ? 'from-source' : 'from-file'));
        const cache = createCopyCache(make, 8);
        const source = {} as ImageBitmap;
        expect(await cache('u', size, 'image/png', source)).toBe('from-source');
        expect(make).toHaveBeenLastCalledWith('u', size, 'image/png', source);
        expect(await cache('u', size, 'image/png')).toBe('from-source');
        expect(make).toHaveBeenCalledTimes(1);
    });
    it('keeps at most `max` copies', async () => {
        const make = vi.fn(async (url: string) => `c:${url}`);
        const cache = createCopyCache(make, 2);
        for (const u of ['a', 'b', 'c']) await cache(u, size, 'image/jpeg');
        await cache('a', size, 'image/jpeg');
        expect(make).toHaveBeenCalledTimes(4);
    });
});

describe('keepIfDecoded (a fresh blob copy, kept only when it decodes)', () => {
    it('returns the url and keeps it when it decodes', async () => {
        const revoke = vi.fn();
        expect(await keepIfDecoded('blob:a', async () => ({}), revoke)).toBe('blob:a');
        expect(revoke).not.toHaveBeenCalled();
    });
    it('revokes the url and returns null when it does not decode', async () => {
        const revoke = vi.fn();
        expect(await keepIfDecoded('blob:b', async () => null, revoke)).toBeNull();
        expect(revoke).toHaveBeenCalledWith('blob:b');
    });
});
