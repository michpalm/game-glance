import { parseHTML } from 'linkedom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareMenuPresentation } from '../../src/menu/presentation';

beforeEach(() => { vi.stubGlobal('requestAnimationFrame', undefined); vi.stubGlobal('cancelAnimationFrame', undefined); });
afterEach(() => vi.unstubAllGlobals());

function fixture() {
    const owner = parseHTML('<html><head></head><body><section><div id="viewport"></div><div id="foreign"></div></section></body></html>');
    const source = parseHTML('<html><head><style id="foreign-style"></style></head><body><div class="gg-menu"><div class="gg-menu-panel"></div></div></body></html>');
    Object.defineProperty(source.window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(source.window, 'innerHeight', { value: 600, configurable: true });
    const viewport = owner.document.querySelector('#viewport')! as unknown as HTMLElement;
    viewport.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 480 } as DOMRect);
    const frames = new Map<number, FrameRequestCallback>(); let id = 0;
    source.window.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
    source.window.cancelAnimationFrame = key => { frames.delete(key); };
    const frame = async () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); await Promise.resolve(); };
    const start = () => prepareMenuPresentation(owner.document as unknown as Document, source.document as unknown as Document, viewport);
    const gate = () => source.document.querySelector('[data-gg-menu-presentation]')! as HTMLStyleElement;
    return { owner, source, frames, frame, start, gate };
}

describe('single-window glass menu presentation', () => {
    it('holds the menu fully transparent behind the gate, so lifting it starts the reveal fade',()=>{
        const f=fixture(),stop=f.start();
        expect(f.gate().textContent).toContain('.gg-menu,.gg-menu-status-host{opacity:0!important}');
        expect(f.gate().textContent).toContain('visibility:hidden!important');stop();
    });
    // The tiles drew Steam's white button border for a frame before the menu's own, and their 250 ms transition faded it in
    // as a ring on every tile (probed on the Ally 2026-11-04). Behind the gate a style change lands at once; the menu's own fade is untouched.
    it('turns transitions off inside the menu while the gate is up, never on the menu itself',()=>{
        const f=fixture(),stop=f.start();
        expect(f.gate().textContent).toContain('.gg-menu *,.gg-menu *::before,.gg-menu *::after{transition:none!important}');
        expect(f.gate().textContent).not.toMatch(/\.gg-menu\s*\{[^}]*transition/);stop();
    });
    it('marks frost presentation immediately before the visible gate opens',async()=>{
        const f=fixture(),seen:string[]=[];
        const stop=prepareMenuPresentation(f.owner.document as unknown as Document,f.source.document as unknown as Document,
            f.owner.document.querySelector('#viewport') as unknown as HTMLElement,()=>seen.push(f.gate().media));
        await f.frame();expect(seen).toEqual(['all']);expect(f.gate().media).toBe('not all');stop();
    });
    it('reveals after viewport agreement without creating an owner blur surface or waiting for its paint', async () => {
        const f = fixture(), stop = f.start();
        expect(f.gate().media).not.toBe('not all');
        await f.frame(); expect(f.gate().media).toBe('not all');
        expect(f.owner.document.querySelector('section')!.children.length).toBe(2);
        expect(f.owner.document.querySelector('[data-gg-menu-frost]')).toBeNull();
        stop();
    });
    it('keeps the menu hidden while the popup has its old native aspect ratio', async () => {
        const f = fixture(); Object.defineProperty(f.source.window, 'innerHeight', { value: 1600, configurable: true });
        const stop = f.start(); await f.frame(); expect(f.gate().media).not.toBe('not all');
        Object.defineProperty(f.source.window, 'innerHeight', { value: 600, configurable: true });
        await f.frame(); expect(f.gate().media).not.toBe('not all');
        await f.frame(); expect(f.gate().media).toBe('not all'); stop();
    });
    it('conceals all popup content before close cleanup and resumes when an open cancels close', async () => {
        const f = fixture(), stop = f.start(); await f.frame();
        let painted = false; const hidden = stop.conceal().then(() => { painted = true; });
        expect(f.gate().media).toBe('all'); await f.frame(); expect(painted).toBe(false);
        stop.resume(); for (let i = 0; i < 3; i++) await f.frame();
        await hidden; expect(f.gate().media).toBe('not all'); stop();
    });
    it('cancels pending frames and resolves an outstanding conceal on disposal', async () => {
        const f = fixture(), stop = f.start(), hidden = stop.conceal();
        stop(); stop(); await hidden; await f.frame();
        expect(f.frames.size).toBe(0); expect(f.gate()).toBeNull();
        expect(f.source.document.querySelector('#foreign-style')).not.toBeNull();
        expect(f.owner.document.querySelector('#foreign')?.getAttribute('style')).toBeNull();
    });
    it('holds the reveal until frost settles, then reveals once',async()=>{
        const f=fixture(),seen:string[]=[];let release!:()=>void;const hold=vi.fn(()=>new Promise<void>(r=>{release=r;}));
        const stop=prepareMenuPresentation(f.owner.document as unknown as Document,f.source.document as unknown as Document,
            f.owner.document.querySelector('#viewport') as unknown as HTMLElement,()=>seen.push('reveal'),hold);
        await f.frame();await f.frame();expect(f.gate().media).toBe('all');expect(seen).toEqual([]);
        release();for(let i=0;i<4;i++)await f.frame();
        expect(f.gate().media).toBe('not all');expect(seen).toEqual(['reveal']);expect(hold).toHaveBeenCalledTimes(1);stop();
    });
    it('reveals glass at the 150 ms cap when frost is late, and a later settle changes nothing',async()=>{
        vi.useFakeTimers();const f=fixture(),seen:string[]=[];let release!:()=>void;
        const stop=prepareMenuPresentation(f.owner.document as unknown as Document,f.source.document as unknown as Document,
            f.owner.document.querySelector('#viewport') as unknown as HTMLElement,()=>seen.push('reveal'),()=>new Promise<void>(r=>{release=r;}));
        await f.frame();await vi.advanceTimersByTimeAsync(149);await f.frame();expect(f.gate().media).toBe('all');
        await vi.advanceTimersByTimeAsync(1);await f.frame();await f.frame();
        expect(f.gate().media).toBe('not all');expect(seen).toEqual(['reveal']);
        release();await f.frame();expect(seen).toEqual(['reveal']);stop();vi.useRealTimers();
    });
    it('holds again after a cancelled close resumes, and disposal during a hold leaves no timer',async()=>{
        vi.useFakeTimers();const f=fixture();const hold=vi.fn(()=>Promise.resolve());
        const stop=prepareMenuPresentation(f.owner.document as unknown as Document,f.source.document as unknown as Document,
            f.owner.document.querySelector('#viewport') as unknown as HTMLElement,undefined,hold);
        for(let i=0;i<3;i++)await f.frame();expect(f.gate().media).toBe('not all');
        void stop.conceal();stop.resume();for(let i=0;i<4;i++)await f.frame();expect(hold).toHaveBeenCalledTimes(2);
        const g=fixture(),late=prepareMenuPresentation(g.owner.document as unknown as Document,g.source.document as unknown as Document,
            g.owner.document.querySelector('#viewport') as unknown as HTMLElement,undefined,()=>new Promise<void>(()=>{}));
        await g.frame();late();expect(vi.getTimerCount()).toBe(0);stop();vi.useRealTimers();
    });
});
