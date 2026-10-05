import { DEFAULT_ACCENT } from './accent';
import { openOverlayCss } from './homeCss';
import { DOMRectLike, usableRect } from './openTransition';

const CSS = openOverlayCss();
/** Fades Home out (homeCss `.gh-root[data-gh-leaving]`) while the overlay is up. */
const LEAVING = 'data-gh-leaving';

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/**
 * The open transition's full-screen overlay: a clone of the source (`rect`, measured with getBoundingClientRect)
 * with the wide art (`art`, a CSS background-image value) over ink, which expands to cover Home's box and then
 * fades (the motion is CSS, openOverlayCss). Built as plain DOM in Home's document body, not rendered by React:
 * Steam unmounts Home as soon as the game page opens (probed on the Ally), and the clone must stay over that
 * page until it has faded. Geometry is in the same space as the source: Home's measured box in CSS px, never
 * the window size (SharedJSContext's window is 1x1). Also marks Home as leaving so it fades out.
 *
 * Throws (leaving nothing behind) when there is nowhere to put it; returns an idempotent remover that takes the
 * overlay away and restores Home.
 */
export function mountOpenOverlay(home: HTMLElement, rect: DOMRectLike, art: string): () => void {
    const doc = home.ownerDocument;
    const parent = doc?.body ?? doc?.documentElement;
    if (!doc || !parent) throw new Error('Home has no document');
    const box = home.getBoundingClientRect();
    if (!usableRect(box)) throw new Error('Home has no usable size');

    const overlay = doc.createElement('div');
    let removed = false;
    const remove = () => {
        if (removed) return;
        removed = true;
        try {
            overlay.remove();
        } finally {
            home.removeAttribute(LEAVING);
        }
    };
    try {
        overlay.className = 'gh-open';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.left = px(box.left);
        overlay.style.top = px(box.top);
        overlay.style.width = px(box.width);
        overlay.style.height = px(box.height);
        overlay.style.setProperty('--glance-accent', home.style.getPropertyValue('--glance-accent').trim() || DEFAULT_ACCENT);
        const style = doc.createElement('style');
        style.textContent = CSS;
        const clone = doc.createElement('div');
        clone.className = 'gh-open-clone';
        clone.style.setProperty('--gh-from-l', px(rect.left - box.left));
        clone.style.setProperty('--gh-from-t', px(rect.top - box.top));
        clone.style.setProperty('--gh-from-w', px(rect.width));
        clone.style.setProperty('--gh-from-h', px(rect.height));
        if (art) clone.style.backgroundImage = art;
        overlay.append(style, clone);
        parent.appendChild(overlay);
        home.setAttribute(LEAVING, '');
    } catch (error) {
        try {
            remove();
        } catch {
            // nothing more to undo
        }
        throw error;
    }
    return remove;
}
