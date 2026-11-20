/**
 * Steam's on-screen keyboard as Steam + X opens it (spec 2026-11-18-menu-keyboard-shortcut): Steam's own handler for the
 * client's "user keyboard" message (SteamClient.Input.RegisterForUserKeyboardMessages → OnModalKeyboardMessage), with the
 * message a chord sends. Over a game it closes the side menus and shows Steam's keyboard screen that types into the game;
 * elsewhere the keyboard for the focused text field; a second one while it shows hides it.
 */
export interface KeyboardOwner {
    OnModalKeyboardMessage?(message: { nAppID: number; bChordInvoked: boolean; bEnterDismissesKeyboard: boolean; nXPosition: number; nYPosition: number; nWidth: number; nHeight: number }): void;
    MainRunningAppID?: number;
}

/** True when Steam took the request; false on a Steam without the handler (nothing happens then). */
export function openSteamKeyboard(owner: KeyboardOwner | undefined = (globalThis as { SteamUIStore?: KeyboardOwner }).SteamUIStore): boolean {
    try {
        if (typeof owner?.OnModalKeyboardMessage !== 'function') return false;
        const appId = Number(owner.MainRunningAppID);
        owner.OnModalKeyboardMessage({ nAppID: Number.isFinite(appId) && appId > 0 ? appId : 0, bChordInvoked: true, bEnterDismissesKeyboard: true, nXPosition: 0, nYPosition: 0, nWidth: 0, nHeight: 0 });
        return true;
    } catch {
        return false;
    }
}
