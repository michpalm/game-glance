import { RoutePatch, routerHook } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { settings } from '../data/settings';
import { HOME_ROUTE, isKnownHomeShape } from '../home/guard';
import { HomeGate } from '../home/HomeGate';
import { cancelOpen } from '../home/homeNav';
import { homeMode } from '../home/mode';
import { createHomePatchManager } from './homePatchManager';

const KEY = 'game-glance-home';
let warned = false;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Steam's Home route has no renderFunc (verified on device), so instead of afterPatch we hand
// Steam's own Home element to HomeGate as its fallback. Decky re-runs this on every router render,
// so the guard is re-checked each time; an unknown shape leaves the route exactly as Steam built it.
const homeRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        if (!isKnownHomeShape(routeProps)) {
            if (!warned) {
                warned = true;
                console.warn(`${LOG_PREFIX} Home route shape changed; leaving Steam's Home unchanged`);
            }
            return routeProps;
        }
        return { ...routeProps, children: <HomeGate key={KEY} fallback={routeProps.children} /> };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home route patch failed; leaving Steam's Home unchanged`, error);
        return routeProps;
    }
};

// The route patch exists only while Spotlight Home is on: with the toggle off Steam's Home is not
// patched at all. Never throws, so a failure here cannot stop the plugin (or the game page) loading.
export function patchHomePage(): () => void {
    try {
        const manager = createHomePatchManager({
            isOn: () => homeMode(settings.get()).home,
            subscribe: (listener) => settings.subscribe(listener),
            add: () => routerHook.addPatch(HOME_ROUTE, homeRoutePatch),
            remove: (handle) => routerHook.removePatch(HOME_ROUTE, handle as RoutePatch),
        });
        manager.start();
        return () => {
            try {
                cancelOpen(); // an open transition running at unload leaves no overlay behind
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home: cancelling the open transition at unload failed`, error);
            }
            try {
                manager.stop();
            } catch (error) {
                console.warn(`${LOG_PREFIX} Home route unpatch failed`, error);
            }
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Home route patch failed; leaving Steam's Home unchanged`, error);
        return () => undefined;
    }
}
