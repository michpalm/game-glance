import { LOGO_BOX } from '../styles/logoBox';

/**
 * The logo option's pure parts. Steam's logo files are all 640 x 360 with the artwork somewhere inside and the rest
 * transparent (probed on the Ally: Control's is a 640 x 119 strip, The Witcher 3's a 314 x 204 block in the middle,
 * Darkest Dungeon's fills the file), so fitting the files into one box drew some logos at a third of the weight of
 * others. Each logo is cropped to its visible part (alphaBounds) and sized by area (logoFit).
 */

/** The visible part of a logo file, in its own pixels. */
export interface LogoTrim {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** What a game's logo ended on: the url, its visible part (null when its pixels could not be read) and the file's size. */
export interface LogoChoice {
    url: string;
    /** What to draw when not the file itself: a smaller copy (home/artShrink); `natural` and `trim` are then the copy's. */
    src?: string;
    trim: LogoTrim | null;
    natural: { width: number; height: number };
    /** How bright its visible pixels are, 0 (black) to 1 (white); absent when not measured. The Library lifts dark ones. */
    luma?: number;
}

/** The visible part is found on a copy at most this wide: a quarter of Steam's 640 px files, 16 times fewer pixels to read. */
export const MEASURE_MAX = 160;

/** The size of the copy to read a file's pixels from, and its scale; null for a file with no size. */
export function measureSize(natural: { width: number; height: number }): { width: number; height: number; scale: number } | null {
    if (!(natural.width > 0 && natural.height > 0)) return null;
    const scale = Math.min(1, MEASURE_MAX / natural.width);
    return { width: Math.max(1, Math.round(natural.width * scale)), height: Math.max(1, Math.round(natural.height * scale)), scale };
}

/** Reads a file's RGBA pixels at `size` (a smaller copy); null when they cannot be read. */
export type PixelReader = (url: string, size: { width: number; height: number }) => Promise<ArrayLike<number> | null>;

/**
 * The visible part of a logo file (`trim`, in its own pixels; null when nothing shows) and whether its pixels could be read
 * (`readable`; when not, the file is drawn whole). Only the copy at measureSize is read: a 6790 x 3213 SteamGridDB logo
 * decoded whole on the main thread froze Home for about 300 ms (#31). Never rejects.
 */
export async function measureLogo(url: string, natural: { width: number; height: number }, read: PixelReader): Promise<{ readable: boolean; trim: LogoTrim | null; luma?: number }> {
    const size = measureSize(natural);
    if (!size) return { readable: false, trim: null };
    try {
        const pixels = await read(url, { width: size.width, height: size.height });
        if (!pixels) return { readable: false, trim: null };
        const luma = logoLuma(pixels, size.width, size.height);
        return { readable: true, trim: scaleTrim(alphaBounds(pixels, size.width, size.height), size.scale, natural), ...(luma === null ? {} : { luma }) };
    } catch {
        return { readable: false, trim: null };
    }
}

/** A crop found on the smaller copy, in the file's own pixels: rounded outward (never cutting the artwork), inside the file. */
export function scaleTrim(trim: LogoTrim | null, scale: number, natural: { width: number; height: number }): LogoTrim | null {
    if (!trim || !(scale > 0)) return null;
    const x = Math.max(0, Math.floor(trim.x / scale));
    const y = Math.max(0, Math.floor(trim.y / scale));
    const right = Math.min(natural.width, Math.ceil((trim.x + trim.width) / scale));
    const bottom = Math.min(natural.height, Math.ceil((trim.y + trim.height) / scale));
    return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/**
 * Whether a logo file is blank: its pixels were read (`readable`) and none shows (no trim). Steam's own local logo can be
 * a fully transparent file (Deus Ex: Human Revolution's, 640 x 360, every pixel clear): drawn, it showed nothing where the
 * name belongs. A file whose pixels could not be read is drawn whole. Pure.
 */
export function isBlankLogo(readable: boolean, trim: LogoTrim | null): boolean {
    return readable && trim === null;
}

/** Every logo gets about this area, in canvas px, before the LOGO_BOX caps: a wide logo spreads, a tall one rises. */
export const LOGO_AREA = 56_000;

/** Below this alpha (of 255) a pixel counts as transparent: soft shadows and stray pixels do not stretch the box. */
const ALPHA_MIN = 16;

/**
 * How bright a logo is: the mean relative luminance (0-1) of its pixels that show, weighted by their alpha; null when
 * none shows. Read on the same small copy as the crop (Library, PS5 check 2026-11-19: dark logos vanished on dark art).
 */
export function logoLuma(data: ArrayLike<number>, width: number, height: number): number | null {
    const n = width * height;
    if (!(n > 0) || data.length < n * 4) return null;
    let sum = 0;
    let weight = 0;
    for (let i = 0; i < n; i++) {
        const a = data[i * 4 + 3];
        if (a <= ALPHA_MIN) continue;
        const l = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
        sum += l * a;
        weight += a;
    }
    return weight > 0 ? sum / weight : null;
}

/** The box around the pixels that show (alpha above ALPHA_MIN) in RGBA `data`; null for an empty image or bad sizes. */
export function alphaBounds(data: ArrayLike<number>, width: number, height: number): LogoTrim | null {
    if (!(width > 0 && height > 0) || data.length < width * height * 4) return null;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y++) {
        const row = y * width * 4;
        for (let x = 0; x < width; x++) {
            if (data[row + x * 4 + 3] <= ALPHA_MIN) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const tenth = (n: number) => Math.round(n * 10) / 10;

/**
 * The size to draw a logo at, in canvas px: LOGO_AREA at the visible part's aspect ratio, scaled down to fit LOGO_BOX;
 * and the crop (`object-view-box`) that shows only the visible part, null without a trim (the whole file is used).
 */
export function logoFit(trim: LogoTrim | null, natural: { width: number; height: number }): { width: number; height: number; viewBox: string | null } {
    const box = trim ?? { x: 0, y: 0, width: natural.width, height: natural.height };
    const ratio = box.width > 0 && box.height > 0 ? box.width / box.height : 16 / 9;
    let height = Math.sqrt(LOGO_AREA / ratio);
    let width = ratio * height;
    const scale = Math.min(1, LOGO_BOX.width / width, LOGO_BOX.height / height);
    width *= scale;
    height *= scale;
    const viewBox = trim
        ? `inset(${trim.y}px ${natural.width - trim.x - trim.width}px ${natural.height - trim.y - trim.height}px ${trim.x}px)`
        : null;
    return { width: tenth(width), height: tenth(height), viewBox };
}

const LOGO_MEMO_MAX = 200;
const memo = new Map<number, { key: string; choice: LogoChoice | null }>();

/**
 * What `appId` ended on this session: its logo, null for the title, undefined when it should be (re)tried. Its url list
 * (`key`, urls joined by "|") can grow once Steam loads the game and lists its local logo file: a game that ended on its
 * title is then tried again, and so is one whose logo came from further down the list (Steam's image server, during a
 * pre-load) when a url it has not tried now comes ahead of it. Urls ahead of it that it already tried had failed.
 */
export function knownLogo(appId: number, key: string): LogoChoice | null | undefined {
    const entry = memo.get(appId);
    if (!entry) return undefined;
    if (entry.key === key) return entry.choice;
    if (entry.choice === null) return undefined;
    const now = key.split('|');
    const at = now.indexOf(entry.choice.url);
    if (at < 0) return undefined;
    const tried = new Set(entry.key.split('|'));
    return now.slice(0, at).every((url) => tried.has(url)) ? entry.choice : undefined;
}

/** The logo `appId` last ended on, whatever its list: shown while a better source loads. Null when none. */
export function lastLogo(appId: number): LogoChoice | null {
    return memo.get(appId)?.choice ?? null;
}

export function rememberLogo(appId: number, key: string, choice: LogoChoice | null) {
    memo.delete(appId);
    memo.set(appId, { key, choice });
    while (memo.size > LOGO_MEMO_MAX) memo.delete(memo.keys().next().value as number);
}

export function forgetLogo(appId: number) {
    memo.delete(appId);
}

export function resetLogoMemo() {
    memo.clear();
}
