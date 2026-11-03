import { isValidElement, type ReactElement } from 'react';
import { PLUGIN_NAME } from '../../constants';

/** A loaded Decky plugin as the menu's Plugins page lists it. */
export interface DeckyPlugin {
    name: string;
    version: string;
    icon: ReactElement | null;
}
export interface DeckyLoaderLike {
    plugins?: unknown;
    deckyState?: { _pluginOrder?: unknown; _hiddenPlugins?: unknown; setActivePlugin?: unknown };
}

export function deckyLoader(): DeckyLoaderLike | null {
    const loader = (globalThis as { DeckyPluginLoader?: unknown }).DeckyPluginLoader;
    return loader && typeof loader === 'object' ? loader as DeckyLoaderLike : null;
}

const names = (value: unknown): string[] => Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string') : [];

/**
 * Loaded plugins, Game Glance first, then in Decky's own order: its order list (it can repeat names and hold plugins
 * that are not loaded), then any loaded plugin it does not name, in load order. Hidden plugins are left out, as
 * Decky's list does. Null when the loader's list cannot be read.
 */
export function listDeckyPlugins(loader: DeckyLoaderLike | null = deckyLoader()): DeckyPlugin[] | null {
    if (!loader || !Array.isArray(loader.plugins)) return null;
    const loaded = loader.plugins.filter((p): p is { name: string; version?: unknown; icon?: unknown } =>
        !!p && typeof p === 'object' && typeof (p as { name?: unknown }).name === 'string');
    const byName = new Map(loaded.map(p => [p.name, p]));
    const hidden = new Set(names(loader.deckyState?._hiddenPlugins));
    const shown: string[] = [];
    for (const name of [PLUGIN_NAME, ...names(loader.deckyState?._pluginOrder), ...loaded.map(p => p.name)]) {
        if (byName.has(name) && !hidden.has(name) && !shown.includes(name)) shown.push(name);
    }
    return shown.map(name => {
        const p = byName.get(name)!;
        return { name, version: typeof p.version === 'string' ? p.version : '', icon: isValidElement(p.icon) ? p.icon : null };
    });
}

/** Decky's panel opens on this plugin next time its tab shows (a plain state setter in Decky's DeckyState). */
export function activateDeckyPlugin(name: string, loader: DeckyLoaderLike | null = deckyLoader()): void {
    const state = loader?.deckyState;
    if (!state || typeof state.setActivePlugin !== 'function') return;
    try { (state.setActivePlugin as (name: string) => void).call(state, name); } catch { /* Decky's list still opens. */ }
}
