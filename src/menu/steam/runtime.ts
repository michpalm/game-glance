import type { ReactNode } from 'react';
import type { Entry, GameContext, Stop } from '../model';
import { ownMethod } from './patchOwnership';

export type QamTab = 'notifications' | 'friends' | 'quick-settings' | 'performance' | 'help' | 'soundtrack' | 'decky';
export type NavigateDestination = 'library' | 'store' | 'downloads' | 'settings' | 'profile' | 'power';
export type NativeRequest =
    | { kind: 'main-menu' }
    | { kind: 'qam'; tab: QamTab }
    | { kind: 'navigate'; destination: NavigateDestination }
    | { kind: 'game-action'; appId: number; gameId: string; actionId: string }
    | { kind: 'guide-article'; appId: number; fileId: string }
    | { kind: 'friend-chat'; steamId: string };
export interface HostAttachment {
    present(node: ReactNode): Promise<void>;
    suspend(): void;
    close(): void;
    dispose(): void;
}
export interface IntentHandlers {
    open(entry: Entry, replayNative: Stop): void;
    closed(): void;
    suspended(value: boolean): void;
}
export interface NativeBindings {
    capabilities: ReadonlySet<string>;
    attachHost(render: (nativeTree: ReactNode) => ReactNode): HostAttachment;
    installIntentHandlers(handlers: IntentHandlers): Stop;
    subscribeGame(listener: (game: GameContext | null) => void): Stop;
    showMenuHost(): void;
    closeMenuHost(): void;
    openNative(request: NativeRequest): Promise<void>;
}
export interface NativeMenu {
    m_cSuppressRequests?: number;
    GetOpenSideMenu(): number;
    GetQuickAccessTab(): number;
    OpenSideMenu(kind: number): void;
    CloseSideMenus(): void;
    ToggleSideMenu(kind: number, open?: boolean): void;
    OpenQuickAccessMenu(tab: number, open?: boolean): void;
    OpenMainMenu?(): void;
}
export interface NativeOwner {
    MenuStore: NativeMenu;
    BrowserWindow?: Window;
    MainRunningApp?: { appid?: number; gameid?: unknown; display_name?: string };
    MainRunningAppID?: number;
    IsAnyVRWindow(): boolean;
    OnHomeButtonPressed(): void;
    OnQuickAccessButtonPressed(): void;
}
export type MenuHostFactory = (owner: NativeOwner, render: (nativeTree: ReactNode) => ReactNode) => HostAttachment;
let hostFactory: MenuHostFactory | null = null;
let routeHandler: ((request: NativeRequest, owner: NativeOwner) => Promise<void>) | null = null;
export function registerMenuHost(factory: MenuHostFactory): Stop {
    const previous = hostFactory;
    hostFactory = factory;
    return () => { if (hostFactory === factory) hostFactory = previous; };
}
export function registerNativeRoutes(handler: NonNullable<typeof routeHandler>): Stop {
    const previous = routeHandler;
    routeHandler = handler;
    return () => { if (routeHandler === handler) routeHandler = previous; };
}
const QAM: Record<QamTab, number> = { notifications: 0, friends: 3, 'quick-settings': 4, performance: 5, help: 6, soundtrack: 7, decky: 999 };

/** Requires a verified host factory; global Steam stores alone cannot prove render compatibility. */
export function discoverMenuRuntime(): NativeBindings | null {
    const owner = (globalThis as unknown as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: NativeOwner } } }).SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance;
    const factory = hostFactory;
    if (!owner || !factory || typeof owner.IsAnyVRWindow !== 'function') return null;
    const menu = owner.MenuStore;
    if (!menu || ['GetOpenSideMenu', 'GetQuickAccessTab', 'OpenSideMenu', 'CloseSideMenus', 'ToggleSideMenu', 'OpenQuickAccessMenu'].some(k => typeof (menu as unknown as Record<string, unknown>)[k] !== 'function')) return null;
    if (typeof owner.OnHomeButtonPressed !== 'function' || typeof owner.OnQuickAccessButtonPressed !== 'function') return null;
    let bypass = 0;
    const native = <T>(action: () => T): T => { bypass++; try { return action(); } finally { bypass--; } };
    return {
        capabilities: new Set(['host', 'native-menu']),
        attachHost: render => factory(owner, render),
        showMenuHost: () => native(() => menu.OpenSideMenu(1)),
        closeMenuHost: () => native(() => menu.CloseSideMenus()),
        async openNative(request) {
            bypass++;
            try {
                if (request.kind === 'main-menu') { menu.OpenMainMenu ? menu.OpenMainMenu() : menu.OpenSideMenu(1); return; }
                if (request.kind === 'qam') { menu.OpenQuickAccessMenu(QAM[request.tab]); return; }
                if (!routeHandler) throw new Error('Native destination is not available');
                await routeHandler(request, owner);
            } finally { bypass--; }
        },
        subscribeGame(listener) {
            let last = '';
            const read = () => {
                const app = owner.MainRunningApp;
                const appId = Number(app?.appid ?? owner.MainRunningAppID);
                const value: GameContext | null = Number.isInteger(appId) && appId > 0 ? { appId, gameId: String(app?.gameid ?? appId), name: app?.display_name ?? '', kind: 'local', actionIds: [] } : null;
                const key = JSON.stringify(value);
                if (last !== key) { last = key; listener(value); }
            };
            read();
            const timer = setInterval(read, 500);
            return () => clearInterval(timer);
        },
        installIntentHandlers(handlers) {
            const stops: Stop[] = [];
            let intent: { entry: Entry; handled: boolean } | null = null;
            let inToggle = false;
            const eligible = () => !bypass && !owner.IsAnyVRWindow() && !(menu.m_cSuppressRequests && menu.m_cSuppressRequests > 0);
            const intercept = (replay: Stop) => {
                if (!intent || intent.handled || !eligible()) return false;
                intent.handled = true;
                handlers.open(intent.entry, () => native(replay));
                return true;
            };
            const stop = () => {
                for (const release of stops.splice(0).reverse()) {
                    try { release(); } catch (error) { console.warn('[Game Glance] native menu hook restore failed', error); }
                }
            };
            try {
                stops.push(ownMethod(menu, 'OpenSideMenu', next => function(this: NativeMenu, kind) {
                    if (intercept(() => next.call(this, kind))) return;
                    if (!bypass && kind === 2) handlers.suspended(true);
                    return next.call(this, kind);
                }));
                stops.push(ownMethod(menu, 'CloseSideMenus', next => function(this: NativeMenu) {
                    if (inToggle && intercept(() => next.call(this))) return;
                    next.call(this);
                    if (!bypass) handlers.closed();
                }));
                stops.push(ownMethod(menu, 'ToggleSideMenu', next => function(this: NativeMenu, kind, open) {
                    const previous = inToggle;
                    inToggle = !!intent;
                    try { return next.call(this, kind, open); } finally { inToggle = previous; }
                }));
                for (const [key, entry] of [['OnHomeButtonPressed', 'home'], ['OnQuickAccessButtonPressed', 'quick-access']] as const) {
                    stops.push(ownMethod(owner, key, next => function(this: NativeOwner) {
                        const previous = intent;
                        intent = { entry, handled: false };
                        try { return next.call(this); } finally { intent = previous; }
                    }));
                }
                return stop;
            } catch (error) { stop(); throw error; }
        },
    };
}
