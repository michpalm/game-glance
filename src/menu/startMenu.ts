import { Navigation } from '@decky/ui';
import { createElement, useSyncExternalStore } from 'react';
import { backendKv } from '../data/kv';
import { settings } from '../data/settings';
import { createMenuCoordinator } from './coordinator';
import { registerDiscoveredMenuHost } from './host';
import { defaultMenuState, reduceMenu, type MenuEvent, type Stop } from './model';
import { createMenuPreferences,menuPreferences } from './preferences';
export {menuPreferences} from './preferences';
import { discoverMenuRuntime, type NativeBindings } from './steam/runtime';
import { menuInputActive, type NativeInputOwner } from './navigation';
import { createPerformance } from './steam/performance';
import { discoverPerformanceBindings } from './steam/performanceNative';
import { createQuickSettings } from './steam/quickSettings';
import { createNotificationBadge, createNotificationList } from './steam/notifications';
import { nativeNotificationActions, type NotificationActions } from './steam/notificationActions';
import { createNotificationReads } from './notificationReads';
import { discoverQuickSettingsBindings, nativeNotificationBindings } from './steam/nativeCore';
import { MenuShell } from './components/MenuShell';
import { createSocial, type SocialService } from './steam/social';
import { discoverSocialBindings } from './steam/chatNative';
import { createSoundtrack, nativeSoundtrackBindings, type SoundtrackService } from './steam/soundtrack';

const notificationReads = createNotificationReads(backendKv);
let currentService: object | undefined;
const serviceListeners = new Set<Stop>();
export const isMenuServiceCurrent = () => currentService !== undefined;
export function subscribeMenuService(listener: Stop): Stop { serviceListeners.add(listener); return () => { serviceListeners.delete(listener); }; }
const emitService = () => serviceListeners.forEach(listener => listener());
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
    const root = globalThis as typeof globalThis & { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: NativeInputOwner } } };
    return menuInputActive(root.SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance);
}
export function startMenu(options?: Partial<Options>): Stop {
    const service = {}; currentService = service; emitService();
    const masterSettings = options?.masterSettings ?? settings;
    const preferences = options?.preferences ?? menuPreferences;
    const fallback = options?.openNativeMenu ?? nativeMenu;
    let alive = true, ready = false;
    let stopSession: Stop | undefined;
    let controller: ReturnType<typeof createMenuCoordinator> | undefined;
    let releaseHost: Stop | undefined;
    let quickSettings: ReturnType<typeof createQuickSettings> | undefined;
    let notificationBadge: ReturnType<typeof createNotificationBadge> | undefined;
    let notifications: ReturnType<typeof createNotificationList> | undefined;
    let notificationActions: NotificationActions | undefined;
    let performance: ReturnType<typeof createPerformance> | undefined;
    let social: SocialService | undefined;
    let soundtrack: SoundtrackService | undefined;
    let state = defaultMenuState();
    const listeners = new Set<Stop>();
    const subscribe = (fn: Stop) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
    const dispatch = (event: MenuEvent) => { state = reduceMenu(state, event); listeners.forEach(fn => fn()); };
    const recover = () => controller && state.phase !== 'failed' && state.phase !== 'disabled' ? controller.handoff({ kind: 'main-menu' }) : fallback();
    recovery = recover;
    function release() {
        const friends = social; social = undefined;
        const music = soundtrack; soundtrack = undefined;
        const perf = performance; performance = undefined;
        const quick = quickSettings, badge = notificationBadge, tray = notifications; quickSettings = undefined; notificationBadge = undefined; notifications = undefined; notificationActions = undefined;
        const steps = [stopSession, () => friends?.dispose(), () => quick?.dispose(), () => badge?.dispose(), () => tray?.dispose(), () => perf?.dispose(), () => music?.dispose(), releaseHost]; stopSession = undefined; releaseHost = undefined; controller = undefined;
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
            social = createSocial(discoverSocialBindings());
            if (!options?.discover) {
                try { quickSettings = createQuickSettings(discoverQuickSettingsBindings()); } catch (error) { console.warn('[Game Glance] custom Quick Settings unavailable', error); }
                try { performance = createPerformance(discoverPerformanceBindings()); } catch (error) { console.warn('[Game Glance] custom Performance unavailable', error); }
                try { notificationBadge = createNotificationBadge(nativeNotificationBindings()); } catch (error) { console.warn('[Game Glance] notification badge unavailable', error); }
                try { const music = nativeSoundtrackBindings(); if (music) soundtrack = createSoundtrack(music); } catch (error) { console.warn('[Game Glance] custom Soundtrack unavailable', error); }
                try { notifications = createNotificationList(nativeNotificationBindings()); notificationActions = nativeNotificationActions(); void notificationReads.load(); } catch (error) { console.warn('[Game Glance] notification list unavailable', error); }
            }
            state = reduceMenu(defaultMenuState(), { type: 'enable', value: true });
            dispatch({ type: 'pins', value: [...preferences.get().pins] });
            function ConnectedShell() {
                const snapshot = useSyncExternalStore(subscribe, () => state);
                return createElement(MenuShell, { state: snapshot, preferences, dispatch, handoff: request => controller!.handoff(request), close: () => controller?.close(), inputActive, quickSettings, notificationBadge, notifications, notificationReads, notificationActions, performance, social, soundtrack });
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
        if (currentService === service) { currentService = undefined; emitService(); }
        for (const stop of [stopMaster, stopPreferences, release]) { try { stop(); } catch (error) { console.warn('[Game Glance] menu stop failed', error); } }
        listeners.clear();
        if (recovery === recover) recovery = nativeMenu;
    };
}
