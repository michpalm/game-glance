import { RoutePatch, routerHook } from '@decky/api';
import { createElement, isValidElement } from 'react';
import { LOG_PREFIX } from '../constants';
import { stopNativeReset } from '../library/libraryGate';
import { LibraryGate, watchNativeReset } from '../library/LibraryPage';

/** Steam's tabbed Library (read from steamui/sp.js on the PS5, 2026-11-19): Home, game pages and Downloads are earlier routes. */
export const LIBRARY_ROUTE = '/library';
const KEY = 'game-glance-library';

/* eslint-disable @typescript-eslint/no-explicit-any */
// As the Downloads patch: Steam's route is { path, children: <its Library> }; the child is wrapped in the gate, which shows
// Game Glance's Library or falls back to Steam's element. Any other shape leaves the route as Steam built it.
const libraryRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        const native = routeProps?.children;
        if (!isValidElement(native) || (native.type as unknown) === LibraryGate) return routeProps;
        routeProps.children = createElement(LibraryGate, { key: KEY, native });
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library route patch failed; leaving Steam's page`, error);
    }
    return routeProps;
};

/** Never throws, so a failure here cannot stop the plugin loading. */
export function patchLibraryPage(): () => void {
    try {
        const handle = routerHook.addPatch(LIBRARY_ROUTE, libraryRoutePatch);
        watchNativeReset();
        return () => {
            stopNativeReset();
            routerHook.removePatch(LIBRARY_ROUTE, handle);
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not patch the Library route`, error);
        return () => {};
    }
}
