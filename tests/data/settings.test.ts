import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore } from '../../src/data/settings';

describe('settings', () => {
    it('defaults to enabled and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
        const listener = vi.fn();
        store.subscribe(listener);
        await store.setEnabled(false);
        expect(store.get().enabled).toBe(false);
        expect(listener).toHaveBeenCalledOnce();
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().enabled).toBe(false);
    });
    it('falls back to defaults on corrupt data', async () => {
        const kv = memoryKv();
        await kv.set('settings', 'nonsense');
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
    });
});

describe('settings: automatic pre-load', () => {
    it('is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        await store.setAutoPreload(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get()).toEqual({ enabled: true, autoPreload: false, spotlightHome: false, wishlistDeals: false, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
    });
    it('keeps the other setting when one changes, including settings saved before this option existed', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: false });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: false, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
        await store.setAutoPreload(false);
        expect(store.get()).toEqual({ enabled: false, autoPreload: false, spotlightHome: false, wishlistDeals: false, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
    });
});

describe('settings: spotlight home', () => {
    it('spotlight home is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().spotlightHome).toBe(false);
        await store.setSpotlightHome(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().spotlightHome).toBe(true);
    });
});

describe('settings: wishlist deals', () => {
    it('wishlist deals is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().wishlistDeals).toBe(false);
        await store.setWishlistDeals(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().wishlistDeals).toBe(true);
    });
});

describe('settings: the removed Home switches', () => {
    it('settings saved with the old What\'s new / Clean Home switches load without them', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, homeFeed: false, cleanHome: true });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, homeNewGames: false, cleanPage: false, homeStatusBar: true, gameLogo: false });
    });
});

describe('settings: New to library', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeNewGames).toBe(false);
        await store.setHomeNewGames(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeNewGames).toBe(true);
    });
});

describe('settings: Clean game page', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().cleanPage).toBe(false);
        await store.setCleanPage(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().cleanPage).toBe(true);
    });
});

describe('settings: Spotlight Home status bar', () => {
    it('is on by default and remembers being turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeStatusBar).toBe(true);
        await store.setHomeStatusBar(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeStatusBar).toBe(false);
    });
});

describe('settings: game logo instead of the title', () => {
    it('is off by default and remembers being turned on', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().gameLogo).toBe(false);
        await store.setGameLogo(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().gameLogo).toBe(true);
    });
});
