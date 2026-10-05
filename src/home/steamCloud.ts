import { findModule } from '@decky/ui';
import { memoLookup } from './moduleLookup';
import type { ComponentType } from 'react';
import { LOG_PREFIX } from '../constants';
import { CloudAction, CloudState, cloudState } from './cloud';

/**
 * Steam's own pieces behind the game page's cloud status, found by export names as the Play pill's are (probed on
 * the Ally): the CloudSync icon (one icon module), the cloud dialogs (TE: file conflict, zI: sync failed / retry, aj)
 * and the login state (qw().BIsOfflineMode()). Anything missing gives null and Home falls back (its own icon; no
 * button when the state cannot be read; no dialog, so A does nothing).
 */

type DialogFn = (props: Record<string, unknown>, win: unknown) => void;
interface CloudApi {
    ResolveAppSyncConflict?(appId: number, keepLocal: boolean): void;
    RetryAppSync?(appId: number): void;
}
const cloudApi = (): CloudApi | undefined => (globalThis as { SteamClient?: { Cloud?: CloudApi } }).SteamClient?.Cloud;

/**
 * The dialog call Steam's cloud status makes on A (its handlers, copied): a conflict asks which files to keep, a
 * failed sync offers a retry. Pure given `api`; null for 'none'.
 */
export function cloudDialog(action: CloudAction, appId: number, api: () => CloudApi | undefined): { dialog: 'conflict' | 'retry'; props: Record<string, unknown> } | null {
    if (action === 'conflict') {
        return {
            dialog: 'conflict',
            props: {
                appid: appId,
                onCancel: () => undefined,
                keepLocal: () => api()?.ResolveAppSyncConflict?.(appId, true),
                keepRemote: () => api()?.ResolveAppSyncConflict?.(appId, false),
                onOK: () => undefined,
                bOnAppLaunch: false,
            },
        };
    }
    if (action === 'retry') {
        return { dialog: 'retry', props: { appid: appId, onCancel: () => undefined, onOK: () => api()?.RetryAppSync?.(appId), bOnAppLaunch: false } };
    }
    return null;
}

/** Steam's CloudSync icon component, or null (a miss is retried at most once a minute). */
export const steamCloudIcon = memoLookup<ComponentType<Record<string, unknown>>>('cloud icon', () => findModule((m: any) => m && typeof m.CloudSync === 'function')?.CloudSync ?? null);

const steamDialogs = memoLookup<{ conflict: DialogFn; retry: DialogFn }>('cloud dialogs', () => {
    const m = findModule((x: any) => x && typeof x.TE === 'function' && typeof x.zI === 'function' && typeof x.aj === 'function');
    return m ? { conflict: m.TE as DialogFn, retry: m.zI as DialogFn } : null;
});

const steamLogin = memoLookup<() => { BIsOfflineMode?(): boolean }>('login state', () => {
    const m = findModule((x: any) => x && typeof x.qw === 'function' && typeof x.qw()?.BIsOfflineMode === 'function');
    return m ? (m.qw as () => { BIsOfflineMode?(): boolean }) : null;
});

function offlineMode(): boolean {
    try {
        return steamLogin()?.()?.BIsOfflineMode?.() === true;
    } catch {
        return false;
    }
}

type Globals = {
    appDetailsStore?: { GetAppDetails?(appId: number): unknown };
    appStore?: { GetAppOverviewByAppID?(appId: number): { BIsModOrShortcut?(): boolean } | null | undefined };
};

/** The cloud state of a game now (as the game page derives it), or null when the page would show none or anything fails. */
export function readCloud(appId: number): CloudState | null {
    try {
        const g = globalThis as unknown as Globals;
        const overview = g.appStore?.GetAppOverviewByAppID?.(appId);
        const app = !overview ? 'missing' : overview.BIsModOrShortcut?.() ? 'shortcut' : 'game';
        return cloudState(g.appDetailsStore?.GetAppDetails?.(appId) as never, app, offlineMode());
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home: could not read the cloud state`, error);
        return null;
    }
}

/** A on the cloud button: Steam's conflict or retry dialog in `win` (the button's window), as the game page does. */
export function pressCloud(state: CloudState, appId: number, win: unknown) {
    const call = cloudDialog(state.action, appId, cloudApi);
    if (!call) return;
    const fns = steamDialogs();
    if (!fns) return;
    fns[call.dialog](call.props, win);
}
