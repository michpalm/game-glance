import { fetchNoCors } from '@decky/api';
import { HeroicRef, parseHeroicLaunch } from '../logic/heroic';
import { LutrisRef, parseLutrisLaunch } from '../logic/lutris';
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
    lutris: LutrisRef | null; // set when Lutris added this shortcut
}

const SHORTCUT_APP_TYPE = 1073741824;
const FIRST_SHORTCUT_APP_ID = 0x80000000;

type AnyRecord = Record<string, unknown> | undefined | null;

/**
 * Minutes played: the larger of the app overview's (`minutes_playtime_forever`, Steam's servers' count) and the app
 * details' (`nPlaytimeForever`), for every game, as 3.4.0 (#52) did. A non-Steam shortcut's play time is only ever local
 * (localconfig.vdf's Playtime under its signed app id), which Steam loads into its details; its overview's stays 0
 * (#52: EmulationStationDE on the Deck read 0 here and 21 on Steam's own page). On the Ally the two counters agreed for
 * all 145 Steam games (2026-10-21), and R3APER's 200+ h for about 40 was a Lutris shortcut, not a Steam game (see
 * lutrisPlaytime). Junk counts as 0. Pure.
 */
export function playedMinutesOf(overviewMinutes: unknown, detailsMinutes: unknown): number {
    const minutes = (v: unknown) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n) && n > 0 ? n : 0;
    };
    return Math.max(minutes(overviewMinutes), minutes(detailsMinutes));
}

/** A non-Steam shortcut: its app type, or an app id in the shortcuts' range. Pure. */
export function isShortcutApp(appId: number, appType: unknown): boolean {
    return appType === SHORTCUT_APP_TYPE || appId >= FIRST_SHORTCUT_APP_ID;
}

export function readGameInfo(overview: unknown, details: unknown): GameInfo {
    const o = overview as AnyRecord;
    const d = details as AnyRecord;
    const appId = Number(o?.appid ?? 0) || 0;
    const isShortcut = isShortcutApp(appId, o?.app_type);
    const a = d?.achievements as AnyRecord;
    const total = Number(a?.nTotal ?? 0);
    const achievements = !isShortcut && Number.isFinite(total) && total > 0
        ? { achieved: Number(a?.nAchieved ?? 0) || 0, total }
        : null;
    return {
        appId,
        name: typeof o?.display_name === 'string' ? o.display_name : '',
        isShortcut,
        playedMinutes: playedMinutesOf(o?.minutes_playtime_forever, d?.nPlaytimeForever),
        achievements,
        heroic: isShortcut ? parseHeroicLaunch(d?.strShortcutLaunchOptions as string | undefined) : null,
        lutris: isShortcut ? parseLutrisLaunch(d?.strShortcutLaunchOptions as string | undefined) : null,
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
