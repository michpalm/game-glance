import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore } from '../../src/data/settings';

describe('settings', () => {
    it('defaults to enabled and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeFeed: true });
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
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeFeed: true });
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
        expect(reloaded.get()).toEqual({ enabled: true, autoPreload: false, spotlightHome: false, wishlistDeals: false, homeFeed: true });
    });
    it('keeps the other setting when one changes, including settings saved before this option existed', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: false });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: false, autoPreload: true, spotlightHome: false, wishlistDeals: false, homeFeed: true });
        await store.setAutoPreload(false);
        expect(store.get()).toEqual({ enabled: false, autoPreload: false, spotlightHome: false, wishlistDeals: false, homeFeed: true });
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

describe('settings: Home feed', () => {
    it('the bottom section is shown by default and remembers being hidden', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeFeed).toBe(true);
        await store.setHomeFeed(false);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeFeed).toBe(false);
    });
    it('settings saved before the toggle existed keep the bottom section shown', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, homeFeed: true });
    });
});
