import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { LAUNCH_BRIDGE_CLASS, LAUNCH_BRIDGE_Z, mountLaunchBridge, type BridgeView } from '../../src/home/launchBridge';
import { LAUNCH_ART_CLASS } from '../../src/styles/launchArt';

function setup() {
    const { document } = parseHTML('<html><body><div class="BasicUI"><div class="footer"></div></div></body></html>');
    const timers: Array<() => void> = [];
    const frames: Array<() => void> = [];
    const watchers: Array<() => void> = [];
    class Observer { constructor(run: () => void) { watchers.push(run); } observe() {} disconnect() {} }
    const view = {
        setTimeout: (run: () => void) => { timers.push(run); return timers.length; },
        clearTimeout: () => undefined,
        requestAnimationFrame: (run: () => void) => { frames.push(run); return frames.length; },
        MutationObserver: Observer,
    } as unknown as BridgeView;
    const flushFrames = () => { while (frames.length) frames.shift()!(); };
    const doc = document as unknown as Document;
    const mount = (layers: { fill: string | null; art: string }, scrims?: string) => mountLaunchBridge(doc, layers, scrims, 3000, view);
    return { doc, timers, flushFrames, mount, mutate: () => watchers.forEach((run) => run()) };
}
const LAYERS = { fill: 'position: absolute; inset: -120px;', art: 'position: absolute; inset: 0;' };

describe('mountLaunchBridge (Home’s art kept up while Steam swaps Home for the page)', () => {
    it('puts Home’s art layers in Steam’s UI root, under its footer, with the page’s shading', () => {
        const { doc, mount } = setup();
        mount(LAYERS, 'linear-gradient(red, blue)');
        const box = doc.querySelector(`.BasicUI > .${LAUNCH_BRIDGE_CLASS}`)!;
        expect(box).not.toBeNull();
        expect(box.getAttribute('style')).toContain(`z-index: ${LAUNCH_BRIDGE_Z};`);
        expect(box.getAttribute('style')).toContain('position: absolute;');
        expect([...box.children].map((c) => c.getAttribute('style'))).toEqual([LAYERS.fill, LAYERS.art, 'position: absolute; inset: 0; background: linear-gradient(red, blue);']);
    });
    it('Fill has no fill layer, and None no shading', () => {
        const { doc, mount } = setup();
        mount({ fill: null, art: LAYERS.art });
        expect(doc.querySelector(`.${LAUNCH_BRIDGE_CLASS}`)!.children.length).toBe(1);
    });
    it('leaves once the page’s own copy is drawn, or after its time limit', async () => {
        const a = setup();
        a.mount(LAYERS);
        const header = a.doc.createElement('div');
        header.className = LAUNCH_ART_CLASS;
        a.doc.body.appendChild(header);
        a.mutate();
        expect(a.doc.querySelector(`.${LAUNCH_BRIDGE_CLASS}`)).not.toBeNull(); // drawn a frame first
        a.flushFrames();
        expect(a.doc.querySelector(`.${LAUNCH_BRIDGE_CLASS}`)).toBeNull();
        const b = setup();
        b.mount(LAYERS);
        b.timers.forEach((run) => run());
        expect(b.doc.querySelector(`.${LAUNCH_BRIDGE_CLASS}`)).toBeNull();
    });
    it('replaces a bridge from an earlier Play, and can be removed at once', () => {
        const { doc, mount } = setup();
        mount(LAYERS);
        const remove = mount(LAYERS);
        expect(doc.querySelectorAll(`.${LAUNCH_BRIDGE_CLASS}`).length).toBe(1);
        remove();
        expect(doc.querySelectorAll(`.${LAUNCH_BRIDGE_CLASS}`).length).toBe(0);
    });
});
