import { LOG_PREFIX } from '../constants';
import { BatteryView, connectionKind, ConnectionKind, NetworkDevices, readBattery, readConnectivity, readNetworkDevices } from './statusItems';

/**
 * The battery and connection for Spotlight Home's status bar, from three Steam callbacks
 * (SteamClient.System.RegisterForBatteryStateChanges, and System.Network's RegisterForConnectivityTestChanges and
 * RegisterForDeviceChanges). Started by the first status bar and kept for the plugin's lifetime, so the state is
 * already known when Home opens again (some of these fire only on a change); `stopStatus` unregisters on unload. A
 * missing API leaves its item unknown, and the bar leaves it out.
 */

type Registration = { unregister?(): void } | undefined;
type SystemApi = {
    RegisterForBatteryStateChanges?(cb: (state: unknown) => void): Registration;
    Network?: {
        RegisterForConnectivityTestChanges?(cb: (change: unknown) => void): Registration;
        RegisterForDeviceChanges?(cb: (data: unknown) => void): Registration;
    };
};
const api = () => (globalThis as unknown as { SteamClient?: { System?: SystemApi } }).SteamClient?.System;

export interface StatusState {
    battery: BatteryView | null;
    connection: ConnectionKind | null;
}

let battery: BatteryView | null = null;
let online: boolean | null = null;
let devices: NetworkDevices | null = null;
let state: StatusState = { battery: null, connection: null };
let registrations: Registration[] | null = null;
const listeners = new Set<() => void>();

function guard<T>(what: string, fn: () => T): T | undefined {
    try {
        return fn();
    } catch (error) {
        console.warn(`${LOG_PREFIX} status bar: ${what} failed`, error);
        return undefined;
    }
}

const sameBattery = (a: BatteryView | null, b: BatteryView | null) =>
    a === b || (a !== null && b !== null && a.percent === b.percent && a.charging === b.charging && a.low === b.low);

/** Recomputes the shown state; listeners hear only real changes. */
function refresh() {
    const next: StatusState = { battery, connection: connectionKind(online, devices) };
    if (sameBattery(next.battery, state.battery) && next.connection === state.connection) return;
    state = next;
    listeners.forEach((fn) => guard('a listener', fn));
}

/** Subscribes to Steam's callbacks, once per plugin lifetime (until `stopStatus`). */
export function startStatus() {
    if (registrations) return;
    const system = api();
    registrations = [
        guard('battery subscription', () => system?.RegisterForBatteryStateChanges?.((raw) => {
            battery = guard('battery state', () => readBattery(raw)) ?? null;
            refresh();
        })),
        guard('connectivity subscription', () => system?.Network?.RegisterForConnectivityTestChanges?.((raw) => {
            const next = guard('connectivity', () => readConnectivity(raw));
            // A test in progress (or an unknown answer) keeps the last verdict.
            if (next !== null && next !== undefined) online = next;
            refresh();
        })),
        guard('device subscription', () => system?.Network?.RegisterForDeviceChanges?.((raw) => {
            devices = guard('network devices', () => readNetworkDevices(raw)) ?? devices;
            refresh();
        })),
    ];
}

/** Unsubscribes and forgets everything (plugin unload). */
export function stopStatus() {
    for (const r of registrations ?? []) guard('unsubscribe', () => r?.unregister?.());
    registrations = null;
    battery = null;
    online = null;
    devices = null;
    state = { battery: null, connection: null };
}

export const statusState = (): StatusState => state;

export function subscribeStatus(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
