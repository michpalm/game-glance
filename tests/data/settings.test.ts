import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore } from '../../src/data/settings';
import { SCREENSAVER_DEFAULTS } from '../../src/screensaver/options';

describe('settings', () => {
    it('defaults to enabled and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
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
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
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
        expect(reloaded.get()).toEqual({ enabled: true, autoPreload: false, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
    });
    it('keeps the other setting when one changes, including settings saved before this option existed', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: false });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: false, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
        await store.setAutoPreload(false);
        expect(store.get()).toEqual({ enabled: false, autoPreload: false, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
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
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', screensaver: SCREENSAVER_DEFAULTS });
    });
});

describe('settings: Games row', () => {
    it('shows the recent games, sorted by last played, by default and remembers a collection and its sort', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRow).toBe('recent');
        expect(store.get().homeRowSort).toBe('lastPlayed');
        await store.setHomeRow('uc-vHNTb8+oFvas');
        await store.setHomeRowSort('name');
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeRow).toBe('uc-vHNTb8+oFvas');
        expect(reloaded.get().homeRowSort).toBe('name');
    });
    it('reads junk, and the old New to library switch, as the defaults', async () => {
        const kv = memoryKv();
        await kv.set('settings', { homeRow: 7, homeRowSort: 'bogus', homeNewGames: true });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRow).toBe('recent');
        expect(store.get().homeRowSort).toBe('lastPlayed');
        expect('homeNewGames' in store.get()).toBe(false);
    });
    it('moves the row as Steam\'s Home does by default, and remembers Spotlight; junk reads as Steam\'s', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRowStyle).toBe('steam');
        await store.setHomeRowStyle('spotlight');
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().homeRowStyle).toBe('spotlight');
        await kv.set('settings', { homeRowStyle: 'bogus' });
        await reloaded.load();
        expect(reloaded.get().homeRowStyle).toBe('steam');
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

describe('statusAvatar (#9: your avatar in the status bar instead of the dot)', () => {
    it('is off by default and remembers its setting', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().statusAvatar).toBe(false);
        await store.setStatusAvatar(true);
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().statusAvatar).toBe(true);
    });
});

describe('screensaver settings', () => {
    it('persists a change and leaves the other options alone', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        await store.setScreensaver({ logo: false });
        expect(store.get().screensaver).toEqual({ enabled: true, logo: false, statusBar: true, stats: true });
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().screensaver).toEqual({ enabled: true, logo: false, statusBar: true, stats: true });
    });
});

describe('settings survive a return to an older version', () => {
    it('preserves future fields and unsupported values while changing a known setting', async () => {
        const kv = memoryKv();
        await kv.set('settings', { homeRowStyle: 'future-style', future: { mode: 2 }, screensaver: { logo: 'future-mode', future: 7 } });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRowStyle).toBe('steam');
        expect(store.get().screensaver.logo).toBe(true);
        await store.setEnabled(false);
        await store.setScreensaver({ stats: false });
        expect(await kv.get('settings')).toMatchObject({ enabled: false, homeRowStyle: 'future-style', future: { mode: 2 }, screensaver: { logo: 'future-mode', future: 7, stats: false } });
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().enabled).toBe(false);
        await reloaded.setHomeRowStyle('steam');
        expect(await kv.get('settings')).toMatchObject({ homeRowStyle: 'steam', future: { mode: 2 }, screensaver: { future: 7 } });
    });
    it('recovers from non-object payloads without storing array indices', async () => {
        for (const raw of [null, 42, 'bad', [1, 2]]) {
            const kv = memoryKv();
            await kv.set('settings', raw);
            const store = createSettingsStore(kv);
            await store.load();
            await store.setEnabled(false);
            expect(await kv.get('settings')).toMatchObject({ enabled: false });
            expect(await kv.get('settings')).not.toHaveProperty('0');
        }
    });
});
