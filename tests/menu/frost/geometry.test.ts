import { parseHTML } from 'linkedom';
import { describe, expect, it, vi } from 'vitest';
import { measureFrostFrame, observeFrostFrame } from '../../../src/menu/frost/geometry';

function fixture() {
    const { window: owner, document } = parseHTML('<html><body><div id="viewport"></div><div id="bar"></div><div id="panel"></div><div id="notifications"></div><div id="status"></div><div id="keyboard"></div></body></html>');
    const { window: source } = parseHTML('<html><body></body></html>');
    // Linkedom windows share several global descriptors; use independent plain viewports.
    const view = Object.assign(new EventTarget(), { innerWidth:1000, innerHeight:500, devicePixelRatio:1.25, getComputedStyle:()=>({borderTopLeftRadius:'999px'}), requestAnimationFrame:vi.fn(), cancelAnimationFrame:vi.fn() });
    const sourceView = Object.assign(new EventTarget(), view);
    const placeholder = document.getElementById('viewport')! as unknown as HTMLElement;
    placeholder.getBoundingClientRect = () => ({left:20, top:10, width:500, height:250} as DOMRect);
    const elements = Object.fromEntries(['bar','panel','notifications','status','keyboard'].map(id => {
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
    // The Social chat's keyboard is usually closed: an absent, empty or hidden panel is an all-zero area, not a failure.
    it.each(['missing','detached','empty','hidden'])('measures a %s keyboard as an all-zero area and keeps every other area', kind => {
        const input=fixture(),open=measureFrostFrame(input)!;
        expect(open.regions.keyboard).toMatchObject({x:.07,y:.10,width:.20,height:.20});
        if(kind==='missing') delete (input.elements as Partial<typeof input.elements>).keyboard;
        if(kind==='detached') input.elements.keyboard.remove();
        if(kind==='empty') Object.defineProperties(input.elements.keyboard,{offsetWidth:{value:0},offsetHeight:{value:0}});
        if(kind==='hidden') input.source.getComputedStyle=(e=>({borderTopLeftRadius:'999px',visibility:e===input.elements.keyboard?'hidden':'visible'})) as never;
        const f=measureFrostFrame(input)!;
        expect(f).not.toBeNull();
        expect(f.regions.keyboard).toEqual({x:0,y:0,width:0,height:0,radiusX:0,radiusY:0});
        for(const id of ['bar','panel','notifications','status'] as const) expect(f.regions[id]).toEqual(open.regions[id]);
    });
    // A drag can carry the keyboard past an edge: the frame stays, with the keyboard clipped to the output.
    it('clips a keyboard partly off the output and keeps every other area',()=>{
        const input=fixture(),open=measureFrostFrame(input)!;
        input.elements.keyboard.getBoundingClientRect=()=>({left:1700,top:-100,width:400,height:200} as DOMRect);
        const f=measureFrostFrame(input)!;
        expect(f).not.toBeNull();
        const k=f.regions.keyboard;
        expect(k.x).toBeCloseTo(.87); expect(k.width).toBeCloseTo(.13);
        expect(k.y).toBe(0); expect(k.height).toBeCloseTo(.12);
        expect(k.radiusX).toBeLessThanOrEqual(k.width/2); expect(k.radiusY).toBeLessThanOrEqual(k.height/2);
        for(const id of ['bar','panel','notifications','status'] as const) expect(f.regions[id]).toEqual(open.regions[id]);
    });
    it('measures a keyboard wholly off the output as an all-zero area',()=>{
        const input=fixture();
        input.elements.keyboard.getBoundingClientRect=()=>({left:2200,top:80,width:400,height:200} as DOMRect);
        expect(measureFrostFrame(input)!.regions.keyboard).toEqual({x:0,y:0,width:0,height:0,radiusX:0,radiusY:0});
    });
    it('still fails the frame when a required area leaves the output',()=>{
        const input=fixture();
        input.elements.panel.getBoundingClientRect=()=>({left:1700,top:80,width:400,height:200} as DOMRect);
        expect(measureFrostFrame(input)).toBeNull();
    });
    it('still fails the frame when a required area is empty',()=>{
        const input=fixture();
        Object.defineProperties(input.elements.status,{offsetWidth:{value:0},offsetHeight:{value:0}});
        expect(measureFrostFrame(input)).toBeNull();
    });
    // The keyboard moves by its left/top (a drag, a spot), which no ResizeObserver reports: its style is watched.
    it('re-measures, without a null, when the keyboard moves or shows',()=>{
        const input=fixture(),frames=new Map<number,FrameRequestCallback>();let id=0;
        input.source.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
        input.source.cancelAnimationFrame=id=>{frames.delete(id);};
        const watched:{target:unknown;options:MutationObserverInit;fn:MutationCallback}[]=[];
        Object.assign(input.source,{MutationObserver:class{constructor(private fn:MutationCallback){}observe(target:unknown,options:MutationObserverInit){watched.push({target,options,fn:this.fn});}disconnect(){watched.length=0;}}});
        const publish=vi.fn(),stop=observeFrostFrame(input,publish);publish.mockClear();
        expect(watched.map(w=>w.target)).toEqual([input.elements.keyboard]);
        expect(watched[0].options.attributeFilter).toEqual(expect.arrayContaining(['style','class']));
        input.elements.keyboard.getBoundingClientRect=()=>({left:200,top:100,width:400,height:200} as DOMRect);
        watched[0].fn([],{} as MutationObserver);watched[0].fn([],{} as MutationObserver);
        expect(publish).not.toHaveBeenCalled();expect(frames.size).toBe(1);
        for(const fn of [...frames.values()])fn(0);frames.clear();
        expect(publish).toHaveBeenCalledTimes(1);expect(publish.mock.calls[0][0].regions.keyboard).toMatchObject({x:.12,y:.12});
        stop();expect(watched).toEqual([]);
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
