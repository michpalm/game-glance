/**
 * How the rest of Game Glance (the game page's Achievements card) asks the menu to open straight on one of its views.
 * The running menu registers itself here; without one, openMenuView says no and the caller falls back to Steam. Kept
 * apart from startMenu so the game page does not pull in the whole menu.
 */
type Opener = (viewId: string) => boolean;
let current: Opener | null = null;

/** The running menu's opener (null: none). The returned stop only removes this one, never a newer menu's. */
export function setMenuViewOpener(opener: Opener | null): () => void {
    current = opener;
    return () => { if (current === opener) current = null; };
}

/** True when the menu took the view and is opening on it. */
export function openMenuView(viewId: string): boolean {
    try { return current?.(viewId) === true; } catch { return false; }
}
