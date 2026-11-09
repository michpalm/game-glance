import { describe, expect, it, vi } from 'vitest';
import { memoryKv } from '../../src/data/kv';
import { createMenuPreferences } from '../../src/menu/preferences';
import { startMenu, isMenuServiceCurrent, subscribeMenuService } from '../../src/menu/startMenu';
import type { IntentHandlers, NativeBindings } from '../../src/menu/steam/runtime';
import * as socialModule from '../../src/menu/steam/social';
vi.mock('../../src/menu/host', () => ({ registerDiscoveredMenuHost: vi.fn() }));
vi.mock('../../src/menu/components/MenuShell', () => ({ MenuShell: () => null }));
function harness(enabled = true) {
    let master = { enabled, spotlightHome: false };
    const listeners = new Set<() => void>();
    const masterSettings = { get: () => master, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; } };
    const kv = memoryKv();
    const preferences = createMenuPreferences(kv);
    let handlers!: IntentHandlers;
    const stopNativeHooks = vi.fn();
    const host = { present: vi.fn(async () => {}), suspend: vi.fn(), close: vi.fn(), dispose: vi.fn() };
    const bindings: NativeBindings = { capabilities: new Set(['host']), attachHost: () => host, subscribeGame: () => vi.fn(), installIntentHandlers: value => { handlers = value; return stopNativeHooks; }, showMenuHost: vi.fn(), closeMenuHost: vi.fn(), openNative: vi.fn(async () => {}) };
    const discover = vi.fn(() => bindings);
    return { kv, preferences, masterSettings, discover, host, bindings, stopNativeHooks, handlers: () => handlers,
        master(value: boolean) { master = { ...master, enabled: value }; listeners.forEach(fn => fn()); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
describe('floating menu startup', () => {
    it('owns and releases the Social service on disable and unload', async () => {
        const h = harness(); await h.kv.set('menu:preferences', { enabled: true });
        const dispose = vi.fn();
        const factory = vi.spyOn(socialModule, 'createSocial').mockReturnValue({ dispose } as unknown as ReturnType<typeof socialModule.createSocial>);
        try {
            const stop = startMenu(h); await tick(); expect(factory).toHaveBeenCalledOnce();
            h.master(false); stop(); expect(dispose).toHaveBeenCalledOnce();
        } finally { factory.mockRestore(); }
    });
    it('waits for loaded preferences and master readiness; Spotlight Home is independent', async () => {
        const h = harness(); await h.kv.set('menu:preferences', { enabled: true });
        let ready!: () => void;
        const stop = startMenu({ ...h, masterReady: new Promise<void>(resolve => { ready = resolve; }) });
        expect(h.discover).not.toHaveBeenCalled(); await tick(); expect(h.discover).not.toHaveBeenCalled();
        ready(); await tick(); expect(h.discover).toHaveBeenCalledTimes(1); stop(); stop();
        expect(h.stopNativeHooks).toHaveBeenCalledTimes(1);
    });
    it.each([false, true])('does not intercept when master or menu is disabled (master=%s)', async enabled => {
        const h = harness(enabled); await h.kv.set('menu:preferences', { enabled: !enabled });
        const stop = startMenu(h); await tick(); expect(h.discover).not.toHaveBeenCalled(); stop();
    });
    it('preferences load rejection leaves recovery callable and retry can start interception', async () => {
        const h = harness(); const get = h.kv.get; h.kv.get = vi.fn().mockRejectedValueOnce(Error('backend unavailable')).mockImplementation(get);
        await h.kv.set('menu:preferences', { enabled: true }); const recover = vi.fn(async () => {});
        const stop = startMenu({ ...h, openNativeMenu: recover }); await tick();
        expect(h.discover).not.toHaveBeenCalled(); expect(h.preferences.loadState()).toBe('failed');
        // The explicit recovery command remains available independently of preference loading.
        const { openSteamMenu } = await import('../../src/menu/startMenu'); await openSteamMenu(); expect(recover).toHaveBeenCalledTimes(1);
        await h.preferences.load(); expect(h.discover).toHaveBeenCalledTimes(1); stop();
    });
    it.each(['master', 'menu'])('disabling %s during handoff disposes owned resources once', async target => {
        const h = harness(); await h.kv.set('menu:preferences', { enabled: true });
        const stop = startMenu(h); await tick(); h.handlers().open('home', vi.fn()); await tick(); h.handlers().suspended(true);
        if (target === 'master') h.master(false); else await h.preferences.setEnabled(false);
        expect(h.stopNativeHooks).toHaveBeenCalledTimes(1); expect(h.host.dispose).toHaveBeenCalledTimes(1); stop();
        expect(h.host.dispose).toHaveBeenCalledTimes(1);
    });
    it('notifies an already-open settings panel when its plugin instance unloads', async () => {
        const h = harness(), listener = vi.fn();
        const unsubscribe = subscribeMenuService(listener), stop = startMenu(h);
        await tick(); expect(isMenuServiceCurrent()).toBe(true);
        stop(); expect(isMenuServiceCurrent()).toBe(false); expect(listener).toHaveBeenCalledTimes(2);
        unsubscribe();
    });
    it('late load completion after unload cannot install hooks', async () => {
        const h = harness(); let release!: (value: unknown) => void;
        h.kv.get = () => new Promise(resolve => { release = resolve; }); const stop = startMenu(h); stop();
        release({ enabled: true }); await tick(); expect(h.discover).not.toHaveBeenCalled();
    });
});
