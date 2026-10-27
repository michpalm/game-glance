import { REGION_IDS, type FrostContext, type FrostFrame, type Region, type RegionId } from './types';

interface GeometryInput {
    generation:number; source:Window; owner:Window; placeholder:HTMLElement;
    elements:Record<RegionId,HTMLElement>; context:FrostContext;
}
function radius(value:string, dimension:number):number {
    return value.endsWith('%') ? parseFloat(value)*dimension/100 : value.endsWith('px') || value==='0' ? parseFloat(value) : NaN;
}
export function measureFrostFrame(input:GeometryInput):FrostFrame|null {
    const {source,owner,placeholder,elements,context,generation}=input;
    if (!placeholder.isConnected || !Number.isSafeInteger(generation) || generation<0) return null;
    const p=placeholder.getBoundingClientRect(), ow=owner.innerWidth, oh=owner.innerHeight;
    if (![p.left,p.top,p.width,p.height,ow,oh,source.innerWidth,source.innerHeight].every(Number.isFinite) ||
        [p.width,p.height,ow,oh,source.innerWidth,source.innerHeight].some(n=>n<=0) ||
        Math.abs(Math.round(ow*owner.devicePixelRatio)-context.outputWidth)>1 ||
        Math.abs(Math.round(oh*owner.devicePixelRatio)-context.outputHeight)>1) return null;
    const sx=p.width/source.innerWidth, sy=p.height/source.innerHeight;
    const regions={} as Record<RegionId,Region>;
    for (const id of REGION_IDS) {
        const element=elements[id];
        if (!element?.isConnected || element.offsetWidth<=0 || element.offsetHeight<=0) return null;
        const r=element.getBoundingClientRect();
        const parts=source.getComputedStyle(element).borderTopLeftRadius.trim().split(/\s+/);
        const requestedX=radius(parts[0],element.offsetWidth), requestedY=radius(parts[1]??parts[0],element.offsetHeight);
        // CSS reduces both corner axes by the same overlap factor. Independent
        // clamping would turn a circular pill end into a stretched ellipse.
        const factor=Math.min(1,element.offsetWidth/(2*requestedX),element.offsetHeight/(2*requestedY));
        const rx=requestedX*factor, ry=requestedY*factor;
        const region:Region={x:(p.left+r.left*sx)/ow,y:(p.top+r.top*sy)/oh,width:r.width*sx/ow,height:r.height*sy/oh,
            radiusX:rx*(r.width/element.offsetWidth)*sx/ow,radiusY:ry*(r.height/element.offsetHeight)*sy/oh};
        if (!Object.values(region).every(Number.isFinite) || region.width<=0 || region.height<=0 || region.radiusX<0 || region.radiusY<0 ||
            region.x<0 || region.y<0 || region.x+region.width>1.000001 || region.y+region.height>1.000001) return null;
        regions[id]=region;
    }
    return {generation,context,regions};
}

export function observeFrostFrame(input:GeometryInput, publish:(frame:FrostFrame|null)=>void):()=>void {
    const {source,owner}=input;
    let stopped=false, frame:number|undefined;
    const invalidate=()=>{
        if(stopped)return;
        publish(null);
        if(frame===undefined) frame=source.requestAnimationFrame(()=>{frame=undefined;if(!stopped)publish(measureFrostFrame(input));});
    };
    const Resize=(source as Window & {ResizeObserver?:typeof ResizeObserver}).ResizeObserver;
    const observer=Resize ? new Resize(invalidate) : undefined;
    observer?.observe(input.placeholder);
    for(const id of REGION_IDS) if(input.elements[id])observer?.observe(input.elements[id]);
    source.addEventListener('resize',invalidate); owner.addEventListener('resize',invalidate);
    source.visualViewport?.addEventListener('resize',invalidate); owner.visualViewport?.addEventListener('resize',invalidate);
    invalidate();
    return ()=>{
        if(stopped)return; stopped=true;
        if(frame!==undefined)source.cancelAnimationFrame(frame);
        observer?.disconnect();
        source.removeEventListener('resize',invalidate); owner.removeEventListener('resize',invalidate);
        source.visualViewport?.removeEventListener('resize',invalidate); owner.visualViewport?.removeEventListener('resize',invalidate);
        publish(null);
    };
}
