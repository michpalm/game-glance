import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOG_PREFIX } from '../../src/constants';
import { createHomePatchManager } from '../../src/patches/homePatchManager';

function fakeDeps(initial: boolean) {
    let on = initial;
    const listeners = new Set<() => void>();
    let next = 0;
    const deps = {
        isOn: () => on,
        subscribe: vi.fn((listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        }),
        add: vi.fn((): unknown => `handle-${++next}`),
        remove: vi.fn((_handle: unknown) => undefined),
    };
    const set = (value: boolean) => {
        on = value;
        listeners.forEach((listener) => listener());
    };
    return { deps, set, listeners };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('createHomePatchManager', () => {
    it('does not register when off at start', () => {
        const { deps } = fakeDeps(false);
        createHomePatchManager(deps).start();
        expect(deps.add).not.toHaveBeenCalled();
        expect(deps.subscribe).toHaveBeenCalledTimes(1);
    });

    it('registers at start when already on', () => {
        const { deps } = fakeDeps(true);
        createHomePatchManager(deps).start();
        expect(deps.add).toHaveBeenCalledTimes(1);
    });

    it('registers exactly once when it turns on (including a later settings load emit)', () => {
        const { deps, set } = fakeDeps(false);
        createHomePatchManager(deps).start();
        set(true);
        expect(deps.add).toHaveBeenCalledTimes(1);
        expect(deps.remove).not.toHaveBeenCalled();
    });

    it('removes the patch when it turns off', () => {
        const { deps, set } = fakeDeps(false);
        createHomePatchManager(deps).start();
        set(true);
        set(false);
        expect(deps.remove).toHaveBeenCalledTimes(1);
        expect(deps.remove).toHaveBeenCalledWith('handle-1');
    });

    it('does not double-register when turned on twice in a row', () => {
        const { deps, set } = fakeDeps(false);
        createHomePatchManager(deps).start();
        set(true);
        set(true);
        expect(deps.add).toHaveBeenCalledTimes(1);
    });

    it('stop() removes an active patch and unsubscribes', () => {
        const { deps, set, listeners } = fakeDeps(true);
        const manager = createHomePatchManager(deps);
        manager.start();
        manager.stop();
        expect(deps.remove).toHaveBeenCalledWith('handle-1');
        expect(listeners.size).toBe(0);
        set(false);
        set(true);
        expect(deps.add).toHaveBeenCalledTimes(1);
    });

    it('catches a throwing add(): stays off, never throws, warns once with LOG_PREFIX', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { deps, set } = fakeDeps(true);
        deps.add.mockImplementation(() => {
            throw new Error('boom');
        });
        const manager = createHomePatchManager(deps);
        expect(() => manager.start()).not.toThrow();
        expect(() => set(true)).not.toThrow();
        expect(() => set(false)).not.toThrow();
        expect(deps.remove).not.toHaveBeenCalled();
        const ours = warn.mock.calls.filter((call) => String(call[0]).startsWith(LOG_PREFIX));
        expect(ours).toHaveLength(1);
        expect(() => manager.stop()).not.toThrow();
        expect(deps.remove).not.toHaveBeenCalled();
    });

    it('never throws when remove(), isOn() or subscribe() throw', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const { deps, set } = fakeDeps(true);
        deps.remove.mockImplementation(() => {
            throw new Error('boom');
        });
        const manager = createHomePatchManager(deps);
        manager.start();
        expect(() => set(false)).not.toThrow();
        expect(() => manager.stop()).not.toThrow();

        const broken = createHomePatchManager({
            isOn: () => {
                throw new Error('boom');
            },
            subscribe: () => {
                throw new Error('boom');
            },
            add: vi.fn(),
            remove: vi.fn(),
        });
        expect(() => broken.start()).not.toThrow();
        expect(() => broken.stop()).not.toThrow();
    });
});
