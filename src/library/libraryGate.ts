import { usesStat, type GameInfoSlots } from '../logic/infoSlots';
import { keepsNative, routeChoice, type LibrarySnapshot, type RouteChoice } from './libraryModel';
import { libraryMemory } from './libraryState';

export interface GateInput {
    /** The "Library page" setting. */
    enabled: boolean;
    /** Steam's library, or null when it cannot be read. */
    snapshot: LibrarySnapshot | null;
    /** Steam's current route, or null when unknown. */
    path: string | null;
    /** The user chose Steam's library for this visit (Y → Steam's library). */
    native: boolean;
}

/** The paths Steam's `/library` route itself shows; any other path means Steam is leaving it (a game page, Home). */
export const ownsPath = (path: string) => /^\/library(\/(tab|collection)\/[^/]+|\/collections)?\/?$/.test(path);

/**
 * Whether Steam's `/library` route shows Game Glance's Library, and on which tab (spec §2). While Steam is leaving the
 * route (opening a game page) the path already names the next page for a frame: the previous choice stands, so
 * Steam's own Library never flashes in between.
 */
export function gateChoice({ enabled, snapshot, path, native }: GateInput, previous?: RouteChoice): RouteChoice {
    if (!enabled || native || !snapshot || path === null) return { kind: 'native' };
    if (previous && !ownsPath(path)) return previous;
    return routeChoice(path, snapshot);
}

/** ProtonDB is asked only while it is in a Game info slot, as on Home and the game page (it sends the app id out). */
export const libraryProtonWanted = (slots: GameInfoSlots): boolean => usesStat(slots, 'protondb');

interface History { location?: { pathname?: string }; listen?(changed: () => void): unknown }
let stopReset: (() => void) | null = null;

/**
 * Watches Steam's history so a chosen "Steam's library" resets when the user leaves the Library and its game pages.
 * Called at load and again from the gate: Steam's history may not exist yet when the plugin loads. True once watching.
 */
export function ensureNativeReset(history: () => History | null | undefined): boolean {
    if (stopReset) return true;
    try {
        const h = history();
        if (typeof h?.listen !== 'function') return false;
        const stop = h.listen(() => {
            const path = history()?.location?.pathname;
            if (libraryMemory.get().native && typeof path === 'string' && !keepsNative(path)) libraryMemory.set({ native: false });
        });
        stopReset = typeof stop === 'function' ? stop as () => void : () => {};
        return true;
    } catch {
        return false;
    }
}

/** Stops the watch (plugin unload). */
export function stopNativeReset(): void {
    stopReset?.();
    stopReset = null;
}
