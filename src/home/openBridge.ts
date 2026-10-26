import type { OpenBridge } from './openTransition';

/**
 * The open transition's bridge: a frozen copy of Spotlight Home's root, in its final (page-shaped) state, placed over
 * Home's box in the document body. Steam unmounts Home as soon as the game page's route opens (probed on the Ally), so
 * the copy is what covers the moment the page draws behind it; it fades away once the page is ready. Plain DOM, not
 * rendered by React. The copy carries `gh-bridge` (homeCss: no animations or transitions inside it, so nothing replays,
 * e.g. the hero layer's fade-in); the fade is on its own container, which no stylesheet touches. Geometry is Home's
 * measured box, never the window size (SharedJSContext's window is 1x1). `css`: a stylesheet that applies while the
 * bridge is up; `extras`: other layers of Home's to copy on top (the status bar). Throws when there is nowhere to put it.
 */
/** The bridge's fade: most of it early (the page's new parts show through soon), a long soft tail. */
export const BRIDGE_FADE_EASE = 'cubic-bezier(.2,.65,.3,1)';

export function mountOpenBridge(root: HTMLElement, css = '', extras: Element[] = [], drop: string[] = [], settle?: (copy: HTMLElement) => void): OpenBridge {
    const doc = root.ownerDocument;
    const parent = doc?.body;
    if (!doc || !parent) throw new Error('Home has no document');
    const r = root.getBoundingClientRect();
    if (![r.left, r.top, r.width, r.height].every(Number.isFinite) || r.width <= 0 || r.height <= 0) throw new Error('Home has no usable size');
    const box = doc.createElement('div');
    Object.assign(box.style, {
        position: 'fixed',
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        overflow: 'hidden',
        zIndex: '99999',
        pointerEvents: 'none',
        margin: '0',
        padding: '0',
    });
    box.setAttribute('aria-hidden', 'true');
    // A stylesheet that applies while the bridge is up (Steam's page-enter fade switched off: theme.steamEnterOffCss).
    if (css) {
        const style = doc.createElement('style');
        style.textContent = css;
        box.appendChild(style);
    }
    const copy = root.cloneNode(true) as HTMLElement;
    copy.classList.add('gh-bridge');
    // Not Home's "just back" state (homeCss .gh-back: its UI fading in after B): in the copy that fade would replay from 0.
    copy.classList.remove('gh-back');
    // Parts already gone by the hand-over (`drop`: Home's game row, tabs and feed) are left out: on the Ally they were
    // half the copy's style and layout work, in the frame Steam is busiest.
    if (drop.length > 0) for (const el of [...copy.querySelectorAll(drop.join(', '))]) el.remove();
    box.appendChild(copy);
    // Layers Home draws outside its root (our status bar, which also keeps Steam's top bar hidden), copied over the top.
    for (const extra of extras) box.appendChild(extra.cloneNode(true));
    parent.appendChild(box);
    let removed = false;
    return {
        fadeIn(ms: number) {
            // From transparent, committed before the transition starts, so the copy cross-fades over live Home (whose moved
            // text is drawn soft) instead of replacing it in one frame.
            box.style.transition = 'none';
            box.style.opacity = '0';
            void (box as HTMLElement).offsetWidth;
            box.style.transition = `opacity ${ms}ms ease-in-out`;
            box.style.opacity = '1';
        },
        fadeOut(ms: number) {
            // Front-loaded, so the page's new parts show through soon, and soft at the end: the copy and the page differ only
            // in sub-pixel rendering, which a slow tail hides.
            box.style.transition = `opacity ${ms}ms ${BRIDGE_FADE_EASE}`;
            box.style.opacity = '0';
        },
        settle() {
            if (!removed) settle?.(copy);
        },
        remove() {
            if (removed) return;
            removed = true;
            box.remove();
        },
    };
}

/**
 * A copy of Steam's own top bar for the bridge, pinned where the live one is. With Game Glance's status bar off, Steam's
 * bar is what Home shows at the top; the bridge covers the whole screen, so without this copy the bar vanished for the
 * whole open (Reddit 3.4, R3APER's blink; Task 5 on the Ally). On the Ally the live bar is an absolute strip at the top,
 * transparent, over Home's own gradient: the copy is a fixed wrapper at the bar's rect and the clone fills it. Detached;
 * `mountOpenBridge` takes it as an extra.
 */
export function topBarCopy(bar: Element, rect: { left: number; top: number; width: number; height: number }, doc: Document): HTMLElement {
    const wrap = doc.createElement('div');
    Object.assign(wrap.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        pointerEvents: 'none',
        margin: '0',
    });
    wrap.setAttribute('aria-hidden', 'true');
    const clone = bar.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, { position: 'relative', inset: 'auto', width: '100%', height: '100%' });
    wrap.appendChild(clone);
    return wrap;
}

/**
 * On Steam's own page, Steam's bar fades in under the copy as the copy fades out, instead of only after the copy is
 * gone (the 190 ms without any bar, seen on the Ally). `giveBack` runs once, when the fade starts, or at `remove()` if
 * the copy goes without a fade. A throwing `giveBack` never stops the fade.
 */
export function withSteamBarBack(bridge: OpenBridge, giveBack: () => void): OpenBridge {
    let done = false;
    const back = () => {
        if (done) return;
        done = true;
        try {
            giveBack();
        } catch {
            // the bar stays covered until the copy is gone; never stop the fade
        }
    };
    const wrapped: OpenBridge = {
        fadeIn: (ms) => bridge.fadeIn(ms),
        fadeOut: (ms) => {
            back();
            bridge.fadeOut(ms);
        },
        remove: () => {
            bridge.remove();
            back();
        },
    };
    if (bridge.settle) wrapped.settle = () => bridge.settle?.();
    return wrapped;
}
