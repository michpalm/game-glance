import { RoutePatch, routerHook } from '@decky/api';
import { createElement, isValidElement } from 'react';
import { LOG_PREFIX } from '../constants';
import { DownloadsGate } from '../downloads/DownloadsPage';

export const DOWNLOADS_ROUTE = '/library/downloads';
const KEY = 'game-glance-downloads';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Steam's route is { path, children: <its page> } (read on the PS5, 2026-11-19): the page is wrapped in the gate, which
// shows Game Glance's Downloads or falls back to Steam's element. Any other shape leaves the route as Steam built it.
const downloadsRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        const native = routeProps?.children;
        if (!isValidElement(native) || (native.type as unknown) === DownloadsGate) return routeProps;
        routeProps.children = createElement(DownloadsGate, { key: KEY, native });
    } catch (error) {
        console.warn(`${LOG_PREFIX} Downloads route patch failed; leaving Steam's page`, error);
    }
    return routeProps;
};

/** Never throws, so a failure here cannot stop the plugin loading. */
export function patchDownloadsPage(): () => void {
    try {
        const handle = routerHook.addPatch(DOWNLOADS_ROUTE, downloadsRoutePatch);
        return () => routerHook.removePatch(DOWNLOADS_ROUTE, handle);
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not patch the Downloads route`, error);
        return () => {};
    }
}
