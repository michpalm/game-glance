import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { measureFrostFrame, observeFrostFrame } from '../../../src/menu/frost/geometry';

function fixture() {
    const { window: owner, document } = parseHTML('<html><body><div id="viewport"></div><div id="bar"></div><div id="panel"></div><div id="notifications"></div><div id="status"></div></body></html>');
    const { window: source } = parseHTML('<html><body></body></html>');
    // Linkedom windows share several global descriptors; use independent plain viewports.
    const view = Object.assign(new EventTarget(), { innerWidth:1000, innerHeight:500, devicePixelRatio:1.25, getComputedStyle:()=>({borderTopLeftRadius:'999px'}), requestAnimationFrame:vi.fn(), cancelAnimationFrame:vi.fn() });
    const sourceView = Object.assign(new EventTarget(), view);
    const placeholder = document.getElementById('viewport')! as unknown as HTMLElement;
    placeholder.getBoundingClientRect = () => ({left:20, top:10, width:500, height:250} as DOMRect);
    const elements = Object.fromEntries(['bar','panel','notifications','status'].map(id => {
        const e = document.getElementById(id)! as unknown as HTMLElement;
        e.getBoundingClientRect = () => ({left:100,top:80,width:400,height:200} as DOMRect);
        Object.defineProperties(e,{offsetWidth:{value:400,configurable:true},offsetHeight:{value:200,configurable:true}});
        return [id,e];
    })) as Parameters<typeof measureFrostFrame>[0]['elements'];
    void owner; void source;
    return {generation:1, source:sourceView as unknown as Window, owner:view as unknown as Window, placeholder, elements,
        context:{viewportId:'v1',background:'game' as const,outputWidth:1250,outputHeight:625,dpr:1.25,fit:'fit' as const,colorMode:'sdr' as const}};
}
describe('frost geometry', () => {
    it('maps transformed source through placeholder with fractional DPR', () => {
        const f = measureFrostFrame(fixture())!;
        expect(f.regions.bar).toMatchObject({x:.07,y:.10,width:.20,height:.20});
    });
    it('clamps capsule radius in output pixels, including independent axis scaling', () => {
        const input=fixture();
        input.elements.notifications.getBoundingClientRect=()=>({left:100,top:80,width:120,height:40} as DOMRect);
        Object.defineProperties(input.elements.notifications,{offsetWidth:{value:120},offsetHeight:{value:40}});
        input.placeholder.getBoundingClientRect=()=>({left:0,top:0,width:500,height:500} as DOMRect);
        const n=measureFrostFrame(input)!.regions.notifications;
        expect(n.radiusX*1000).toBe(10); expect(n.radiusY*500).toBe(20);
    });
    it.each(['NaN','empty','missing','detached'])('rejects %s geometry', kind => {
        const input=fixture();
        if(kind==='NaN') input.elements.bar.getBoundingClientRect=()=>({left:NaN,top:0,width:1,height:1} as DOMRect);
        if(kind==='empty') input.elements.bar.getBoundingClientRect=()=>({left:0,top:0,width:0,height:1} as DOMRect);
        if(kind==='missing') delete (input.elements as Partial<typeof input.elements>).notifications;
        if(kind==='detached') input.placeholder.remove();
        expect(measureFrostFrame(input)).toBeNull();
    });
    it('invalidates before reallocation, coalesces observers and disposes pending work', () => {
        const input=fixture(), frames=new Map<number,FrameRequestCallback>(); let id=0;
        input.source.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
        input.source.cancelAnimationFrame=id=>{frames.delete(id);};
        const callbacks:ResizeObserverCallback[]=[];
        Object.assign(input.source,{ResizeObserver:class {constructor(fn:ResizeObserverCallback){callbacks.push(fn);}observe(){}disconnect(){}}});
        const publish=vi.fn(), stop=observeFrostFrame(input,publish);
        for(const fn of [...frames.values()])fn(0); frames.clear(); publish.mockClear();
        callbacks[0]([],{} as ResizeObserver); callbacks[0]([],{} as ResizeObserver);
        // An area resizing (the status bar filling in, the bell's count) keeps the current frame until the re-measure:
        // a null would clear frost still activating at the reveal (Ally, 2026-10-29).
        expect(publish).not.toHaveBeenCalled(); expect(frames.size).toBe(1);
        for(const fn of [...frames.values()])fn(0); frames.clear();
        expect(publish).toHaveBeenCalledTimes(1); expect(publish.mock.calls[0][0]).not.toBeNull();
        // The window resizing does invalidate first: until it is measured again, the geometry is not known.
        input.source.dispatchEvent(new Event('resize'));
        expect(publish).toHaveBeenLastCalledWith(null); expect(frames.size).toBe(1);
        stop(); expect(frames.size).toBe(0);
    });
    it('preserves initial frost when ResizeObserver delivers unchanged initial bounds after reveal',()=>{
        const input=fixture(),callbacks:ResizeObserverCallback[]=[];
        Object.assign(input.source,{ResizeObserver:class{constructor(fn:ResizeObserverCallback){callbacks.push(fn);}observe(){}disconnect(){}}});
        const publish=vi.fn(),stop=observeFrostFrame(input,publish);
        expect(publish.mock.calls.at(-1)?.[0]).not.toBeNull();publish.mockClear();
        callbacks[0](Object.values(input.elements).map(target=>({target})) as ResizeObserverEntry[],{} as ResizeObserver);
        expect(publish).not.toHaveBeenCalled();stop();
    });
});
