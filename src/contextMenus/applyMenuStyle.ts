import { CTX_UNIT } from './menuCss';

const ATTR = 'data-gg-context-menus';

/** Puts the context-menu stylesheet into `doc` (one, replaced on a second call) and the canvas unit on its root; returns the remover. */
export function applyMenuStyle(doc: Document, css: string, unit: number): () => void {
    let style = doc.head.querySelector(`style[${ATTR}]`);
    if (!style) {
        style = doc.createElement('style');
        style.setAttribute(ATTR, '');
        doc.head.append(style);
    }
    style.textContent = css;
    doc.documentElement.style.setProperty(CTX_UNIT, String(unit));
    return () => {
        doc.head.querySelector(`style[${ATTR}]`)?.remove();
        doc.documentElement.style.removeProperty(CTX_UNIT);
    };
}

/** True when the window of `target` (an element, or Steam's event target) carries the context-menu stylesheet with rules. */
export function menuStyled(target: unknown): boolean {
    try {
        const t = target as { ownerDocument?: Document | null; document?: Document } | null;
        const doc = t?.ownerDocument ?? t?.document;
        return Boolean(doc?.head?.querySelector(`style[${ATTR}]`)?.textContent);
    } catch {
        return false;
    }
}
