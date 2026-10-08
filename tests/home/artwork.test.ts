import { afterEach, describe, expect, it } from 'vitest';
import { browserStores, capsuleUrls, getGameLogoUrls, guessedHeroUrls, guessedLogoUrls, heroUrls, landscapeUrls, logoUrls, SteamStores } from '../../src/home/artwork';
import { noteDetails, resetDetailsMemo } from '../../src/home/detailsMemo';

const stores: SteamStores = {
    details: () => ({ libraryAssets: { strHeroImage: 'hero.jpg' } }),
    overview: () => ({ header_filename: 'header.jpg', library_capsule_filename: 'capsule.jpg' }),
};
const base = 'https://steamloopback.host/assets/42';

describe('heroUrls', () => {
    it('puts strHeroImage first then header then capsule', () => {
        expect(heroUrls(42, stores)).toEqual([`${base}/hero.jpg`, `${base}/header.jpg`, `${base}/capsule.jpg`]);
    });

    it('survives a store that throws and returns []', () => {
        const boom = () => { throw new Error('nope'); };
        expect(heroUrls(42, { details: boom, overview: boom })).toEqual([]);
    });
});

describe('capsuleUrls', () => {
    it('prefers the capsule over the header', () => {
        expect(capsuleUrls(42, stores)).toEqual([`${base}/capsule.jpg`, `${base}/header.jpg`]);
    });
});

describe('custom (SteamGridDB) hero and portrait art', () => {
    const host = 'https://steamloopback.host';
    // Shapes probed on the Ally: appStore.GetCustomHeroImageURLs / GetCustomVerticalCapsuleURLs(overview).
    const custom: SteamStores = {
        ...stores,
        customHero: () => ['/customimages/42_hero.jpg?v=1', '/customimages/42_hero.png?v=1'],
        customCapsule: () => ['/customimages/42p.jpg?v=1', '/customimages/42p.png?v=1'],
    };

    it('lists the custom hero first, made absolute, then the asset paths', () => {
        expect(heroUrls(42, custom)).toEqual([
            `${host}/customimages/42_hero.jpg?v=1`,
            `${host}/customimages/42_hero.png?v=1`,
            `${base}/hero.jpg`,
            `${base}/header.jpg`,
            `${base}/capsule.jpg`,
        ]);
    });

    it('lists the custom portrait capsule first, made absolute, then the asset paths', () => {
        expect(capsuleUrls(42, custom)).toEqual([
            `${host}/customimages/42p.jpg?v=1`,
            `${host}/customimages/42p.png?v=1`,
            `${base}/capsule.jpg`,
            `${base}/header.jpg`,
        ]);
    });

    it('keeps the old order when Steam lists no custom art (an empty list)', () => {
        const none: SteamStores = { ...stores, customHero: () => [], customCapsule: () => [] };
        expect(heroUrls(42, none)).toEqual([`${base}/hero.jpg`, `${base}/header.jpg`, `${base}/capsule.jpg`]);
        expect(capsuleUrls(42, none)).toEqual([`${base}/capsule.jpg`, `${base}/header.jpg`]);
    });

    it('skips a missing, throwing or non-array helper and garbage entries', () => {
        const boom = () => { throw new Error('nope'); };
        const expectedHero = [`${base}/hero.jpg`, `${base}/header.jpg`, `${base}/capsule.jpg`];
        const expectedCap = [`${base}/capsule.jpg`, `${base}/header.jpg`];
        const bads: unknown[] = [undefined, null, 7, '/customimages/42p.png', { length: 1 }];
        for (const bad of bads) {
            const s: SteamStores = { ...stores, customHero: () => bad as string[], customCapsule: () => bad as string[] };
            expect(heroUrls(42, s)).toEqual(expectedHero);
            expect(capsuleUrls(42, s)).toEqual(expectedCap);
        }
        expect(heroUrls(42, { ...stores, customHero: boom, customCapsule: boom })).toEqual(expectedHero);
        expect(capsuleUrls(42, { ...stores, customHero: boom, customCapsule: boom })).toEqual(expectedCap);
        const garbage: SteamStores = { ...stores, customHero: () => ['', 7 as unknown as string, '/customimages/42_hero.png'] };
        expect(heroUrls(42, garbage)[0]).toBe(`${host}/customimages/42_hero.png`);
        expect(heroUrls(42, garbage)).toHaveLength(4);
    });

    it('a shortcut without assets still gets its custom art', () => {
        const shortcut: SteamStores = { details: () => undefined, overview: () => ({}), customHero: () => ['/customimages/9_hero.png'], customCapsule: () => ['/customimages/9p.png'] };
        expect(heroUrls(9, shortcut)).toEqual([`${host}/customimages/9_hero.png`]);
        expect(capsuleUrls(9, shortcut)).toEqual([`${host}/customimages/9p.png`]);
    });
});

describe('landscapeUrls', () => {
    const host = 'https://steamloopback.host';
    it("uses Steam's own landscape list (custom art first), made absolute, local files only when any exist", () => {
        // Shape probed on the Ally (appDetailsStore.GetHeaderImages) for a game with SteamGridDB art.
        const withHelper: SteamStores = {
            ...stores,
            landscape: () => [
                '/customimages/42.jpg?v=1',
                '/customimages/42.png?v=1',
                '/assets/42/header.jpg?c=7',
                '/assets/42_header.jpg?c=7',
                'https://shared.steamstatic.com/store_item_assets/steam/apps/42/header.jpg?t=1',
            ],
        };
        expect(landscapeUrls(42, withHelper)).toEqual([
            `${host}/customimages/42.jpg?v=1`,
            `${host}/customimages/42.png?v=1`,
            `${host}/assets/42/header.jpg?c=7`,
            `${host}/assets/42_header.jpg?c=7`,
        ]);
    });

    it('keeps a remote url only when Steam lists nothing local', () => {
        const remote = 'https://shared.steamstatic.com/store_item_assets/steam/apps/42/header.jpg?t=1';
        expect(landscapeUrls(42, { ...stores, landscape: () => [remote] })).toEqual([remote]);
    });

    it('falls back to the library header asset, then header_filename, when the helper is missing, empty or throws', () => {
        const details = () => ({ libraryAssets: { strHeroImage: 'hero.jpg', strHeaderImage: 'lib_header.jpg' } });
        expect(landscapeUrls(42, { ...stores, details })).toEqual([`${base}/lib_header.jpg`, `${base}/header.jpg`]);
        expect(landscapeUrls(42, { ...stores, details, landscape: () => [] })).toEqual([`${base}/lib_header.jpg`, `${base}/header.jpg`]);
        const boom = () => { throw new Error('nope'); };
        expect(landscapeUrls(42, { ...stores, landscape: boom })).toEqual([`${base}/header.jpg`]);
        expect(landscapeUrls(42, { details: boom, overview: boom, landscape: boom })).toEqual([]);
    });

    it('treats a non-array helper result as empty and still falls back to the header asset and header_filename', () => {
        const details = () => ({ libraryAssets: { strHeroImage: 'hero.jpg', strHeaderImage: 'lib_header.jpg' } });
        const expected = [`${base}/lib_header.jpg`, `${base}/header.jpg`];
        for (const bad of [{ length: 2 }, '/customimages/42.png', null, 7]) {
            expect(landscapeUrls(42, { ...stores, details, landscape: () => bad as unknown as string[] })).toEqual(expected);
        }
    });

    it('ignores garbage entries from the helper', () => {
        expect(landscapeUrls(42, { ...stores, landscape: () => ['', 7 as unknown as string, '/assets/42/h.jpg'] })).toEqual([`${host}/assets/42/h.jpg`]);
    });
});

describe('a Steam game whose hero file name is not known yet (Reddit: zoomed capsule after the first 4 games)', () => {
    const noDetails: SteamStores = { details: () => undefined, overview: () => ({ header_filename: 'header.jpg', library_capsule_filename: 'capsule.jpg', app_type: 1 }) };

    it('tries the unhashed local hero, then Steam\'s image server, before the header and capsule', () => {
        expect(guessedHeroUrls(42)).toEqual([`${base}/library_hero.jpg`, 'https://shared.steamstatic.com/store_item_assets/steam/apps/42/library_hero.jpg']);
        expect(heroUrls(42, noDetails)).toEqual([...guessedHeroUrls(42), `${base}/header.jpg`, `${base}/capsule.jpg`]);
    });
    it('the known file name wins (no guesses), and shortcuts or non-games never get them', () => {
        expect(heroUrls(42, stores)).not.toContain(`${base}/library_hero.jpg`);
        const shortcut: SteamStores = { ...noDetails, overview: () => ({ header_filename: 'header.jpg', app_type: 1073741824 }) };
        expect(heroUrls(42, shortcut)).toEqual([`${base}/header.jpg`]);
        const unknown: SteamStores = { ...noDetails, overview: () => ({ header_filename: 'header.jpg' }) };
        expect(heroUrls(42, unknown)).toEqual([`${base}/header.jpg`]);
    });
});

describe('browserStores', () => {
    const g = globalThis as unknown as { appDetailsStore?: unknown };
    afterEach(() => {
        delete g.appDetailsStore;
        resetDetailsMemo();
    });

    it('uses the assets Steam\'s details callback sent when its store has none', () => {
        noteDetails(42, { libraryAssets: { strHeroImage: 'abc/library_hero.jpg' } });
        expect(browserStores.details(42)).toEqual({ libraryAssets: { strHeroImage: 'abc/library_hero.jpg' } });
        g.appDetailsStore = { GetAppDetails: () => ({ strDisplayName: 'G' }) };
        expect(browserStores.details(42)).toEqual({ strDisplayName: 'G', libraryAssets: { strHeroImage: 'abc/library_hero.jpg' } });
    });
    it('Steam\'s store wins when it has the assets', () => {
        noteDetails(42, { libraryAssets: { strHeroImage: 'old.jpg' } });
        g.appDetailsStore = { GetAppDetails: () => ({ libraryAssets: { strHeroImage: 'store.jpg' } }) };
        expect(browserStores.details(42)?.libraryAssets?.strHeroImage).toBe('store.jpg');
    });
    it('does not throw when Steam globals are absent', () => {
        expect(browserStores.details(42)).toBeUndefined();
        expect(browserStores.overview(42)).toBeUndefined();
        expect(browserStores.landscape?.(42)).toBeUndefined();
        expect(browserStores.customHero?.(42)).toBeUndefined();
        expect(browserStores.customCapsule?.(42)).toBeUndefined();
    });
});

describe('storeHeaderUrl', () => {
    it('Steam CDN header for a game not in the library; null for a broken id', async () => {
        const { storeHeaderUrl } = await import('../../src/home/artwork');
        expect(storeHeaderUrl(620)).toBe('https://shared.steamstatic.com/store_item_assets/steam/apps/620/header.jpg');
        expect(storeHeaderUrl(0)).toBeNull();
        expect(storeHeaderUrl(1.5)).toBeNull();
    });
});

describe('logoUrls', () => {
    const host = 'https://steamloopback.host';
    it('prefers custom logo, then libraryAsset strLogoImage, then guessed CDN urls', () => {
        const customLogo: SteamStores = {
            details: () => ({ libraryAssets: { strLogoImage: 'lib_logo.png' } }),
            overview: () => ({ app_type: 1 }),
            customLogo: () => ['/customimages/42_logo.png'],
        };
        expect(logoUrls(42, customLogo)).toEqual([
            `${host}/customimages/42_logo.png`,
            `${host}/assets/42/lib_logo.png`,
        ]);
    });

    it('falls back to guessed logo urls when no custom or library logo is known', () => {
        const noLogo: SteamStores = {
            details: () => undefined,
            overview: () => ({ app_type: 1 }),
        };
        expect(logoUrls(42, noLogo)).toEqual(guessedLogoUrls(42));
    });

    it('shortcuts or non-games with no logo get an empty list', () => {
        const shortcut: SteamStores = {
            details: () => undefined,
            overview: () => ({ app_type: 1073741824 }),
        };
        expect(logoUrls(42, shortcut)).toEqual([]);
    });
});

describe('getGameLogoUrls', () => {
    it('uses details and overview when provided', () => {
        const details = { libraryAssets: { strLogoImage: 'detail_logo.png' } };
        const overview = { app_type: 1 };
        const urls = getGameLogoUrls(42, overview, details);
        expect(urls[0]).toBe('https://steamloopback.host/assets/42/detail_logo.png');
    });

    it('returns empty list for appId 0', () => {
        expect(getGameLogoUrls(0)).toEqual([]);
    });
});

