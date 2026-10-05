import { browserStores, capsuleUrls, heroUrls } from './artwork';
import { pickAccent } from './accent';

const W = 64;
const H = 36;
const LOAD_TIMEOUT_MS = 4000;

/** Wraps a callback-style load so it always settles: null on timeout. */
export function loadWithTimeout<T>(start: (done: (value: T | null) => void) => void, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        start((value) => {
            clearTimeout(timer);
            resolve(value);
        });
    });
}

/** Tries each url in order; the first that loads and yields an accent wins. Never throws. */
export async function sampleUrls<I>(
    urls: string[],
    deps: { load(url: string): Promise<I | null>; read(img: I): string | null },
): Promise<string | null> {
    for (const url of urls) {
        try {
            const img = await deps.load(url);
            const accent = img ? deps.read(img) : null;
            if (accent) return accent;
        } catch {
            continue;
        }
    }
    return null;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return loadWithTimeout<HTMLImageElement>((done) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => done(img);
        img.onerror = () => done(null);
        img.src = url;
    }, LOAD_TIMEOUT_MS);
}

function readAccent(img: HTMLImageElement): string | null {
    const canvas = document.createElement('canvas'); // getImageData throws on a tainted canvas; sampleUrls catches
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    return pickAccent(ctx.getImageData(0, 0, W, H).data);
}

/** Browser glue: samples the hero, then the capsule, into a small canvas. Null on any failure. */
export async function sampleAccent(appId: number): Promise<string | null> {
    try {
        const urls = [...heroUrls(appId, browserStores).slice(0, 1), ...capsuleUrls(appId, browserStores)];
        return await sampleUrls(urls, { load: loadImage, read: readAccent });
    } catch {
        return null;
    }
}
