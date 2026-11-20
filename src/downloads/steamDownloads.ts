import type { DownloadsInput, RawItem, RawOverview, RawSample } from './downloadsModel';

/**
 * Steam's own download store (`window.downloadsStore`, read on the PS5 2026-11-19: LocalDownloadOverview, QueuedTransfers,
 * CompletedTransfers, DownloadHistory) and its queue calls, made as Steam's Downloads page makes them, for the local client.
 * Every read and call is guarded: a Steam build without them leaves Steam's own page in place.
 */
export interface DownloadsBindings {
    available(): boolean;
    read(): DownloadsInput | null;
    pauseAll(): boolean;
    resume(appId: number): boolean;
    downloadNow(appId: number): boolean;
    moveUp(appId: number, queueIndex: number): boolean;
    remove(appId: number): boolean;
}

const LOCAL_CLIENT = '0';
type Calls = Partial<Record<'SetQueueIndex' | 'ResumeAppUpdate' | 'RemoveFromDownloadList' | 'EnableAllDownloads', (...args: unknown[]) => unknown>>;
type Store = { LocalDownloadOverview?: unknown; QueuedTransfers?: unknown; CompletedTransfers?: unknown; DownloadHistory?: unknown };

/** MobX arrays and maps copied to plain arrays; a map keyed by client gives the local client's entry. */
function items<T>(value: unknown): T[] {
    if (value instanceof Map || (value && typeof (value as Map<string, unknown>).get === 'function' && typeof (value as Map<string, unknown>).has === 'function')) {
        return items<T>((value as Map<string, unknown>).get(LOCAL_CLIENT));
    }
    return Array.isArray(value) ? [...value] as T[] : [];
}

export function createDownloadsBindings(store: unknown, client: unknown): DownloadsBindings {
    const s = (store && typeof store === 'object' ? store : null) as Store | null;
    const calls = ((client as { Downloads?: unknown } | null)?.Downloads ?? {}) as Calls;
    const call = (name: keyof Calls, ...args: unknown[]): boolean => {
        const fn = calls[name];
        if (typeof fn !== 'function') return false;
        try {
            fn.apply(calls, args);
            return true;
        } catch {
            return false;
        }
    };
    return {
        available: () => s !== null && typeof calls.SetQueueIndex === 'function',
        read() {
            if (!s) return null;
            try {
                const overview = s.LocalDownloadOverview;
                return {
                    overview: overview && typeof overview === 'object' ? overview as RawOverview : null,
                    queued: items<RawItem>(s.QueuedTransfers),
                    completed: items<RawItem>(s.CompletedTransfers),
                    history: items<RawSample>(s.DownloadHistory).filter(sample => sample?.is_upload !== true),
                };
            } catch {
                return null;
            }
        },
        pauseAll: () => call('EnableAllDownloads', false, LOCAL_CLIENT),
        resume: (appId) => call('ResumeAppUpdate', appId, LOCAL_CLIENT),
        // To the top of the queue, then started (a queue left paused by Pause download would not start it).
        downloadNow: (appId) => call('SetQueueIndex', appId, 0, LOCAL_CLIENT) && call('ResumeAppUpdate', appId, LOCAL_CLIENT),
        moveUp: (appId, queueIndex) => call('SetQueueIndex', appId, Math.max(0, queueIndex - 1), LOCAL_CLIENT),
        remove: (appId) => call('RemoveFromDownloadList', appId, LOCAL_CLIENT),
    };
}
