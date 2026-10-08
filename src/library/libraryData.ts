import { SHORTCUT_APP_TYPE } from '../data/installedGames';
import { readGameInfo } from '../data/steam';
import { HeroicRef, heroicStoreLabel } from '../logic/heroic';

export interface LibraryGameItem {
    appId: number;
    name: string;
    isShortcut: boolean;
    isSoundtrack?: boolean;
    gameId?: string; // 64-bit shortcut ID
    installed: boolean;
    running: boolean;
    playedMinutes: number;
    achievements: { achieved: number; total: number } | null;
    heroic: HeroicRef | null;
    source: string;
    accent?: string;
    lastPlayed?: number;
    sizeOnDisk?: number;
    // Pre-filled URLs if known (e.g. mock data or fast paths)
    capsuleUrl?: string;
    landscapeUrl?: string;
    heroUrl?: string;
    logoUrl?: string;
    description?: string;
}

export interface LibraryCategory {
    id: string;
    name: string;
    count: number;
    games: LibraryGameItem[];
}

type RawApp = {
    appid: number;
    display_name?: string;
    app_type?: number;
    installed?: boolean;
    m_gameid?: string;
    minutes_playtime_forever?: number;
    rt_last_time_played?: number;
    size_on_disk?: string | number;
    steam_deck_compat_category?: number;
    is_shortcut?: boolean;
};

type StoreGlobals = {
    collectionStore?: {
        localGamesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        allGamesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        favoriteGamesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        favoritesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        deckGamesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        deckDesktopApps?: { allApps?: unknown[]; apps?: unknown[] };
        soundtracksCollection?: { allApps?: unknown[]; apps?: unknown[] };
        musicCollection?: { allApps?: unknown[]; apps?: unknown[] };
        userCollections?: unknown;
        m_mapCollections?: unknown;
        collections?: unknown;
        GetUserCollections?(): unknown;
        GetCollections?(): unknown;
        BIsFavorite?(app: unknown): boolean;
        BIsHidden?(appId: number): boolean;
    };
    appStore?: {
        GetAppOverviewByAppID?(appId: number): (RawApp & Record<string, unknown>) | undefined | null;
        allApps?: RawApp[];
    };
    appDetailsStore?: {
        GetAppDetails?(appId: number): unknown;
    };
    SteamUIStore?: {
        RunningApps?: Array<{ appid?: number }>;
        MainRunningAppID?: number;
    };
};

const steam = () => globalThis as unknown as StoreGlobals;

export function readRawApps(): {
    installed: RawApp[];
    deckCompat: RawApp[];
    all: RawApp[];
    favorites: RawApp[];
    shortcuts: RawApp[];
    soundtracks: RawApp[];
    userCollections: Array<{ id: string; name: string; apps: RawApp[] }>;
    runningAppIds: Set<number>;
} {
    const s = steam();
    const cStore = s.collectionStore;
    const aStore = s.appStore;
    const running = new Set<number>();
    try {
        const runningList = s.SteamUIStore?.RunningApps;
        if (Array.isArray(runningList)) {
            for (const r of runningList) {
                if (typeof r?.appid === 'number') running.add(r.appid);
            }
        }
        if (typeof s.SteamUIStore?.MainRunningAppID === 'number') {
            running.add(s.SteamUIStore.MainRunningAppID);
        }
    } catch {
        // ignore
    }

    const isHidden = (appId: number) => {
        try {
            return cStore?.BIsHidden?.(appId) === true;
        } catch {
            return false;
        }
    };

    // Build comprehensive map of all known apps across stores
    const allAppsMap = new Map<number, RawApp>();
    const registerApp = (app: unknown) => {
        if (!app || typeof app !== 'object') return;
        const a = app as RawApp;
        if (typeof a.appid === 'number' && a.appid > 0 && !isHidden(a.appid)) {
            if (!allAppsMap.has(a.appid)) {
                allAppsMap.set(a.appid, a);
            } else {
                allAppsMap.set(a.appid, { ...allAppsMap.get(a.appid)!, ...a });
            }
        }
    };

    if (Array.isArray(aStore?.allApps)) {
        for (const a of aStore.allApps) registerApp(a);
    }
    const cAllApps = cStore?.allGamesCollection?.allApps ?? cStore?.allGamesCollection?.apps;
    if (Array.isArray(cAllApps)) {
        for (const a of cAllApps) registerApp(a);
    }
    const cLocalApps = cStore?.localGamesCollection?.allApps ?? cStore?.localGamesCollection?.apps;
    if (Array.isArray(cLocalApps)) {
        for (const a of cLocalApps) registerApp(a);
    }

    // Helper to safely extract RawApp array from any collection representation
    // Steam collections can store: RawApp[], appid numbers, Sets of numbers, or methods
    const extractCollectionApps = (col: unknown): RawApp[] => {
        if (!col) return [];
        const c = col as Record<string, unknown>;
        let rawItems: unknown[] = [];

        if (Array.isArray(c.allApps)) rawItems = c.allApps;
        else if (Array.isArray(c.apps)) rawItems = c.apps;
        else if (Array.isArray(c.visibleApps)) rawItems = c.visibleApps;
        else if (typeof c.GetApps === 'function') {
            try {
                const res = (c.GetApps as () => unknown)();
                if (Array.isArray(res)) rawItems = res;
            } catch {}
        } else if (c.allApps && typeof (c.allApps as any)[Symbol.iterator] === 'function') {
            try { rawItems = Array.from(c.allApps as any); } catch {}
        } else if (c.apps && typeof (c.apps as any)[Symbol.iterator] === 'function') {
            try { rawItems = Array.from(c.apps as any); } catch {}
        } else if (c.m_setAppIDs && typeof (c.m_setAppIDs as any)[Symbol.iterator] === 'function') {
            try { rawItems = Array.from(c.m_setAppIDs as any); } catch {}
        }

        const list: RawApp[] = [];
        const seen = new Set<number>();
        for (const item of rawItems) {
            if (!item) continue;
            let id: number | undefined;
            let obj: RawApp | undefined;
            if (typeof item === 'number') {
                id = item;
            } else if (typeof item === 'object') {
                const rec = item as Record<string, unknown>;
                id = typeof rec.appid === 'number' ? rec.appid : typeof rec.m_appid === 'number' ? rec.m_appid : undefined;
                obj = item as RawApp;
            }

            if (typeof id === 'number' && id > 0 && !seen.has(id) && !isHidden(id)) {
                seen.add(id);
                const known = allAppsMap.get(id);
                if (known) {
                    list.push(known);
                } else if (obj) {
                    list.push(obj);
                    allAppsMap.set(id, obj);
                } else {
                    const fallback: RawApp = { appid: id, display_name: `App ${id}` };
                    list.push(fallback);
                    allAppsMap.set(id, fallback);
                }
            }
        }
        return list;
    };

    // Installed apps
    const installed = extractCollectionApps(cStore?.localGamesCollection);
    if (installed.length === 0) {
        // Fallback: check installed flag on allAppsMap
        for (const a of allAppsMap.values()) {
            if (a.installed) installed.push(a);
        }
    }

    // All apps
    const all = Array.from(allAppsMap.values());

    // Favorites
    let favorites = extractCollectionApps(cStore?.favoriteGamesCollection ?? cStore?.favoritesCollection);
    if (favorites.length === 0 && cStore?.BIsFavorite) {
        for (const a of allAppsMap.values()) {
            try {
                if (cStore.BIsFavorite(a) || cStore.BIsFavorite(a.appid)) {
                    favorites.push(a);
                }
            } catch {}
        }
    }

    // Steam Deck Compatible ("GREAT ON DECK")
    const deckApps = extractCollectionApps(cStore?.deckGamesCollection ?? cStore?.deckDesktopApps);
    const deckSeen = new Set<number>(deckApps.map((a) => a.appid));
    const deckCompat: RawApp[] = [...deckApps];
    for (const a of allAppsMap.values()) {
        if (deckSeen.has(a.appid)) continue;
        const overview = s.appStore?.GetAppOverviewByAppID?.(a.appid) as (RawApp & { steam_deck_compat_category?: number }) | undefined;
        const cat = overview?.steam_deck_compat_category ?? a.steam_deck_compat_category;
        // 3 = Verified, 2 = Playable
        if (cat === 3 || cat === 2) {
            deckSeen.add(a.appid);
            deckCompat.push(a);
        }
    }

    // Shortcuts / Non-Steam
    const shortcuts: RawApp[] = [];
    for (const a of allAppsMap.values()) {
        const overview = s.appStore?.GetAppOverviewByAppID?.(a.appid);
        const isShortcut =
            a.app_type === SHORTCUT_APP_TYPE ||
            a.appid >= 0x80000000 ||
            a.appid < 0 ||
            overview?.is_shortcut === true ||
            a.is_shortcut === true ||
            (typeof a.m_gameid === 'string' && a.m_gameid.length > 0 && a.m_gameid !== String(a.appid));
        if (isShortcut) {
            shortcuts.push(a);
        }
    }

    // Soundtracks
    const musicCollectionApps = extractCollectionApps(cStore?.musicCollection ?? cStore?.soundtracksCollection);
    const ostSeen = new Set<number>(musicCollectionApps.map((a) => a.appid));
    const soundtracks: RawApp[] = [...musicCollectionApps];
    for (const a of allAppsMap.values()) {
        if (ostSeen.has(a.appid)) continue;
        const overview = s.appStore?.GetAppOverviewByAppID?.(a.appid);
        const isOst =
            a.app_type === 8 ||
            Boolean(a.app_type && (a.app_type & 8) !== 0) ||
            overview?.app_type === 8;
        if (isOst) {
            ostSeen.add(a.appid);
            soundtracks.push(a);
        }
    }

    // User Collections
    const userCols: Array<{ id: string; name: string; apps: RawApp[] }> = [];
    const rawColsList: unknown[] = [];
    try {
        const uCols = cStore?.userCollections;
        if (Array.isArray(uCols)) {
            rawColsList.push(...uCols);
        } else if (uCols && typeof (uCols as any)[Symbol.iterator] === 'function') {
            rawColsList.push(...Array.from(uCols as any));
        }

        const mapCols = cStore?.m_mapCollections;
        if (mapCols) {
            if (typeof (mapCols as any).values === 'function') {
                try { rawColsList.push(...Array.from((mapCols as any).values())); } catch {}
            } else if (typeof mapCols === 'object') {
                rawColsList.push(...Object.values(mapCols as Record<string, unknown>));
            }
        }

        const colsArray = cStore?.collections;
        if (Array.isArray(colsArray)) {
            rawColsList.push(...colsArray);
        }

        if (typeof cStore?.GetUserCollections === 'function') {
            try {
                const res = cStore.GetUserCollections();
                if (Array.isArray(res)) rawColsList.push(...res);
            } catch {}
        }
        if (typeof cStore?.GetCollections === 'function') {
            try {
                const res = cStore.GetCollections();
                if (Array.isArray(res)) rawColsList.push(...res);
            } catch {}
        }
    } catch {
        // ignore
    }

    const seenColIds = new Set<string>();
    for (const c of rawColsList) {
        if (!c || typeof c !== 'object') continue;
        const col = c as Record<string, unknown>;
        const name = (col.name ?? col.strName ?? col.m_strName ?? col.label ?? col.title) as string | undefined;
        const id = String(col.id ?? col.m_strId ?? name ?? '');
        if (!name || seenColIds.has(id)) continue;

        // Skip internal/system collections if they match installed/all/favorites/etc.
        const lower = name.toLowerCase();
        if (lower === 'installed' || lower === 'all games' || lower === 'favorites' || lower === 'soundtracks' || lower === 'music') {
            continue;
        }

        const apps = extractCollectionApps(col);
        if (apps.length > 0) {
            seenColIds.add(id);
            userCols.push({ id, name, apps });
        }
    }

    return {
        installed,
        deckCompat,
        all,
        favorites,
        shortcuts,
        soundtracks,
        userCollections: userCols,
        runningAppIds: running,
    };
}

export function rawAppToItem(app: RawApp, isRunning: boolean): LibraryGameItem {
    const s = steam();
    const overview = s.appStore?.GetAppOverviewByAppID?.(app.appid) ?? app;
    const details = s.appDetailsStore?.GetAppDetails?.(app.appid);
    const info = readGameInfo(overview, details);
    const isSoundtrack =
        app.app_type === 8 ||
        Boolean(app.app_type && (app.app_type & 8) !== 0) ||
        (overview as { app_type?: number } | undefined)?.app_type === 8;
    const source = isSoundtrack
        ? 'Soundtrack'
        : !info.isShortcut
            ? 'Steam'
            : heroicStoreLabel(info.heroic) ?? 'Non-Steam';
    const size = typeof app.size_on_disk === 'number' ? app.size_on_disk : Number(app.size_on_disk) || undefined;

    return {
        appId: app.appid,
        name: info.name || app.display_name || `App ${app.appid}`,
        isShortcut: info.isShortcut,
        isSoundtrack,
        gameId: app.m_gameid,
        installed: app.installed ?? true,
        running: isRunning,
        playedMinutes: info.playedMinutes,
        achievements: isSoundtrack ? null : info.achievements,
        heroic: info.heroic,
        source,
        lastPlayed: app.rt_last_time_played,
        sizeOnDisk: size,
    };
}

export function buildCategories(mockGames?: LibraryGameItem[]): LibraryCategory[] {
    if (mockGames && mockGames.length > 0) {
        // Playground mock categories: regular games in game tabs, soundtracks in SOUNDTRACKS
        const regularGames = mockGames.filter((g) => !g.isSoundtrack);
        const soundtracks = mockGames.filter((g) => g.isSoundtrack);
        const baseCategories: LibraryCategory[] = [
            { id: 'installed', name: 'INSTALLED', count: regularGames.length, games: regularGames },
            { id: 'great-on-deck', name: 'GREAT ON DECK', count: regularGames.slice(0, 3).length, games: regularGames.slice(0, 3) },
            { id: 'all', name: 'ALL GAMES', count: regularGames.length, games: regularGames },
            { id: 'favorites', name: 'FAVORITES', count: regularGames.filter((g) => g.playedMinutes > 3000).length, games: regularGames.filter((g) => g.playedMinutes > 3000) },
            { id: 'non-steam', name: 'NON-STEAM', count: regularGames.filter((g) => g.isShortcut).length, games: regularGames.filter((g) => g.isShortcut) },
        ];
        if (soundtracks.length > 0) {
            baseCategories.push({ id: 'soundtracks', name: 'SOUNDTRACKS', count: soundtracks.length, games: soundtracks });
        }
        baseCategories.push({
            id: 'rpg',
            name: 'RPG',
            count: regularGames.filter((g) => g.name.includes('Witcher') || g.name.includes('Cyberpunk') || g.name.includes('Echoes')).length,
            games: regularGames.filter((g) => g.name.includes('Witcher') || g.name.includes('Cyberpunk') || g.name.includes('Echoes')),
        });
        return baseCategories;
    }

    const { installed, deckCompat, all, favorites, shortcuts, soundtracks, userCollections, runningAppIds } = readRawApps();

    const toItems = (apps: RawApp[]): LibraryGameItem[] => {
        // Deduplicate by appid and sort alphabetically by name
        const seen = new Set<number>();
        const list: LibraryGameItem[] = [];
        for (const app of apps) {
            if (!seen.has(app.appid)) {
                seen.add(app.appid);
                list.push(rawAppToItem(app, runningAppIds.has(app.appid)));
            }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    };

    const isOst = (app: RawApp) => app.app_type === 8 || Boolean(app.app_type && (app.app_type & 8) !== 0);
    const regularInstalled = installed.filter((a) => !isOst(a));
    const regularDeckCompat = deckCompat.filter((a) => !isOst(a));
    const regularAll = all.filter((a) => !isOst(a));
    const regularFavorites = favorites.filter((a) => !isOst(a));
    const regularShortcuts = shortcuts.filter((a) => !isOst(a));

    const categories: LibraryCategory[] = [
        { id: 'installed', name: 'INSTALLED', count: regularInstalled.length, games: toItems(regularInstalled) },
    ];

    if (regularDeckCompat.length > 0) {
        categories.push({ id: 'great-on-deck', name: 'GREAT ON DECK', count: regularDeckCompat.length, games: toItems(regularDeckCompat) });
    }

    categories.push({ id: 'all', name: 'ALL GAMES', count: regularAll.length, games: toItems(regularAll) });

    if (regularFavorites.length > 0) {
        categories.push({ id: 'favorites', name: 'FAVORITES', count: regularFavorites.length, games: toItems(regularFavorites) });
    }

    if (regularShortcuts.length > 0) {
        categories.push({ id: 'non-steam', name: 'NON-STEAM', count: regularShortcuts.length, games: toItems(regularShortcuts) });
    }

    if (soundtracks.length > 0) {
        categories.push({
            id: 'soundtracks',
            name: 'SOUNDTRACKS',
            count: soundtracks.length,
            games: toItems(soundtracks),
        });
    }

    for (const uc of userCollections) {
        const regularUcApps = uc.apps.filter((a) => !isOst(a));
        const games = toItems(regularUcApps);
        if (games.length > 0) {
            categories.push({
                id: `col-${uc.id}`,
                name: uc.name.toUpperCase(),
                count: games.length,
                games,
            });
        }
    }

    return categories.filter((c) => c.games.length > 0 || c.id === 'installed' || c.id === 'all');
}
