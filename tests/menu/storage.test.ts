import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStorageBindings, storageAvailable, type StorageSnapshot } from '../../src/menu/steam/storage';

const GB = 1e9;
const SECRET_PATH = '/run/media/mmcblk0p1/private-folder', SECRET_LABEL = 'Private label';
interface App { nAppID: number; strAppName: string; nUsedSize: number | string; nDLCSize?: number; rtLastPlayed: number }
interface Folder { nFolderIndex: number; strFolderPath: string; strUserLabel: string; strDriveName: string; nCapacity: number | string; nFreeSpace: number | string;
    bIsDefaultFolder: boolean; bIsMounted: boolean; bIsFixed: boolean; vecApps: App[] }
const app = (id: number, name: string, gb: number, rtLastPlayed = 0): App => ({ nAppID: id, strAppName: name, nUsedSize: gb * GB, nDLCSize: 0, rtLastPlayed });
const internal = (apps: App[], extra: Partial<Folder> = {}): Folder => ({ nFolderIndex: 0, strFolderPath: '/home/deck/.local/share/Steam', strUserLabel: '', strDriveName: '/dev/nvme0n1p8',
    nCapacity: 465 * GB, nFreeSpace: 111 * GB, bIsDefaultFolder: true, bIsMounted: true, bIsFixed: true, vecApps: apps, ...extra });
const sd = (apps: App[], extra: Partial<Folder> = {}): Folder => ({ nFolderIndex: 1, strFolderPath: SECRET_PATH, strUserLabel: '', strDriveName: '/run/media/mmcblk0p1',
    nCapacity: 512 * GB, nFreeSpace: 12 * GB, bIsDefaultFolder: false, bIsMounted: true, bIsFixed: false, vecApps: apps, ...extra });

function fakeSteam(folders: unknown) {
    let onChange: (() => void) | null = null, onProgress: ((p: unknown) => void) | null = null;
    const unregisterChange = vi.fn(), unregisterProgress = vi.fn();
    const steam = {
        InstallFolder: {
            GetInstallFolders: vi.fn(async () => typeof folders === 'function' ? (folders as () => unknown)() : folders),
            RegisterForInstallFolderChanges: vi.fn((cb: () => void) => { onChange = cb; return { unregister: unregisterChange }; }),
            RegisterForMoveContentProgress: vi.fn((cb: (p: unknown) => void) => { onProgress = cb; return { unregister: unregisterProgress }; }),
            MoveInstallFolderForApp: vi.fn(async () => undefined),
            CancelMove: vi.fn(),
        },
        Installs: { OpenUninstallWizard: vi.fn() },
    };
    return { steam, change: () => onChange?.(), progress: (p: unknown) => onProgress?.(p), unregisterChange, unregisterProgress };
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
async function loaded(folders: unknown, ui: unknown = {}) {
    const fake = fakeSteam(folders);
    const bindings = createStorageBindings(fake.steam, ui);
    const stop = bindings.subscribe(() => {});
    await flush();
    return { ...fake, bindings, stop };
}
const UNAVAILABLE: StorageSnapshot = { available: false, loading: false, drives: [], move: null, runningAppId: null, failedMove: null };
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('storageAvailable', () => {
    it('needs GetInstallFolders', () => {
        expect(storageAvailable(undefined)).toBe(false);
        expect(storageAvailable({ InstallFolder: {} })).toBe(false);
        expect(storageAvailable(fakeSteam([]).steam)).toBe(true);
        expect(storageAvailable({ get InstallFolder(): unknown { throw Error('boom'); } })).toBe(false);
    });
});

describe('read', () => {
    it('is unavailable before the first load and on every failure', async () => {
        expect(createStorageBindings(fakeSteam([internal([])]).steam, {}).read()).toEqual({ ...UNAVAILABLE, loading: true });
        expect((await loaded([{}])).bindings.read()).toEqual(UNAVAILABLE);
        expect((await loaded([])).bindings.read()).toEqual(UNAVAILABLE);
        expect((await loaded(undefined)).bindings.read()).toEqual(UNAVAILABLE);
        expect((await loaded({ nope: 1 })).bindings.read()).toEqual(UNAVAILABLE);
        expect((await loaded(() => { throw Error('boom'); })).bindings.read()).toEqual(UNAVAILABLE);
        expect((await loaded(() => Promise.reject(Error('boom')))).bindings.read()).toEqual(UNAVAILABLE);
        const none = createStorageBindings(undefined, undefined);
        none.subscribe(() => {}); await flush();
        expect(none.read()).toEqual(UNAVAILABLE);
    });
    it('maps folders to drives, leaving unmounted ones out', async () => {
        const { bindings } = await loaded([
            internal([app(10, 'Small', 2), app(11, 'Big', 65, 1_700_000_000), app(12, 'Also big', 65)]),
            sd([app(20, 'On card', 39.6)], { nCapacity: String(512 * GB), nFreeSpace: String(12 * GB) }),
            { ...sd([], { nFolderIndex: 2, strUserLabel: 'Gone' }), bIsMounted: false },
        ]);
        const snap = bindings.read();
        expect(snap.available).toBe(true);
        expect(snap.drives.map(d => [d.index, d.name, d.kind, d.freeBytes, d.capacityBytes])).toEqual([
            [0, 'Internal drive', 'internal', 111 * GB, 465 * GB],
            [1, 'SD card', 'sd', 12 * GB, 512 * GB],
        ]);
        expect(snap.drives[0].games).toEqual([
            { appId: 12, name: 'Also big', bytes: 65 * GB, lastPlayed: 0 },
            { appId: 11, name: 'Big', bytes: 65 * GB, lastPlayed: 1_700_000_000 },
            { appId: 10, name: 'Small', bytes: 2 * GB, lastPlayed: 0 },
        ]);
    });
    it('names drives as Steam does', async () => {
        const { bindings } = await loaded([
            internal([]),
            sd([], { strUserLabel: 'Games' }),
            sd([], { nFolderIndex: 2, strDriveName: '/dev/sda1', strFolderPath: '/run/media/deck/USB', bIsFixed: true, strUserLabel: 'USB disk' }),
            sd([], { nFolderIndex: 3, strDriveName: '/dev/sdb1', strFolderPath: '/mnt/extra/SteamLibrary', bIsFixed: true }),
            sd([], { nFolderIndex: 4, strDriveName: '/dev/sdc1', strFolderPath: '', bIsFixed: true }),
        ]);
        expect(bindings.read().drives.map(d => [d.name, d.kind])).toEqual([
            ['Internal drive', 'internal'], ['SD card · Games', 'sd'], ['USB disk', 'other'], ['SteamLibrary', 'other'], ['Drive 5', 'other'],
        ]);
    });
    it('reports the running game', async () => {
        expect((await loaded([internal([])], { MainRunningAppID: 11 })).bindings.read().runningAppId).toBe(11);
        expect((await loaded([internal([])], { MainRunningAppID: 0 })).bindings.read().runningAppId).toBe(null);
        expect((await loaded([internal([])], { MainRunningAppID: '7' })).bindings.read().runningAppId).toBe(null);
    });
    it('returns the same object while nothing changed', async () => {
        const { bindings } = await loaded([internal([app(1, 'A', 1)])]);
        expect(bindings.read()).toBe(bindings.read());
    });
});

describe('subscribe', () => {
    it('registers once, reloads on a folder change and unregisters with the last listener', async () => {
        let folders = [internal([app(1, 'A', 1)])];
        const fake = fakeSteam(() => folders);
        const bindings = createStorageBindings(fake.steam, {});
        const a = vi.fn(), b = vi.fn();
        const stopA = bindings.subscribe(a), stopB = bindings.subscribe(b);
        await flush();
        expect(fake.steam.InstallFolder.RegisterForInstallFolderChanges).toHaveBeenCalledTimes(1);
        expect(fake.steam.InstallFolder.RegisterForMoveContentProgress).toHaveBeenCalledTimes(1);
        expect(a).toHaveBeenCalled();
        folders = [internal([])];
        fake.change(); await flush();
        expect(bindings.read().drives[0].games).toEqual([]);
        stopA();
        expect(fake.unregisterChange).not.toHaveBeenCalled();
        stopB();
        expect(fake.unregisterChange).toHaveBeenCalledTimes(1);
        expect(fake.unregisterProgress).toHaveBeenCalledTimes(1);
    });
});

describe('move', () => {
    const folders = () => [internal([app(1, 'Big', 39.6), app(2, 'Small', 2), app(3, 'Huge', 200)]), sd([], { nFreeSpace: 100 * GB })];
    it('refuses up front', async () => {
        const { bindings, steam } = await loaded(folders(), { MainRunningAppID: 2 });
        expect(await bindings.move(2, 1)).toBe('running');
        expect(await bindings.move(3, 1)).toBe('no-space');
        expect(await bindings.move(1, 9)).toBe('failed');
        expect(await bindings.move(99, 1)).toBe('failed');
        expect(steam.InstallFolder.MoveInstallFolderForApp).not.toHaveBeenCalled();
        expect(await bindings.move(1, 1)).toBe('started');
        expect(steam.InstallFolder.MoveInstallFolderForApp).toHaveBeenCalledWith(1, 1);
        expect(bindings.read().move).toEqual({ appId: 1, toIndex: 1, movedBytes: 0, totalBytes: 39.6 * GB, secondsLeft: null });
        expect(await bindings.move(1, 1)).toBe('busy');
    });
    it('fails when Steam rejects the move', async () => {
        const { bindings, steam } = await loaded(folders());
        steam.InstallFolder.MoveInstallFolderForApp.mockRejectedValueOnce(17);
        expect(await bindings.move(1, 1)).toBe('failed');
        expect(bindings.read().move).toBe(null);
    });
    it('follows progress and clears on done, cancel and error', async () => {
        const { bindings, progress } = await loaded(folders());
        await bindings.move(1, 1);
        progress({ appid: 1, eError: 20, flProgress: 61, strBytesMoved: '', strTotalBytesToMove: '' });
        expect(bindings.read().move?.movedBytes).toBeCloseTo(0.61 * 39.6 * GB);
        progress({ appid: 1, eError: 0, flProgress: 100 });
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(null);
        await bindings.move(1, 1);
        progress({ appid: 1, eError: 3 });
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(null);
        await bindings.move(1, 1);
        progress({ appid: 1, eError: 12 });
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(1);
        await bindings.move(1, 1);
        expect(bindings.read().failedMove).toBe(null);
    });
    it('clears when the folders show the game on the target', async () => {
        let current = folders();
        const { bindings, change } = await loaded(() => current);
        await bindings.move(1, 1);
        current = [internal([app(2, 'Small', 2)]), sd([app(1, 'Big', 39.6)])];
        change(); await flush();
        expect(bindings.read().move).toBe(null);
    });
    it('a move reported before the drives load gets its size and, with one other drive, its target', async () => {
        let resolve: (v: unknown) => void = () => {};
        const fake = fakeSteam(() => new Promise(r => { resolve = r; }));
        const bindings = createStorageBindings(fake.steam, {});
        bindings.subscribe(() => {});
        fake.progress({ appid: 1, eError: 20, flProgress: 34 });
        resolve(folders()); await flush();
        expect(bindings.read().move).toMatchObject({ appId: 1, toIndex: 1, totalBytes: 39.6 * GB });
        expect(bindings.read().move!.movedBytes).toBeCloseTo(0.34 * 39.6 * GB);
        fake.progress({ appid: 1, eError: 20, flProgress: 50 });
        expect(bindings.read().move!.movedBytes).toBeCloseTo(0.5 * 39.6 * GB);
    });
    it('picks up a move Steam reports that we did not start', async () => {
        const { bindings, progress } = await loaded(folders());
        progress({ appid: 2, eError: 20, flProgress: 50 });
        // Two drives: the other one is the only place it can go.
        expect(bindings.read().move).toMatchObject({ appId: 2, toIndex: 1, totalBytes: 2 * GB });
    });
    it('gives up on a move whose progress stops arriving', async () => {
        vi.useFakeTimers();
        const { bindings } = await loaded(folders());
        await bindings.move(1, 1);
        vi.advanceTimersByTime(61_000);
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(1);
    });
    it('gives a move left over from an earlier visit a short grace, then drops it without blame', async () => {
        vi.useFakeTimers();
        const { bindings, stop } = await loaded(folders());
        await bindings.move(1, 1);
        stop();
        const again = bindings.subscribe(() => {});
        await flush();
        vi.advanceTimersByTime(11_000);
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(null);
        again();
    });
    it('a cancelled move whose call then rejects reports cancelled, a rejected one keeps the blame', async () => {
        const { bindings, steam } = await loaded(folders());
        let reject: (e: unknown) => void = () => {};
        steam.InstallFolder.MoveInstallFolderForApp.mockImplementationOnce(() => new Promise((_, r) => { reject = r; }));
        const started = bindings.move(1, 1);
        bindings.cancelMove();
        reject(3);
        expect(await started).toBe('cancelled');
        expect(bindings.read().failedMove).toBe(null);
        steam.InstallFolder.MoveInstallFolderForApp.mockRejectedValueOnce(12);
        expect(await bindings.move(1, 1)).toBe('failed');
        expect(bindings.read().failedMove).toBe(1);
    });
    it('cancels', async () => {
        const { bindings, steam } = await loaded(folders());
        await bindings.move(1, 1);
        bindings.cancelMove();
        expect(steam.InstallFolder.CancelMove).toHaveBeenCalled();
        expect(bindings.read().move).toBe(null);
        expect(bindings.read().failedMove).toBe(null);
    });
});

describe('uninstall', () => {
    it('opens Steam\'s uninstall for the local client, never for the running game', async () => {
        const { bindings, steam } = await loaded([internal([app(1, 'A', 1), app(2, 'B', 1)])], { MainRunningAppID: 2 });
        expect(bindings.uninstall(2)).toBe(false);
        expect(bindings.uninstall(1)).toBe(true);
        expect(steam.Installs.OpenUninstallWizard).toHaveBeenCalledWith([1], '0', true);
        expect(bindings.read().drives[0].games).toHaveLength(2);
        const bare = await loaded([internal([app(1, 'A', 1)])]);
        (bare.steam as { Installs?: unknown }).Installs = {};
        expect(bare.bindings.uninstall(1)).toBe(false);
    });
});

describe('privacy', () => {
    it('never logs a path or label', async () => {
        const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(k => vi.spyOn(console, k).mockImplementation(() => {}));
        const { bindings, steam, progress } = await loaded([internal([app(1, 'A', 1)]), sd([], { strUserLabel: SECRET_LABEL })]);
        steam.InstallFolder.MoveInstallFolderForApp.mockRejectedValueOnce(Error(SECRET_PATH));
        await bindings.move(1, 1);
        progress({ appid: 1, eError: 12 });
        await loaded(() => { throw Error(SECRET_PATH); });
        const logged = spies.flatMap(s => s.mock.calls).flat().map(String).join(' ');
        expect(logged).not.toContain(SECRET_PATH);
        expect(logged).not.toContain(SECRET_LABEL);
    });
});
