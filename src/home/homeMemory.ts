import type { Zone } from './focusZones';

/**
 * Where Home was when the user left it for a game page, news page or store page, kept for the session so that
 * Steam's B (which remounts Home) lands back on the same selected game, zone, tab and card. Module state: it outlives the
 * component, is never written to disk, and is empty on a cold start. The decisions are pure; the state is a
 * small singleton behind noteHome / markLeaving / takeRestore.
 */

/** The selected recents item (L1/R1): a game (by appid, so a reordered row still finds it) or the Library card. */
export type RecentRef = { kind: 'game'; appId: number } | { kind: 'library' };

export interface HomeMemory {
    /** The zone that held gamepad focus. */
    zone: Zone;
    recent: RecentRef;
    /** Which action button was focused (0 = the first, the Play pill), when the zone is the actions. */
    action: number;
    /** The selected feed tab. */
    tab: number;
    /** The selected feed card's key (feedLayout FeedItem.key), null when the tab has none. */
    feedKey: string | null;
}

export const DEFAULT_MEMORY: HomeMemory = { zone: 'actions', recent: { kind: 'game', appId: 0 }, action: 0, tab: 0, feedKey: null };

/** How long after leaving Home a return still restores it (a longer absence is a fresh visit). */
export const RESTORE_MAX_AGE_MS = 30 * 60_000;
/** How long a restore waits for a feed card that loads late (the Recommended tab's deals) before settling for the tab. */
export const RESTORE_WAIT_MS = 4000;

/** The recents ref for a selection index: a game, or the Library card (index at or past the end). */
export function recentRefFor(index: number, appIds: number[]): RecentRef | null {
    if (appIds.length === 0 || !Number.isFinite(index)) return null;
    const at = Math.max(0, Math.round(index));
    return at >= appIds.length ? { kind: 'library' } : { kind: 'game', appId: appIds[at] };
}

/** The selection index for a ref in the current games: the game's index, the Library card's, else the first. */
export function recentIndexFor(ref: RecentRef, appIds: number[]): number {
    if (ref.kind === 'library') return appIds.length;
    const at = appIds.indexOf(ref.appId);
    return at >= 0 ? at : 0;
}

/** A tab index inside 0..count-1. */
export function clampTab(tab: number, count: number): number {
    const last = Math.floor(count) - 1;
    if (!Number.isFinite(tab) || last < 0) return 0;
    return Math.min(last, Math.max(0, Math.round(tab)));
}

/** What a restore does next with the feed: wait for the card, select (and maybe focus) it, or settle for the tab. */
export type RestoreStep = 'wait' | 'tab' | { card: number };

/**
 * `keys`: the selected tab's card keys now; `key`: the remembered one; `settled`: this tab's cards are final
 * (everything but Recommended, whose deals arrive later); `waited`: the wait for late cards is over.
 */
export function restoreStep(keys: string[], key: string | null, settled: boolean, waited: boolean): RestoreStep {
    if (key === null) return 'tab';
    const at = keys.indexOf(key);
    if (at >= 0) return { card: at };
    return settled || waited ? 'tab' : 'wait';
}

let memory: HomeMemory | null = null;
let leftAt: number | null = null;

/** Records what Home shows now (a partial update). */
export function noteHome(patch: Partial<HomeMemory>) {
    memory = { ...(memory ?? DEFAULT_MEMORY), ...patch };
}

/** Home is being left for a page Steam's B returns from: the next mount may restore. No-op before anything was noted. */
export function markLeaving(now: number = Date.now()) {
    if (memory) leftAt = now;
}

/** The memory to restore on this mount, once: null on a cold start, after a visit that did not leave for a page, or when stale. */
export function takeRestore(now: number = Date.now()): HomeMemory | null {
    const at = leftAt;
    leftAt = null;
    if (!memory || at === null || now - at > RESTORE_MAX_AGE_MS || now < at) return null;
    return { ...memory };
}

/** Forgets everything (tests). */
export function resetHomeMemory() {
    memory = null;
    leftAt = null;
}
