import { findModule, showContextMenu } from '@decky/ui';
import { ComponentType, createElement, ReactElement } from 'react';
import { LOG_PREFIX } from '../constants';
import { memoLookup } from './moduleLookup';

/**
 * Steam's own game context menu (Add to Favorites, Add to, Manage > Hide / Mark as private / Uninstall..., Developer,
 * Properties...), opened as the game page's gear button opens it (probed on the Ally, Steam's app page header):
 *   showContextMenu(<AppActionsMenu {...props} client="selected" launchSource={100} bInGamepadUI omitPrimaryAction
 *     ownerWindow={windowInstance.BrowserWindow} />, gearButton, { ...menuOptions(), bOverlapHorizontal: true, bOverlapVertical: false })
 * The menu component and its position options are exports of Steam's app-action module (the one the Play pill
 * uses), found by export names as Decky's own tools do; showContextMenu is @decky/ui's (the same Steam function).
 * Anything missing or throwing returns false, so the caller can fall back to Properties.
 */

export interface MenuModule {
    /** The game context menu component (Steam's AppActionsMenu). */
    uU: ComponentType<Record<string, unknown>>;
    /** Its position options ({ bFitToWindow, strClassName }). */
    zq(): Record<string, unknown>;
}

/** ELaunchSource._2ftLibraryDetails, as the game page passes it. */
const LAUNCH_SOURCE = 100;

export interface GameMenuCall {
    element: ReactElement;
    options: Record<string, unknown>;
}

/** The menu element and position options for a game's overview, or null when a piece is missing. Pure given `mod`. */
export function buildGameMenu(mod: MenuModule | null, overview: unknown, ownerWindow: unknown): GameMenuCall | null {
    try {
        if (!mod || typeof mod.uU !== 'function' || typeof mod.zq !== 'function' || !overview) return null;
        const base = mod.zq();
        const options = { ...(base && typeof base === 'object' ? base : {}), bOverlapHorizontal: true, bOverlapVertical: false };
        const element = createElement(mod.uU, {
            overview,
            client: 'selected',
            launchSource: LAUNCH_SOURCE,
            bInGamepadUI: true,
            omitPrimaryAction: true,
            ownerWindow,
        });
        return { element, options };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not build the game menu`, error);
        return null;
    }
}

/** Steam's app-action module (menu component and options), looked up once on success; a miss is retried at most once a minute. */
const findMenuModule = memoLookup<MenuModule>('game menu', () => {
    const mod = findModule((m: any) => m && typeof m.uU === 'function' && typeof m.zq === 'function' && typeof m.AH === 'function');
    return mod ? { uU: mod.uU, zq: mod.zq } : null;
});

type Globals = {
    appStore?: { GetAppOverviewByAppID?(appId: number): unknown };
    SteamUIStore?: { GetFocusedWindowInstance?(): { BrowserWindow?: unknown } | null | undefined };
};

/**
 * Opens Steam's context menu for a game at `anchor` (Home's gear button). True when Steam's menu was shown; false
 * when anything is missing or throws (the caller then opens Properties, as before).
 */
export function openGameMenu(appId: number, anchor: HTMLElement | null | undefined): boolean {
    try {
        if (!anchor || typeof showContextMenu !== 'function') return false;
        const g = globalThis as unknown as Globals;
        const ownerWindow = g.SteamUIStore?.GetFocusedWindowInstance?.()?.BrowserWindow ?? anchor.ownerDocument?.defaultView ?? undefined;
        const call = buildGameMenu(findMenuModule(), g.appStore?.GetAppOverviewByAppID?.(appId), ownerWindow);
        if (!call) return false;
        showContextMenu(call.element, anchor, call.options);
        return true;
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not open the game menu`, error);
        return false;
    }
}
