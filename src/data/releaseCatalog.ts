import { fetchNoCors } from '@decky/api';
import { cache, Cache, DAY_MS } from './cache';
import { isNewer, parseVersion, pickRelease, Release } from './update';

const FRESH_KEY = 'update:catalog:fresh';
const SNAPSHOT_KEY = 'update:catalog:complete';
const RELEASES = 'https://api.github.com/repos/michpalm/game-glance/releases';

/** All installable stable releases, including the preserved 3.5 series, newest first. */
export function pickVersionCatalog(rows: unknown[]): Release[] {
    const kept = new Map<string, Release>();
    for (const row of rows) {
        const release = pickRelease(row);
        if (!release || release.version.includes('-') || isNewer('3.5.0', release.version)) continue;
        const key = parseVersion(release.version)?.join('.');
        if (key && !kept.has(key)) kept.set(key, release);
    }
    return [...kept.values()].sort((a, b) => isNewer(a.version, b.version) ? -1 : isNewer(b.version, a.version) ? 1 : 0);
}

export interface CatalogResult { releases: Release[]; stale: boolean }

/** Cache only complete answers: a failed later page must not hide the versions kept on earlier runs. */
export function createReleaseCatalog(fetchPage: (page: number) => Promise<unknown>, store: Cache) {
    let pending: Promise<CatalogResult> | null = null;
    let complete: Release[] | null = null;
    const load = async (force = false): Promise<CatalogResult> => {
        if (pending) return pending;
        pending = (async () => {
            if (!force) {
                const fresh = await store.get<{ releases: Release[] }>(FRESH_KEY).catch(() => null);
                if (fresh && Array.isArray(fresh.releases)) {
                    complete = fresh.releases;
                    return { releases: complete, stale: false };
                }
            }
            try {
                const rows: unknown[] = [];
                for (let page = 1; ; page++) {
                    const batch = await fetchPage(page);
                    if (!Array.isArray(batch)) throw new Error('Invalid release catalog');
                    rows.push(...batch);
                    if (batch.length < 100) break;
                }
                complete = pickVersionCatalog(rows);
                // The retained snapshot outlives the fresh answer, for offline version selection.
                await store.put(SNAPSHOT_KEY, { releases: complete }, 3650 * DAY_MS).catch(() => undefined);
                await store.put(FRESH_KEY, { releases: complete }, DAY_MS).catch(() => undefined);
                return { releases: complete, stale: false };
            } catch (error) {
                if (!complete) {
                    const snapshot = await store.get<{ releases: Release[] }>(SNAPSHOT_KEY).catch(() => null);
                    if (snapshot && Array.isArray(snapshot.releases)) complete = snapshot.releases;
                }
                if (complete) return { releases: complete, stale: true };
                throw error;
            }
        })();
        try { return await pending; } finally { pending = null; }
    };
    return { load };
}

export const versionCatalog = createReleaseCatalog(async (page) => {
    const response = await fetchNoCors(`${RELEASES}?per_page=100&page=${page}`, {
        method: 'GET', headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    return response.json();
}, cache);
