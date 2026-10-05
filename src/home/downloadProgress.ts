/**
 * The Play pill's download state. Primary source: Steam's download list (readDownloadItems). Fallback: the app
 * overview's `display_status` (Steam's EDisplayStatus) for the state only; its `status_percentage` is NOT used
 * (probed on the Ally: it disagreed with Steam's own bar, 36 against 10). Pure; anything unexpected reads as "no download", so the pill keeps its old look.
 */

export type DownloadKind = 'installing' | 'updating' | 'downloading' | 'verifying' | 'finalizing' | 'paused' | 'queued';

export interface DownloadState {
    kind: DownloadKind;
    /** 0..100, or null when Steam gave none. */
    percent: number | null;
    /** The app overview's display_status when known (it decides Steam's own pill words, see pillWords). */
    status?: number | null;
}

/** Steam's EDisplayStatus values that mean a transfer is under way, paused or waiting (decky-frontend-lib's DisplayStatus). */
const KIND_BY_STATUS: Record<number, DownloadKind> = {
    3: 'installing',
    5: 'verifying',
    6: 'updating',
    7: 'downloading',
    18: 'paused', // UpdatePaused
    19: 'queued', // UpdateQueued
    22: 'paused', // DownloadPaused
    23: 'queued', // DownloadQueued
};

/** A percent kept to 0..100 and rounded; null when it is not a number. */
export function clampPercent(value: unknown): number | null {
    const n = typeof value === 'number' ? value : Number.NaN;
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.min(100, Math.max(0, n)));
}

/** The download state of an app overview, or null when nothing is being installed, updated or downloaded. */
export function readDownload(overview: unknown): DownloadState | null {
    if (typeof overview !== 'object' || overview === null) return null;
    const o = overview as { display_status?: unknown };
    const kind = KIND_BY_STATUS[Number(o.display_status)];
    if (!kind) return null;
    return { kind, percent: null };
}

/**
 * Steam's own words on the Play pill (decoded from its client: the action for each display status): "Pause" while a
 * transfer is running (it pauses all downloads); then by the app's display_status: Update for UpdateQueued (19) and
 * UpdateRequired (20); Download for DownloadPaused (22), DownloadQueued (23), DownloadRequired (24) and UpdatePaused
 * (18). Steam has no "Resume" word here. Without a status it follows `installed` (Update for an installed game).
 * Both resume. The percent is not in the label, the pill fills instead.
 */
export function pillWords(d: DownloadState, installed: boolean): 'Pause' | 'Download' | 'Update' {
    if (d.kind !== 'paused' && d.kind !== 'queued') return 'Pause';
    const ds = Number(d.status);
    if (ds === 19 || ds === 20) return 'Update';
    if (ds === 18 || ds === 22 || ds === 23 || ds === 24) return 'Download';
    return installed ? 'Update' : 'Download';
}

/** What A on the pill does, as Steam's button does: pause while a transfer runs, resume otherwise. */
export function pillToggle(d: DownloadState): 'pause' | 'resume' {
    return d.kind === 'paused' || d.kind === 'queued' ? 'resume' : 'pause';
}

/** Width of the pill's fill in percent: the progress, 0 when unknown. */
export function fillPercent(d: DownloadState): number {
    return d.percent ?? 0;
}

export function sameDownload(a: DownloadState | null, b: DownloadState | null): boolean {
    if (a === null || b === null) return a === b;
    return a.kind === b.kind && a.percent === b.percent && (a.status ?? null) === (b.status ?? null);
}

/** Whether the game is installed now, from its app overview's `installed`; `snapshot` when the overview does not say. */
export function liveInstalled(overview: unknown, snapshot: boolean): boolean {
    const installed = typeof overview === 'object' && overview !== null ? (overview as { installed?: unknown }).installed : undefined;
    return typeof installed === 'boolean' ? installed : snapshot;
}

/**
 * The downloads Steam's client lists (`SteamClient.Downloads.RegisterForDownloadItems` -> `(isLocal, items)`;
 * probed on the Ally): each entry has `item_data[]` of {appid, active, paused, completed, queue_index, buildid,
 * update_type_info[{has_update, completed_update, overall_percent_complete}]}. Per app:
 * - completed: not a download (Steam keeps the finished ones in the list);
 * - active: a transfer (kind 'downloading'; refineKind says installing or updating), percent from the update_type_info entry that has an
 *   update and is not complete (overall_percent_complete, 0..100);
 * - paused: paused, same percent;
 * - otherwise queued (queue_index >= 0), with the percent so far (a queued item can be part way: probed at 10).
 * Anything else is ignored. Pure; broken input gives an empty map.
 */
const RANK: Record<DownloadKind, number> = { downloading: 3, installing: 3, updating: 3, verifying: 3, finalizing: 3, paused: 2, queued: 1 };

export function readDownloadItems(items: unknown): Map<number, DownloadState> {
    const out = new Map<number, DownloadState>();
    if (!Array.isArray(items)) return out;
    for (const entry of items) {
        const data = (entry as { item_data?: unknown } | null)?.item_data;
        if (!Array.isArray(data)) continue;
        for (const raw of data) {
            const item = raw as {
                appid?: unknown; active?: unknown; paused?: unknown; completed?: unknown; queue_index?: unknown; buildid?: unknown;
                update_type_info?: unknown;
            } | null;
            const appId = Number(item?.appid);
            if (!item || !Number.isInteger(appId) || appId <= 0 || item.completed === true) continue;
            let state: DownloadState | null = null;
            const wanted = item.active === true || item.paused === true || (typeof item.queue_index === 'number' && item.queue_index >= 0);
            if (wanted) {
                const types = Array.isArray(item.update_type_info) ? item.update_type_info : [];
                type Stage = { has_update?: unknown; completed_update?: unknown; overall_percent_complete?: unknown };
                const stages = types.filter((t: Stage) => t?.has_update === true) as Stage[];
                // The running stage; when it has completed while the item is still active (staging, verifying) the last stage's percent stays.
                const live = stages.find((t) => t.completed_update !== true) ?? stages[stages.length - 1];
                const percent = clampPercent(live?.overall_percent_complete);
                const kind: DownloadKind = item.active === true ? (item.paused === true ? 'paused' : 'downloading') : item.paused === true ? 'paused' : 'queued';
                state = { kind, percent };
            }
            // Several items for one app: active over paused over queued.
            const old = out.get(appId);
            if (state && (!old || RANK[state.kind] > RANK[old.kind])) out.set(appId, state);
        }
    }
    return out;
}

/** A list-sourced transfer is an update of an installed game, an install otherwise (buildid does not tell them apart). */
export function refineKind(state: DownloadState, installed: boolean): DownloadState {
    return state.kind === 'downloading' ? { ...state, kind: installed ? 'updating' : 'installing' } : state;
}

/** The list to keep after a callback: only the local client's (`isLocal`), a remote client's list never replaces it. */
export function acceptDownloadList(isLocal: unknown, items: unknown, previous: Map<number, DownloadState>): Map<number, DownloadState> {
    return isLocal === true ? readDownloadItems(items) : previous;
}

/** The client's current transfer (SteamClient.Downloads.RegisterForDownloadOverview, about once a second). */
export interface DownloadOverview {
    appId: number;
    /** Steam's update_state: 'Downloading', 'Finalizing', 'None', ... */
    state: string;
    /** Live percent 0..100 (the list's per-item percent is only a snapshot). */
    percent: number | null;
    paused: boolean;
}

/** The local client's overview, or null for anything else (a remote client's, or a broken one). */
export function readOverview(raw: unknown): DownloadOverview | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const o = raw as { remote_client_id?: unknown; update_state?: unknown; update_appid?: unknown; overall_percent_complete?: unknown; paused?: unknown };
    if (o.remote_client_id !== undefined && String(o.remote_client_id) !== '0') return null;
    const appId = Number(o.update_appid);
    return {
        appId: Number.isInteger(appId) && appId > 0 ? appId : 0,
        state: typeof o.update_state === 'string' ? o.update_state : 'None',
        percent: clampPercent(o.overall_percent_complete),
        paused: o.paused === true,
    };
}

/**
 * The download state per app from both Steam callbacks, latest of each. The list says what is queued, paused or
 * waiting; the overview is live for the one app being transferred (`appId`): Downloading is active at its percent,
 * Finalizing is done at 100, its `paused` flag pauses it, and a resumed one is active again (the overview wins over
 * the list's possibly stale entry for that app). State 'None' means nothing is active, so list entries marked
 * active are dropped. Without an overview yet the list stands alone. Pure; never mutates its input.
 */
export function mergeDownloads(items: Map<number, DownloadState>, overview: DownloadOverview | null): Map<number, DownloadState> {
    const out = new Map(items);
    if (!overview) return out;
    const idle = overview.state === 'None' || overview.state === '' || overview.appId === 0;
    for (const [id, d] of items) if (idle && d.kind === 'downloading') out.delete(id);
    if (idle) return out;
    const kind: DownloadKind = overview.paused ? 'paused' : overview.state === 'Finalizing' ? 'finalizing' : 'downloading';
    out.set(overview.appId, { kind, percent: kind === 'finalizing' ? 100 : overview.percent });
    return out;
}
