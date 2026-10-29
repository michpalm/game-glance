import { EMPTY_REGION, OPTIONAL_REGIONS, REGION_IDS, type FrostContext, type FrostFrame, type Region, type RegionId } from './types';

interface GeometryInput {
    generation:number; source:Window; owner:Window; placeholder:HTMLElement;
    elements:Partial<Record<RegionId,HTMLElement>>; context:FrostContext;
}
function radius(value:string, dimension:number):number {
    return value.endsWith('%') ? parseFloat(value)*dimension/100 : value.endsWith('px') || value==='0' ? parseFloat(value) : NaN;
}
function clipToOutput(r:Region):Region {
    const x=Math.max(0,r.x), y=Math.max(0,r.y), width=Math.min(1,r.x+r.width)-x, height=Math.min(1,r.y+r.height)-y;
    if (width<=0 || height<=0) return {...EMPTY_REGION};
    return {x,y,width,height,radiusX:Math.min(r.radiusX,width/2),radiusY:Math.min(r.radiusY,height/2)};
}
const DRAGGING_CLASS='gg-keyboard-dragging';
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
        const style=element?.isConnected && element.offsetWidth>0 && element.offsetHeight>0 ? source.getComputedStyle(element) : null;
        if (!style || OPTIONAL_REGIONS.has(id) && (style.visibility==='hidden' || element!.classList.contains(DRAGGING_CLASS))) {
            // The keyboard closed, mounted but not yet placed, or being dragged (no frost until it is dropped, so the
            // drag stays smooth): no area. Every other area must be there.
            if (!OPTIONAL_REGIONS.has(id)) return null;
            regions[id]={...EMPTY_REGION};
            continue;
        }
        const r=element!.getBoundingClientRect();
        const parts=style.borderTopLeftRadius.trim().split(/\s+/);
        const {offsetWidth,offsetHeight}=element!;
        const requestedX=radius(parts[0],offsetWidth), requestedY=radius(parts[1]??parts[0],offsetHeight);
        // CSS reduces both corner axes by the same overlap factor. Independent
        // clamping would turn a circular pill end into a stretched ellipse.
        const factor=Math.min(1,offsetWidth/(2*requestedX),offsetHeight/(2*requestedY));
        const rx=requestedX*factor, ry=requestedY*factor;
        const region:Region={x:(p.left+r.left*sx)/ow,y:(p.top+r.top*sy)/oh,width:r.width*sx/ow,height:r.height*sy/oh,
            radiusX:rx*(r.width/offsetWidth)*sx/ow,radiusY:ry*(r.height/offsetHeight)*sy/oh};
        if (!Object.values(region).every(Number.isFinite) || region.width<=0 || region.height<=0 || region.radiusX<0 || region.radiusY<0) return null;
        const outside=region.x<0 || region.y<0 || region.x+region.width>1.000001 || region.y+region.height>1.000001;
        if (outside && !OPTIONAL_REGIONS.has(id)) return null;
        // An optional area (the keyboard, dragged past an edge) is clipped to the output, or absent when nothing remains.
        regions[id]=outside ? clipToOutput(region) : region;
    }
    return {generation,context,regions};
}

/** The returned stop publishes null (geometry unknown), unless `quiet`: a restart whose next frame follows at once.
 * `publish` returns false when it did not pass the frame on, so an equal frame is sent again next time. */
export function observeFrostFrame(input:GeometryInput, publish:(frame:FrostFrame|null)=>void|false):(quiet?:boolean)=>void {
    const {source,owner}=input;
    let stopped=false, frame:number|undefined;
    // An unchanged frame (the keyboard re-measured mid-drag) is not sent again; null and the frame after it always are.
    const publishInput=publish;
    let last:string|null=null;
    publish=next=>{
        const key=next?JSON.stringify(next):null;
        if(key!==null&&key===last)return;
        last=key;
        if(publishInput(next)===false)last=null;
    };
    const remeasure=()=>{
        if(stopped)return;
        if(frame===undefined) frame=source.requestAnimationFrame(()=>{frame=undefined;if(!stopped)publish(measureFrostFrame(input));});
    };
    // A window resize leaves the geometry unknown until it is measured again. An area resizing (the status bar filling
    // in, the bell's count) keeps the current frame until then: a null would clear frost still activating at the reveal.
    const invalidate=()=>{
        if(stopped)return;
        publish(null);
        remeasure();
    };
    const boundsKey=(element:Element)=>{const r=element.getBoundingClientRect();return [r.left,r.top,r.width,r.height].join(',');};
    const initialBounds=new Map<Element,string>([input.placeholder,...REGION_IDS.map(id=>input.elements[id])].filter((e):e is HTMLElement=>!!e).map(e=>[e,boundsKey(e)]));
    const Resize=(source as Window & {ResizeObserver?:typeof ResizeObserver}).ResizeObserver;
    const observer=Resize ? new Resize(entries=>{
        // observe() schedules an initial delivery even when nothing resized.
        // Suppress only that unchanged first delivery for each target.
        let changed=entries.length===0;
        for(const {target} of entries){
            if(initialBounds.get(target)!==boundsKey(target))changed=true;
            initialBounds.delete(target);
        }
        if(changed)remeasure();
    }) : undefined;
    observer?.observe(input.placeholder);
    for(const id of REGION_IDS) if(input.elements[id])observer?.observe(input.elements[id]);
    // The keyboard moves by its left/top (a drag, a spot) and shows by its visibility once placed, which no
    // ResizeObserver reports: watch its style. A move keeps the current frame until the re-measure, like a resize.
    const Mutation=(source as Window & {MutationObserver?:typeof MutationObserver}).MutationObserver;
    const moves=Mutation ? new Mutation(remeasure) : undefined;
    for(const id of REGION_IDS) if(OPTIONAL_REGIONS.has(id)&&input.elements[id])moves?.observe(input.elements[id]!,{attributes:true,attributeFilter:['style','class']});
    source.addEventListener('resize',invalidate); owner.addEventListener('resize',invalidate);
    source.visualViewport?.addEventListener('resize',invalidate); owner.visualViewport?.addEventListener('resize',invalidate);
    // Initial bounds are already available in the host's layout effect. Publish
    // them before the presentation RAF; subsequent changes remain coalesced.
    publish(measureFrostFrame(input));
    return (quiet=false)=>{
        if(stopped)return; stopped=true;
        if(frame!==undefined)source.cancelAnimationFrame(frame);
        observer?.disconnect(); moves?.disconnect();
        source.removeEventListener('resize',invalidate); owner.removeEventListener('resize',invalidate);
        source.visualViewport?.removeEventListener('resize',invalidate); owner.visualViewport?.removeEventListener('resize',invalidate);
        if(!quiet)publish(null);
    };
}
