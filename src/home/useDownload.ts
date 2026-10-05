import { useEffect, useState } from 'react';
import { LOG_PREFIX } from '../constants';
import { DownloadState, liveInstalled, readDownload, refineKind, sameDownload } from './downloadProgress';
import { acquireDownloads, downloadFor, subscribeDownloads } from './downloadStore';
import { pageHidden } from './pageVisible';

/** How often the state is read (about twice a second; each read is an in-memory lookup). */
const DOWNLOAD_POLL_MS = 500;

type SteamStores = { appStore?: { GetAppOverviewByAppID?(appId: number): unknown } };
const steam = () => globalThis as unknown as SteamStores;

function guarded<T>(what: string, read: () => T, fallback: T): T {
    try {
        return read();
    } catch (error) {
        console.warn(`${LOG_PREFIX} downloads: ${what} failed`, error);
        return fallback;
    }
}

const displayStatus = (o: unknown): number | null => {
    const n = typeof o === 'object' && o !== null ? (o as { display_status?: unknown }).display_status : undefined;
    return typeof n === 'number' ? n : null;
};

const overviewOf = (appId: number) => guarded('app overview', () => steam().appStore?.GetAppOverviewByAppID?.(appId) ?? undefined, undefined);

/**
 * One game's install/update/download state, shared by Spotlight Home and the details page. Primary source: Steam's
 * download list (`SteamClient.Downloads.RegisterForDownloadItems`, subscribed once per mount and unregistered on
 * unmount; its percent matches Steam's own bar). Fallback for the state only: the app overview's display_status.
 * `status` is the overview's display_status (what Steam's own pill derives its action from; a change re-renders). The state is applied at most twice a second. `installed` follows the overview live (a finished install reads Play).
 */
export function useDownload(appId: number | null, snapshotInstalled = false): { download: DownloadState | null; installed: boolean; status: number | null } {
    interface Read { id: number | null; download: DownloadState | null; installed: boolean; status: number | null }
    const read = (): Read => {
        const installed = appId === null ? snapshotInstalled : guarded('installed state', () => liveInstalled(overviewOf(appId), snapshotInstalled), snapshotInstalled);
        const fromList = appId === null ? null : downloadFor(appId);
        const download = appId === null ? null
            : fromList ? { ...refineKind(fromList, installed), status: guarded('display status', () => displayStatus(overviewOf(appId!)), null) }
                : guarded('download state', () => readDownload(overviewOf(appId)), null);
        const status = appId === null ? null : guarded('display status', () => displayStatus(overviewOf(appId)), null);
        return { id: appId, download, installed, status };
    };
    const [state, setState] = useState<Read>(read);
    useEffect(() => {
        const tick = () => setState((old) => {
            const next = read();
            return old.id === next.id && old.installed === next.installed && old.status === next.status && sameDownload(old.download, next.download) ? old : next;
        });
        tick();
        if (appId === null) return undefined;
        const release = acquireDownloads(); // the first user starts Steam's callbacks, the last one stops them
        const timer = setInterval(() => { if (!pageHidden()) tick(); }, DOWNLOAD_POLL_MS);
        const unsubscribe = subscribeDownloads(tick);
        return () => {
            clearInterval(timer);
            unsubscribe();
            release();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appId, snapshotInstalled]);
    // A state read for the previous game is never shown for the new one (until its first tick).
    return state.id === appId ? { download: state.download, installed: state.installed, status: state.status } : { download: null, installed: snapshotInstalled, status: null };
}
