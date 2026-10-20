import { LOG_PREFIX } from '../constants';
import { CARD_NAV } from './cardNav';
import { playRow } from '../styles/theme';
type ScrollOwner = { Element?: unknown; ScrollTo?(top: number, behavior: 'auto'): void };
type Fiber = { stateNode?: ScrollOwner; return?: Fiber | null };

/** Steam animates ScrollToTop itself; DOM scrollIntoView cannot cancel that animation. */
function nativeScroll(port: HTMLElement, top: number): boolean {
    const key = Object.keys(port).find((name) => name.startsWith('__reactFiber'));
    let fiber = key ? (port as unknown as Record<string, Fiber>)[key] : undefined;
    for (let depth = 0; fiber && depth < 80; depth++, fiber = fiber.return ?? undefined) {
        const owner = fiber.stateNode;
        if (owner?.Element === port && typeof owner.ScrollTo === 'function') {
            owner.ScrollTo(top, 'auto');
            return true;
        }
    }
    return false;
}

function scrollPort(element: HTMLElement): HTMLElement | null {
    const win = element.ownerDocument.defaultView;
    if (!win) return null;
    let port = element.parentElement;
    while (port && !(port.scrollHeight > port.clientHeight && /auto|scroll|overlay/.test(win.getComputedStyle(port).overflowY))) port = port.parentElement;
    return port;
}

/** Center the whole question and response row, using Steam's scroll controller when available. */
export function centerFeedbackPanel(panel: HTMLElement): void {
    const port = scrollPort(panel);
    if (!port) return;
    const rect = panel.getBoundingClientRect();
    const viewport = port.getBoundingClientRect();
    if (viewport.height <= 0 || port.clientHeight <= 0) return;
    const delta = ((rect.top + rect.bottom) / 2 - (viewport.top + viewport.bottom) / 2) * port.clientHeight / viewport.height;
    const top = Math.max(0, Math.min(port.scrollHeight - port.clientHeight, port.scrollTop + delta));
    if (!nativeScroll(port, top)) port.scrollTop = top;
}

/** The hero screen: Play and the Family Sharing pill. Scroll the page port to the top. */
export function scrollPageToTop(anchor: HTMLElement): void {
    const playSel = playRow();
    const play = playSel ? anchor.ownerDocument.querySelector<HTMLElement>(playSel) : null;
    const port = scrollPort(anchor) ?? (play ? scrollPort(play) : null);
    if (port && !nativeScroll(port, 0)) port.scrollTop = 0;
}

/** Present the submenu as its own screen, below Steam's header inset. */
function showMenus(section: HTMLElement, inset: number): void {
    const port = scrollPort(section);
    if (!port) return;
    const rect = section.getBoundingClientRect();
    const viewport = port.getBoundingClientRect();
    if (viewport.height <= 0 || port.clientHeight <= 0) return;
    const delta = (rect.top - viewport.top) * port.clientHeight / viewport.height - inset;
    const top = Math.max(0, Math.min(port.scrollHeight - port.clientHeight, port.scrollTop + delta));
    if (!nativeScroll(port, top)) port.scrollTop = top;
}

/** After native focus callbacks, show the hero, feedback, or submenu for the selected zone. */
export function installPageFocusScrolling(doc: Document, selector: string | null, tabs: { selector: string; inset: number } | null = null): () => void {
    const win = doc.defaultView;
    if (!win) return () => undefined;
    let pending: number | null = null;
    const cancel = () => {
        if (pending !== null) win.cancelAnimationFrame(pending);
        pending = null;
    };
    const onFocus = (event: Event) => {
        cancel();
        const target = event.target as Element | null;
        const card = typeof target?.closest === 'function' ? target.closest<HTMLElement>(`.${CARD_NAV}`) : null;
        const family = typeof target?.closest === 'function' ? target.closest<HTMLElement>('.gg-family') : null;
        const feedback = selector && typeof target?.closest === 'function' ? target.closest<HTMLElement>(selector) : null;
        const tab = tabs && typeof target?.closest === 'function' ? target.closest<HTMLElement>('[role="tab"]') : null;
        const section = tab && tabs ? tab.closest<HTMLElement>(tabs.selector) : null;
        const scope = card ?? family ?? feedback ?? (section ? tab : null);
        if (!scope) return;
        pending = win.requestAnimationFrame(() => {
            pending = win.requestAnimationFrame(() => {
                pending = null;
                if (!scope.isConnected || !(scope.contains(doc.activeElement) || scope.querySelector('.gpfocus') || scope.classList.contains('gpfocus'))) return;
                try {
                    if (card || family) scrollPageToTop(scope);
                    else if (feedback) centerFeedbackPanel(feedback);
                    else if (section && tabs) showMenus(section, tabs.inset);
                } catch (error) {
                    console.warn(`${LOG_PREFIX} could not position the game page`, error);
                }
            });
        });
    };
    doc.addEventListener('focusin', onFocus, true);
    return () => {
        doc.removeEventListener('focusin', onFocus, true);
        cancel();
    };
}
