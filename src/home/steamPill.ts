import { findModule } from '@decky/ui';
import type { ReactNode } from 'react';
import { LOG_PREFIX } from '../constants';
import { memoLookup } from './moduleLookup';

/**
 * Steam's own Play-button logic for a game, so Home's pill is the game page's pill: the action Steam derives from the
 * app's display status ("Play", "Pause", "Download", "Update", "Install", "Resume"...), its own localized word, its own
 * glyph, and its own click handler (launch, pause, resume, install, update). These are plain functions in Steam's
 * app-action module (found by their export names, as Decky's own tools do); anything missing or throwing gives null
 * and Home keeps its own pill.
 */

export interface ActionFns {
    /** (windowInstance, overview, 'selected') -> action name or null */
    AH(instance: unknown, overview: unknown, client: string): string | null | undefined;
    /** (action, overview, client, launchSource, window) -> handler or null */
    jy(action: string, overview: unknown, client: string, launchSource: number, win: unknown): (() => void) | null | undefined;
    /** action -> Steam's glyph element */
    WB(action: string): ReactNode;
    /** action -> Steam's localized word */
    Np(action: string, count?: number): string;
}

export interface SteamPill {
    action: string;
    label: string;
    icon: ReactNode;
    /** Runs Steam's handler for the pill in the given window (the pressed element's own). */
    run(win: unknown): void;
}

/** ELaunchSource._2ftLibraryDetails, as launching from a game's page. */
const LAUNCH_SOURCE = 100;

/** The pill for an overview, or null when Steam gives no action (or any piece is missing/throws). Pure given `fns`. */
export function buildSteamPill(fns: ActionFns | null, instance: unknown, overview: unknown): SteamPill | null {
    try {
        if (!fns || !overview) return null;
        const action = fns.AH(instance, overview, 'selected');
        if (typeof action !== 'string' || action.length === 0) return null;
        const label = fns.Np(action);
        const icon = fns.WB(action);
        if (typeof label !== 'string' || label.length === 0 || !icon) return null;
        return {
            action,
            label,
            icon,
            run: (win) => {
                const handler = fns.jy(action, overview, 'selected', LAUNCH_SOURCE, win);
                if (typeof handler !== 'function') throw new Error(`no handler for ${action}`);
                handler();
            },
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: Steam's pill failed`, error);
        return null;
    }
}

/** Steam's action functions, looked up once on success (a miss is retried at most once a minute); null when not found. */
const actionFns = memoLookup<ActionFns>("app actions", () => {
    const actions = findModule((m: any) => m && typeof m.AH === 'function' && typeof m.jy === 'function' && typeof m.WB === 'function');
    const words = findModule((m: any) => m && typeof m.Np === 'function' && typeof m.Bb === 'function');
    return actions && words ? { AH: actions.AH, jy: actions.jy, WB: actions.WB, Np: words.Np } : null;
});

type Globals = {
    appStore?: { GetAppOverviewByAppID?(appId: number): unknown };
    SteamUIStore?: { GetFocusedWindowInstance?(): unknown };
};

/** Steam's pill for a game now (derived from its display status, as the game page does), or null. */
export function readSteamPill(appId: number): SteamPill | null {
    try {
        const g = globalThis as unknown as Globals;
        return buildSteamPill(actionFns(), g.SteamUIStore?.GetFocusedWindowInstance?.(), g.appStore?.GetAppOverviewByAppID?.(appId));
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not read Steam's pill`, error);
        return null;
    }
}
