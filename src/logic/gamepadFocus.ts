/**
 * Steam keeps two focuses: the browser's (document.activeElement) and its own gamepad focus (the `gpfocus` class), which is
 * where controller buttons go. On a Unifideck game's page the Play button takes the browser's focus, but Steam can put the
 * gamepad focus on a tab of its own page content that has no size (the hidden "Actividad"), so B (and the D-pad) go to
 * something nobody can see. Found on the Ally 2026-10-07 (after closing Quick Access, and after a Steam page).
 */

/** True for a box with no area: nothing the user can see, so never a place for the gamepad focus. */
export function isUnreachableRect(rect: { width: number; height: number } | null | undefined): boolean {
    return !rect || !(rect.width > 0) || !(rect.height > 0);
}

/** Pause between taking the focus off the button and putting it back (Steam updates its focus on the real change). */
export const REFOCUS_GAP_MS = 150;
/** The least time between two repairs, and the most on one page: a page that keeps resisting is left alone. */
export const REFOCUS_COOLDOWN_MS = 1000;
export const REFOCUS_MAX = 6;

/**
 * Whether to repair now: the gamepad focus is on something invisible, the window has focus (never steal it from Quick Access),
 * the cooldown has passed and the repairs are not used up. Pure.
 */
export function shouldRefocus(i: { gpRect: { width: number; height: number } | null; windowFocused: boolean; sinceLastMs: number; done: number }): boolean {
    return i.gpRect !== null && isUnreachableRect(i.gpRect) && i.windowFocused && i.sinceLastMs >= REFOCUS_COOLDOWN_MS && i.done < REFOCUS_MAX;
}
