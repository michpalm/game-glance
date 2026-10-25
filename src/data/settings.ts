import { useSyncExternalStore } from 'react';
import { RECENT_ROW, RowSort, rowSortOf } from '../home/collections';
import { FEED_TABS_DEFAULT, FeedTabs, feedTabsOf } from '../home/feedTabs';
import type { FeedTab } from '../home/feedLayout';
import { HeroFit, heroFitOf } from '../home/heroFit';
import { RowStyle, rowStyleOf } from '../home/recentsLayout';
import { backendKv, KvBackend } from './kv';
import { readScreensaverOptions, SCREENSAVER_DEFAULTS, ScreensaverOptions } from '../screensaver/options';

export interface Settings {
    enabled: boolean;
    autoPreload: boolean; // pre-load game data for installed games in the background
    spotlightHome: boolean; // replace Steam's Home screen with Spotlight Home
    wishlistDeals: boolean; // look up wishlist sales on Steam's public store
    cleanPage: boolean; // the Game Glance page's Clean look: one row at the bottom, no description or HowLongToBeat cards
    homeStatusBar: boolean; // Spotlight Home's status bar: clock, battery and connection in Steam's top strip
    statusAvatar: boolean; // your avatar, round and ringed in your status colour, in the status bar instead of the dot
    gameLogo: boolean; // the game's logo instead of its name on Home and the game page (the name when it has none)
    homeRow: string; // Home's games row: 'recent' (Steam's recent games, with those new to the library) or a collection id
    homeRowSort: RowSort; // how a collection's games are sorted in the row
    homeRowStyle: RowStyle; // how the row moves: 'steam' (Steam's Home: the first game wide) 'spotlight' (selected game wide at the left), or 'minimal' (all cards small)
    homeGrayUninstalled: boolean; // gray treatment for uninstalled Steam games in Home's row
    heroFit: HeroFit; // the hero art: 'fill' (covers the screen, wide art's sides cut off) or 'fit' (the whole art at the top over a blurred copy)
    feedTabs: FeedTabs; // Home's feed tabs shown (What's new, Friends, Recommended); a tab that is off loads nothing
    screensaver: ScreensaverOptions; // Steam's screensaver drawn by Game Glance (screensaver/options)
}

const KEY = 'settings';
const DEFAULTS: Settings = { enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: RECENT_ROW, homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: FEED_TABS_DEFAULT, screensaver: SCREENSAVER_DEFAULTS };

export function createSettingsStore(kv: KvBackend) {
    let current: Settings = { ...DEFAULTS };
    let retained: Record<string, unknown> = {};
    const object = (value: unknown): Record<string, unknown> =>
        value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    // Save only the explicit change over retained raw values: an older version must not erase future preferences.
    const persist = async (change: Partial<Settings>) => {
        retained = { ...current, ...retained, ...change };
        await kv.set(KEY, retained);
    };
    const listeners = new Set<() => void>();
    const emit = () => listeners.forEach((listener) => listener());
    return {
        async load(): Promise<void> {
            retained = object(await kv.get(KEY));
            const raw = retained as Partial<Settings>;
            const pick = <K extends keyof Settings>(key: K): Settings[K] =>
                typeof raw?.[key] === 'boolean' ? (raw[key] as Settings[K]) : DEFAULTS[key];
            current = {
                enabled: pick('enabled'),
                autoPreload: pick('autoPreload'),
                spotlightHome: pick('spotlightHome'),
                wishlistDeals: pick('wishlistDeals'),
                cleanPage: pick('cleanPage'),
                homeStatusBar: pick('homeStatusBar'),
                statusAvatar: pick('statusAvatar'),
                gameLogo: pick('gameLogo'),
                homeRow: typeof raw?.homeRow === 'string' && raw.homeRow !== '' ? raw.homeRow : DEFAULTS.homeRow,
                homeRowSort: rowSortOf(raw?.homeRowSort),
                homeRowStyle: rowStyleOf(raw?.homeRowStyle),
                homeGrayUninstalled: pick('homeGrayUninstalled'),
                heroFit: heroFitOf(raw?.heroFit),
                feedTabs: feedTabsOf(raw?.feedTabs),
                screensaver: readScreensaverOptions(raw?.screensaver),
            };
            emit();
        },
        get: (): Settings => current,
        async setEnabled(enabled: boolean): Promise<void> {
            current = { ...current, enabled };
            emit();
            await persist({ enabled });
        },
        async setStatusAvatar(statusAvatar: boolean): Promise<void> {
            current = { ...current, statusAvatar };
            emit();
            await persist({ statusAvatar });
        },
        async setAutoPreload(autoPreload: boolean): Promise<void> {
            current = { ...current, autoPreload };
            emit();
            await persist({ autoPreload });
        },
        async setSpotlightHome(spotlightHome: boolean): Promise<void> {
            current = { ...current, spotlightHome };
            emit();
            await persist({ spotlightHome });
        },
        async setWishlistDeals(wishlistDeals: boolean): Promise<void> {
            current = { ...current, wishlistDeals };
            emit();
            await persist({ wishlistDeals });
        },
        async setHomeRow(homeRow: string): Promise<void> {
            current = { ...current, homeRow };
            emit();
            await persist({ homeRow });
        },
        async setHomeRowSort(homeRowSort: RowSort): Promise<void> {
            current = { ...current, homeRowSort };
            emit();
            await persist({ homeRowSort });
        },
        async setHomeRowStyle(homeRowStyle: RowStyle): Promise<void> {
            current = { ...current, homeRowStyle };
            emit();
            await persist({ homeRowStyle });
        },
        async setHomeGrayUninstalled(homeGrayUninstalled: boolean): Promise<void> {
            current = { ...current, homeGrayUninstalled };
            emit();
            await persist({ homeGrayUninstalled });
        },
        async setHeroFit(heroFit: HeroFit): Promise<void> {
            current = { ...current, heroFit };
            emit();
            await persist({ heroFit });
        },
        async setFeedTab(tab: FeedTab, on: boolean): Promise<void> {
            const feedTabs = { ...current.feedTabs, [tab]: on };
            current = { ...current, feedTabs };
            emit();
            // Keep tabs a newer version stored (as setScreensaver keeps unknown screensaver keys).
            await persist({ feedTabs: { ...feedTabs, ...object(retained.feedTabs), [tab]: on } as FeedTabs });
        },
        async setCleanPage(cleanPage: boolean): Promise<void> {
            current = { ...current, cleanPage };
            emit();
            await persist({ cleanPage });
        },
        async setHomeStatusBar(homeStatusBar: boolean): Promise<void> {
            current = { ...current, homeStatusBar };
            emit();
            await persist({ homeStatusBar });
        },
        async setGameLogo(gameLogo: boolean): Promise<void> {
            current = { ...current, gameLogo };
            emit();
            await persist({ gameLogo });
        },
        /** One or more screensaver options. */
        async setScreensaver(change: Partial<ScreensaverOptions>): Promise<void> {
            current = { ...current, screensaver: { ...current.screensaver, ...change } };
            emit();
            await persist({ screensaver: { ...current.screensaver, ...object(retained.screensaver), ...change } as ScreensaverOptions });
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
