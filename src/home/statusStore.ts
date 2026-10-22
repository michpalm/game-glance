import { callable } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { BatteryView, connectionKind, ConnectionKind, ControllerBatteryView, NetworkDevices, readBattery, readConnectivity, readControllerBatteries, readNetworkDevices } from './statusItems';

/**
 * The battery and connection for Spotlight Home's status bar, from three Steam callbacks
 * (SteamClient.System.RegisterForBatteryStateChanges, and System.Network's RegisterForConnectivityTestChanges and
 * RegisterForDeviceChanges). Started by the first status bar and kept for the plugin's lifetime, so the state is
 * already known when Home opens again (some of these fire only on a change); `stopStatus` unregisters on unload. A
 * missing API leaves its item unknown, and the bar leaves it out.
 *
 * Bluetooth controllers' batteries come from the backend (BlueZ; Steam's own controller level is a placeholder for some
 * controllers): read when the first status bar subscribes, then every CONTROLLER_POLL_MS while one is subscribed.
 */

type Registration = { unregister?(): void } | undefined;
type SystemApi = {
    RegisterForBatteryStateChanges?(cb: (state: unknown) => void): Registration;
    Network?: {
        RegisterForConnectivityTestChanges?(cb: (change: unknown) => void): Registration;
        RegisterForDeviceChanges?(cb: (data: unknown) => void): Registration;
    };
};
const getControllers = callable<[], unknown>('get_controller_batteries');

/** How often the controllers' batteries are read while a status bar is shown; they change slowly. */
export const CONTROLLER_POLL_MS = 60_000;

/**
 * How long after Steam reports a controller change (connect or disconnect) the batteries are read: Steam reports a
 * reconnect twice within 0.2 s (Ally, 2026-10-22), and BlueZ needs a moment to publish the new controller's battery.
 */
export const CONTROLLER_CHANGE_DELAY_MS = 2_000;

type InputApi = { RegisterForUnboundControllerListChanges?(cb: () => void): Registration };
const inputApi = () => (globalThis as unknown as { SteamClient?: { Input?: InputApi } }).SteamClient?.Input;

/** A read with no reply by then is given up (the backend's own busctl times out after 2 s; this covers a lost reply). */
export const CONTROLLER_REPLY_TIMEOUT_MS = 10_000;

const api = () => (globalThis as unknown as { SteamClient?: { System?: SystemApi } }).SteamClient?.System;

export interface StatusState {
    battery: BatteryView | null;
    connection: ConnectionKind | null;
    /** Connected Bluetooth controllers, lowest battery first; [] when none or unknown. */
    controllers: ControllerBatteryView[];
}

let battery: BatteryView | null = null;
let online: boolean | null = null;
let devices: NetworkDevices | null = null;
let controllers: ControllerBatteryView[] = [];
let state: StatusState = { battery: null, connection: null, controllers: [] };
let pollTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;
let pollRun = 0;
let changeRegistration: Registration | null = null;
let changeTimer: ReturnType<typeof setTimeout> | null = null;
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

const sameControllers = (a: ControllerBatteryView[], b: ControllerBatteryView[]) =>
    a.length === b.length && a.every((c, i) => c.name === b[i].name && c.percent === b[i].percent);

/** Recomputes the shown state; listeners hear only real changes. */
function refresh() {
    const next: StatusState = { battery, connection: connectionKind(online, devices), controllers };
    if (sameBattery(next.battery, state.battery) && next.connection === state.connection && sameControllers(next.controllers, state.controllers)) return;
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

/** One read of the controllers' batteries; skipped while one is still running, and a read that fails keeps the last list. */
async function pollControllers() {
    if (polling) return;
    polling = true;
    const run = pollRun;
    try {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('no reply')), CONTROLLER_REPLY_TIMEOUT_MS);
        });
        const raw = await Promise.race([getControllers(), timeout]).finally(() => clearTimeout(timer));
        if (run !== pollRun) return;
        controllers = readControllerBatteries(raw);
        refresh();
    } catch (error) {
        console.warn(`${LOG_PREFIX} status bar: controller batteries failed`, error);
    } finally {
        if (run === pollRun) polling = false;
    }
}

function startControllerPolling() {
    if (pollTimer) return;
    void pollControllers();
    pollTimer = setInterval(() => void pollControllers(), CONTROLLER_POLL_MS);
    // A controller connecting or disconnecting is read soon after, not at the next minute. Steam calls back once as it
    // registers (no change: the read above covers it), which is ignored.
    let registering = true;
    changeRegistration = guard('controller change subscription', () =>
        inputApi()?.RegisterForUnboundControllerListChanges?.(() => {
            if (registering) return;
            if (changeTimer) clearTimeout(changeTimer);
            changeTimer = setTimeout(() => {
                changeTimer = null;
                void pollControllers();
            }, CONTROLLER_CHANGE_DELAY_MS);
        }),
    ) ?? null;
    registering = false;
}

/**
 * Stops the reads and forgets the list: a controller turned off while no bar was shown must not show its old level when
 * one opens again (it appears with the first read instead). A read still running is ignored when it answers.
 */
function stopControllerPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    guard('controller change unsubscribe', () => changeRegistration?.unregister?.());
    changeRegistration = null;
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = null;
    pollRun++;
    polling = false;
    controllers = [];
    refresh();
}

/** Unsubscribes and forgets everything (plugin unload). */
export function stopStatus() {
    stopControllerPolling();
    controllers = [];
    for (const r of registrations ?? []) guard('unsubscribe', () => r?.unregister?.());
    registrations = null;
    battery = null;
    online = null;
    devices = null;
    state = { battery: null, connection: null, controllers: [] };
}

export const statusState = (): StatusState => state;

export function subscribeStatus(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) startControllerPolling();
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) stopControllerPolling();
    };
}
