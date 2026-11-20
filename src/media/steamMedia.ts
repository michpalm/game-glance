import { LOG_PREFIX } from '../constants';
import type { MediaItem, RawClip, RawShot, ShotItem } from './mediaModel';

export interface MediaBindings {
    available(): boolean;
    list(): Promise<{ shots: RawShot[]; clips: RawClip[] } | null>;
    gameName(item: MediaItem): string | null;
    upload(item: ShotItem, privacy: 0 | 1 | 2): Promise<boolean>;
    remove(item: MediaItem): Promise<boolean>;
    onNewShot(cb: () => void): () => void;
}

interface Screenshots {
    GetAllAppsLocalScreenshotsCount?(): Promise<number>;
    GetAllAppsLocalScreenshotsRange?(start: number, end: number): Promise<RawShot[]>;
    UploadLocalScreenshot?(gameId: string, handle: number, privacy: number): Promise<boolean>;
    DeleteLocalScreenshots?(req: { gameID: string; rgHandles: number[] }[]): Promise<{ bSuccess?: boolean }>;
}
interface Steam { Screenshots?: Screenshots; GameSessions?: { RegisterForScreenshotNotification?(cb: (n: { strOperation?: string }) => void): unknown } }
interface Grs { LazyLoadClips?(): Promise<void>; BLoadingClips?(): boolean; GetClipIDs?(): string[]; GetClipSummaries?(ids: string[]): RawClip[]; m_clips?: Map<string, unknown>; DeleteClip?(id: string): unknown }
interface Stores { appStore?: unknown; screenshotStore?: unknown; grs?: unknown }

const PAGE = 1000;
const CLIP_WAIT_MS = 2000;

/**
 * Steam's own screenshot and recording calls, as its Media page makes them (sp.js, read 2026-11-19). Read failures give
 * null (the gate then shows Steam's page), logged once; actions give false, so nothing leaves the page unless Steam
 * reports success.
 */
export function createMediaBindings(steamClient: unknown, stores: Stores, log: (e: unknown) => void = e => console.warn(`${LOG_PREFIX} Media: Steam's media could not be read`, e)): MediaBindings {
    const steam = () => (steamClient ?? {}) as Steam;
    const shots = () => steam().Screenshots;
    const grs = () => stores.grs as Grs | undefined;
    let logged = false;

    /**
     * Steam loads recordings on first ask (CGameRecordingStore.LazyLoadClips, sp.js): reading straight away can give
     * none on a device that has some. Waits for that load, up to CLIP_WAIT_MS when Steam's page already started it.
     */
    const readClips = async (): Promise<RawClip[]> => {
        const g = grs();
        if (!g) return [];
        if (typeof g.LazyLoadClips === 'function') {
            await g.LazyLoadClips();
            for (let waited = 0; g.BLoadingClips?.() === true && waited < CLIP_WAIT_MS; waited += 100) await new Promise(r => setTimeout(r, 100));
        }
        if (typeof g.GetClipSummaries === 'function') return g.GetClipSummaries(g.GetClipIDs?.() ?? []) ?? [];
        return g.m_clips ? ([...g.m_clips.values()] as RawClip[]) : [];
    };

    return {
        available: () => { try { return typeof shots()?.GetAllAppsLocalScreenshotsCount === 'function'; } catch { return false; } },
        async list() {
            try {
                const s = shots()!;
                const count = await s.GetAllAppsLocalScreenshotsCount!();
                const all: RawShot[] = [];
                for (let start = 0; start < count; start += PAGE) all.push(...(await s.GetAllAppsLocalScreenshotsRange!(start, Math.min(count - 1, start + PAGE - 1))));
                return { shots: all, clips: await readClips() };
            } catch (error) {
                if (!logged) { logged = true; log(error); }
                return null;
            }
        },
        gameName(item) {
            try {
                const app = (stores.appStore as { GetAppOverviewByAppID?(id: number): { display_name?: unknown } | null } | undefined)?.GetAppOverviewByAppID?.(item.appId);
                if (typeof app?.display_name === 'string' && app.display_name) return app.display_name;
                const short = (stores.screenshotStore as { GetShortcutDisplayName?(g: string): unknown } | undefined)?.GetShortcutDisplayName?.(item.gameId);
                if (typeof short === 'string' && short) return short;
            } catch { /* a name is optional */ }
            return item.appId === 7 ? 'Steam' : null;
        },
        async upload(item, privacy) {
            try { return (await shots()?.UploadLocalScreenshot?.(item.gameId, item.handle, privacy)) === true; } catch { return false; }
        },
        async remove(item) {
            try {
                if (item.kind === 'shot') {
                    const r = await shots()?.DeleteLocalScreenshots?.([{ gameID: item.gameId, rgHandles: [item.handle] }]);
                    return r?.bSuccess === true;
                }
                const g = grs(), id = item.id.replace(/^clip_/, '');
                if (typeof g?.DeleteClip !== 'function') return false;
                await g.DeleteClip(id);
                return !(g.m_clips?.has(id) ?? true);
            } catch { return false; }
        },
        onNewShot(cb) {
            try {
                const reg = steam().GameSessions?.RegisterForScreenshotNotification?.(n => { if (n?.strOperation === 'written') cb(); }) as { unregister?(): void } | (() => void) | undefined;
                return () => { try { if (typeof reg === 'function') reg(); else reg?.unregister?.(); } catch { /* already gone */ } };
            } catch { return () => undefined; }
        },
    };
}

let shared: MediaBindings | null = null;
/** The bindings on Steam's globals, made on first use (the stores load after the plugin). */
export function sharedMediaBindings(): MediaBindings {
    const g = globalThis as Record<string, unknown>;
    return shared ??= createMediaBindings(g.SteamClient, { get appStore() { return g.appStore; }, get screenshotStore() { return g.screenshotStore; }, get grs() { return g.g_GRS; } });
}
