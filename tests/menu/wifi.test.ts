import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWifiBindings, wifiSummary, type WifiSnapshot } from '../../src/menu/steam/wifi';

const SECRET = 'hunter2-secret';
interface FakeAp { type: number; state: number; key: string; showAsLocked: boolean; isSaved: boolean; deviceId: number; deviceWapId: number;
    wirelessAPInfo?: Record<string, unknown>; Disconnect?: () => Promise<boolean>; Forget?: () => Promise<boolean> }
let next = 1;
function ap(name: string, extra: Partial<FakeAp> & { strength?: number; security?: number } = {}): FakeAp {
    const id = next++;
    const { strength = 3, security = 16, ...rest } = extra;
    return { type: 2, state: 2, key: `k-${name}-${id}`, showAsLocked: security !== 0, isSaved: false, deviceId: 7, deviceWapId: id,
        wirelessAPInfo: { ssid: name, estrength: strength, esecurity: security, password: SECRET, is_saved: false, is_active: false }, ...rest };
}
function store(aps: FakeAp[], extra: Record<string, unknown> = {}) {
    return { isWifiEnabled: true, hasWirelessDevice: true, networkManagementAvailable: true, userVisibleAccessPoints: aps,
        SetWifiEnabled: vi.fn(), StartScanningForNetworks: vi.fn(), StopScanningForNetworks: vi.fn(), Connect: vi.fn(async () => true), ...extra };
}
const EMPTY: WifiSnapshot = { available: false, enabled: false, connected: null, others: [] };
afterEach(() => { vi.useRealTimers(); });

describe('read', () => {
    it('is unavailable without a usable store', () => {
        expect(createWifiBindings(undefined).read()).toEqual(EMPTY);
        expect(createWifiBindings({ isWifiEnabled: true, hasWirelessDevice: true, networkManagementAvailable: true }).read()).toEqual(EMPTY);
        expect(createWifiBindings(store([], { hasWirelessDevice: false })).read()).toEqual(EMPTY);
        expect(createWifiBindings(store([], { networkManagementAvailable: false })).read()).toEqual(EMPTY);
        const throwing = { hasWirelessDevice: true, networkManagementAvailable: true, get isWifiEnabled(): boolean { throw Error('boom'); }, userVisibleAccessPoints: [] };
        expect(createWifiBindings(throwing).read()).toEqual(EMPTY);
    });
    it('maps wireless access points only', () => {
        const wired = { ...ap('wired'), type: 1 };
        const bare = { ...ap('bare'), wirelessAPInfo: undefined };
        const home = ap('Home', { strength: 9, isSaved: true });
        const snap = createWifiBindings(store([wired, bare, home])).read();
        expect(snap.available).toBe(true);
        expect(snap.enabled).toBe(true);
        expect(snap.others).toEqual([{ key: home.key, name: 'Home', strength: 4, locked: true, saved: true, state: 'idle', needsSteam: false, minPassword: 8, security: 'WPA2' }]);
    });
    it('maps states and picks the connected network', () => {
        const aps = [ap('a', { state: 5 }), ap('b', { state: 4 }), ap('c', { state: 6 }), ap('d', { state: 1 }), ap('e', { state: 0 }), ap('f', { state: 3 })];
        const snap = createWifiBindings(store(aps)).read();
        expect(snap.connected?.name).toBe('a');
        expect(snap.connected?.state).toBe('connected');
        expect(Object.fromEntries(snap.others.map(n => [n.name, n.state]))).toEqual({ b: 'connecting', c: 'connecting', d: 'failed', f: 'idle' });
    });
    it('marks networks one password cannot join', () => {
        const need = [1, 2, 8, 32, 32768, 16 | 32];
        const fine = [0, 4, 16, 64, 4 | 16, 16 | 64];
        const aps = [...need.map(s => ap(`n${s}`, { security: s })), ...fine.map(s => ap(`f${s}`, { security: s }))];
        const snap = createWifiBindings(store(aps)).read();
        for (const n of snap.others) expect([n.name, n.needsSteam]).toEqual([n.name, n.name.startsWith('n')]);
    });
    it('asks WPA networks for at least 8 characters, others for 1', () => {
        const aps = [4, 16, 64, 16 | 64, 0].map(s => ap(`s${s}`, { security: s }));
        const snap = createWifiBindings(store(aps)).read();
        expect(Object.fromEntries(snap.others.map(n => [n.name, n.minPassword]))).toEqual({ s4: 8, s16: 8, s64: 8, s80: 8, s0: 1 });
    });
    it('names the security', () => {
        const aps = [[0, 'Open'], [4, 'WPA'], [16, 'WPA2'], [64, 'WPA3'], [80, 'WPA2/WPA3'], [8, 'Enterprise'], [32, 'Enterprise'], [1, 'WEP'], [32768, 'Unsupported']] as const;
        const snap = createWifiBindings(store(aps.map(([s]) => ap(`s${s}`, { security: s })))).read();
        expect(Object.fromEntries(snap.others.map(n => [n.name, n.security]))).toEqual(Object.fromEntries(aps.map(([s, name]) => [`s${s}`, name])));
    });
    it('orders saved first, then strength, then name, and keeps the strongest of a name', () => {
        const aps = [ap('b', { strength: 2 }), ap('a', { strength: 2 }), ap('z', { strength: 4 }), ap('s', { strength: 1, isSaved: true }),
            ap('dup', { strength: 1 }), ap('dup', { strength: 3 }), ap('tie', { strength: 2 }), ap('tie', { strength: 2, isSaved: true })];
        const snap = createWifiBindings(store(aps)).read();
        expect(snap.others.map(n => `${n.name}${n.strength}${n.saved ? 's' : ''}`)).toEqual(['tie2s', 's1s', 'z4', 'dup3', 'a2', 'b2']);
    });
    it('never carries a password', () => {
        const snap = createWifiBindings(store([ap('x', { state: 5 }), ap('y')])).read();
        expect(JSON.stringify(snap)).not.toContain(SECRET);
        expect(JSON.stringify(snap)).not.toContain('password');
    });
});

describe('subscribe', () => {
    it('polls every 500 ms, tells listeners only on change, and stops with the last listener', () => {
        vi.useFakeTimers();
        const s = store([ap('a')]);
        const wifi = createWifiBindings(s);
        const listener = vi.fn();
        const stop = wifi.subscribe(listener);
        vi.advanceTimersByTime(1000);
        expect(listener).not.toHaveBeenCalled();
        s.isWifiEnabled = false;
        vi.advanceTimersByTime(500);
        expect(listener).toHaveBeenCalledTimes(1);
        stop();
        s.isWifiEnabled = true;
        vi.advanceTimersByTime(2000);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });
});

describe('commands', () => {
    it('switches and scans once per change', () => {
        const s = store([]);
        const wifi = createWifiBindings(s);
        wifi.setEnabled(false);
        expect(s.SetWifiEnabled).toHaveBeenCalledWith(false);
        wifi.scan(true); wifi.scan(true);
        expect(s.StartScanningForNetworks).toHaveBeenCalledTimes(1);
        wifi.scan(false); wifi.scan(false);
        expect(s.StopScanningForNetworks).toHaveBeenCalledTimes(1);
        const bare = createWifiBindings({ ...store([]), SetWifiEnabled: undefined, StartScanningForNetworks: undefined, StopScanningForNetworks: undefined });
        expect(() => { bare.setEnabled(true); bare.scan(true); bare.scan(false); }).not.toThrow();
    });
    it('connects with and without a password', async () => {
        const a = ap('a');
        const s = store([a]);
        const wifi = createWifiBindings(s);
        expect(await wifi.connect(a.key)).toBe(true);
        expect(s.Connect).toHaveBeenLastCalledWith({ deviceId: 7, deviceWapId: a.deviceWapId });
        await wifi.connect(a.key, 'pw');
        expect(s.Connect).toHaveBeenLastCalledWith({ deviceId: 7, deviceWapId: a.deviceWapId, credentials: { username: '', password: 'pw' } });
        s.Connect.mockClear();
        expect(await wifi.connect('nope')).toBe(false);
        expect(s.Connect).not.toHaveBeenCalled();
    });
    it('resolves false when Steam fails or never answers', async () => {
        const a = ap('a');
        expect(await createWifiBindings(store([a], { Connect: async () => { throw Error('x'); } })).connect(a.key)).toBe(false);
        expect(await createWifiBindings(store([a], { Connect: () => { throw Error('x'); } })).connect(a.key)).toBe(false);
        vi.useFakeTimers();
        const pending = createWifiBindings(store([a], { Connect: () => new Promise(() => {}) })).connect(a.key);
        await vi.advanceTimersByTimeAsync(30000);
        expect(await pending).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });
    it('disconnects and forgets through the access point', async () => {
        const a = ap('a', { state: 5, Disconnect: vi.fn(async () => true), Forget: vi.fn(async () => false) });
        const b = ap('b');
        const wifi = createWifiBindings(store([a, b]));
        expect(await wifi.disconnect(a.key)).toBe(true);
        expect(await wifi.forget(a.key)).toBe(false);
        expect(await wifi.disconnect(b.key)).toBe(false);
        expect(await wifi.forget(b.key)).toBe(false);
    });
});

describe('wifiSummary', () => {
    const net = (name: string, state: 'connected' | 'connecting' | 'idle') => ({ key: name, name, strength: 3 as const, locked: false, saved: false, state, needsSteam: false, minPassword: 1, security: 'Open' });
    it('describes the state', () => {
        expect(wifiSummary(EMPTY)).toBe('');
        expect(wifiSummary({ ...EMPTY, available: true })).toBe('Off');
        expect(wifiSummary({ available: true, enabled: true, connected: net('Home', 'connected'), others: [] })).toBe('Home');
        expect(wifiSummary({ available: true, enabled: true, connected: null, others: [net('x', 'connecting')] })).toBe('Connecting…');
        expect(wifiSummary({ available: true, enabled: true, connected: null, others: [net('x', 'idle')] })).toBe('Not connected');
    });
});

describe('read snapshots for React', () => {
    it('returns the same object while nothing changed, a new one when something did', () => {
        const s = store([ap('a'), ap('b', { state: 5 })]);
        const wifi = createWifiBindings(s);
        const first = wifi.read();
        expect(wifi.read()).toBe(first);
        s.isWifiEnabled = false;
        expect(wifi.read()).not.toBe(first);
    });
});
