import type { Stop } from './model';

const SURFACES = '.gg-menu-bar,.gg-menu-panel,.gg-menu-notifications';
/** Blur Steam content in its own document, only behind the popup's actual rounded surfaces. */
export function frostMenuSurfaces(owner: Document, source: Document, viewport: HTMLElement): Stop {
    const view = source.defaultView, ownerView = owner.defaultView;
    const root = source.querySelector<HTMLElement>('.gg-menu');
    if (!view || !root || !viewport.parentElement) throw new Error('Custom menu geometry is unavailable');
    const layer = owner.createElement('div');
    layer.dataset.ggMenuFrost = 'true';
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none';
    const panes = new Map<HTMLElement, HTMLDivElement>();
    let stopped = false, frame: number | undefined;
    const resize = view.ResizeObserver ? new view.ResizeObserver(() => schedule()) : undefined;
    const sync = () => {
        if (stopped) return;
        const bounds = viewport.getBoundingClientRect();
        const sx = bounds.width / view.innerWidth, sy = bounds.height / view.innerHeight;
        if (!(sx > 0 && sy > 0)) return;
        const surfaces = [...root.querySelectorAll<HTMLElement>(SURFACES), ...source.querySelectorAll<HTMLElement>('.gg-menu-status-host .gh-status-pill')];
        for (const [element, pane] of panes) if (!surfaces.includes(element)) {
            resize?.unobserve(element); pane.remove(); panes.delete(element);
        }
        for (const element of surfaces) {
            let pane = panes.get(element);
            if (!pane) {
                pane = owner.createElement('div'); panes.set(element, pane); layer.append(pane); resize?.observe(element);
            }
            const r = element.getBoundingClientRect();
            const style = view.getComputedStyle?.(element) ?? element.style;
            const scale = r.width / (parseFloat(style.width) || element.offsetWidth || r.width || 1);
            const radius = (parseFloat(style.borderTopLeftRadius || style.borderRadius) || 0) * scale;
            pane.style.cssText = `position:absolute;left:${bounds.left + r.left * sx}px;top:${bounds.top + r.top * sy}px;width:${r.width * sx}px;height:${r.height * sy}px;border-radius:${radius * sx}px / ${radius * sy}px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);pointer-events:none`;
        }
    };
    const schedule = () => {
        if (stopped || frame !== undefined) return;
        if (!view.requestAnimationFrame) { sync(); return; }
        frame = view.requestAnimationFrame(() => { frame = undefined; sync(); });
    };
    const changes = view.MutationObserver ? new view.MutationObserver(schedule) : undefined;
    const release = () => {
        if (stopped) return;
        stopped = true;
        if (frame !== undefined) view.cancelAnimationFrame(frame);
        resize?.disconnect(); changes?.disconnect();
        view.removeEventListener('resize', schedule); ownerView?.removeEventListener('resize', schedule);
        layer.remove(); panes.clear();
    };
    try {
        viewport.parentElement.prepend(layer);
        sync(); resize?.observe(root); resize?.observe(viewport);
        // The status bar portals to the popup body, outside the transformed menu root.
        changes?.observe(source.body, { childList: true, subtree: true });
        view.addEventListener('resize', schedule); ownerView?.addEventListener('resize', schedule);
    } catch (error) { release(); throw error; }
    return release;
}
