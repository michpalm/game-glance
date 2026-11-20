import { describe, expect, it, vi } from 'vitest';
import { measureLogo, MEASURE_MAX } from '../../src/home/logo';

/** RGBA pixels of `w` x `h`, transparent except a solid block (x, y, width, height). */
function withBlock(w: number, h: number, block: { x: number; y: number; width: number; height: number }): Uint8ClampedArray {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = block.y; y < block.y + block.height; y++) for (let x = block.x; x < block.x + block.width; x++) data[(y * w + x) * 4 + 3] = 255;
    return data;
}

describe('measuring a logo from a small copy read off the main thread (#31)', () => {
    it('asks only for the small copy, never the file: a 6790 x 3213 SteamGridDB logo is read at 160 px wide', async () => {
        const read = vi.fn(async (_url: string, size: { width: number; height: number }) => withBlock(size.width, size.height, { x: 0, y: 0, width: size.width, height: size.height }));
        await measureLogo('logo.png', { width: 6790, height: 3213 }, read);
        expect(read).toHaveBeenCalledWith('logo.png', { width: MEASURE_MAX, height: 76 });
    });

    it("gives the visible part in the file's own pixels", async () => {
        // A 640 x 360 Steam logo read at 160 x 90 (a quarter): artwork at 40..119 x 20..59 there.
        const read = async (_url: string, size: { width: number; height: number }) => withBlock(size.width, size.height, { x: 40, y: 20, width: 80, height: 40 });
        expect(await measureLogo('logo.png', { width: 640, height: 360 }, read)).toMatchObject({ readable: true, trim: { x: 160, y: 80, width: 320, height: 160 } }); // plus its luma (Library)
    });

    it('a fully transparent file is readable with nothing showing', async () => {
        const read = async (_url: string, size: { width: number; height: number }) => new Uint8ClampedArray(size.width * size.height * 4);
        expect(await measureLogo('logo.png', { width: 640, height: 360 }, read)).toEqual({ readable: true, trim: null });
    });

    it('pixels that cannot be read (no reader result, an error, a file with no size) leave the file drawn whole', async () => {
        expect(await measureLogo('logo.png', { width: 640, height: 360 }, async () => null)).toEqual({ readable: false, trim: null });
        expect(await measureLogo('logo.png', { width: 640, height: 360 }, async () => { throw new Error('tainted'); })).toEqual({ readable: false, trim: null });
        const read = vi.fn(async () => null);
        expect(await measureLogo('logo.png', { width: 0, height: 0 }, read)).toEqual({ readable: false, trim: null });
        expect(read).not.toHaveBeenCalled();
    });
});
