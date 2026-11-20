import { describe, expect, it } from 'vitest';
import { nextFocusKey, wifiRows } from '../../src/menu/wifiPage';
import type { WifiNetwork, WifiSnapshot } from '../../src/menu/steam/wifi';

const net = (key: string, extra: Partial<WifiNetwork> = {}): WifiNetwork => ({ key, name: key, strength: 3, locked: true, saved: false, state: 'idle', needsSteam: false, minPassword: 8, security: 'WPA2', ...extra });
const snap = (extra: Partial<WifiSnapshot> = {}): WifiSnapshot => ({ available: true, enabled: true, connected: null, others: [], ...extra });
const none = new Map<string, string>();

describe('wifiRows', () => {
    it('shows only the switch and a note when Wi-Fi is off', () => {
        expect(wifiRows(snap({ enabled: false, others: [net('a')] }), none)).toEqual([{ kind: 'switch', on: false }, { kind: 'note', text: 'Turn on Wi-Fi to see networks.' }]);
    });
    it('says it is looking when nothing is found yet', () => {
        expect(wifiRows(snap(), none)).toEqual([{ kind: 'switch', on: true }, { kind: 'note', text: 'Looking for networks…' }]);
    });
    it('lists the connected network with its actions', () => {
        const home = net('home', { state: 'connected', saved: true });
        expect(wifiRows(snap({ connected: home }), none)).toEqual([{ kind: 'switch', on: true }, { kind: 'heading', text: 'Connected' },
            { kind: 'network', network: home, status: 'Connected', actions: ['details'] }]);
        const open = net('open', { state: 'connected', saved: false, locked: false });
        expect(wifiRows(snap({ connected: open }), none)[2]).toMatchObject({ actions: ['details'] });
    });
    it('lists the others in order with what A does on each', () => {
        const others = [net('saved', { saved: true }), net('open', { locked: false }), net('locked'), net('corp', { needsSteam: true }), net('busy', { state: 'connecting' }), net('bad')];
        const rows = wifiRows(snap({ others }), new Map([['bad', "Couldn't connect."]]));
        expect(rows.slice(0, 2)).toEqual([{ kind: 'switch', on: true }, { kind: 'heading', text: 'Other networks' }]);
        expect(rows.slice(2).map(r => r.kind === 'network' && [r.network.key, r.status, r.actions])).toEqual([
            ['saved', 'Saved', ['details']], ['open', '', ['join']], ['locked', '', ['password']],
            ['corp', 'Set up in Steam settings', ['steam']], ['busy', 'Connecting…', []], ['bad', "Couldn't connect.", ['password']]]);
    });
});

describe('nextFocusKey', () => {
    it('keeps focus on the same network, else the row now at its place', () => {
        expect(nextFocusKey(['a', 'b', 'c'], ['c', 'b', 'a'], 'b')).toBe('b');
        expect(nextFocusKey(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c');
        expect(nextFocusKey(['a', 'b', 'c'], ['a', 'b'], 'c')).toBe('b');
        expect(nextFocusKey(['a'], [], 'a')).toBeNull();
    });
});

import { vi } from 'vitest';
import { createWifiPage } from '../../src/menu/wifiPage';
import type { WifiBindings } from '../../src/menu/steam/wifi';

function fakeWifi(snapshot: WifiSnapshot) {
    let current = snapshot; const listeners = new Set<() => void>();
    const wifi = { read: () => current, subscribe: vi.fn((l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; }),
        setEnabled: vi.fn(), scan: vi.fn(), connect: vi.fn(async () => true), disconnect: vi.fn(async () => true), forget: vi.fn(async () => true) };
    return { wifi: wifi as typeof wifi & WifiBindings, set(next: WifiSnapshot) { current = next; listeners.forEach(l => l()); }, listeners };
}
const flush = () => new Promise(r => setTimeout(r, 0));

describe('createWifiPage', () => {
    it('scans while started, and stops on stop or when Wi-Fi is switched off', () => {
        const f = fakeWifi(snap());
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet: vi.fn() }, vi.fn());
        const stop = page.start();
        expect(f.wifi.scan).toHaveBeenLastCalledWith(true);
        page.setEnabled(false);
        expect(f.wifi.setEnabled).toHaveBeenCalledWith(false);
        expect(f.wifi.scan).toHaveBeenLastCalledWith(false);
        f.set(snap({ enabled: false }));
        page.setEnabled(true);
        expect(f.wifi.setEnabled).toHaveBeenLastCalledWith(true);
        f.set(snap());
        expect(f.wifi.scan).toHaveBeenLastCalledWith(true);
        stop();
        expect(f.wifi.scan).toHaveBeenLastCalledWith(false);
        expect(f.listeners.size).toBe(0);
    });
    it('joins, asks for a password, and records failures until the next try or a connection', async () => {
        const locked = net('locked'), open = net('open', { locked: false });
        const f = fakeWifi(snap({ others: [locked, open] }));
        let answer: string | null = null;
        const askPassword = vi.fn(async () => answer);
        const page = createWifiPage({ wifi: f.wifi, askPassword, openSteamInternet: vi.fn() }, vi.fn());
        page.start();
        const row = (key: string) => page.rows().find(r => r.kind === 'network' && r.network.key === key)!;
        page.activate(row('open')); await flush();
        expect(f.wifi.connect).toHaveBeenLastCalledWith('open');
        page.activate(row('locked')); await flush();
        expect(askPassword).toHaveBeenCalledWith(locked);
        expect(f.wifi.connect).toHaveBeenCalledTimes(1);
        answer = 'secret12';
        f.wifi.connect.mockResolvedValueOnce(false);
        page.activate(row('locked')); await flush();
        expect(f.wifi.connect).toHaveBeenLastCalledWith('locked', 'secret12');
        expect(row('locked')).toMatchObject({ status: "Couldn't connect. Check the password." });
        f.wifi.connect.mockResolvedValueOnce(false);
        page.activate(row('open')); await flush();
        expect(row('open')).toMatchObject({ status: "Couldn't connect." });
        let release!: (ok: boolean) => void;
        f.wifi.connect.mockReturnValueOnce(new Promise<boolean>(r => { release = r; }));
        page.activate(row('open'));
        expect(row('open')).toMatchObject({ status: '' });
        release(true); await flush();
        f.set(snap({ connected: { ...locked, state: 'connected' }, others: [open] }));
        f.set(snap({ others: [locked, open] }));
        expect(row('locked')).toMatchObject({ status: '' });
    });
    it('opens the page of a connected or saved network', () => {
        const home = net('home', { state: 'connected', saved: true }), saved = net('saved', { saved: true });
        const f = fakeWifi(snap({ connected: home, others: [saved] }));
        const openNetwork = vi.fn();
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet: vi.fn(), openNetwork }, vi.fn());
        page.start();
        page.activate(page.rows()[2]);
        expect(openNetwork).toHaveBeenLastCalledWith('home');
        page.activate(page.rows()[4]);
        expect(openNetwork).toHaveBeenLastCalledWith('saved');
        expect(f.wifi.connect).not.toHaveBeenCalled();
    });
    it('sends networks one password cannot join to Steam', () => {
        const openSteamInternet = vi.fn();
        const f = fakeWifi(snap({ others: [net('corp', { needsSteam: true })] }));
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet }, vi.fn());
        page.start();
        page.activate(page.rows()[2]);
        expect(openSteamInternet).toHaveBeenCalled();
        expect(f.wifi.connect).not.toHaveBeenCalled();
    });
    it('tells nobody after it stopped', async () => {
        const f = fakeWifi(snap({ others: [net('open', { locked: false })] }));
        const changed = vi.fn();
        let release!: (ok: boolean) => void;
        f.wifi.connect.mockReturnValueOnce(new Promise<boolean>(r => { release = r; }));
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet: vi.fn() }, changed);
        const stop = page.start();
        page.activate(page.rows()[2]);
        stop(); changed.mockClear();
        release(false); await flush();
        expect(changed).not.toHaveBeenCalled();
    });
});

import { lostFocusKey } from '../../src/menu/wifiPage';

describe('review fixes', () => {
    it('a failed attempt wins over Steam still reporting connecting', () => {
        const rows = wifiRows(snap({ others: [net('cafe', { state: 'connecting' })] }), new Map([['cafe', "Couldn't connect. Check the password."]]));
        expect(rows[2]).toMatchObject({ status: "Couldn't connect. Check the password.", actions: ['password'] });
    });
    it('refocuses only when focus was lost, even if the focused key still exists', () => {
        expect(lostFocusKey({ lost: false, before: ['a', 'b'], after: ['b'], was: 'a' })).toBeNull();
        expect(lostFocusKey({ lost: true, before: ['a', 'b'], after: ['b', 'a'], was: 'a' })).toBe('a');
        expect(lostFocusKey({ lost: true, before: ['a', 'b'], after: ['b'], was: 'a' })).toBe('b');
        expect(lostFocusKey({ lost: true, before: ['a'], after: ['a'], was: null })).toBeNull();
    });
    it('starts scanning when Wi-Fi comes on, from the page or from outside it', () => {
        const f = fakeWifi(snap({ enabled: false }));
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet: vi.fn() }, vi.fn());
        page.start();
        expect(f.wifi.scan).not.toHaveBeenCalledWith(true);
        f.set(snap({ enabled: true }));
        expect(f.wifi.scan).toHaveBeenLastCalledWith(true);
        f.set(snap({ enabled: false }));
        expect(f.wifi.scan).toHaveBeenLastCalledWith(false);
    });
    it('sends one join at a time', async () => {
        const f = fakeWifi(snap({ others: [net('open', { locked: false })] }));
        let release!: (ok: boolean) => void;
        f.wifi.connect.mockReturnValueOnce(new Promise<boolean>(r => { release = r; }));
        const page = createWifiPage({ wifi: f.wifi, askPassword: async () => null, openSteamInternet: vi.fn() }, vi.fn());
        page.start();
        page.activate(page.rows()[2]); page.activate(page.rows()[2]);
        await flush();
        expect(f.wifi.connect).toHaveBeenCalledTimes(1);
        release(true); await flush();
        page.activate(page.rows()[2]); await flush();
        expect(f.wifi.connect).toHaveBeenCalledTimes(2);
    });
});

import { wifiPageBack } from '../../src/menu/wifiPage';
describe('B on the Wi-Fi page', () => {
    it('cancels the password view, else lets the menu go back', () => {
        const cancel = vi.fn();
        expect(wifiPageBack(true, cancel)).toBe(true);
        expect(cancel).toHaveBeenCalled();
        expect(wifiPageBack(false, cancel)).toBe(false);
    });
});
