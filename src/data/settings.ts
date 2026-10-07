import { useSyncExternalStore } from 'react';
import { backendKv, KvBackend } from './kv';

export interface Settings {
    enabled: boolean;
    autoPreload: boolean; // pre-load game data for installed games in the background
    spotlightHome: boolean; // replace Steam's Home screen with Spotlight Home
    wishlistDeals: boolean; // look up wishlist sales on Steam's public store
    homeFeed: boolean; // Spotlight Home's bottom section: the What's new, Friends and Recommended tabs
    homeNewGames: boolean; // Spotlight Home's recents also show the games Steam lists as new to the library (unplayed)
    cleanPage: boolean; // the Game Glance page's Clean look: one row at the bottom, no description or HowLongToBeat cards
    homeStatusBar: boolean; // Spotlight Home's status bar: clock, battery and connection in Steam's top strip
}

const KEY = 'settings';
const DEFAULTS: Settings = { enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeFeed: true, homeNewGames: false, cleanPage: false, homeStatusBar: true };

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
                homeFeed: pick('homeFeed'),
                homeNewGames: pick('homeNewGames'),
                cleanPage: pick('cleanPage'),
                homeStatusBar: pick('homeStatusBar'),
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
        async setHomeFeed(homeFeed: boolean): Promise<void> {
            current = { ...current, homeFeed };
            emit();
            await kv.set(KEY, current);
        },
        async setHomeNewGames(homeNewGames: boolean): Promise<void> {
            current = { ...current, homeNewGames };
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
