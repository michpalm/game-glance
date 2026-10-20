import type { MenuEvent, MenuState } from './model';

export interface NativeInputOwner {
    GetShowingGlobalModal?(): boolean;
    ModalManager?: { active_modal?: unknown };
    VirtualKeyboardManager?: { IsShowingVirtualKeyboard?: { Value?: boolean } };
}
export function menuInputActive(owner: NativeInputOwner | undefined): boolean {
    return !!owner && !owner.GetShowingGlobalModal?.() && !owner.ModalManager?.active_modal && !owner.VirtualKeyboardManager?.IsShowingVirtualKeyboard?.Value;
}

/** Called only by this menu's native Focusable subtree, never a global controller listener. */
export function handleMenuButton(detail: { button: number; is_repeat?: boolean }, state: MenuState, dispatch: (event: MenuEvent) => void, inputActive: boolean): boolean {
    if (!inputActive || state.phase !== 'custom-open' || ![2, 5, 6].includes(detail.button)) return false;
    if (!detail.is_repeat) dispatch(detail.button === 2 ? { type: 'back' } : { type: 'step', direction: detail.button === 5 ? -1 : 1 });
    return true;
}
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
        if (event.button > 0 || !inputActive() || !event.target || root.contains(event.target as Node)) return;
        event.preventDefault(); event.stopImmediatePropagation();
        close();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
}
