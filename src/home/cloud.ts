/**
 * Steam Cloud state for Home's cloud button, mirroring the game page's own cloud status (probed on the Ally, Steam's
 * play section component): it shows only when `bCloudEnabledForApp`, `bCloudEnabledForAccount` and
 * `bHasAnyLocalContent` are set and the app is a real game (not a mod or shortcut); its icon variant comes from
 * `eCloudStatus`; A acts only on a problem: a file conflict opens Steam's conflict dialog, "out of sync"/"unable to
 * sync" open its retry dialog, "pending elsewhere" does nothing. Pure.
 */

/** Steam's cloud status values (appDetails.eCloudStatus), with the game page's words. */
export const CLOUD_STATUS = {
    unknown: 0,
    disabled: 1,
    unknown2: 2,
    synchronized: 3,
    checking: 4,
    outOfSync: 5,
    uploading: 6,
    downloading: 7,
    syncFailed: 8,
    conflict: 9,
    pendingElsewhere: 10,
} as const;

export type CloudTone = 'ok' | 'busy' | 'bad' | 'off';
export type CloudAction = 'conflict' | 'retry' | 'none';

export interface CloudState {
    status: number;
    tone: CloudTone;
    /** Steam's icon variant props (its CloudSync icon: a check, the save arrows or the error mark), as the page passes them. */
    icon: { uploaded?: true; save?: true; error?: true };
    action: CloudAction;
    /** Words for the button's label. */
    label: string;
}

export interface CloudDetails {
    bCloudEnabledForApp?: unknown;
    bCloudEnabledForAccount?: unknown;
    bHasAnyLocalContent?: unknown;
    eCloudStatus?: unknown;
    nCloudProgressPercent?: unknown;
}

const S = CLOUD_STATUS;
const PROBLEM: number[] = [S.outOfSync, S.syncFailed, S.conflict, S.pendingElsewhere];
const BUSY: number[] = [S.checking, S.uploading, S.downloading];

const WORDS: Record<number, string> = {
    [S.synchronized]: 'synced',
    [S.checking]: 'checking',
    [S.uploading]: 'uploading',
    [S.downloading]: 'downloading',
    [S.outOfSync]: 'out of sync',
    [S.syncFailed]: 'unable to sync',
    [S.conflict]: 'file conflict',
    [S.pendingElsewhere]: 'out of sync on another device',
};

/**
 * The button's state, or null when the game page shows no cloud status (cloud off for the game or the account, no
 * local content, not a real game, or no details). `app`: the overview is a game, a mod/shortcut, or missing.
 * `offline`: Steam is in offline mode (grey, like the page's OfflineMode colour).
 */
export function cloudState(details: CloudDetails | null | undefined, app: 'game' | 'shortcut' | 'missing', offline: boolean): CloudState | null {
    if (!details || app !== 'game') return null;
    if (details.bCloudEnabledForApp !== true || details.bCloudEnabledForAccount !== true || details.bHasAnyLocalContent !== true) return null;
    const status = typeof details.eCloudStatus === 'number' ? details.eCloudStatus : S.unknown;
    const icon: CloudState['icon'] = status === S.synchronized ? { uploaded: true } : BUSY.includes(status) ? { save: true } : PROBLEM.includes(status) ? { error: true } : {};
    const action: CloudAction = status === S.conflict ? 'conflict' : status === S.pendingElsewhere || !PROBLEM.includes(status) ? 'none' : 'retry';
    const tone: CloudTone = offline ? 'off' : status === S.synchronized ? 'ok' : BUSY.includes(status) ? 'busy' : PROBLEM.includes(status) ? 'bad' : 'off';
    const pct = typeof details.nCloudProgressPercent === 'number' && Number.isFinite(details.nCloudProgressPercent) ? Math.round(details.nCloudProgressPercent) : null;
    const words = offline ? 'offline' : WORDS[status] ?? 'unknown';
    const label = `Steam Cloud: ${words}${(status === S.uploading || status === S.downloading) && pct !== null && pct > 0 ? ` ${pct}%` : ''}`;
    return { status, tone, icon, action, label };
}

/** Two states that render the same (the poll keeps the old object then, so React skips the render). */
export function sameCloud(a: CloudState | null, b: CloudState | null): boolean {
    if (a === null || b === null) return a === b;
    return a.status === b.status && a.tone === b.tone && a.action === b.action && a.label === b.label;
}

/**
 * Icon colours on the dark translucent circle (rgba(12,16,22,.4) over the scrimmed hero), shared by Home and the
 * restyled game page. Contrast against the circle composited over dark / mid / white hero art at the row's position
 * (scrim .45): ok 13.6 / 9.8 / 5.7, busy 14.0 / 10.0 / 5.8, bad 8.2 / 5.9 / 3.4 (plus the icon's dark halo), off
 * 11.6 / 8.4 / 4.9.
 */
export const CLOUD_COLOURS: Record<CloudTone, string> = {
    ok: '#5cf2b4',
    busy: '#ffd84d',
    bad: '#ff8585',
    off: '#c4c9d1',
};

/** The icon on a focused (white) cloud circle on the game page, which only takes focus on a sync problem: 6.6:1 on white. */
export const CLOUD_FOCUS_BAD = '#b3261e';
