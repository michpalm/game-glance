import { memoDetails, noteDetails } from './detailsMemo';

export interface SteamStores {
    details(appId: number): { libraryAssets?: { strHeroImage?: string; strHeaderImage?: string; strLogoImage?: string } } | undefined;
    overview(appId: number): { header_filename?: string; library_capsule_filename?: string; app_type?: number } | undefined;
    /** Steam's own landscape (header) art list for the app, custom art first; root-relative or absolute urls. */
    landscape?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) hero art, jpg then png; root-relative urls; [] without custom art. */
    customHero?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) portrait capsule art, jpg then png; root-relative urls; [] without custom art. */
    customCapsule?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) logo art, png; root-relative urls; [] without custom art. */
    customLogo?(appId: number): string[] | undefined;
}

const HOST = 'https://steamloopback.host';
const ASSETS = `${HOST}/assets`;

function guarded<T>(read: () => T | undefined): T | undefined {
    try {
        return read();
    } catch {
        return undefined; // store not loaded for this app
    }
}

/** Root-relative urls ("/customimages/...") resolve against Big Picture's origin. */
function absolute(url: string): string {
    return url.startsWith('/') && !url.startsWith('//') ? `${HOST}${url}` : url;
}

const isLocal = (url: string) => url.startsWith(`${HOST}/`);

/** A Steam url list helper's result: anything but an array (or a throwing helper) counts as empty; garbage dropped. */
function listed(read: () => unknown): string[] {
    const raw: unknown = guarded(read);
    return (Array.isArray(raw) ? raw : []).filter((u): u is string => typeof u === 'string' && u.length > 0).map(absolute);
}

/** Steam's app type for a game (not a shortcut, tool or mod). */
const GAME_APP_TYPE = 1;
const SHORTCUT_APP_TYPE = 1073741824;
const FIRST_SHORTCUT_APP_ID = 0x80000000;

function toAssetUrl(appId: number, path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/') && !path.startsWith('//')) return `${HOST}${path}`;
    return `${ASSETS}/${appId}/${path}`;
}

function toUrls(appId: number, paths: (string | undefined)[]): string[] {
    return paths.filter((p): p is string => typeof p === 'string' && p.length > 0).map((p) => toAssetUrl(appId, p));
}

function extractLogoPath(d: unknown): string | undefined {
    if (!d || typeof d !== 'object') return undefined;
    const obj = d as Record<string, unknown>;
    const assets = obj.libraryAssets as Record<string, unknown> | undefined;
    if (typeof assets?.strLogoImage === 'string' && assets.strLogoImage.length > 0) return assets.strLogoImage;
    if (typeof obj.strLogoImage === 'string' && obj.strLogoImage.length > 0) return obj.strLogoImage;
    if (typeof obj.strLogoURL === 'string' && obj.strLogoURL.length > 0) return obj.strLogoURL;
    if (typeof obj.logo_filename === 'string' && obj.logo_filename.length > 0) return obj.logo_filename;
    return undefined;
}

function getDomLogoUrl(): string | undefined {
    try {
        if (typeof document === 'undefined') return undefined;
        const img = document.querySelector(
            'div[class*="TitleImageContainer"] img, div[class*="titleImageContainer"] img, div[class*="TitleImage"] img, div[class*="BoxSizer"] img, img[class*="TitleImage"]'
        ) as HTMLImageElement | null;
        const src = img ? (img.currentSrc || img.src) : undefined;
        if (typeof src === 'string' && src.length > 0) {
            return src;
        }
    } catch {
        // ignore in non-browser or test environments
    }
    return undefined;
}

/**
 * Where a Steam game's library hero is when its hashed file name is unknown (no details from Steam yet): the old,
 * unhashed local path, then Steam's image server (the CDN pattern storeHeaderUrl uses). Only for Steam games: a
 * shortcut has no such art. Tried after everything known and before the blurred-capsule fallback.
 */
export function guessedHeroUrls(appId: number): string[] {
    return [`${ASSETS}/${appId}/library_hero.jpg`, `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`];
}

/**
 * Hero first: it is the widest. Custom (SteamGridDB) hero art first (`appStore.GetCustomHeroImageURLs`, probed on
 * the Ally: `/customimages/<id>_hero.jpg|.png`, listed whenever the game has any custom art, so a listed file may
 * not exist), then the library assets in their hashed folders. A Steam game whose hero file name is not known yet
 * gets guessedHeroUrls in its place.
 */
export function heroUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customHero?.(appId));
    const hero = guarded(() => stores.details(appId))?.libraryAssets?.strHeroImage;
    const overview = guarded(() => stores.overview(appId));
    const guessed = !hero && overview?.app_type === GAME_APP_TYPE ? guessedHeroUrls(appId) : [];
    return [...new Set([...custom, ...toUrls(appId, [hero]), ...guessed, ...toUrls(appId, [overview?.header_filename, overview?.library_capsule_filename])])];
}

/** Custom portrait art first (`appStore.GetCustomVerticalCapsuleURLs`: `/customimages/<id>p.jpg|.png`), then the assets. */
export function capsuleUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customCapsule?.(appId));
    const overview = guarded(() => stores.overview(appId));
    return [...new Set([...custom, ...toUrls(appId, [overview?.library_capsule_filename, overview?.header_filename])])];
}

/**
 * Wide (landscape) art for the expanded recents card: the image stock Home shows for its first Recently Played
 * game. Steam's own list first (`appDetailsStore.GetHeaderImages`, probed on the Ally: custom/SteamGridDB art
 * `/customimages/<id>.jpg|.png`, then the cached library header, then a CDN url); remote urls are kept only when
 * nothing local is listed, so no network fetch on every focus. Without the helper: the library header asset,
 * then `header_filename`. [] when nothing is known (the caller falls back to the hero).
 */
export function landscapeUrls(appId: number, stores: SteamStores): string[] {
    // Anything but an array (or a throwing helper) counts as an empty list, so the header fallbacks still apply.
    const all = listed(() => stores.landscape?.(appId));
    const local = all.filter(isLocal);
    const fromSteam = local.length > 0 ? local : all;
    if (fromSteam.length > 0) return [...new Set(fromSteam)];
    const header = guarded(() => stores.details(appId))?.libraryAssets?.strHeaderImage;
    const overview = guarded(() => stores.overview(appId));
    return [...new Set(toUrls(appId, [header, overview?.header_filename]))];
}

/**
 * Where a Steam game's library logo is when its hashed file name is unknown: the old,
 * unhashed local path, then Steam's CDN server.
 */
export function guessedLogoUrls(appId: number): string[] {
    return [
        `${ASSETS}/${appId}/logo.png`,
        `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/logo.png`,
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`,
    ];
}

/**
 * Custom (SteamGridDB) logo art first (`appStore.GetCustomLogoImageURLs`: `/customimages/<id>_logo.png`),
 * then any logo image Steam already rendered in the DOM, then the library assets in their hashed folders
 * (`strLogoImage`), then guessedLogoUrls for Steam games.
 */
export function logoUrls(appId: number, stores: SteamStores): string[] {
    const custom = listed(() => stores.customLogo?.(appId));
    const domLogo = getDomLogoUrl();
    const details = guarded(() => stores.details(appId));
    const logo = extractLogoPath(details);
    const overview = guarded(() => stores.overview(appId));
    const overviewLogo = typeof (overview as Record<string, unknown> | undefined)?.logo_filename === 'string'
        ? (overview as Record<string, unknown>).logo_filename as string
        : undefined;
    const isShortcut = (overview as { app_type?: number } | undefined)?.app_type === SHORTCUT_APP_TYPE || appId >= FIRST_SHORTCUT_APP_ID;
    const isGame = overview?.app_type === GAME_APP_TYPE || (overview?.app_type === undefined && !isShortcut);
    const guessed = !logo && isGame ? guessedLogoUrls(appId) : [];
    const directLogos = toUrls(appId, [logo, overviewLogo]);
    const domLogos = domLogo ? [domLogo] : [];
    return [...new Set([...custom, ...domLogos, ...directLogos, ...guessed])];
}

interface StoreGlobals {
    appDetailsStore?: {
        GetAppDetails?(appId: number): ReturnType<SteamStores['details']>;
        GetHeaderImages?(overview: unknown, want2x: boolean): string[] | undefined;
    };
    appStore?: {
        GetAppOverviewByAppID?(appId: number): ReturnType<SteamStores['overview']>;
        GetCustomHeroImageURLs?(overview: unknown): string[] | undefined;
        GetCustomVerticalCapsuleURLs?(overview: unknown): string[] | undefined;
        GetCustomLogoImageURLs?(overview: unknown): string[] | undefined;
    };
}

const globals = (): StoreGlobals => ((globalThis as unknown as StoreGlobals | undefined) ?? {});

export const browserStores: SteamStores = {
    // Steam's store when it has the game's assets; else what its details callback sent (detailsMemo).
    details: (id) => {
        const details = globals().appDetailsStore?.GetAppDetails?.(id);
        if (details?.libraryAssets) return details;
        const remembered = memoDetails(id);
        return remembered ? { ...details, libraryAssets: remembered } : details;
    },
    overview: (id) => globals().appStore?.GetAppOverviewByAppID?.(id),
    landscape: (id) => {
        const g = globals();
        const overview = g.appStore?.GetAppOverviewByAppID?.(id);
        return overview ? g.appDetailsStore?.GetHeaderImages?.(overview, false) : undefined;
    },
    customHero: (id) => {
        const store = globals().appStore;
        const overview = store?.GetAppOverviewByAppID?.(id);
        return overview ? store?.GetCustomHeroImageURLs?.(overview) : undefined;
    },
    customCapsule: (id) => {
        const store = globals().appStore;
        const overview = store?.GetAppOverviewByAppID?.(id);
        return overview ? store?.GetCustomVerticalCapsuleURLs?.(overview) : undefined;
    },
    customLogo: (id) => {
        const store = globals().appStore;
        const overview = store?.GetAppOverviewByAppID?.(id);
        return overview ? store?.GetCustomLogoImageURLs?.(overview) : undefined;
    },
};

/**
 * Resolves candidate logo URLs for a game, optionally given its overview and details objects.
 * Caches details in detailsMemo when provided.
 */
export function getGameLogoUrls(appId: number, overview?: unknown, details?: unknown): string[] {
    if (appId === 0) return [];
    if (details) {
        noteDetails(appId, details);
    }
    const stores: SteamStores = {
        ...browserStores,
        details: (id) => {
            if (id === appId && details) {
                const d = details as ReturnType<SteamStores['details']>;
                if (d?.libraryAssets) return d;
                const remembered = memoDetails(id);
                if (remembered) return { ...d, libraryAssets: remembered };
                const fromStore = browserStores.details(id);
                if (fromStore?.libraryAssets) return fromStore;
                return d;
            }
            return browserStores.details(id);
        },
        overview: (id) => {
            if (id === appId && overview) {
                return overview as ReturnType<SteamStores['overview']>;
            }
            return browserStores.overview(id);
        },
        customLogo: (id) => {
            if (id === appId && overview) {
                const store = globals().appStore;
                const custom = store?.GetCustomLogoImageURLs?.(overview);
                if (custom && custom.length > 0) return custom;
            }
            return browserStores.customLogo?.(id);
        },
    };
    const list = logoUrls(appId, stores);
    const isShortcut = (overview as { app_type?: number } | undefined)?.app_type === SHORTCUT_APP_TYPE || appId >= FIRST_SHORTCUT_APP_ID;
    if (appId > 0 && !isShortcut) {
        const cdnFallbacks: string[] = [];
        for (const u of list) {
            if (u.startsWith(`${ASSETS}/${appId}/`)) {
                const filename = u.slice(`${ASSETS}/${appId}/`.length);
                if (filename.length > 0) {
                    cdnFallbacks.push(`https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/${filename}`);
                    cdnFallbacks.push(`https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/${filename}`);
                }
            }
        }
        return [...new Set([...list, ...cdnFallbacks, ...guessedLogoUrls(appId)])];
    }
    return list;
}


/**
 * A game's store header on Steam's CDN (the url pattern Steam's own GetHeaderImages lists last, probed on the Ally),
 * for games with no local art: wishlist sales, which are not in the library. Only the Recommended tab's deal row
 * uses it, and only when Show wishlist deals is on (that feature already talks to the store).
 */
export function storeHeaderUrl(appId: number): string | null {
    return Number.isInteger(appId) && appId > 0 ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : null;
}
