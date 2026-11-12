import { LAUNCH_ART_BOX, LAUNCH_ART_CLASS } from '../styles/launchArt';

/**
 * The launch's bridge: after Play on Spotlight Home, Steam replaces Home with the game's page at once, but draws the page's
 * header (where the page keeps Home's art, styles/launchArt) only some 300 to 700 ms later (filmed on the Ally): dark until
 * then. Home puts its own art (the same layers) in Steam's window the moment Play is pressed, and takes it away as soon as
 * the page's own copy is there, so Home's hero never leaves the screen.
 *
 * It sits in Steam's UI root (`.BasicUI`), under Steam's footer (z-index 7000 there) and over the page; our status bar is
 * above both (its own host). Plain DOM, as the open transition's bridge. Leaves on its own after LAUNCH_BRIDGE_MAX_MS
 * whatever happens (a launch Steam refused, a page without the layer). Returns a function that removes it at once.
 */
export const LAUNCH_BRIDGE_MAX_MS = 3000;
export const LAUNCH_BRIDGE_Z = 6000;
export const LAUNCH_BRIDGE_CLASS = 'gg-launch-bridge';

/** What the bridge needs of the window it is drawn in (the document's own: SharedJSContext's window is not Steam's). */
export type BridgeView = Pick<Window, 'setTimeout' | 'clearTimeout' | 'requestAnimationFrame'> & { MutationObserver?: typeof MutationObserver };

export function mountLaunchBridge(doc: Document, layers: { fill: string | null; art: string }, scrims = 'none', maxMs = LAUNCH_BRIDGE_MAX_MS, view: BridgeView | null = doc.defaultView): () => void {
    const win = view;
    const host = doc.querySelector<HTMLElement>('.BasicUI') ?? doc.body;
    if (!win || !host) return () => undefined;
    // A bridge from an earlier Play that has not left yet goes first.
    for (const old of [...doc.querySelectorAll(`.${LAUNCH_BRIDGE_CLASS}`)]) old.remove();
    const box = doc.createElement('div');
    box.className = LAUNCH_BRIDGE_CLASS;
    box.setAttribute('aria-hidden', 'true');
    const place = host === doc.body ? 'position: fixed;' : 'position: absolute;';
    box.setAttribute('style', `${LAUNCH_ART_BOX} ${place} z-index: ${LAUNCH_BRIDGE_Z}; background: #000;`);
    for (const style of [layers.fill, layers.art]) {
        if (style === null) continue;
        const part = doc.createElement('div');
        part.setAttribute('style', style);
        box.appendChild(part);
    }
    // The page's shading over the art (themeCss.pageScrims, as Home and the page draw it), so the bridge is not brighter.
    if (scrims !== 'none') {
        const shade = doc.createElement('div');
        shade.setAttribute('style', `position: absolute; inset: 0; background: ${scrims};`);
        box.appendChild(shade);
    }
    host.appendChild(box);

    let done = false;
    let observer: MutationObserver | null = null;
    const timer = win.setTimeout(() => remove(), maxMs);
    function remove() {
        if (done) return;
        done = true;
        observer?.disconnect();
        win?.clearTimeout(timer);
        box.remove();
    }
    // The page's own copy is in: leave a frame later, once it has been drawn.
    const handedOver = () => doc.querySelector(`.${LAUNCH_ART_CLASS}`) !== null;
    const check = () => {
        if (!done && handedOver()) win.requestAnimationFrame(() => win.requestAnimationFrame(remove));
    };
    if (win.MutationObserver) {
        observer = new win.MutationObserver(check);
        observer.observe(doc.body, { childList: true, subtree: true });
    }
    return remove;
}
