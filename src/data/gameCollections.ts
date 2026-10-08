/**
 * Resolves user collections that a game belongs to from Steam's collectionStore.
 * Non-disruptive: returns an empty array when a game has no collections or when
 * collection data is unavailable.
 */

type StoreGlobals = {
    collectionStore?: {
        userCollections?: unknown[];
        m_mapCollections?: unknown;
        collections?: unknown[];
        GetUserCollections?: () => unknown[];
        GetCollections?: () => unknown[];
        GetCollectionsForApp?: (appId: number) => unknown[];
        favoriteGamesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        favoritesCollection?: { allApps?: unknown[]; apps?: unknown[] };
        BIsFavorite?: (appId: number | { appid: number }) => boolean;
    };
};

function steam(): StoreGlobals {
    return (typeof window !== 'undefined' ? window : globalThis) as unknown as StoreGlobals;
}

function collectionContainsApp(col: unknown, appId: number): boolean {
    if (!col || typeof col !== 'object') return false;
    const c = col as Record<string, unknown>;

    // 1. Direct contains check
    if (typeof c.BContainsApp === 'function') {
        try {
            if (c.BContainsApp(appId) || c.BContainsApp({ appid: appId })) return true;
        } catch {}
    }

    // 2. m_setAppIDs (Set / Map in Steam CCollection)
    if (c.m_setAppIDs) {
        try {
            if (typeof (c.m_setAppIDs as Set<number>).has === 'function') {
                if ((c.m_setAppIDs as Set<number>).has(appId)) return true;
            }
        } catch {}
    }

    // 3. allApps, apps, visibleApps arrays
    const arrays = [c.allApps, c.apps, c.visibleApps];
    for (const arr of arrays) {
        if (Array.isArray(arr)) {
            for (const item of arr) {
                if (typeof item === 'number' && item === appId) return true;
                if (item && typeof item === 'object') {
                    const rec = item as Record<string, unknown>;
                    if (rec.appid === appId || rec.m_appid === appId) return true;
                }
            }
        } else if (arr && typeof (arr as any)[Symbol.iterator] === 'function') {
            try {
                for (const item of arr as any) {
                    if (typeof item === 'number' && item === appId) return true;
                    if (item && typeof item === 'object') {
                        const rec = item as Record<string, unknown>;
                        if (rec.appid === appId || rec.m_appid === appId) return true;
                    }
                }
            } catch {}
        }
    }

    // 4. GetApps function
    if (typeof c.GetApps === 'function') {
        try {
            const list = (c.GetApps as () => unknown)();
            if (Array.isArray(list)) {
                for (const item of list) {
                    if (typeof item === 'number' && item === appId) return true;
                    if (item && typeof item === 'object') {
                        const rec = item as Record<string, unknown>;
                        if (rec.appid === appId || rec.m_appid === appId) return true;
                    }
                }
            }
        } catch {}
    }

    return false;
}

function getCollectionName(col: unknown): string | null {
    if (!col || typeof col !== 'object') return null;
    const c = col as Record<string, unknown>;
    const name = c.name ?? c.strName ?? c.m_strName ?? c.label ?? c.title;
    if (typeof name === 'string' && name.trim().length > 0) {
        return name.trim();
    }
    return null;
}

function isSystemCollection(name: string, id?: string): boolean {
    const raw = (id ?? name).toLowerCase();
    if (
        raw === 'local_games' || raw === 'local-games' ||
        raw === 'all_games' || raw === 'all-games' ||
        raw === 'deck_games' || raw === 'deck-games' ||
        raw === 'recent_games' || raw === 'hidden' ||
        raw === 'soundtracks' || raw === 'soundtrack' ||
        raw === 'music' || raw === 'uncategorized'
    ) {
        return true;
    }
    const lower = name.toLowerCase();
    if (
        lower === 'installed' ||
        lower.includes('instalad') ||
        lower === 'all games' ||
        lower.includes('todos los juegos') ||
        lower === 'soundtracks' ||
        lower.includes('banda sonora') ||
        lower.includes('great on deck') ||
        lower.includes('compatible') ||
        lower.includes('non-steam') ||
        lower.includes('no son de steam') ||
        lower.includes('uncategorized') ||
        lower.includes('sin categoría')
    ) {
        return true;
    }
    return false;
}

function isFavorites(name: string, id?: string): boolean {
    const raw = (id ?? name).toLowerCase();
    return (
        raw === 'favorite_games' ||
        raw === 'favorites' ||
        raw === 'favorite' ||
        raw.includes('favorit')
    );
}

/**
 * Returns the list of collection names that the given game appId belongs to.
 * Deduplicates and excludes internal/system categories.
 */
export function getGameCollections(appId: number): string[] {
    if (!appId || appId <= 0) return [];

    const s = steam();
    const cStore = s.collectionStore;
    const results: string[] = [];
    const seen = new Set<string>();

    const addCol = (name: string) => {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            results.push(name);
        }
    };

    // Check Favorites
    let isFav = false;
    try {
        if (cStore?.BIsFavorite?.(appId) === true || cStore?.BIsFavorite?.({ appid: appId } as any) === true) {
            isFav = true;
        } else if (
            collectionContainsApp(cStore?.favoriteGamesCollection, appId) ||
            collectionContainsApp(cStore?.favoritesCollection, appId)
        ) {
            isFav = true;
        }
    } catch {}

    if (isFav) {
        addCol('Favorites');
    }

    // Try direct GetCollectionsForApp
    if (typeof cStore?.GetCollectionsForApp === 'function') {
        try {
            const cols = cStore.GetCollectionsForApp(appId);
            if (Array.isArray(cols)) {
                for (const c of cols) {
                    const name = typeof c === 'string' ? c : getCollectionName(c);
                    const id = typeof c === 'object' && c !== null ? String((c as any).id ?? '') : '';
                    if (name && !isSystemCollection(name, id) && !isFavorites(name, id)) {
                        addCol(name);
                    }
                }
            }
        } catch {}
    }

    // Gather all collections from userCollections / m_mapCollections / collections
    const rawCols: unknown[] = [];
    try {
        if (Array.isArray(cStore?.userCollections)) {
            rawCols.push(...cStore.userCollections);
        } else if (cStore?.userCollections && typeof (cStore.userCollections as any)[Symbol.iterator] === 'function') {
            rawCols.push(...Array.from(cStore.userCollections as any));
        }

        const mapCols = cStore?.m_mapCollections;
        if (mapCols) {
            if (typeof (mapCols as any).values === 'function') {
                rawCols.push(...Array.from((mapCols as any).values()));
            } else if (typeof mapCols === 'object') {
                rawCols.push(...Object.values(mapCols as Record<string, unknown>));
            }
        }

        if (Array.isArray(cStore?.collections)) {
            rawCols.push(...cStore.collections);
        }

        if (typeof cStore?.GetUserCollections === 'function') {
            const res = cStore.GetUserCollections();
            if (Array.isArray(res)) rawCols.push(...res);
        }
    } catch {}

    for (const c of rawCols) {
        if (!c || typeof c !== 'object') continue;
        const name = getCollectionName(c);
        const id = String((c as Record<string, unknown>).id ?? (c as Record<string, unknown>).m_strId ?? '');
        if (!name || isSystemCollection(name, id)) continue;

        if (isFavorites(name, id)) {
            if (collectionContainsApp(c, appId)) {
                addCol('Favorites');
            }
            continue;
        }

        if (collectionContainsApp(c, appId)) {
            addCol(name);
        }
    }

    // Check mock fallback (for testing / playground)
    const g = typeof window !== 'undefined' ? window : globalThis;
    if (results.length === 0 && (g as unknown as { __mockCollections?: Record<number, string[]> }).__mockCollections) {
        const mock = (g as unknown as { __mockCollections?: Record<number, string[]> }).__mockCollections?.[appId];
        if (Array.isArray(mock)) {
            for (const m of mock) addCol(m);
        }
    }

    return results;
}
