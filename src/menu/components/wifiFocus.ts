import { FOCUSABLE_SELECTOR } from '../navigation';

/** The control inside a keyed wrapper (the switch's row is a div around Steam's toggle), as findMenuFocus resolves it. */
export function focusTarget(wrapper: HTMLElement | null | undefined): HTMLElement | null {
    if (!wrapper) return null;
    return wrapper.matches(FOCUSABLE_SELECTOR) ? wrapper : wrapper.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
}
