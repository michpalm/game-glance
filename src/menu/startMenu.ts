import { Navigation } from '@decky/ui';
import { createElement, useSyncExternalStore } from 'react';
import { backendKv } from '../data/kv';
import { settings } from '../data/settings';
import { createMenuCoordinator } from './coordinator';
import { registerDiscoveredMenuHost } from './host';
import { defaultMenuState, reduceMenu, type MenuEvent, type Stop } from './model';
import { createMenuPreferences } from './preferences';
import { discoverMenuRuntime, type NativeBindings } from './steam/runtime';
import { MenuShell } from './components/MenuShell';

export const menuPreferences = createMenuPreferences(backendKv);
const nativeMenu = async () => { Navigation.OpenMainMenu(); };
let recovery: () => Promise<void> = nativeMenu;
/** Recovery works even when storage or runtime discovery failed. */
export function openSteamMenu(): Promise<void> { return recovery(); }
interface Options {
    masterSettings: { get(): { enabled: boolean }; subscribe(listener: Stop): Stop };
    preferences: ReturnType<typeof createMenuPreferences>;
    discover(): NativeBindings | null;
    masterReady?: Promise<void>;
    openNativeMenu?(): Promise<void>;
}
function inputActive(): boolean {
    const owner = globalThis as typeof globalThis & {
        GetShowingGlobalModal?: () => unknown;
        VirtualKeyboardManager?: { IsShowingVirtualKeyboard?: { Value?: boolean } };
    };
    return !owner.GetShowingGlobalModal?.() && !owner.VirtualKeyboardManager?.IsShowingVirtualKeyboard?.Value;
}
export function startMenu(options?: Partial<Options>): Stop {
    const masterSettings = options?.masterSettings ?? settings;
    const preferences = options?.preferences ?? menuPreferences;
    const fallback = options?.openNativeMenu ?? nativeMenu;
    let alive = true, ready = false;
    let stopSession: Stop | undefined;
    let controller: ReturnType<typeof createMenuCoordinator> | undefined;
    let releaseHost: Stop | undefined;
    let state = defaultMenuState();
    const listeners = new Set<Stop>();
    const subscribe = (fn: Stop) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
    const dispatch = (event: MenuEvent) => { state = reduceMenu(state, event); listeners.forEach(fn => fn()); };
    const recover = () => controller && state.phase !== 'failed' && state.phase !== 'disabled' ? controller.handoff({ kind: 'main-menu' }) : fallback();
    recovery = recover;
    function release() {
        const steps = [stopSession, releaseHost]; stopSession = undefined; releaseHost = undefined; controller = undefined;
        for (const stop of steps) { try { stop?.(); } catch (error) { console.warn('[Game Glance] menu release failed', error); } }
    }
    function reconcile() {
        if (!alive) return;
        if (!ready || preferences.loadState() !== 'ready' || !masterSettings.get().enabled || !preferences.get().enabled) { release(); return; }
        if (stopSession) { dispatch({ type: 'pins', value: [...preferences.get().pins] }); return; }
        try {
            if (!options?.discover) releaseHost = registerDiscoveredMenuHost() ?? undefined;
            const bindings = options?.discover ? options.discover() : discoverMenuRuntime();
            if (!bindings) { release(); return; }
            state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
            dispatch({ type: 'pins', value: [...preferences.get().pins] });
            function ConnectedShell() {
                const snapshot = useSyncExternalStore(subscribe, () => state);
                return createElement(MenuShell, { state: snapshot, preferences, dispatch, handoff: request => controller!.handoff(request), close: () => controller?.close(), inputActive });
            }
            controller = createMenuCoordinator({ bindings, getState: () => state, dispatch, render: () => createElement(ConnectedShell) });
            stopSession = controller.start();
        } catch (error) { release(); console.warn('[Game Glance] floating menu unavailable; native menus remain active', error); }
    }
    const stopMaster = masterSettings.subscribe(reconcile), stopPreferences = preferences.subscribe(reconcile);
    void (options?.masterReady ?? Promise.resolve()).then(() => { if (alive) { ready = true; reconcile(); } }, error => console.warn('[Game Glance] menu waiting for master settings', error));
    void preferences.load().catch(error => console.warn('[Game Glance] menu preferences could not load', error));
    return () => {
        if (!alive) return;
        alive = false;
        for (const stop of [stopMaster, stopPreferences, release]) { try { stop(); } catch (error) { console.warn('[Game Glance] menu stop failed', error); } }
        listeners.clear();
        if (recovery === recover) recovery = nativeMenu;
    };
}
