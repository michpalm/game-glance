import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createSettingsStore } from '../../src/data/settings';
import { SCREENSAVER_DEFAULTS } from '../../src/screensaver/options';

describe('settings', () => {
    it('defaults to enabled and persists changes', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
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
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
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
        expect(reloaded.get()).toEqual({ enabled: true, autoPreload: false, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
    });
    it('keeps the other setting when one changes, including settings saved before this option existed', async () => {
        const kv = memoryKv();
        await kv.set('settings', { enabled: false });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get()).toEqual({ enabled: false, autoPreload: true, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
        await store.setAutoPreload(false);
        expect(store.get()).toEqual({ enabled: false, autoPreload: false, spotlightHome: false, wishlistDeals: false, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
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
        expect(store.get()).toEqual({ enabled: true, autoPreload: true, spotlightHome: true, wishlistDeals: true, cleanPage: false, homeStatusBar: true, statusAvatar: false, gameLogo: false, homeRow: 'recent', homeRowSort: 'lastPlayed', homeRowStyle: 'steam', homeGrayUninstalled: true, heroFit: 'fill', feedTabs: { news: true, friends: true, recommended: true }, screensaver: SCREENSAVER_DEFAULTS });
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
    it('fills the screen with the hero art by default, and remembers Fit; anything else reads as Fill', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().heroFit).toBe('fill');
        await store.setHeroFit('fit');
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().heroFit).toBe('fit');
        expect(await kv.get('settings')).toMatchObject({ heroFit: 'fit' });
        await kv.set('settings', { heroFit: 'whole' });
        await reloaded.load();
        expect(reloaded.get().heroFit).toBe('fill');
    });
    it('keeps an unknown stored hero fit when another setting changes (a newer version may add one)', async () => {
        const kv = memoryKv();
        await kv.set('settings', { heroFit: 'whole' });
        const store = createSettingsStore(kv);
        await store.load();
        await store.setCleanPage(true);
        expect(await kv.get('settings')).toMatchObject({ heroFit: 'whole', cleanPage: true });
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

describe('Minimal setting', () => {
    it('remembers Minimal across reloads while leaving the default Steam', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeRowStyle).toBe('steam');
        await store.setHomeRowStyle('minimal' as Parameters<typeof store.setHomeRowStyle>[0]);
        const other = createSettingsStore(kv);
        await other.load();
        expect(other.get().homeRowStyle).toBe('minimal');
    });
});

describe('settings: feed tabs', () => {
    it('shows every tab by default and remembers one turned off', async () => {
        const kv = memoryKv();
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().feedTabs).toEqual({ news: true, friends: true, recommended: true });
        await store.setFeedTab('friends', false);
        expect(store.get().feedTabs).toEqual({ news: true, friends: false, recommended: true });
        const reloaded = createSettingsStore(kv);
        await reloaded.load();
        expect(reloaded.get().feedTabs).toEqual({ news: true, friends: false, recommended: true });
    });
    it('reads a partly stored value field by field', async () => {
        const kv = memoryKv();
        await kv.set('settings', { feedTabs: { news: false } });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().feedTabs).toEqual({ news: false, friends: true, recommended: true });
    });
    it('keeps a newer version\'s unknown tab when a tab changes', async () => {
        const kv = memoryKv();
        await kv.set('settings', { feedTabs: { news: true, friends: true, recommended: true, later: false } });
        const store = createSettingsStore(kv);
        await store.load();
        await store.setFeedTab('friends', false);
        expect(await kv.get('settings')).toMatchObject({ feedTabs: { news: true, friends: false, recommended: true, later: false } });
    });
    it('keeps stored keys it does not know when a tab changes', async () => {
        const kv = memoryKv();
        await kv.set('settings', { futureKey: 1 });
        const store = createSettingsStore(kv);
        await store.load();
        await store.setFeedTab('news', false);
        expect(await kv.get('settings')).toMatchObject({ futureKey: 1, feedTabs: { news: false, friends: true, recommended: true } });
    });
});

describe('settings: gray out uninstalled games', () => {
    it('preserves the existing look for old settings and persists turning it off', async () => {
        const kv = memoryKv();
        await kv.set('settings', { spotlightHome: true, futurePreference: 'keep' });
        const store = createSettingsStore(kv);
        await store.load();
        expect(store.get().homeGrayUninstalled).toBe(true);
        const listener = vi.fn(); store.subscribe(listener);
        await store.setHomeGrayUninstalled(false);
        expect(listener).toHaveBeenCalledOnce();
        const reloaded = createSettingsStore(kv); await reloaded.load();
        expect(reloaded.get().homeGrayUninstalled).toBe(false);
        expect(await kv.get('settings')).toMatchObject({ futurePreference: 'keep', homeGrayUninstalled: false });
        await reloaded.setHomeGrayUninstalled(true);
        const again = createSettingsStore(kv); await again.load();
        expect(again.get().homeGrayUninstalled).toBe(true);
    });
    it('uses the existing enabled treatment for an invalid stored value', async () => {
        const kv = memoryKv(); await kv.set('settings', { homeGrayUninstalled: 'no' });
        const store = createSettingsStore(kv); await store.load();
        expect(store.get().homeGrayUninstalled).toBe(true);
    });
});
