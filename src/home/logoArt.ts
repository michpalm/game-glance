import { displayInfo, loadDecoded, logoCopy, logoWorkSize, makeCopy } from './artShrink';
import { browserStores, logoUrls } from './artwork';
import { imageSize } from './imageSize';
import { isBlankLogo, knownLogo, LogoChoice, measureLogo, PixelReader, rememberLogo } from './logo';

/**
 * Game logos, resolved the way HeroBackground resolves hero art: once per game (the urls tried in order, the first that
 * loads is decoded and measured), shared by everyone asking at the same time, remembered for the session (home/logo),
 * and pre-loaded for the games either side of the selection, so L1/R1 draw the next logo on the very step.
 */

/** Lookups in flight, by game and url list, so a pre-load and the selection share one load. */
const inFlight = new Map<string, Promise<LogoChoice | null>>();

/** The url list for a game's logo and its memo key. */
export function logoList(appId: number): { urls: string[]; key: string } {
    const urls = appId > 0 ? logoUrls(appId, browserStores) : [];
    return { urls, key: urls.join('|') };
}

/** Loads and decodes `url` (readable pixels: Steam's own files are the page's origin, its image server allows any). */
function loadImage(url: string): Promise<HTMLImageElement | null> {
    return loadDecoded(url, true);
}

/** The pixels a canvas holds after drawing `source` at `size`; null without a 2D context. */
function drawnPixels(source: CanvasImageSource, size: { width: number; height: number }): Uint8ClampedArray | null {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, size.width, size.height);
    return ctx.getImageData(0, 0, size.width, size.height).data;
}

/** `source`'s pixels at `size`: shrunk off the main thread (createImageBitmap), so the page only draws the small copy. */
async function smallPixels(source: ImageBitmapSource, size: { width: number; height: number }): Promise<Uint8ClampedArray | null> {
    const bitmap = await createImageBitmap(source, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'medium' });
    try {
        return drawnPixels(bitmap, size);
    } finally {
        bitmap.close?.();
    }
}

/**
 * Reads a logo's pixels at the measuring size: the file is decoded and shrunk off the main thread (createImageBitmap from
 * its bytes), so the page only draws the small copy (#31: drawing a 6790 x 3213 file decoded all of it on the main thread,
 * about 300 ms). Where that is not available or fails, the loaded image is drawn as before. Throws when the pixels
 * cannot be read (a tainted canvas); measureLogo catches it.
 */
function pixelReader(img: HTMLImageElement): PixelReader {
    return async (url, size) => {
        try {
            if (typeof fetch === 'function' && typeof createImageBitmap === 'function') {
                const response = await fetch(url);
                if (response.ok) return await smallPixels(await response.blob(), size);
            }
        } catch {
            // fall back to the loaded image below
        }
        return drawnPixels(img, size);
    };
}

/** Enough of a file's start to find its size in (PNG: 24 bytes; JPEG: after its metadata segments). */
const HEADER_BYTES = 64 * 1024;

/**
 * A huge logo file (custom art), decoded once: its size is read from its header (home/imageSize) and the file decoded
 * straight to logoWorkSize, off the main thread; its visible part is measured on that copy and its drawn copy made from
 * it. Decoding the #31 logo to load it, to measure it and to copy it took three decodes of 180-340 ms each: the logo was
 * ready about 1.4 s after Home opened. What to draw; null for a blank file; undefined when the file is not huge, its size
 * is not in its header, or anything fails (lookOnce looks at it as before).
 */
async function lookHuge(url: string): Promise<LogoChoice | null | undefined> {
    try {
        if (typeof fetch !== 'function' || typeof createImageBitmap !== 'function') return undefined;
        const response = await fetch(url);
        if (!response.ok) return undefined;
        const blob = await response.blob();
        const natural = imageSize(new Uint8Array(await blob.slice(0, HEADER_BYTES).arrayBuffer()));
        const perCanvas = displayInfo().perCanvas;
        const work = natural && logoWorkSize(natural, perCanvas);
        if (!natural || !work) return undefined;
        const bitmap = await createImageBitmap(blob, { resizeWidth: work.width, resizeHeight: work.height, resizeQuality: 'high' });
        try {
            const seen = await measureLogo(url, natural, (_url, size) => smallPixels(bitmap, size));
            if (isBlankLogo(seen.readable, seen.trim)) return null;
            const file: LogoChoice = { url, trim: seen.trim, natural };
            const copy = logoCopy(file, perCanvas);
            if (!copy) return file;
            // A visible part under half the file is drawn bigger than the work copy holds: copied from the file instead.
            const fits = copy.natural.width <= work.width && copy.natural.height <= work.height;
            const src = await makeCopy(url, copy.natural, 'image/png', fits ? bitmap : blob);
            return src ? { ...copy, src } : file;
        } finally {
            bitmap.close?.();
        }
    } catch {
        return undefined;
    }
}

/** A logo file looked at: decoded (loadImage), measured, and copied when it is far bigger than it is drawn. */
async function lookOnce(url: string): Promise<LogoChoice | null> {
    const img = await loadImage(url);
    if (!img || !(img.naturalWidth > 0)) return null;
    const seen = await measureLogo(url, { width: img.naturalWidth, height: img.naturalHeight }, pixelReader(img));
    if (isBlankLogo(seen.readable, seen.trim)) return null;
    const file: LogoChoice = { url, trim: seen.trim, natural: { width: img.naturalWidth, height: img.naturalHeight }, ...(seen.luma === undefined ? {} : { luma: seen.luma }) };
    // A logo far bigger than it is drawn (custom art: 3841x5405) is drawn from a smaller copy (home/artShrink).
    const copy = logoCopy(file, displayInfo().perCanvas);
    const src = copy ? await makeCopy(url, copy.natural, 'image/png') : null;
    return copy && src ? { ...copy, src } : file;
}

async function lookup(appId: number, urls: string[], key: string): Promise<LogoChoice | null> {
    for (const url of urls) {
        const huge = await lookHuge(url);
        const choice = huge === undefined ? await lookOnce(url) : huge;
        // A file that does not load, or a blank one (Steam's local logo can be fully transparent), is no logo: the next
        // source, else the name.
        if (!choice) continue;
        rememberLogo(appId, key, choice);
        return choice;
    }
    rememberLogo(appId, key, null);
    return null;
}

/** The game's logo (null: show the name). Remembered answers return at once; never rejects. */
export function resolveLogo(appId: number, list = logoList(appId)): Promise<LogoChoice | null> {
    const known = knownLogo(appId, list.key);
    if (known !== undefined) return Promise.resolve(known);
    if (list.urls.length === 0) return Promise.resolve(null);
    const id = `${appId}|${list.key}`;
    const pending = inFlight.get(id);
    if (pending) return pending;
    const run = lookup(appId, list.urls, list.key)
        .catch(() => null)
        .finally(() => inFlight.delete(id));
    inFlight.set(id, run);
    return run;
}

/** Resolves the logos of `appIds` ahead (the games either side of the selection), one after another. */
export function preloadLogos(appIds: readonly number[]) {
    void (async () => {
        for (const appId of appIds) await resolveLogo(appId);
    })();
}
