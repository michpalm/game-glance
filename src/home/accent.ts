import { attempt } from '../data/attempt';
import { Cache, TTL } from '../data/cache';

export const DEFAULT_ACCENT = '#5fd1ae';

const MIN_SATURATION = 0.45;
const MIN_VALUE = 110;
const BUCKETS = 12;

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Dominant vivid colour of RGBA pixel data, or null when nothing is vivid enough (grey/dark/washed-out art). */
export function pickAccent(rgba: ArrayLike<number>): string | null {
    const weight = new Array<number>(BUCKETS).fill(0);
    const sum = Array.from({ length: BUCKETS }, () => [0, 0, 0]);
    for (let i = 0; i + 3 < rgba.length; i += 4) {
        const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
        const max = Math.max(r, g, b);
        const d = max - Math.min(r, g, b);
        if (max < MIN_VALUE || d / max < MIN_SATURATION) continue;
        const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        const bucket = Math.floor(((h * 60 + 15) % 360) / 30) // offset 15 degrees so red sits mid-bucket;
        const w = (d / max) * (max / 255);
        weight[bucket] += w;
        sum[bucket][0] += r * w;
        sum[bucket][1] += g * w;
        sum[bucket][2] += b * w;
    }
    let best = -1;
    for (let k = 0; k < BUCKETS; k++) if (weight[k] > 0 && (best < 0 || weight[k] > weight[best])) best = k;
    if (best < 0) return null;
    const [r, g, b] = sum[best].map((c) => c / weight[best]);
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

interface AccentEntry {
    color: string | null;
}

function isEntry(value: unknown): value is AccentEntry {
    if (typeof value !== 'object' || value === null) return false;
    const color = (value as AccentEntry).color;
    return color === null || (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color));
}

/** Per-game accent; always resolves (default colour on any failure). */
export async function accentFor(
    appId: number,
    deps: { cache: Cache; sample(appId: number): Promise<string | null> },
): Promise<string> {
    const key = `accent:${appId}`;
    const cached = await attempt('accent cache read', () => deps.cache.get<unknown>(key), null);
    if (isEntry(cached)) return cached.color ?? DEFAULT_ACCENT;
    const color = await attempt('accent sample', () => deps.sample(appId), null);
    await attempt(
        'accent cache write',
        () => deps.cache.put<AccentEntry>(key, { color }, color ? TTL.accent : TTL.accentMiss),
        undefined,
    );
    return color ?? DEFAULT_ACCENT;
}

/**
 * The dark glass the small accent text is drawn on: Home's page ink (`--gh-ink`, #07090c) under the hero scrim is
 * about this dark, and the restyled details page uses the same near-black scrim. Brighter art behind the text is
 * the reason to keep the floor at the full 4.5:1 rather than a lower one.
 */
export const TEXT_BACKGROUND = '#0b0d12';
/** WCAG AA for small text. */
export const TEXT_MIN_CONTRAST = 4.5;

function parseHex(color: string): [number, number, number] | null {
    const m = /^#([0-9a-f]{6})$/i.exec(color);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
    const lin = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio of two #rrggbb colours (1 to 21); 1 for an unusable value. */
export function contrastRatio(a: string, b: string): number {
    const ra = parseHex(a), rb = parseHex(b);
    if (!ra || !rb) return 1;
    const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
    const l = (max + min) / 2;
    if (d === 0) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return `#${hex((r + m) * 255)}${hex((g + m) * 255)}${hex((b + m) * 255)}`;
}

/**
 * The accent for small TEXT: the accent itself when it already reaches `minContrast` against `background`, else the same
 * hue and saturation (HSL) with lightness raised only until it does. Backgrounds, bars and rings keep the true accent.
 * A value that is not #rrggbb gives the default accent's text colour.
 */
export function legibleAccent(color: string, minContrast = TEXT_MIN_CONTRAST, background = TEXT_BACKGROUND): string {
    const rgb = parseHex(color);
    if (!rgb) return DEFAULT_ACCENT;
    const own = color.toLowerCase();
    if (contrastRatio(own, background) >= minContrast) return own;
    const [h, s, l] = toHsl(rgb);
    let lo = l, hi = 1;
    for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (contrastRatio(fromHsl(h, s, mid), background) >= minContrast) hi = mid;
        else lo = mid;
    }
    // Rounding to 8 bits can land a hair under the floor: nudge up until it holds.
    let out = fromHsl(h, s, hi);
    for (let l2 = hi; contrastRatio(out, background) < minContrast && l2 < 1; l2 += 0.002) out = fromHsl(h, s, l2);
    return out;
}
