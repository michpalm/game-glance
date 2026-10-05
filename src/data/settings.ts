import { useSyncExternalStore } from 'react';
import { backendKv, KvBackend } from './kv';

export interface Settings {
    enabled: boolean;
    autoPreload: boolean; // pre-load game data for installed games in the background
    spotlightHome: boolean; // replace Steam's Home screen with Spotlight Home
    wishlistDeals: boolean; // look up wishlist sales on Steam's public store
}

const KEY = 'settings';
const DEFAULTS: Settings = { enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false };

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
