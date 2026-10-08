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
};

type StoreGlobals = {
    collectionStore?: {
        localGamesCollection?: { allApps?: RawApp[] };
        allGamesCollection?: { allApps?: RawApp[] };
        favoriteGamesCollection?: { allApps?: RawApp[] };
        soundtracksCollection?: { allApps?: RawApp[] };
        musicCollection?: { allApps?: RawApp[] };
        userCollections?: Array<{ id?: string; name?: string; strName?: string; allApps?: RawApp[]; apps?: RawApp[] }>;
        m_mapCollections?: Map<string, { id?: string; name?: string; strName?: string; allApps?: RawApp[]; apps?: RawApp[] }>;
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

    const cleanList = (list: RawApp[] | undefined | null): RawApp[] => {
        if (!Array.isArray(list)) return [];
        return list.filter((a) => a && typeof a.appid === 'number' && a.appid > 0 && !isHidden(a.appid));
    };

    const installed = cleanList(cStore?.localGamesCollection?.allApps);
    const all = cleanList(cStore?.allGamesCollection?.allApps ?? aStore?.allApps);

    // Favorites
    let favorites: RawApp[] = [];
    if (cStore?.favoriteGamesCollection?.allApps) {
        favorites = cleanList(cStore.favoriteGamesCollection.allApps);
    } else if (cStore?.BIsFavorite && all.length > 0) {
        favorites = all.filter((a) => {
            try {
                return cStore.BIsFavorite?.(a) === true;
            } catch {
                return false;
            }
        });
    }

    // Shortcuts / Non-Steam
    const shortcuts = all.filter((a) => {
        const isShortcut = a.app_type === SHORTCUT_APP_TYPE || a.appid >= 0x80000000;
        return isShortcut;
    });

    // Soundtracks (app_type === 8 or musicCollection)
    const musicCollectionApps = cleanList(
        cStore?.musicCollection?.allApps ?? cStore?.soundtracksCollection?.allApps
    );
    const ostApps = all.filter((a) => a.app_type === 8 || Boolean(a.app_type && (a.app_type & 8) !== 0));
    const soundtrackSeen = new Set<number>();
    const soundtracks: RawApp[] = [];
    for (const item of [...ostApps, ...musicCollectionApps]) {
        if (!soundtrackSeen.has(item.appid)) {
            soundtrackSeen.add(item.appid);
            soundtracks.push(item);
        }
    }

    // User collections
    const userCols: Array<{ id: string; name: string; apps: RawApp[] }> = [];
    try {
        const rawCols = cStore?.userCollections ?? (cStore?.m_mapCollections ? Array.from(cStore.m_mapCollections.values()) : []);
        if (Array.isArray(rawCols)) {
            for (const col of rawCols) {
                const name = col.name ?? col.strName;
                const id = col.id ?? name;
                const apps = cleanList(col.allApps ?? col.apps);
                if (name && apps.length > 0) {
                    userCols.push({ id: String(id), name: String(name), apps });
                }
            }
        }
    } catch {
        // ignore
    }

    return {
        installed,
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

    const { installed, all, favorites, shortcuts, soundtracks, userCollections, runningAppIds } = readRawApps();

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
    const regularAll = all.filter((a) => !isOst(a));
    const regularFavorites = favorites.filter((a) => !isOst(a));
    const regularShortcuts = shortcuts.filter((a) => !isOst(a));

    const categories: LibraryCategory[] = [
        { id: 'installed', name: 'INSTALLED', count: regularInstalled.length, games: toItems(regularInstalled) },
        { id: 'all', name: 'ALL GAMES', count: regularAll.length, games: toItems(regularAll) },
        { id: 'favorites', name: 'FAVORITES', count: regularFavorites.length, games: toItems(regularFavorites) },
        { id: 'non-steam', name: 'NON-STEAM', count: regularShortcuts.length, games: toItems(regularShortcuts) },
    ];

    if (soundtracks.length > 0) {
        categories.push({
            id: 'soundtracks',
            name: 'SOUNDTRACKS',
            count: soundtracks.length,
            games: toItems(soundtracks),
        });
    }

    for (const uc of userCollections) {
        const games = toItems(uc.apps);
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
