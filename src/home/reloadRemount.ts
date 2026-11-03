import { Navigation, Router } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { HOME_ROUTE } from './guard';

/**
 * After an update (Decky loading the plugin over itself), the Home on screen is still drawn by the copy Decky unloaded:
 * its status bar lost its battery and connection when that copy stopped them (seen on the Ally, 2026-10-16), and none of
 * the new code shows until Home is opened again. So a load that is not the session's first, with Home on screen, opens
 * Home again once the old copy has gone. The count lives on Steam's window, which outlives the plugin's copies.
 */
const LOADS = '__gameGlanceLoads';

/** Counts this load; true when the plugin was loaded before in this Steam session (an update or a reload). */
export function noteLoad(store: Record<string, unknown> = globalThis as unknown as Record<string, unknown>): boolean {
    const before = typeof store[LOADS] === 'number' ? (store[LOADS] as number) : 0;
    store[LOADS] = before + 1;
    return before > 0;
}

/** Long enough for Decky to unload the old copy and for the settings to load (measured: under a second on the Ally). */
export const REMOUNT_DELAY_MS = 1500;
/** Library in between, as long as it takes Steam to leave Home. */
const AWAY_MS = 120;
/** Check again after an opening; do not navigate out from under its morph or bridge. */
const OPENING_RETRY_MS = 100;

export interface RemountDeps {
    path(): string | undefined;
    opening(): boolean;
    navigate(path: string): void;
    setTimeout(fn: () => void, ms: number): unknown;
    clearTimeout(handle: unknown): void;
}

type HomeOwner = {
    m_history?: { location?: { pathname?: string } };
    BrowserWindow?: { document?: Document };
};
const mainWindow = () => Router?.WindowStore?.GamepadUIMainWindowInstance as HomeOwner | undefined;

const defaultDeps: RemountDeps = {
    path: () => mainWindow()?.m_history?.location?.pathname,
    // A reload can leave the old copy's opening alive. Read Steam's DOM, not this copy's controller state.
    opening: () => Boolean(mainWindow()?.BrowserWindow?.document?.querySelector('.gh-root[data-gh-opening], .gh-bridge')),
    navigate: (path) => Navigation.Navigate(path),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** After a reload, opens Home again if it is on screen. Returns a cancel for unload. Never throws. */
export function remountHomeAfterReload(reloaded: boolean, deps: RemountDeps = defaultDeps): () => void {
    if (!reloaded) return () => undefined;
    let stopped = false;
    let pending: unknown = null;
    let away: unknown = null;
    const refresh = () => {
        try {
            if (stopped || deps.path() !== HOME_ROUTE) return;
            if (deps.opening()) {
                pending = deps.setTimeout(refresh, OPENING_RETRY_MS);
                return;
            }
            deps.navigate('/library');
            away = deps.setTimeout(() => {
                try {
                    if (stopped || deps.path() !== '/library') return;
                    deps.navigate(HOME_ROUTE);
                } catch (error) {
                    console.warn(`${LOG_PREFIX} Home: reopening after the update failed`, error);
                }
            }, AWAY_MS);
        } catch (error) {
            console.warn(`${LOG_PREFIX} Home: reopening after the update failed`, error);
        }
    };
    pending = deps.setTimeout(refresh, REMOUNT_DELAY_MS);
    return () => {
        stopped = true;
        if (pending !== null) deps.clearTimeout(pending);
        if (away !== null) deps.clearTimeout(away);
    };
}
