import type { Stop } from '../model';

/**
 * Steam's own network store (`window.SystemNetworkStore`) as a plain snapshot and five commands
 * (spec 2026-11-13-console-settings-design, Part 1). Steam's access points also hold a saved password in
 * clear text (`wirelessAPInfo.password`): it is never read here, and network names are never logged.
 */
export type WifiState = 'connected' | 'connecting' | 'failed' | 'idle';
export interface WifiNetwork { key: string; name: string; strength: 0 | 1 | 2 | 3 | 4; locked: boolean; saved: boolean; state: WifiState;
    /** One password cannot join it (enterprise or unsupported security): the page sends the player to Steam. */ needsSteam: boolean;
    /** The shortest password Join accepts: 8 for the WPA family (WPA, WPA2, WPA3), else 1. */ minPassword: number;
    /** Its security in words, for the network's page. */ security: string }
export interface WifiSnapshot { available: boolean; enabled: boolean; connected: WifiNetwork | null; others: WifiNetwork[] }
export interface WifiBindings {
    read(): WifiSnapshot; subscribe(listener: Stop): Stop;
    setEnabled(value: boolean): void; scan(on: boolean): void;
    connect(key: string, password?: string): Promise<boolean>; disconnect(key: string): Promise<boolean>; forget(key: string): Promise<boolean>;
}
interface Timers { setInterval: typeof setInterval; clearInterval: typeof clearInterval; setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout }
interface AccessPoint {
    type?: number; state?: number; key?: unknown; showAsLocked?: boolean; isSaved?: boolean; deviceId?: number; deviceWapId?: number;
    wirelessAPInfo?: { ssid?: unknown; estrength?: unknown; esecurity?: unknown };
    Disconnect?(): Promise<boolean>; Forget?(): Promise<boolean>;
}
interface NetworkStore {
    isWifiEnabled?: boolean; hasWirelessDevice?: boolean; networkManagementAvailable?: boolean; userVisibleAccessPoints?: AccessPoint[];
    SetWifiEnabled?(value: boolean): void; StartScanningForNetworks?(): void; StopScanningForNetworks?(): void;
    Connect?(request: { deviceId?: number; deviceWapId?: number; credentials?: { username: string; password: string } }): Promise<boolean>;
}

const EMPTY: WifiSnapshot = { available: false, enabled: false, connected: null, others: [] };
const POLL_MS = 500;
const CONNECT_TIMEOUT_MS = 30_000;
/** StaticWep 1, DynamicWep 2, WpaEnterprise 8, Wpa2Enterprise 32, Unsupported 32768. */
const NEEDS_STEAM = 1 | 2 | 8 | 32 | 32768;
/** Wpa 4, Wpa2 16, Wpa3 64. */
const WPA = 4 | 16 | 64;
const WIRELESS = 2;
function securityName(bits: number): string {
    if (bits === 0) return 'Open';
    if (bits & (8 | 32)) return 'Enterprise';
    if (bits & 16 && bits & 64) return 'WPA2/WPA3';
    if (bits & 64) return 'WPA3';
    if (bits & 16) return 'WPA2';
    if (bits & 4) return 'WPA';
    if (bits & (1 | 2)) return 'WEP';
    return 'Unsupported';
}
const STATES: Record<number, WifiState> = { 1: 'failed', 4: 'connecting', 5: 'connected', 6: 'connecting' };

function toNetwork(ap: AccessPoint): WifiNetwork | null {
    if (ap.type !== WIRELESS || !ap.wirelessAPInfo || ap.state === 0) return null;
    // Field by field: the info object also carries the saved password, which must never be copied.
    const ssid = ap.wirelessAPInfo.ssid, estrength = Number(ap.wirelessAPInfo.estrength), esecurity = Number(ap.wirelessAPInfo.esecurity) || 0;
    if (typeof ssid !== 'string' || ap.key === undefined) return null;
    const strength = Math.max(0, Math.min(4, Math.round(Number.isFinite(estrength) ? estrength : 0))) as WifiNetwork['strength'];
    return { key: String(ap.key), name: ssid, strength, locked: ap.showAsLocked === true, saved: ap.isSaved === true,
        state: STATES[ap.state ?? -1] ?? 'idle', needsSteam: (esecurity & NEEDS_STEAM) !== 0, minPassword: esecurity & WPA ? 8 : 1, security: securityName(esecurity) };
}
const better = (a: WifiNetwork, b: WifiNetwork) => Number(b.saved) - Number(a.saved) || b.strength - a.strength;
const order = (a: WifiNetwork, b: WifiNetwork) => better(a, b) || a.name.localeCompare(b.name) || a.key.localeCompare(b.key);

export function createWifiBindings(source: unknown, timers: Timers = globalThis): WifiBindings {
    const store = () => source as NetworkStore | undefined;
    const points = (): AccessPoint[] => {
        try { const list = store()?.userVisibleAccessPoints; return Array.isArray(list) ? list : []; } catch { return []; }
    };
    const find = (key: string) => points().find(ap => { try { return String(ap.key) === key; } catch { return false; } });
    // React's useSyncExternalStore needs the same object back while nothing changed, or it renders forever.
    let last: WifiSnapshot = EMPTY, lastKey = JSON.stringify(EMPTY);
    function read(): WifiSnapshot {
        const next = compute(), key = JSON.stringify(next);
        if (key !== lastKey) { last = next; lastKey = key; }
        return last;
    }
    function compute(): WifiSnapshot {
        try {
            const s = store();
            if (!s || !s.hasWirelessDevice || !s.networkManagementAvailable || !Array.isArray(s.userVisibleAccessPoints)) return EMPTY;
            const enabled = s.isWifiEnabled === true;
            const networks = s.userVisibleAccessPoints.map(toNetwork).filter((n): n is WifiNetwork => n !== null);
            const connected = networks.find(n => n.state === 'connected') ?? null;
            const byName = new Map<string, WifiNetwork>();
            for (const n of networks) {
                if (n === connected) continue;
                const kept = byName.get(n.name);
                if (!kept || better(n, kept) < 0) byName.set(n.name, n);
            }
            return { available: true, enabled, connected, others: [...byName.values()].sort(order) };
        } catch { return EMPTY; }
    }
    const listeners = new Set<Stop>();
    let poll: ReturnType<typeof setInterval> | undefined, fingerprint = '';
    function subscribe(listener: Stop): Stop {
        listeners.add(listener);
        if (!poll) {
            fingerprint = JSON.stringify(read());
            poll = timers.setInterval(() => {
                const next = JSON.stringify(read());
                if (next === fingerprint) return;
                fingerprint = next;
                listeners.forEach(l => l());
            }, POLL_MS);
        }
        return () => {
            listeners.delete(listener);
            if (!listeners.size && poll) { timers.clearInterval(poll); poll = undefined; }
        };
    }
    let scanning = false;
    function scan(on: boolean) {
        if (on === scanning) return;
        scanning = on;
        try { if (on) store()?.StartScanningForNetworks?.(); else store()?.StopScanningForNetworks?.(); } catch { /* The list simply stops growing. */ }
    }
    function setEnabled(value: boolean) {
        try { store()?.SetWifiEnabled?.(value); } catch { /* The switch shows Steam's state, which did not change. */ }
    }
    function connect(key: string, password?: string): Promise<boolean> {
        const ap = find(key), s = store();
        if (!ap || typeof s?.Connect !== 'function') return Promise.resolve(false);
        return new Promise<boolean>(resolve => {
            const timeout = timers.setTimeout(() => resolve(false), CONNECT_TIMEOUT_MS);
            const done = (ok: boolean) => { timers.clearTimeout(timeout); resolve(ok); };
            try {
                const request = password === undefined ? { deviceId: ap.deviceId, deviceWapId: ap.deviceWapId }
                    : { deviceId: ap.deviceId, deviceWapId: ap.deviceWapId, credentials: { username: '', password } };
                Promise.resolve(s.Connect!(request)).then(ok => done(ok === true), () => done(false));
            } catch { done(false); }
        });
    }
    async function call(key: string, method: 'Disconnect' | 'Forget'): Promise<boolean> {
        const ap = find(key);
        try { return typeof ap?.[method] === 'function' ? (await ap[method]!()) === true : false; } catch { return false; }
    }
    return { read, subscribe, setEnabled, scan, connect, disconnect: key => call(key, 'Disconnect'), forget: key => call(key, 'Forget') };
}

/** The Quick settings row's state line. */
export function wifiSummary(snapshot: WifiSnapshot): string {
    if (!snapshot.available) return '';
    if (!snapshot.enabled) return 'Off';
    if (snapshot.connected) return snapshot.connected.name;
    return snapshot.others.some(n => n.state === 'connecting') ? 'Connecting…' : 'Not connected';
}
