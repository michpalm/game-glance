import { RoutePatch, routerHook } from '@decky/api';
import { LOG_PREFIX } from '../constants';
import { settings } from '../data/settings';
import { LibraryGate } from '../library/LibraryGate';

const LIBRARY_ROUTES = ['/library/games', '/library/all', '/library'];
const KEY = 'game-glance-library';

/* eslint-disable @typescript-eslint/no-explicit-any */
const libraryRoutePatch: RoutePatch = (routeProps: any) => {
    try {
        if (!routeProps || typeof routeProps !== 'object' || !routeProps.children) {
            return routeProps;
        }
        return {
            ...routeProps,
            children: <LibraryGate key={KEY} fallback={routeProps.children} />,
        };
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library route patch failed; leaving Steam's Library unchanged`, error);
        return routeProps;
    }
};

export function patchLibraryPage(): () => void {
    const handles = new Map<string, unknown>();
    let active = false;
    let stopped = false;
    let unsubscribe: (() => void) | null = null;

    const addPatches = () => {
        if (active) return;
        for (const route of LIBRARY_ROUTES) {
            try {
                const handle = routerHook.addPatch(route, libraryRoutePatch);
                handles.set(route, handle);
            } catch (error) {
                console.warn(`${LOG_PREFIX} could not patch library route ${route}`, error);
            }
        }
        active = true;
    };

    const removePatches = () => {
        if (!active) return;
        for (const [route, handle] of handles.entries()) {
            try {
                routerHook.removePatch(route, handle as RoutePatch);
            } catch (error) {
                console.warn(`${LOG_PREFIX} could not remove patch for library route ${route}`, error);
            }
        }
        handles.clear();
        active = false;
    };

    const sync = () => {
        if (stopped) return;
        const on = settings.get().spotlightLibrary;
        if (on && !active) {
            addPatches();
        } else if (!on && active) {
            removePatches();
        }
    };

    try {
        unsubscribe = settings.subscribe(sync);
        sync();
    } catch (error) {
        console.warn(`${LOG_PREFIX} Library route patch manager init failed`, error);
    }

    return () => {
        stopped = true;
        try {
            unsubscribe?.();
        } catch {
            // ignore
        }
        removePatches();
    };
}
