import { afterEach, describe, expect, it, vi } from 'vitest';
import { startStatus, statusState, stopStatus, subscribeStatus } from '../../src/home/statusStore';

function fakeSteam() {
    const callbacks: Record<string, (raw: unknown) => void> = {};
    const reg = { unregister: vi.fn() };
    const register = (name: string) => vi.fn((cb: (raw: unknown) => void) => {
        callbacks[name] = cb;
        return reg;
    });
    const system = {
        RegisterForBatteryStateChanges: register('battery'),
        Network: { RegisterForConnectivityTestChanges: register('test'), RegisterForDeviceChanges: register('devices') },
    };
    (globalThis as unknown as { SteamClient: unknown }).SteamClient = { System: system };
    return { system, callbacks, reg };
}

afterEach(() => {
    stopStatus();
    delete (globalThis as unknown as { SteamClient?: unknown }).SteamClient;
});

describe('status store', () => {
    it('registers once and keeps the state for the session', () => {
        const { system, callbacks } = fakeSteam();
        startStatus();
        startStatus();
        expect(system.RegisterForBatteryStateChanges).toHaveBeenCalledTimes(1);
        callbacks.battery({ bHasBattery: true, eACState: 1, eBatteryState: 1, flLevel: 0.69 });
        callbacks.test({ eConnectivityTestResult: 1 });
        expect(statusState()).toEqual({ battery: { percent: 69, charging: false, low: false }, connection: 'wifi' });
    });
    it('tells listeners only on a change', () => {
        const { callbacks } = fakeSteam();
        startStatus();
        const listener = vi.fn();
        const off = subscribeStatus(listener);
        callbacks.battery({ bHasBattery: true, flLevel: 0.5 });
        callbacks.battery({ bHasBattery: true, flLevel: 0.501 });
        expect(listener).toHaveBeenCalledTimes(1);
        off();
        callbacks.battery({ bHasBattery: true, flLevel: 0.2 });
        expect(listener).toHaveBeenCalledTimes(1);
    });
    it('a test in progress keeps the last verdict', () => {
        const { callbacks } = fakeSteam();
        startStatus();
        callbacks.test({ eConnectivityTestResult: 4 });
        expect(statusState().connection).toBe('offline');
        callbacks.test({ eConnectivityTestResult: 0, bChecking: true });
        expect(statusState().connection).toBe('offline');
    });
    it('a bad device payload keeps the last device list', () => {
        const { callbacks } = fakeSteam();
        startStatus();
        callbacks.test({ eConnectivityTestResult: 1 });
        callbacks.devices(new Uint8Array([0x0a, 0x04, 0x4a, 0x02, 0x08, 0x01])); // devices { wired { is_cable_present: true } }
        expect(statusState().connection).toBe('wired');
        callbacks.devices('%%%');
        expect(statusState().connection).toBe('wired');
    });
    it('a missing API leaves everything unknown; stop unregisters and forgets', () => {
        startStatus();
        expect(statusState()).toEqual({ battery: null, connection: null });
        stopStatus();
        const { reg, callbacks } = fakeSteam();
        startStatus();
        callbacks.battery({ bHasBattery: true, flLevel: 0.5 });
        stopStatus();
        expect(reg.unregister).toHaveBeenCalledTimes(3);
        expect(statusState()).toEqual({ battery: null, connection: null });
    });
});
