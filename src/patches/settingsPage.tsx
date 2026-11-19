import { RoutePatch, routerHook } from '@decky/api';
import { createElement, isValidElement } from 'react';
import { LOG_PREFIX } from '../constants';
import { SettingsGate } from '../settings/SettingsPage';

/** Steam's Settings (sp.js: Settings.Root() = /settings, each page under it); the gate shows ours on the bare path only. */
export const SETTINGS_ROUTE = '/settings';
const KEY = 'game-glance-settings';

/* eslint-disable @typescript-eslint/no-explicit-any */
// As the Library and Media patches: Steam's child element is wrapped in the gate, which falls back to it.
const settingsRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        const native = routeProps?.children;
        if (!isValidElement(native) || (native.type as unknown) === SettingsGate) return routeProps;
        routeProps.children = createElement(SettingsGate, { key: KEY, native });
    } catch (error) {
        console.warn(`${LOG_PREFIX} Settings route patch failed; leaving Steam's page`, error);
    }
    return routeProps;
};

/** Never throws, so a failure here cannot stop the plugin loading. */
export function patchSettingsPage(): () => void {
    try {
        const handle = routerHook.addPatch(SETTINGS_ROUTE, settingsRoutePatch);
        return () => { routerHook.removePatch(SETTINGS_ROUTE, handle); };
    } catch (error) {
        console.warn(`${LOG_PREFIX} could not patch the Settings route`, error);
        return () => {};
    }
}
