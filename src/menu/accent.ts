import { cache } from '../data/cache';
import { accentKey, DEFAULT_ACCENT } from '../home/accent';
import { accentMemo } from '../home/accentMemo';
import { accentVersion } from '../home/accentSample';

interface AccentDependencies {
    memo: Map<number, string>;
    version(appId: number): number;
    cache: { get(key: string): Promise<unknown> };
}
const defaults: AccentDependencies = { memo: accentMemo, cache, version: accentVersion };
const valid = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

/** Screen context, rather than a background game's existence, determines the visible artwork accent. */
export function pickMenuAccent(running: string | undefined, home: string | undefined, gameSurface: boolean): string {
    if (gameSurface) return valid(running) ? running : DEFAULT_ACCENT;
    return valid(home) ? home : valid(running) ? running : DEFAULT_ACCENT;
}

/** Read Home's existing persisted color; never resample art or invent a game color. */
export async function resolveMenuAccent(appId: number, deps: AccentDependencies = defaults): Promise<string | undefined> {
    if (!Number.isInteger(appId) || appId <= 0) return;
    const warm = deps.memo.get(appId);
    if (valid(warm)) return warm;
    try {
        const version = deps.version(appId);
        const entry = await deps.cache.get(accentKey(appId, version));
        const newer = deps.memo.get(appId);
        if (valid(newer)) return newer;
        if (deps.version(appId) !== version) return;
        const color = entry && typeof entry === 'object' && 'color' in entry ? entry.color : undefined;
        if (!valid(color)) return;
        deps.memo.set(appId, color);
        return color;
    } catch { return; }
}
