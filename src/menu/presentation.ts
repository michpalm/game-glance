import type { Stop } from './model';

export type MenuPresentation = Stop & { conceal(): Promise<void>; resume(): void };

/** All menu visuals live in the popup. Only wait for its native viewport resize,
 * never for a second renderer to paint a background blur surface.
 */
export function prepareMenuPresentation(owner: Document, source: Document, viewport: HTMLElement): MenuPresentation {
    const view = source.defaultView, ownerView = owner.defaultView;
    const root = source.querySelector<HTMLElement>('.gg-menu');
    if (!view || !root || !viewport.parentElement) throw new Error('Custom menu geometry is unavailable');
    const gate = source.createElement('style');
    gate.dataset.ggMenuPresentation = 'true';
    gate.textContent = '.gg-menu-native-host,.gg-menu-status-host{visibility:hidden!important}';
    source.head.append(gate);
    let stopped = false, concealed = false, frame: number | undefined;
    let stable = '', samples = 0, hiding: Promise<void> | undefined;
    const paints = new Set<Stop>();
    const sync = () => {
        if (stopped || concealed) return;
        const bounds = viewport.getBoundingClientRect(), r = root.getBoundingClientRect();
        const sx = bounds.width / view.innerWidth, sy = bounds.height / view.innerHeight;
        const agrees = sx > 0 && sy > 0 && Math.abs(sx - sy) <= Math.max(sx, sy) * .01;
        const key = [bounds.left, bounds.top, bounds.width, bounds.height, view.innerWidth, view.innerHeight, r.left, r.top, r.width, r.height].join(',');
        samples = agrees && key === stable ? samples + 1 : agrees ? 1 : 0; stable = key;
        if (typeof view.requestAnimationFrame === 'function' && samples < 2) { gate.media = 'all'; schedule(); }
        else gate.media = agrees ? 'not all' : 'all';
    };
    const schedule = () => {
        if (stopped || concealed || frame !== undefined) return;
        if (typeof view.requestAnimationFrame !== 'function') { sync(); return; }
        frame = view.requestAnimationFrame(() => { frame = undefined; sync(); });
    };
    const resize = view.ResizeObserver ? new view.ResizeObserver(schedule) : undefined;
    const release = () => {
        if (stopped) return;
        stopped = true;
        if (frame !== undefined) view.cancelAnimationFrame(frame);
        resize?.disconnect(); view.removeEventListener('resize', schedule); ownerView?.removeEventListener('resize', schedule);
        gate.remove(); for (const finish of [...paints]) finish();
    };
    try {
        sync(); resize?.observe(root); resize?.observe(viewport);
        view.addEventListener('resize', schedule); ownerView?.addEventListener('resize', schedule);
    } catch (error) { release(); throw error; }
    return Object.assign(release, {
        resume() {
            if (stopped || !concealed) return;
            concealed = false; hiding = undefined; samples = 0; stable = ''; schedule();
        },
        conceal() {
            if (hiding) return hiding;
            concealed = true; gate.media = 'all';
            if (frame !== undefined) { view.cancelAnimationFrame(frame); frame = undefined; }
            if (stopped || typeof view.requestAnimationFrame !== 'function') return Promise.resolve();
            return hiding = new Promise<void>(resolve => {
                let id: number;
                const finish = () => { view.cancelAnimationFrame(id); paints.delete(finish); resolve(); };
                paints.add(finish);
                id = view.requestAnimationFrame(() => { id = view.requestAnimationFrame(finish); });
            });
        },
    });
}
