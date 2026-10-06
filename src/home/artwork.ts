import { memoDetails } from './detailsMemo';

export interface SteamStores {
    details(appId: number): { libraryAssets?: { strHeroImage?: string; strHeaderImage?: string } } | undefined;
    overview(appId: number): { header_filename?: string; library_capsule_filename?: string; app_type?: number } | undefined;
    /** Steam's own landscape (header) art list for the app, custom art first; root-relative or absolute urls. */
    landscape?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) hero art, jpg then png; root-relative urls; [] without custom art. */
    customHero?(appId: number): string[] | undefined;
    /** Custom (SteamGridDB) portrait capsule art, jpg then png; root-relative urls; [] without custom art. */
    customCapsule?(appId: number): string[] | undefined;
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

function toUrls(appId: number, paths: (string | undefined)[]): string[] {
    return paths.filter((p): p is string => typeof p === 'string' && p.length > 0).map((p) => `${ASSETS}/${appId}/${p}`);
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

interface StoreGlobals {
    appDetailsStore?: {
        GetAppDetails?(appId: number): ReturnType<SteamStores['details']>;
        GetHeaderImages?(overview: unknown, want2x: boolean): string[] | undefined;
    };
    appStore?: {
        GetAppOverviewByAppID?(appId: number): ReturnType<SteamStores['overview']>;
        GetCustomHeroImageURLs?(overview: unknown): string[] | undefined;
        GetCustomVerticalCapsuleURLs?(overview: unknown): string[] | undefined;
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
};

/**
 * A game's store header on Steam's CDN (the url pattern Steam's own GetHeaderImages lists last, probed on the Ally),
 * for games with no local art: wishlist sales, which are not in the library. Only the Recommended tab's deal row
 * uses it, and only when Show wishlist deals is on (that feature already talks to the store).
 */
export function storeHeaderUrl(appId: number): string | null {
    return Number.isInteger(appId) && appId > 0 ? `https://shared.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg` : null;
}
