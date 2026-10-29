import { isRadialControl } from './keyboard/radialControls';
import type { MenuEvent, MenuState } from './model';
import type { KeyboardSession } from './keyboard/session';

export interface NativeInputOwner {
    GetShowingGlobalModal?(): boolean;
    ModalManager?: { active_modal?: unknown };
    VirtualKeyboardManager?: { IsShowingVirtualKeyboard?: { Value?: boolean } };
}
export function menuInputActive(owner: NativeInputOwner | undefined): boolean {
    return !!owner && !owner.GetShowingGlobalModal?.() && !owner.ModalManager?.active_modal && !owner.VirtualKeyboardManager?.IsShowingVirtualKeyboard?.Value;
}

/** A notification opens our own Social on that friend's chat; false when Social could not chat with them. */
export function openSocialChat(social: { get(): { status: string; canChat: boolean; friends: { steamId: string; blocked?: boolean }[] }; enter(steamId: string): Promise<void> } | undefined, dispatch: (event: MenuEvent) => void, steamId: string): boolean {
    const snapshot = social?.get();
    const friend = snapshot?.friends.find(f => f.steamId === steamId);
    if (!social || snapshot?.status !== 'ready' || !snapshot.canChat || !friend || friend.blocked) return false;
    dispatch({ type: 'select', section: 'social' });
    dispatch({ type: 'focus', section: 'social', key: `social:friend:${steamId}` });
    dispatch({ type: 'push', viewId: 'social-chat' });
    void social.enter(steamId);
    return true;
}

/** B returns to the same friend before a second B closes Social. Keyboard ownership is checked by the caller. */
export function leaveSocialConversation(state: MenuState, social: { get(): { selectedId: string | null }; leave(): void } | undefined, dispatch: (event: MenuEvent) => void): boolean {
    if (!social || state.section !== 'social' || state.stack[state.stack.length - 1] !== 'social-chat') return false;
    const id = social.get().selectedId;
    social.leave();
    if (id) dispatch({ type: 'focus', section: 'social', key: `social:friend:${id}` });
    dispatch({ type: 'back' });
    return true;
}

/** Called only by this menu's native Focusable subtree, never a global controller listener. */
export function handleMenuButton(detail: { button: number; is_repeat?: boolean }, state: MenuState, dispatch: (event: MenuEvent) => void, inputActive: boolean): boolean {
    if (!inputActive || state.phase !== 'custom-open' || ![2, 5, 6].includes(detail.button)) return false;
    if (!detail.is_repeat) dispatch(detail.button === 2 ? { type: 'back' } : { type: 'step', direction: detail.button === 5 ? -1 : 1 });
    return true;
}
/** A fresh opening (menu or quick-access button) starts on its active tab; a tab switch keeps bar focus only if it was there. */
export const focusPrefersBar = (wasOpen: boolean, focusInBar: boolean) => !wasOpen || focusInBar;
export function findMenuFocus(root: ParentNode, key?: string, preferBar = false): HTMLElement | null {
    const selector = 'button,input,select,textarea,a[href],.Focusable,[tabindex]';
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-gg-focus]')).map(wrapper => ({
        key: wrapper.dataset.ggFocus,
        element: wrapper.matches(selector) ? wrapper : wrapper.querySelector<HTMLElement>(selector),
    })).filter((item): item is { key: string | undefined; element: HTMLElement } => !!item.element && !item.element.closest('[hidden],[disabled],[aria-disabled="true"]'));
    if (preferBar || key?.startsWith('section:')) {
        const selected = elements.find(item => item.element.matches('.gg-menu-tab[aria-pressed="true"]'))?.element;
        if (selected) return selected;
    }
    const saved = elements.find(item => item.key === key)?.element;
    return saved ?? elements.find(item => item.element.closest('.gg-menu-panel'))?.element ?? elements[0]?.element ?? null;
}


/** A click covers mouse and touch activation; consume it before dismissing the popup. */
export function installOutsideMenuClick(root: HTMLElement, close: () => void, inputActive: () => boolean): () => void {
    const document = root.ownerDocument;
    const onClick = (event: MouseEvent) => {
        if (event.button > 0 || !inputActive() || !event.target || root.contains(event.target as Node) || (event.target as Element).closest?.('.gg-radial-keyboard-host')) return;
        event.preventDefault(); event.stopImmediatePropagation();
        close();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
}

/** The first B only closes an open keyboard; the caller consumes the event when this returns true. */
export function keyboardTakesCancel(detail: { button: number }, cancel: boolean, session: KeyboardSession): boolean {
    if (detail.button !== 2 || !cancel || !session.get().open || session.mode() === 'radial') return false;
    session.close();
    return true;
}

/** The keyboard lives only in the Social chat view. */
export function keyboardBelongs(state: MenuState): boolean {
    return state.section === 'social' && state.stack[state.stack.length - 1] === 'social-chat';
}

/** On the window so it runs before the menu's document-capture dismissal: the first outside tap only closes the keyboard. */
export function installKeyboardOutsideTap(view: Window, inside: () => HTMLElement[], close: () => void): () => void {
    const onClick = (event: MouseEvent) => {
        const target = event.target as Node | null;
        if (!target || inside().some(element => element.contains(target))) return;
        event.preventDefault(); event.stopImmediatePropagation();
        close();
    };
    view.addEventListener('click', onClick, true);
    return () => view.removeEventListener('click', onClick, true);
}

/** The friend whose chat may hold the keyboard; a change of value (or null) means the keyboard must close. */
export function keyboardHome(state: MenuState, active: boolean, enteredId: string | null): string | null {
    return active && enteredId && keyboardBelongs(state) ? enteredId : null;
}

export function rememberFocusKey(key: string | undefined): key is string {
    return !!key && !key.startsWith('keyboard:');
}

/** Scoped fallback when a Steam routing event reaches the shell before the radial document listener. */
export function radialOwnsButton(detail:{button:number},session:KeyboardSession):boolean {
    return session.get().open && session.mode() === 'radial' && isRadialControl(detail.button);
}
