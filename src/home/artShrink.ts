import { loadWithTimeout } from './accentSample';
import { LogoChoice, logoFit, scaleTrim } from './logo';
import { LOGO_BOX } from '../styles/logoBox';

/**
 * Smaller copies of oversized art. Custom art (SteamGridDB) is often far bigger than it is drawn: logos of 3841x5405 and
 * 3495x677, heroes as 3840x1240 PNGs. Chromium decodes such a file again, at the size it draws it, whenever it is shown,
 * and Home waited on that decode (probed on the Ally: a PNG decode of 169-227 ms froze L1/R1 for up to 600 ms). A copy at
 * the drawn size (a JPEG for a big PNG hero) decodes in a few ms; it is made once per game, off the main thread
 * (createImageBitmap), and kept for the session as a blob url.
 */

export interface Size {
    width: number;
    height: number;
}

/** A copy is made only when the file is at least this much bigger than it is drawn. */
export const MIN_GAIN = 1.25;
/** A PNG this big (pixels) is copied (as a JPEG) even when it is drawn near its size: decoding the PNG is the cost. */
export const PNG_COPY_MIN_PX = 2_000_000;
/** Logos are copied with this much room over the size they are drawn at (the game page's scale can differ from Home's). */
export const LOGO_MARGIN = 1.5;

const valid = (s: Size) => Number.isFinite(s.width) && Number.isFinite(s.height) && s.width > 0 && s.height > 0;
const up = (n: number) => Math.max(1, Math.ceil(n - 1e-6));

/** The copy to draw a file of `natural` size at, with background-size: cover in `box` (device px); null: draw the file. */
export function copyPlan(natural: Size, box: Size, png: boolean): Size | null {
    if (!valid(natural) || !valid(box)) return null;
    const scale = Math.min(1, Math.max(box.width / natural.width, box.height / natural.height));
    const shrinks = scale * MIN_GAIN < 1;
    if (!shrinks && !(png && natural.width * natural.height > PNG_COPY_MIN_PX)) return null;
    return { width: up(natural.width * scale), height: up(natural.height * scale) };
}

/**
 * A logo's copy: its size and the visible part's place in it, at what the visible part is drawn at (logoFit, in canvas
 * px, times `perCanvas` device px, times LOGO_MARGIN); null when the file is not worth copying. `url` stays the file's
 * (home/logo remembers by it); the caller adds the copy's `src`.
 */
export function logoCopy(choice: LogoChoice, perCanvas: number): LogoChoice | null {
    if (!valid(choice.natural) || !(perCanvas > 0)) return null;
    const fit = logoFit(choice.trim, choice.natural);
    const visible = choice.trim ?? { width: choice.natural.width };
    const scale = (fit.width * perCanvas * LOGO_MARGIN) / visible.width;
    if (!(scale > 0) || scale * MIN_GAIN >= 1) return null;
    const natural = { width: up(choice.natural.width * scale), height: up(choice.natural.height * scale) };
    const actual = natural.width / choice.natural.width;
    return { url: choice.url, trim: scaleTrim(choice.trim, 1 / actual, natural), natural };
}

/**
 * The size a huge logo is decoded straight to (createImageBitmap from its bytes), so its file is decoded once: its visible
 * part is measured on this copy and its drawn copy (logoCopy) made from it, instead of decoding the file three times
 * (to load it, to measure it, to copy it: about 1.4 s for the #31 logo on the Ally). Room for the copy of a visible part
 * at least half the file wide or tall (LOGO_BOX on its longer side, perCanvas, LOGO_MARGIN, times 2); a narrower one is
 * copied from the file again. Null when the file is not much bigger (decoding it as it is costs little).
 */
export function logoWorkSize(natural: Size, perCanvas: number): Size | null {
    if (!valid(natural) || !(perCanvas > 0)) return null;
    const scale = Math.min(1, 2 * LOGO_MARGIN * perCanvas * Math.max(LOGO_BOX.width / natural.width, LOGO_BOX.height / natural.height));
    if (scale * MIN_GAIN >= 1) return null;
    return { width: up(natural.width * scale), height: up(natural.height * scale) };
}

export interface DisplayInfo {
    /** The screen in device px. */
    width: number;
    height: number;
    /** Device px per Home canvas px. */
    perCanvas: number;
}

const ALLY: DisplayInfo = { width: 1920, height: 1080, perCanvas: 4 / 3 };
let display: DisplayInfo = ALLY;

/** Home's measure: its css box, the device pixel ratio and its canvas scale (css px per canvas px). */
export function noteDisplay(cssWidth: number, cssHeight: number, dpr: number, canvasScale: number) {
    if (![cssWidth, cssHeight, dpr, canvasScale].every((n) => Number.isFinite(n) && n > 0)) return;
    display = { width: Math.round(cssWidth * dpr), height: Math.round(cssHeight * dpr), perCanvas: canvasScale * dpr };
}

/** The screen as Home last measured it (an Ally until then). */
export function displayInfo(): DisplayInfo {
    return display;
}

export function resetDisplay() {
    display = ALLY;
}

const LOAD_TIMEOUT_MS = 4000;

/** Whether a url names a PNG file (custom art keeps its extension). */
export function isPngUrl(url: string): boolean {
    return /\.png(?:[?#]|$)/i.test(url);
}

/** Loads `url` and waits for its decode; the image, or null when it does not load. Never rejects. */
export function loadDecoded(url: string, crossOrigin = false): Promise<HTMLImageElement | null> {
    try {
        return loadWithTimeout<HTMLImageElement>((done) => {
            const img = new Image();
            if (crossOrigin) img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    if (typeof img.decode === 'function') img.decode().then(() => done(img), () => done(img));
                    else done(img);
                } catch {
                    done(img);
                }
            };
            img.onerror = () => done(null);
            img.src = url;
        }, LOAD_TIMEOUT_MS);
    } catch {
        return Promise.resolve(null);
    }
}

/**
 * `url`, a blob copy just made, when it decodes; else null, and the blob is revoked: nothing else holds it yet, so it would
 * stay in memory for the plugin's lifetime.
 */
export async function keepIfDecoded(url: string, decode: (url: string) => Promise<unknown>, revoke: (url: string) => void = (u) => URL.revokeObjectURL(u)): Promise<string | null> {
    if (await decode(url)) return url;
    revoke(url);
    return null;
}

/** The file at `url`, as bytes to decode; null when it does not load. */
async function fetchBlob(url: string): Promise<Blob | null> {
    if (typeof fetch !== 'function') return null;
    const response = await fetch(url);
    return response.ok ? response.blob() : null;
}

/**
 * A copy of `url` at `size` as a blob url (decoded and resized off the main thread by createImageBitmap, encoded by an
 * OffscreenCanvas), already decoded once; null when anything is missing or fails (the file is drawn instead). From
 * `source` when given (the file already decoded, at least `size`), else from the file.
 */
async function createCopy(url: string, size: Size, type: CopyType, source?: ImageBitmapSource): Promise<string | null> {
    try {
        if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null;
        const from = source ?? (await fetchBlob(url));
        if (!from) return null;
        const bitmap = await createImageBitmap(from, { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high' });
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        if (type === 'image/jpeg') {
            // A JPEG has no transparency: what a transparent hero would show over is Home's own black.
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, bitmap.width, bitmap.height);
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();
        const copy = URL.createObjectURL(await canvas.convertToBlob({ type, quality: 0.9 }));
        return await keepIfDecoded(copy, loadDecoded);
    } catch {
        return null;
    }
}

export type CopyType = 'image/jpeg' | 'image/png';
type CopyMaker = (url: string, size: Size, type: CopyType, source?: ImageBitmapSource) => Promise<string | null>;

/**
 * `make` remembered by file, size and type (the newest `max`), shared by everyone asking at the same time: a game's art
 * is copied once per session however often its lookup runs again. A failed copy is not kept.
 */
export function createCopyCache(make: CopyMaker, max: number): CopyMaker {
    const copies = new Map<string, Promise<string | null>>();
    return (url, size, type, source) => {
        const key = `${url}|${size.width}x${size.height}|${type}`;
        const hit = copies.get(key);
        if (hit) {
            copies.delete(key);
            copies.set(key, hit);
            return hit;
        }
        const run = make(url, size, type, source).then((copy) => {
            if (copy === null) copies.delete(key);
            return copy;
        }, () => {
            copies.delete(key);
            return null;
        });
        copies.set(key, run);
        while (copies.size > max) copies.delete(copies.keys().next().value as string);
        return run;
    };
}

/** Copies kept for the session (heroes, logos and wide card art of a few rows of games). */
const COPY_MAX = 96;

/** A copy of `url` at `size` (createCopy), made once per file, size and type. */
export const makeCopy = createCopyCache(createCopy, COPY_MAX);

/**
 * Art drawn with background-size: cover in `box` (device px): loads and decodes `url`, and hands back the url to draw,
 * a smaller copy when the file is worth one (copyPlan), else the file itself; null when it does not load. Never rejects.
 */
export async function loadArt(url: string, box: Size): Promise<string | null> {
    const img = await loadDecoded(url);
    if (!img || !(img.naturalWidth > 0)) return null;
    const plan = copyPlan({ width: img.naturalWidth, height: img.naturalHeight }, box, isPngUrl(url));
    if (!plan) return url;
    return (await makeCopy(url, plan, 'image/jpeg')) ?? url;
}
