import type { Stop } from './model';

export type MenuPresentation = Stop & { conceal(): Promise<void>; resume(): void };

export function menuViewportAgrees(bounds:{width:number;height:number},view:{innerWidth:number;innerHeight:number}):boolean {
    const sx=bounds.width/view.innerWidth,sy=bounds.height/view.innerHeight;
    return Number.isFinite(sx)&&Number.isFinite(sy)&&sx>0&&sy>0&&Math.abs(sx-sy)<=Math.max(sx,sy)*.01;
}

/** Gamescope rebuilds the frost effect on every opening (~100 ms), so the
 * reveal waits for frost's outcome, but never longer than this; then glass. */
export const REVEAL_HOLD_MS = 150;

/** Wait for native viewport agreement, then for `hold` (frost) up to
 * REVEAL_HOLD_MS. Frost never arrives after the reveal: late frost stays glass.
 */
export function prepareMenuPresentation(owner: Document, source: Document, viewport: HTMLElement, onReveal?:()=>void, hold?:()=>Promise<unknown>|undefined): MenuPresentation {
    const view = source.defaultView, ownerView = owner.defaultView;
    const root = source.querySelector<HTMLElement>('.gg-menu');
    if (!view || !root || !viewport.parentElement) throw new Error('Custom menu geometry is unavailable');
    const gate = source.createElement('style');
    gate.dataset.ggMenuPresentation = 'true';
    // Opacity rests at 0 behind the gate; lifting it fades the menu in over the
    // fast motion token, alongside the frost shader's own 150 ms fade.
    gate.textContent = '.gg-menu-native-host,.gg-menu-status-host{visibility:hidden!important}.gg-menu,.gg-menu-status-host{opacity:0!important}.gg-radial-keyboard-host{visibility:hidden!important;opacity:0!important}';
    source.head.append(gate);
    let stopped = false, concealed = false, frame: number | undefined;
    let stable = '', samples = 0, hiding: Promise<void> | undefined;
    let held: 'waiting' | 'done' | undefined, holdCycle = 0, holdTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelHold = () => { holdCycle++; if (holdTimer !== undefined) clearTimeout(holdTimer); holdTimer = undefined; };
    /** True while the reveal must stay hidden for frost. */
    const holding = () => {
        if (!hold || held === 'done') return false;
        if (held === undefined) {
            held = 'waiting';
            const cycle = ++holdCycle;
            const done = () => { if (stopped || cycle !== holdCycle) return; cancelHold(); held = 'done'; schedule(); };
            holdTimer = setTimeout(done, REVEAL_HOLD_MS);
            Promise.resolve().then(hold).then(done, done);
        }
        return true;
    };
    const paints = new Set<Stop>();
    const sync = () => {
        if (stopped || concealed) return;
        const bounds = viewport.getBoundingClientRect(), r = root.getBoundingClientRect();
        const agrees = menuViewportAgrees(bounds,view);
        const key = [bounds.left, bounds.top, bounds.width, bounds.height, view.innerWidth, view.innerHeight, r.left, r.top, r.width, r.height].join(',');
        samples = agrees && key === stable ? samples + 1 : agrees ? 1 : 0; stable = key;
        if (typeof view.requestAnimationFrame === 'function' && samples < 2) { gate.media = 'all'; schedule(); }
        else {
            if (agrees && gate.media !== 'not all' && holding()) { gate.media = 'all'; return; }
            if(agrees&&gate.media!=='not all')onReveal?.();
            gate.media = agrees ? 'not all' : 'all';
        }
    };
    const schedule = () => {
        if (stopped || concealed || frame !== undefined) return;
        if (typeof view.requestAnimationFrame !== 'function') { sync(); return; }
        frame = view.requestAnimationFrame(() => { frame = undefined; sync(); });
    };
    const resize = view.ResizeObserver ? new view.ResizeObserver(schedule) : undefined;
    const release = () => {
        if (stopped) return;
        stopped = true; cancelHold();
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
            concealed = false; hiding = undefined; samples = 0; stable = ''; held = undefined; schedule();
        },
        conceal() {
            if (hiding) return hiding;
            concealed = true; gate.media = 'all'; cancelHold(); held = undefined;
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
