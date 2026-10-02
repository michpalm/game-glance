import { callable, fetchNoCors } from '@decky/api';
import { HeroicRef } from '../logic/heroic';
import { sameTitle } from '../logic/names';
import { htmlToText } from '../logic/text';
import { attempt } from './attempt';
import { Cache, cache as defaultCache, TTL } from './cache';
import { getDescription } from './steam';

export interface ShortcutDescriptionDeps {
    cache: Cache;
    heroicDescription: (runner: string, appName: string) => Promise<string | null>;
    fetcher: (url: string) => Promise<{ status: number; json(): Promise<unknown> }>;
    steamDescription: (appId: number, lang: string) => Promise<string | null>;
}

const defaultDeps: ShortcutDescriptionDeps = {
    cache: defaultCache,
    heroicDescription: callable<[runner: string, appName: string], string | null>('get_heroic_description'),
    fetcher: (url) => fetchNoCors(url),
    steamDescription: (appId, lang) => getDescription(appId, lang),
};

interface SearchItem {
    type?: unknown;
    id?: unknown;
    name?: unknown;
}

/** The Steam app whose store name is exactly this game's name (see sameTitle), or null. Misses are remembered too. */
export async function findSteamAppId(name: string, deps: ShortcutDescriptionDeps = defaultDeps): Promise<number | null> {
    const key = `steammatch:${name.trim().toLowerCase()}`;
    const cached = await attempt('cache read', () => deps.cache.get<{ id: number | null }>(key), null);
    if (cached) return cached.id;
    try {
        const response = await deps.fetcher(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name.trim())}&l=english&cc=US`);
        if (response.status !== 200) return null;
        const items = ((await response.json()) as { items?: unknown } | null)?.items;
        const match = (Array.isArray(items) ? (items as SearchItem[]) : []).find(
            (item) => item?.type === 'app' && typeof item.name === 'string' && Number.isInteger(item.id) && sameTitle(name, item.name),
        );
        const id = match ? (match.id as number) : null;
        await attempt('cache write', () => deps.cache.put(key, { id }, id === null ? TTL.steamMatchMiss : TTL.steamMatch), undefined);
        return id;
    } catch {
        return null;
    }
}

/**
 * Description for a non-Steam shortcut: Heroic's local copy when Heroic added the game (exact, offline),
 * otherwise the Steam store's, for the game with exactly the same name, in the Steam language.
 */
export async function getShortcutDescription(
    game: { name: string; heroic: HeroicRef | null },
    lang: string,
    deps: ShortcutDescriptionDeps = defaultDeps,
): Promise<string | null> {
    if (game.heroic) {
        const { runner, appName } = game.heroic;
        const raw = await attempt('heroic description', () => deps.heroicDescription(runner, appName), null);
        const text = typeof raw === 'string' ? htmlToText(raw) : '';
        if (text.length > 0) return text;
    }
    if (game.name.trim().length === 0) return null;
    const appId = await findSteamAppId(game.name, deps);
    return appId === null ? null : deps.steamDescription(appId, lang);
}
