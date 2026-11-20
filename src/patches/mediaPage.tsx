import { RoutePatch, routerHook } from '@decky/api';
import { createElement, isValidElement } from 'react';
import { LOG_PREFIX } from '../constants';
import { MediaGate, watchMediaNativeReset } from '../media/MediaPage';
import { stopMediaNativeReset } from '../media/mediaState';

/** Steam's Media page (read from steamui/sp.js, 2026-11-19): one route for the grid, the list and an item. */
export const MEDIA_ROUTE = '/media';
const KEY = 'game-glance-media';

/* eslint-disable @typescript-eslint/no-explicit-any */
// As the Library patch: Steam's child element is wrapped in the gate, which shows Game Glance's Media or Steam's element.
const mediaRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        const native = routeProps?.children;
        if (!isValidElement(native) || (native.type as unknown) === MediaGate) return routeProps;
        routeProps.children = createElement(MediaGate, { key: KEY, native });
    } catch (error) {
        console.warn(`${LOG_PREFIX} Media route patch failed; leaving Steam's page`, error);
    }
    return routeProps;
};

/** Never throws, so a failure here cannot stop the plugin loading. */
export function patchMediaPage(): () => void {
    try {
        const handle = routerHook.addPatch(MEDIA_ROUTE, mediaRoutePatch);
        watchMediaNativeReset();
        return () => {
            stopMediaNativeReset();
            routerHook.removePatch(MEDIA_ROUTE, handle);
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not patch the Media route`, error);
        return () => {};
    }
}
