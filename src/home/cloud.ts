/**
 * Steam Cloud state for Home's cloud button, mirroring the game page's own cloud status (probed on the Ally, Steam's
 * play section component): it shows only when `bCloudEnabledForApp`, `bCloudEnabledForAccount` and
 * `bHasAnyLocalContent` are set and the app is a real game (not a mod or shortcut); its icon variant comes from
 * `eCloudStatus`; A acts only on a problem: a file conflict opens Steam's conflict dialog, "out of sync"/"unable to
 * sync" open its retry dialog, "pending elsewhere" does nothing. Pure.
 */
import { PhraseKey, tr } from '../i18n/steamText';

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
    /** A Unifideck game: its own cloud button's look (data/unifideckCloud), drawn instead of Steam's icon and colours. */
    unifideck?: UnifideckCloudLook;
}

/** Unifideck's cloud button: its icon (Font Awesome cloud, turning arrows, download cloud, or cloud with a check), its inset ring, dimmed, breathing. */
export interface UnifideckCloudLook {
    icon: 'cloud' | 'sync' | 'download' | 'insync';
    ring: string | null;
    dim: boolean;
    breathe: boolean;
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

const WORDS: Record<number, PhraseKey> = {
    [S.synchronized]: 'cloudSynced',
    [S.checking]: 'cloudChecking',
    [S.uploading]: 'cloudUploading',
    [S.downloading]: 'cloudDownloading',
    [S.outOfSync]: 'cloudOutOfSync',
    [S.syncFailed]: 'cloudSyncFailed',
    [S.conflict]: 'cloudConflict',
    [S.pendingElsewhere]: 'cloudPendingElsewhere',
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
    const transferring = (status === S.uploading || status === S.downloading) && pct !== null && pct > 0;
    const words = offline
        ? tr('cloudOffline')
        : transferring
          ? tr(status === S.uploading ? 'cloudUploadingPct' : 'cloudDownloadingPct', [pct as number])
          : tr(WORDS[status] ?? 'cloudUnknown');
    const label = `${tr('steamCloud')}: ${words}`;
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

/**
 * The cloud circle's glyph (#64): one solid white cloud in every state (Ionicons' IoCloud, as Home draws it), so only the
 * badge carries the state. The page draws it as a background image (a mask would clip the halo).
 */
export const CLOUD_GLYPH_PATH =
    'M396 432H136c-36.44 0-70.36-12.57-95.51-35.41C14.38 372.88 0 340 0 304c0-36.58 13.39-68.12 38.72-91.22 18.11-16.53 42.22-28.25 69.18-33.87a16 16 0 0 0 11.37-9.15 156.24 156.24 0 0 1 42.05-56C187.76 91.69 220.5 80 256 80a153.57 153.57 0 0 1 107.14 42.9c24.73 23.81 41.5 55.28 49.18 92a16 16 0 0 0 12.12 12.39C470 237.42 512 270.43 512 328c0 33.39-12.24 60.78-35.41 79.23C456.23 423.43 428.37 432 396 432';
export const CLOUD_GLYPH_URL = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><path fill='#ffffff' d='${CLOUD_GLYPH_PATH}'/></svg>`)}")`;

/**
 * The state badge at the cloud circle's top right (#64), in Home canvas px (the page's d units): a dot in the state's
 * colour (CLOUD_COLOURS) with a dark ring so it reads over bright art, its outer edge on the circle's bounding box.
 */
export const CLOUD_DOT = { size: 12, ring: 2, inset: 0, ringColour: 'rgba(0, 0, 0, 0.75)' } as const;

/** The icon on a focused (white) cloud circle on the game page, which only takes focus on a sync problem: 6.6:1 on white. */
export const CLOUD_FOCUS_BAD = '#b3261e';

/**
 * The cloud state to show for `appId`: the one read for it (`state`), or, while `state` is still another game's (the
 * selection just moved, its poll not yet run), the new game's read now. Returning none for that render removed the cloud
 * button for a frame on every switch, and it flickered back as if reloading while the other buttons stayed. Pure.
 */
export function cloudFor(state: { id: number | null; cloud: CloudState | null }, appId: number | null, read: (appId: number) => CloudState | null): CloudState | null {
    if (appId === null) return null;
    return state.id === appId ? state.cloud : read(appId);
}
