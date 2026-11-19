import { focusAfterDelete, type MediaItem, type MediaTab } from './mediaModel';
import type { MediaBindings } from './steamMedia';

/** Steam's Media route and its own sub-pages (sp.js: /media, /media/grid, /media/list, /media/item/:type/:id). */
const MEDIA_PATH = /^\/media(\/.*)?$/;
export const mediaKeepsNative = (path: string): boolean => MEDIA_PATH.test(path);

export interface MediaGateInput { enabled: boolean; available: boolean; path: string | null; native: boolean }

/**
 * Whether Steam's `/media` route shows Game Glance's Media (spec §1). While Steam is leaving the route the path already
 * names the next page for a frame: the previous choice stands, so Steam's page never flashes in between.
 */
export function mediaGateChoice({ enabled, available, path, native }: MediaGateInput, previous?: 'ours' | 'native'): 'ours' | 'native' {
    if (!enabled || !available || native || path === null) return 'native';
    if (previous && !MEDIA_PATH.test(path)) return previous;
    return 'ours';
}

/** What Media remembers for the session: the tab, the highlighted item, and "Steam's media" chosen for this visit. */
export interface MediaMemory { tab: MediaTab; focusId: string | null; native: boolean }
const fresh = (): MediaMemory => ({ tab: 'all', focusId: null, native: false });
let current = fresh();
const listeners = new Set<() => void>();
const emit = () => { for (const fn of [...listeners]) fn(); };

export const mediaMemory = {
    get: (): MediaMemory => current,
    set(patch: Partial<MediaMemory>): void { current = { ...current, ...patch }; emit(); },
    subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; },
    reset(): void { current = fresh(); emit(); },
    /** Stores without telling subscribers: the page notes its tab and highlight on every move, and the gate needn't redraw. */
    // In place, so the gate's useSyncExternalStore snapshot keeps its identity and doesn't redraw either.
    remember(patch: Partial<MediaMemory>): void { Object.assign(current, patch); },
};

/**
 * Whether the page must take focus back: nothing holds it, or the element that did is gone (a tile moved rows). Focus
 * on anything else, such as the Delete dialog or the upload menu outside the page, is left alone (final review).
 */
export function focusGone(active: { isConnected: boolean } | null | undefined, body: unknown): boolean {
    return !active || active === body || !active.isConnected;
}

interface History { location?: { pathname?: string }; listen?(changed: () => void): unknown }
let stopReset: (() => void) | null = null;

/** Watches Steam's history so "Steam's media" resets once the user leaves Media (as the Library's). True once watching. */
export function ensureMediaNativeReset(history: () => History | null | undefined): boolean {
    if (stopReset) return true;
    try {
        const h = history();
        if (typeof h?.listen !== 'function') return false;
        const stop = h.listen(() => {
            const path = history()?.location?.pathname;
            if (mediaMemory.get().native && typeof path === 'string' && !mediaKeepsNative(path)) mediaMemory.set({ native: false });
        });
        stopReset = typeof stop === 'function' ? stop as () => void : () => {};
        return true;
    } catch {
        return false;
    }
}

export function stopMediaNativeReset(): void {
    stopReset?.();
    stopReset = null;
}

/** Deletes through Steam; on success focus goes to the next item, else the previous, else nowhere; on failure it stays. */
export async function runDelete(item: MediaItem, items: MediaItem[], remove: (i: MediaItem) => Promise<boolean>): Promise<{ ok: boolean; focusId: string | null }> {
    let ok = false;
    try { ok = await remove(item); } catch { ok = false; }
    return ok ? { ok, focusId: focusAfterDelete(items, item.id) } : { ok, focusId: item.id };
}

/** Uploads a screenshot with the privacy chosen; recordings aren't uploaded from here. */
export async function runUpload(item: MediaItem, privacy: 0 | 1 | 2, upload: MediaBindings['upload']): Promise<boolean> {
    if (item.kind !== 'shot') return false;
    try { return await upload(item, privacy); } catch { return false; }
}

/** The screenshot Steam's item path names (`/media/item/screenshot/<gameId>_<handle>`, as a notification opens it); null otherwise. */
export function mediaItemFromPath(path: string | null): string | null {
    const m = path?.match(/^\/media\/item\/screenshot\/([\w.-]{1,64})\/?$/);
    return m ? m[1] : null;
}

/** Where the page opens when Steam asked for one shot: the viewer on it (All tab) when it is on this device; null: as usual. */
export function openingScreen(items: MediaItem[], want: string | null): { screen: { kind: 'viewer'; id: string }; tab: MediaTab; focusId: string } | null {
    if (!want || !items.some(i => i.kind === 'shot' && i.id === want)) return null;
    return { screen: { kind: 'viewer', id: want }, tab: 'all', focusId: want };
}
