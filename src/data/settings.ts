import { useSyncExternalStore } from 'react';
import { RECENT_ROW, RowSort, rowSortOf } from '../home/collections';
import { backendKv, KvBackend } from './kv';

export interface Settings {
    enabled: boolean;
    autoPreload: boolean; // pre-load game data for installed games in the background
    spotlightHome: boolean; // replace Steam's Home screen with Spotlight Home
    wishlistDeals: boolean; // look up wishlist sales on Steam's public store
    cleanPage: boolean; // the Game Glance page's Clean look: one row at the bottom, no description or HowLongToBeat cards
    homeStatusBar: boolean; // Spotlight Home's status bar: clock, battery and connection in Steam's top strip
    gameLogo: boolean; // the game's logo instead of its name on Home and the game page (the name when it has none)
    homeRow: string; // Home's games row: 'recent' (Steam's recent games, with those new to the library) or a collection id
    homeRowSort: RowSort; // how a collection's games are sorted in the row
}

const KEY = 'settings';
const DEFAULTS: Settings = { enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, gameLogo: false, homeRow: RECENT_ROW, homeRowSort: 'lastPlayed' };

export function createSettingsStore(kv: KvBackend) {
    let current: Settings = { ...DEFAULTS };
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());
    return {
        async load(): Promise<void> {
            const raw = (await kv.get(KEY)) as Partial<Settings> | null;
            const pick = <K extends keyof Settings>(key: K): Settings[K] =>
                typeof raw?.[key] === 'boolean' ? (raw[key] as Settings[K]) : DEFAULTS[key];
            current = {
                enabled: pick('enabled'),
                autoPreload: pick('autoPreload'),
                spotlightHome: pick('spotlightHome'),
                wishlistDeals: pick('wishlistDeals'),
                cleanPage: pick('cleanPage'),
                homeStatusBar: pick('homeStatusBar'),
                gameLogo: pick('gameLogo'),
                homeRow: typeof raw?.homeRow === 'string' && raw.homeRow !== '' ? raw.homeRow : DEFAULTS.homeRow,
                homeRowSort: rowSortOf(raw?.homeRowSort),
            };
            emit();
        },
        get: (): Settings => current,
        async setEnabled(enabled: boolean): Promise<void> {
            current = { ...current, enabled };
            emit();
            await kv.set(KEY, current);
        },
        async setAutoPreload(autoPreload: boolean): Promise<void> {
            current = { ...current, autoPreload };
            emit();
            await kv.set(KEY, current);
        },
        async setSpotlightHome(spotlightHome: boolean): Promise<void> {
            current = { ...current, spotlightHome };
            emit();
            await kv.set(KEY, current);
        },
        async setWishlistDeals(wishlistDeals: boolean): Promise<void> {
            current = { ...current, wishlistDeals };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRow(homeRow: string): Promise<void> {
            current = { ...current, homeRow };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeRowSort(homeRowSort: RowSort): Promise<void> {
            current = { ...current, homeRowSort };
            emit();
            await kv.set(KEY, current);
        },
        async setCleanPage(cleanPage: boolean): Promise<void> {
            current = { ...current, cleanPage };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeStatusBar(homeStatusBar: boolean): Promise<void> {
            current = { ...current, homeStatusBar };
            emit();
            await kv.set(KEY, current);
        },
        async setGameLogo(gameLogo: boolean): Promise<void> {
            current = { ...current, gameLogo };
            emit();
            await kv.set(KEY, current);
        },
        subscribe(listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}

export const settings = createSettingsStore(backendKv);

export function useSettings(): Settings {
    return useSyncExternalStore(settings.subscribe, settings.get);
}
