import type { Stop } from '../model';

/**
 * Steam's install folders (`SteamClient.InstallFolder`) as a plain snapshot and three commands
 * (spec 2026-11-13-console-settings-design, Part 2). Field names and codes as Steam's own Storage page uses them
 * (read from Steam's UI code, ledger 2026-11-16-console-settings-part2-storage). Drive labels and folder paths
 * are shown, never logged.
 */
export interface StorageGame { appId: number; name: string; bytes: number; /** unix seconds, 0 = never */ lastPlayed: number }
export interface StorageDrive { index: number; name: string; kind: 'internal' | 'sd' | 'other'; freeBytes: number; capacityBytes: number;
    /** Biggest first, then name. */ games: StorageGame[] }
export interface StorageMove { appId: number; /** -1 when Steam reported a move we did not start. */ toIndex: number; movedBytes: number; totalBytes: number; secondsLeft: number | null }
export interface StorageSnapshot { available: boolean; /** Before the first answer from Steam. */ loading: boolean; drives: StorageDrive[]; move: StorageMove | null; runningAppId: number | null;
    /** The last move that ended in an error, until the next move starts. */ failedMove: number | null }
export type MoveStart = 'started' | 'busy' | 'running' | 'no-space' | 'failed' | 'cancelled';
export interface StorageBindings {
    read(): StorageSnapshot; subscribe(listener: Stop): Stop;
    /** Starts Steam's uninstall; the caller has already asked the player. */ uninstall(appId: number): boolean;
    move(appId: number, toIndex: number): Promise<MoveStart>; cancelMove(): void;
}
interface Registration { unregister?(): void }
interface InstallFolderApi {
    GetInstallFolders?(): Promise<unknown>;
    RegisterForInstallFolderChanges?(cb: () => void): Registration;
    RegisterForMoveContentProgress?(cb: (progress: unknown) => void): Registration;
    MoveInstallFolderForApp?(appId: number, folderIndex: number): Promise<unknown>;
    CancelMove?(): void;
}
interface Timers { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout }

/** EAppUpdateError, as Steam's move dialog reads it: 0 done, 3 cancelled, 20 (Busy) still moving, anything else failed. */
const DONE = 0, CANCELLED = 3, MOVING = 20;
/** Steam reports a move several times a second; this long without a word, the move is treated as failed. */
const STALL_MS = 60_000;
/** A move remembered from an earlier visit gets this long for Steam's next report, then goes without blame (why it ended is unknown). */
const GRACE_MS = 10_000;
/** Steam's own remote client id for this machine. */
const LOCAL_CLIENT = '0';

const api = (steam: unknown): InstallFolderApi | undefined => {
    try { return (steam as { InstallFolder?: InstallFolderApi } | undefined)?.InstallFolder; } catch { return undefined; }
};
export function storageAvailable(steam: unknown): boolean {
    return typeof api(steam)?.GetInstallFolders === 'function';
}

const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };
const text = (value: unknown) => typeof value === 'string' ? value : '';
function toDrive(raw: unknown): StorageDrive | null {
    if (!raw || typeof raw !== 'object') return null;
    const f = raw as Record<string, unknown>;
    const index = Number(f.nFolderIndex);
    if (!Number.isInteger(index) || index < 0 || f.bIsMounted === false) return null;
    const path = text(f.strFolderPath), device = text(f.strDriveName), label = text(f.strUserLabel).trim();
    // Steam's own rules: folder 0 is the internal drive, an mmcblk device is the SD card.
    const kind: StorageDrive['kind'] = index === 0 ? 'internal' : device.startsWith('/run/media/mmcblk') || device.includes('mmcblk') || path.includes('mmcblk') ? 'sd' : 'other';
    const name = kind === 'internal' ? 'Internal drive' : kind === 'sd' ? label ? `SD card · ${label}` : 'SD card'
        : label || path.split('/').filter(Boolean).pop() || `Drive ${index + 1}`;
    const games: StorageGame[] = [];
    for (const a of Array.isArray(f.vecApps) ? f.vecApps : []) {
        const appId = Number((a as Record<string, unknown>)?.nAppID);
        if (!Number.isInteger(appId) || appId <= 0) continue;
        const g = a as Record<string, unknown>;
        games.push({ appId, name: text(g.strAppName) || `App ${appId}`, bytes: num(g.nUsedSize), lastPlayed: num(g.rtLastPlayed) });
    }
    games.sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
    return { index, name, kind, freeBytes: num(f.nFreeSpace), capacityBytes: num(f.nCapacity), games };
}

export function createStorageBindings(steam: unknown, ui: unknown, timers: Timers = globalThis): StorageBindings {
    let drives: StorageDrive[] | null = null, move: StorageMove | null = null, failedMove: number | null = null, version = 0, loaded = false, cancelled: number | null = null;
    const listeners = new Set<Stop>();
    const changed = () => { version++; listeners.forEach(l => l()); };
    const running = (): number | null => {
        try { const id = (ui as { MainRunningAppID?: unknown } | undefined)?.MainRunningAppID; return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null; } catch { return null; }
    };
    // React's useSyncExternalStore needs the same object back while nothing changed.
    let last: StorageSnapshot = { available: false, loading: true, drives: [], move: null, runningAppId: null, failedMove: null }, lastVersion = -1, lastRunning: number | null = null;
    function read(): StorageSnapshot {
        const runningAppId = running();
        if (version !== lastVersion || runningAppId !== lastRunning) {
            lastVersion = version; lastRunning = runningAppId;
            last = drives ? { available: true, loading: false, drives, move, runningAppId, failedMove } : { available: false, loading: !loaded, drives: [], move: null, runningAppId: null, failedMove: null };
        }
        return last;
    }
    const find = (appId: number) => {
        for (const d of drives ?? []) { const game = d.games.find(g => g.appId === appId); if (game) return { drive: d, game }; }
        return null;
    };
    let loading = 0;
    async function load() {
        const ticket = ++loading;
        let next: StorageDrive[] | null = null;
        try {
            const raw = await api(steam)?.GetInstallFolders?.();
            const mapped = Array.isArray(raw) ? raw.map(toDrive).filter((d): d is StorageDrive => d !== null).sort((a, b) => a.index - b.index) : [];
            // No usable drive is the same as no answer: the page says Storage is unavailable.
            next = mapped.length ? mapped : null;
        } catch { next = null; }
        if (ticket !== loading) return;
        drives = next; loaded = true;
        if (move) move = settle(move);
        // A finished move shows as the game on the target drive.
        if (move && move.toIndex >= 0 && drives?.find(d => d.index === move!.toIndex)?.games.some(g => g.appId === move!.appId)) endMove(null);
        changed();
    }
    /** Steam's last progress for the move, 0–1: kept apart from bytes, since the size may only be known once the drives load. */
    let share = 0;
    /** Fills what a picked-up move lacks: its size from the drives, and its target when only one other drive exists. */
    function settle(m: StorageMove): StorageMove {
        const found = find(m.appId);
        const totalBytes = m.totalBytes || found?.game.bytes || 0;
        const others = found ? (drives ?? []).filter(d => d.index !== found.drive.index) : [];
        const toIndex = m.toIndex >= 0 ? m.toIndex : others.length === 1 ? others[0].index : -1;
        return { ...m, toIndex, totalBytes, movedBytes: totalBytes * share };
    }
    let stall: ReturnType<typeof setTimeout> | undefined;
    function watchStall(ms = STALL_MS, blame = true) {
        if (stall) timers.clearTimeout(stall);
        stall = timers.setTimeout(() => { stall = undefined; if (move) { failedMove = blame ? move.appId : null; move = null; changed(); } }, ms);
    }
    function endMove(failed: number | null) {
        if (stall) { timers.clearTimeout(stall); stall = undefined; }
        move = null; failedMove = failed;
    }
    function onProgress(raw: unknown) {
        try {
            const p = raw as { appid?: unknown; eError?: unknown; flProgress?: unknown };
            const appId = Number(p?.appid), code = Number(p?.eError);
            if (!Number.isInteger(appId) || appId <= 0) return;
            if (code === MOVING) {
                share = Math.max(0, Math.min(100, Number(p.flProgress) || 0)) / 100;
                move = settle({ appId, toIndex: move?.appId === appId ? move.toIndex : -1, movedBytes: 0, totalBytes: move?.appId === appId ? move.totalBytes : 0, secondsLeft: null });
                failedMove = null;
                watchStall();
            } else if (move?.appId === appId) endMove(code === DONE || code === CANCELLED ? null : appId);
            else return;
            changed();
        } catch { /* A report we cannot read changes nothing. */ }
    }
    let registrations: Registration[] = [];
    function subscribe(listener: Stop): Stop {
        listeners.add(listener);
        if (listeners.size === 1) {
            const folders = api(steam);
            registrations = [];
            try { const r = folders?.RegisterForInstallFolderChanges?.(() => { void load(); }); if (r) registrations.push(r); } catch { /* No live updates. */ }
            try { const r = folders?.RegisterForMoveContentProgress?.(onProgress); if (r) registrations.push(r); } catch { /* No progress. */ }
            // A move from an earlier visit may have ended while nobody listened: Steam's next report keeps it, silence drops it.
            if (move) watchStall(GRACE_MS, false);
            void load();
        }
        return () => {
            if (!listeners.delete(listener) || listeners.size) return;
            for (const r of registrations) { try { r.unregister?.(); } catch { /* Steam drops it with the page. */ } }
            registrations = [];
            // Steam's move goes on; its next report brings the progress back.
            if (stall) { timers.clearTimeout(stall); stall = undefined; }
        };
    }
    async function startMove(appId: number, toIndex: number): Promise<MoveStart> {
        if (appId === running()) return 'running';
        if (move) return 'busy';
        const found = find(appId), target = drives?.find(d => d.index === toIndex);
        const call = api(steam)?.MoveInstallFolderForApp;
        if (!found || !target || target.index === found.drive.index || typeof call !== 'function') return 'failed';
        if (target.freeBytes < found.game.bytes) return 'no-space';
        move = { appId, toIndex, movedBytes: 0, totalBytes: found.game.bytes, secondsLeft: null };
        failedMove = null; cancelled = null; share = 0;
        watchStall();
        changed();
        try { await call.call(api(steam), appId, toIndex); return 'started'; } catch {
            // Steam's call may settle when the move ends: a cancel is not a failure.
            if (cancelled === appId) return 'cancelled';
            if (move?.appId === appId) { endMove(appId); changed(); }
            else if (failedMove !== appId) { failedMove = appId; changed(); }
            return 'failed';
        }
    }
    function cancelMove() {
        if (!move) return;
        cancelled = move.appId;
        try { api(steam)?.CancelMove?.(); } catch { /* Steam's next report says how it ended. */ }
        endMove(null);
        changed();
    }
    function uninstall(appId: number): boolean {
        if (appId === running()) return false;
        try {
            const installs = (steam as { Installs?: { OpenUninstallWizard?(ids: number[], client: string, confirmed: boolean): void } }).Installs;
            if (typeof installs?.OpenUninstallWizard !== 'function') return false;
            // As Steam's own dialog calls it once the player has said yes. The row goes when Steam reports the folder change.
            installs.OpenUninstallWizard([appId], LOCAL_CLIENT, true);
            return true;
        } catch { return false; }
    }
    return { read, subscribe, uninstall, move: startMove, cancelMove };
}
