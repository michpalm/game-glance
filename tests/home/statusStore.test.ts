import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTROLLER_CHANGE_DELAY_MS, CONTROLLER_POLL_MS, CONTROLLER_REPLY_TIMEOUT_MS, startStatus, statusState, stopStatus, subscribeStatus } from '../../src/home/statusStore';

const fetchControllers = vi.hoisted(() => vi.fn(async (): Promise<unknown> => []));
vi.mock('@decky/api', () => ({ callable: () => () => fetchControllers() }));

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
        expect(statusState()).toEqual({ battery: { percent: 69, charging: false, low: false }, connection: 'wifi', controllers: [] });
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
        expect(statusState()).toEqual({ battery: null, connection: null, controllers: [] });
        stopStatus();
        const { reg, callbacks } = fakeSteam();
        startStatus();
        callbacks.battery({ bHasBattery: true, flLevel: 0.5 });
        stopStatus();
        expect(reg.unregister).toHaveBeenCalledTimes(3);
        expect(statusState()).toEqual({ battery: null, connection: null, controllers: [] });
    });
});

describe('controller batteries', () => {
    const flush = async () => {
        for (let i = 0; i < 5; i++) await Promise.resolve();
    };
    afterEach(() => {
        vi.useRealTimers();
        fetchControllers.mockReset();
        fetchControllers.mockImplementation(async () => []);
    });

    it('reads once when the first listener subscribes, then every CONTROLLER_POLL_MS', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValue([{ name: 'A', percent: 17 }]);
        const off = subscribeStatus(() => {});
        await flush();
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        expect(statusState().controllers).toEqual([{ name: 'A', percent: 17, low: true }]);
        await vi.advanceTimersByTimeAsync(CONTROLLER_POLL_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(2);
        off();
    });
    it('stops polling when the last listener unsubscribes', async () => {
        vi.useFakeTimers();
        const offA = subscribeStatus(() => {});
        const offB = subscribeStatus(() => {});
        await flush();
        offA();
        await vi.advanceTimersByTimeAsync(CONTROLLER_POLL_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(2);
        offB();
        await vi.advanceTimersByTimeAsync(2 * CONTROLLER_POLL_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(2);
    });
    it('does not start a poll while one is in flight', async () => {
        vi.useFakeTimers();
        let answer: (value: unknown) => void = () => {};
        fetchControllers.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
        const off = subscribeStatus(() => {});
        // A second subscriber does not start another read while the first is out.
        const offB = subscribeStatus(() => {});
        await vi.advanceTimersByTimeAsync(CONTROLLER_REPLY_TIMEOUT_MS / 2);
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        answer([]);
        offB();
        off();
    });
    it('gives up on a reply that never comes, so later polls still run (keeping the last list)', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValueOnce([{ name: 'A', percent: 40 }]).mockImplementation(() => new Promise(() => {}));
        const off = subscribeStatus(() => {});
        await flush();
        await vi.advanceTimersByTimeAsync(3 * CONTROLLER_POLL_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(4);
        expect(statusState().controllers).toEqual([{ name: 'A', percent: 40, low: false }]);
        off();
    });
    it('forgets the list when the last status bar closes, so a controller turned off meanwhile never shows its old level', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValue([{ name: 'A', percent: 40 }]);
        const off = subscribeStatus(() => {});
        await flush();
        expect(statusState().controllers).toHaveLength(1);
        off();
        expect(statusState().controllers).toEqual([]);
    });
    it('drops a disconnected controller on the next poll', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValueOnce([{ name: 'A', percent: 17 }]).mockResolvedValueOnce([]);
        const off = subscribeStatus(() => {});
        await flush();
        expect(statusState().controllers).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(CONTROLLER_POLL_MS);
        expect(statusState().controllers).toEqual([]);
        off();
    });
    it('keeps the last list when a read fails', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValueOnce([{ name: 'A', percent: 40 }]).mockRejectedValueOnce(new Error('backend'));
        const off = subscribeStatus(() => {});
        await flush();
        await vi.advanceTimersByTimeAsync(CONTROLLER_POLL_MS);
        expect(statusState().controllers).toEqual([{ name: 'A', percent: 40, low: false }]);
        off();
    });
    it('notifies only when the list changes', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValue([{ name: 'A', percent: 40 }]);
        const listener = vi.fn();
        const off = subscribeStatus(listener);
        await flush();
        await vi.advanceTimersByTimeAsync(CONTROLLER_POLL_MS);
        expect(listener).toHaveBeenCalledTimes(1);
        off();
    });
    it('stopStatus clears controllers and the timer', async () => {
        vi.useFakeTimers();
        fetchControllers.mockResolvedValue([{ name: 'A', percent: 40 }]);
        const off = subscribeStatus(() => {});
        await flush();
        stopStatus();
        expect(statusState().controllers).toEqual([]);
        await vi.advanceTimersByTimeAsync(2 * CONTROLLER_POLL_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        off();
    });
});

describe('controller batteries: reading on a controller change', () => {
    const flush = async () => {
        for (let i = 0; i < 5; i++) await Promise.resolve();
    };
    /** Steam's controller callback (SteamClient.Input.RegisterForUnboundControllerListChanges), which fires on connect and disconnect. */
    function fakeInput(callOnRegister = false) {
        let cb: (() => void) | null = null;
        const reg = { unregister: vi.fn(() => (cb = null)) };
        (globalThis as unknown as { SteamClient: unknown }).SteamClient = {
            Input: {
                RegisterForUnboundControllerListChanges: vi.fn((fn: () => void) => {
                    cb = fn;
                    if (callOnRegister) fn();
                    return reg;
                }),
            },
        };
        return { fire: () => cb?.(), reg };
    }
    afterEach(() => {
        vi.useRealTimers();
        fetchControllers.mockReset();
        fetchControllers.mockImplementation(async () => []);
    });

    it('reads again CONTROLLER_CHANGE_DELAY_MS after Steam reports a controller change', async () => {
        vi.useFakeTimers();
        const steam = fakeInput();
        const off = subscribeStatus(() => {});
        await flush();
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        steam.fire();
        await vi.advanceTimersByTimeAsync(CONTROLLER_CHANGE_DELAY_MS - 1);
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(fetchControllers).toHaveBeenCalledTimes(2);
        off();
    });
    it('makes one read of several changes in a row (Steam reports a reconnect twice)', async () => {
        vi.useFakeTimers();
        const steam = fakeInput();
        const off = subscribeStatus(() => {});
        await flush();
        steam.fire();
        await vi.advanceTimersByTimeAsync(200);
        steam.fire();
        await vi.advanceTimersByTimeAsync(CONTROLLER_CHANGE_DELAY_MS);
        expect(fetchControllers).toHaveBeenCalledTimes(2);
        off();
    });
    it('ignores the report Steam sends while registering', async () => {
        vi.useFakeTimers();
        fakeInput(true);
        const off = subscribeStatus(() => {});
        await vi.advanceTimersByTimeAsync(CONTROLLER_CHANGE_DELAY_MS * 2);
        expect(fetchControllers).toHaveBeenCalledTimes(1);
        off();
    });
    it('stops listening when the last status bar closes', async () => {
        vi.useFakeTimers();
        const steam = fakeInput();
        const off = subscribeStatus(() => {});
        await flush();
        steam.fire();
        off();
        expect(steam.reg.unregister).toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(CONTROLLER_CHANGE_DELAY_MS * 2);
        expect(fetchControllers).toHaveBeenCalledTimes(1);
    });
});
