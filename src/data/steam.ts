import { fetchNoCors } from '@decky/api';
import { HeroicRef, parseHeroicLaunch } from '../logic/heroic';
import { htmlToText } from '../logic/text';
import { attempt } from './attempt';
import { Cache, cache as defaultCache, TTL } from './cache';

export interface GameInfo {
    appId: number;
    name: string;
    isShortcut: boolean;
    playedMinutes: number;
    achievements: { achieved: number; total: number } | null;
    heroic: HeroicRef | null; // set when Heroic Games Launcher added this shortcut
}

const SHORTCUT_APP_TYPE = 1073741824;
const FIRST_SHORTCUT_APP_ID = 0x80000000;

type AnyRecord = Record<string, unknown> | undefined | null;

export function readGameInfo(overview: unknown, details: unknown): GameInfo {
    const o = overview as AnyRecord;
    const d = details as AnyRecord;
    const appId = Number(o?.appid ?? 0) || 0;
    const isShortcut = o?.app_type === SHORTCUT_APP_TYPE || appId >= FIRST_SHORTCUT_APP_ID;
    const minutes = Number(o?.minutes_playtime_forever ?? 0);
    const a = d?.achievements as AnyRecord;
    const total = Number(a?.nTotal ?? 0);
    const achievements = !isShortcut && Number.isFinite(total) && total > 0
        ? { achieved: Number(a?.nAchieved ?? 0) || 0, total }
        : null;
    return {
        appId,
        name: typeof o?.display_name === 'string' ? o.display_name : '',
        isShortcut,
        playedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 0,
        achievements,
        heroic: isShortcut ? parseHeroicLaunch(d?.strShortcutLaunchOptions as string | undefined) : null,
    };
}

export function parseStoreDescription(json: unknown, appId: number): string | null {
    const entry = (json as Record<string, AnyRecord> | null)?.[String(appId)];
    if (!entry || entry.success !== true) return null;
    const raw = (entry.data as AnyRecord)?.short_description;
    if (typeof raw !== 'string') return null;
    const text = htmlToText(raw);
    return text.length > 0 ? text : null;
}

interface DescriptionDeps {
    cache: Cache;
    fetcher: (url: string) => Promise<{ status: number; json(): Promise<unknown> }>;
}

const defaultDeps: DescriptionDeps = { cache: defaultCache, fetcher: (url) => fetchNoCors(url) };

export async function getDescription(appId: number, lang: string, deps: DescriptionDeps = defaultDeps): Promise<string | null> {
    const key = `desc:${appId}:${lang}`;
    const cached = await attempt('cache read', () => deps.cache.get<{ text: string | null }>(key), null);
    if (cached) return cached.text;
    try {
        const response = await deps.fetcher(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=${encodeURIComponent(lang)}`);
        if (response.status !== 200) return null;
        const text = parseStoreDescription(await response.json(), appId);
        await attempt('cache write', () => deps.cache.put(key, { text }, TTL.description), undefined);
        return text;
    } catch {
        return null;
    }
}

let languagePromise: Promise<string> | null = null;
let resolvedLanguage: string | undefined;

export function getSteamLanguage(): Promise<string> {
    if (!languagePromise) {
        languagePromise = (async () => {
            let lang = 'english';
            try {
                const steamClient = (globalThis as { SteamClient?: { Settings?: { GetCurrentLanguage?: () => Promise<string> } } }).SteamClient;
                const value = await steamClient?.Settings?.GetCurrentLanguage?.();
                if (typeof value === 'string' && value.length > 0) lang = value;
            } catch {
                // keep english
            }
            resolvedLanguage = lang;
            return lang;
        })();
    }
    return languagePromise;
}

/** The Steam language once `getSteamLanguage()` has resolved (started at plugin load), else undefined. */
export function peekSteamLanguage(): string | undefined {
    return resolvedLanguage;
}
