/**
 * Whether one of Steam's side menus (the main menu or Quick Access) is open. Steam's menu store says so directly
 * (`SteamUIStore.WindowStore.GamepadUIMainWindowInstance.MenuStore.IsAnySideMenuVisible()`, probed on the Ally: 1 main
 * menu, 2 Quick Access, 0 none), whatever window has the system's focus. The status bar used to read "Big Picture lost
 * focus" as "a menu is open", which hid it for good when no Steam window had focus at all (seen on the Ally after a
 * Steam restart). That reading stays only as the fallback when Steam's store is not there.
 */

interface MenuStoreLike {
    IsAnySideMenuVisible?(): unknown;
}

/** Steam's menu store answer; else (no store, or it throws) the window having lost focus. Pure. */
export function menuOpen(store: MenuStoreLike | undefined, windowHasFocus: boolean): boolean {
    try {
        if (typeof store?.IsAnySideMenuVisible === 'function') return store.IsAnySideMenuVisible() === true;
    } catch {
        // fall through to the focus reading
    }
    return !windowHasFocus;
}

/** Steam's menu store, read live (undefined when Steam's UI store is not there). */
export function steamMenuStore(): MenuStoreLike | undefined {
    try {
        const ui = (globalThis as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { MenuStore?: MenuStoreLike } } } }).SteamUIStore;
        return ui?.WindowStore?.GamepadUIMainWindowInstance?.MenuStore;
    } catch {
        return undefined;
    }
}
