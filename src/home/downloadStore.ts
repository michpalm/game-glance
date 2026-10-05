import { LOG_PREFIX } from '../constants';
import { acceptDownloadList, DownloadOverview, DownloadState, mergeDownloads, readOverview } from './downloadProgress';

/**
 * The client's downloads, one store for the plugin's lifetime (Home and the details page read the same state, and it
 * is already known when a page opens). Two Steam callbacks feed it: the download list (queued, paused and active
 * entries; fires only when the list changes) and the download overview (the live percent of the running transfer,
 * about once a second). Started lazily by the first subscriber (`acquireDownloads`) and stopped when the last one leaves, so nothing is
 * registered while no Home or restyled details page is showing; `stopDownloads` stays as the unload backstop. Listeners are told only when the merged state changes.
 */

type Registration = { unregister?(): void } | undefined;
type DownloadsApi = {
    RegisterForDownloadItems?(cb: (isLocal: boolean, items: unknown) => void): Registration;
    RegisterForDownloadOverview?(cb: (overview: unknown) => void): Registration;
};
const api = () => (globalThis as unknown as { SteamClient?: { Downloads?: DownloadsApi } }).SteamClient?.Downloads;

let items = new Map<number, DownloadState>();
let overview: DownloadOverview | null = null;
let merged = new Map<number, DownloadState>();
let registrations: Registration[] = [];
let users = 0;
const listeners = new Set<() => void>();

const signature = (m: Map<number, DownloadState>) => [...m].map(([id, d]) => `${id}:${d.kind}:${d.percent}`).sort().join('|');

function refresh() {
    const next = mergeDownloads(items, overview);
    if (signature(next) === signature(merged)) return;
    merged = next;
    listeners.forEach((fn) => {
        try {
            fn();
        } catch (error) {
            console.warn(`${LOG_PREFIX} downloads: a listener failed`, error);
        }
    });
}

function guard<T>(what: string, fn: () => T): T | undefined {
    try {
        return fn();
    } catch (error) {
        console.warn(`${LOG_PREFIX} downloads: ${what} failed`, error);
        return undefined;
    }
}

/** Subscribes to Steam's two download callbacks, once. A missing API leaves the store empty (the overview fallback applies). */
function startDownloads() {
    if (registrations.length > 0) return;
    const downloads = api();
    registrations = [
        guard('list subscription', () => downloads?.RegisterForDownloadItems?.((isLocal, raw) => {
            items = guard('download items', () => acceptDownloadList(isLocal, raw, items)) ?? items;
            refresh();
        })),
        guard('overview subscription', () => downloads?.RegisterForDownloadOverview?.((raw) => {
            const next = guard('download overview', () => readOverview(raw));
            if (next) overview = next;
            refresh();
        })),
    ].filter((r): r is NonNullable<Registration> => r !== undefined);
}

/** Unsubscribes and forgets everything (plugin unload, or the last subscriber leaving). */
export function stopDownloads() {
    users = 0;
    for (const r of registrations) guard('unsubscribe', () => r?.unregister?.());
    registrations = [];
    items = new Map();
    overview = null;
    merged = new Map();
}

/** The merged state for one app, null when it is not being downloaded. */
export function downloadFor(appId: number): DownloadState | null {
    return merged.get(appId) ?? null;
}

export function subscribeDownloads(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Counts one subscriber: the first starts the Steam callbacks, the last release unregisters them. The returned
 * release is safe to call more than once.
 */
export function acquireDownloads(): () => void {
    users++;
    if (users === 1) startDownloads();
    let released = false;
    return () => {
        if (released) return;
        released = true;
        if (users > 0 && --users === 0) stopDownloads();
    };
}
