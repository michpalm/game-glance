import { createFrostBridge } from './backend';
import { createFrostController, type FrostWarmup } from './controller';
import { observeFrostFrame } from './geometry';
import { createHomeFrost } from './home';
import { menuViewportAgrees } from '../presentation';
import { OPTIONAL_REGIONS, REGION_IDS, type FrostContext, type FrostFrame, type NativeFrostEnvironment, type RegionId } from './types';

export interface FrostHostOptions {takeWarmup?():FrostWarmup|null;measured?(frame:FrostFrame):void}

/** The frost areas' elements, in REGION_IDS order. The status bar copy is portalled to the popup's body, outside the menu root. */
export function frostRegionElements(source:Document):(HTMLElement|null)[] {
    const root=source.querySelector('.gg-menu');
    return REGION_IDS.map(id=>id==='keyboard-left'||id==='keyboard-right'?source.querySelector<HTMLElement>(`.gg-radial-keyboard-host [data-gg-frost-region="${id}"]`):id==='status'?source.querySelector<HTMLElement>('.gg-menu-status-host .gh-status-pill'):root?.querySelector<HTMLElement>(`[data-gg-frost-region="${id}"]`)??null);
}

/** Owned by the native viewport lease. No process-wide DOM polling or state. */
export function createMenuFrostHost(owner:Document,source:Document,placeholder:HTMLElement,context:(environment?:NativeFrostEnvironment|null)=>FrostContext|null,options:FrostHostOptions={}) {
    const bridge=createFrostBridge(),controller=createFrostController({bridge,home:createHomeFrost(owner,placeholder),takeWarmup:options.takeWarmup});
    let environment:NativeFrostEnvironment|null=null,reading=false,environmentKnown=false;
    let session:{generation:number;enabled:boolean}|null=null,stopMeasurement:((quiet?:boolean)=>void)|undefined;
    let visible=false,stopped=false,lastContext='',lastElements:(HTMLElement|null)[]=[];
    // A direct null bypasses the observer's dedupe. Retire it so equal recovered geometry is measured and forwarded.
    function invalidateMeasurement(){
        const stop=stopMeasurement;stopMeasurement=undefined;lastContext='';lastElements=[];
        try{stop?.(true);}finally{controller.frame(null);}
    }
    function measure(force=false){
        if(stopped||!session?.enabled)return;
        const value=context(environment),elements=frostRegionElements(source);
        const signature=JSON.stringify(value);
        if(!force&&signature===lastContext&&elements.every((e,i)=>e===lastElements[i]))return;
        // Only the elements changed (the keyboard opening or closing, an area remounting): the new observer measures at
        // once, so the old one stops without a null, which would release live frost. A new context still clears it.
        stopMeasurement?.(!force&&signature===lastContext);stopMeasurement=undefined;
        lastContext=signature;lastElements=elements;
        if(!value||!source.defaultView||!owner.defaultView||elements.some((e,i)=>!e&&!OPTIONAL_REGIONS.has(REGION_IDS[i]))){
            controller.frame(null);
            // Once the native environment has answered, a null context is final for
            // this opening (HDR, integer scaling): release the reveal hold now.
            if(!value&&environmentKnown)controller.unavailable(session.generation);
            return;
        }
        const regions=Object.fromEntries(REGION_IDS.flatMap((id,i)=>elements[i]?[[id,elements[i]]]:[])) as Partial<Record<RegionId,HTMLElement>>;
        stopMeasurement=observeFrostFrame({generation:session.generation,source:source.defaultView,owner:owner.defaultView,placeholder,elements:regions,context:value},frame=>{
            if(!source.defaultView||!menuViewportAgrees(placeholder.getBoundingClientRect(),source.defaultView)){controller.frame(null);return false;}
            if(frame)options.measured?.(frame);controller.frame(frame);return undefined;
        });
    }
    // These are cheap context reads inside the active host lease. Geometry
    // measurement itself is observer-driven and coalesced to one RAF.
    const refresh=()=>{
        if(reading||stopped||!session?.enabled)return;reading=true;
        void bridge.environment?.().then(value=>{if(!stopped){environment=value;environmentKnown=true;measure();if(session&&!context(environment))controller.unavailable(session.generation);}},()=>{if(!stopped){environment=null;invalidateMeasurement();}}).finally(()=>{reading=false;});
    };
    const timer=setInterval(()=>{try{measure();refresh();}catch{invalidateMeasurement();}},250);
    const Observer=(source.defaultView as (Window & {MutationObserver?:typeof MutationObserver})|null)?.MutationObserver;
    const observer=Observer?new Observer(()=>{try{measure();}catch{invalidateMeasurement();}}):undefined;
    observer?.observe(source.body,{childList:true,subtree:true});
    return {
        setSession(value:typeof session){
            if(stopped)return;
            const stop=stopMeasurement;stopMeasurement=undefined;lastContext='';lastElements=[];
            try{stop?.();}catch{/* Cancel the old generation even if its document retired. */}
            const old=session;session=value;
            if(old)void controller.end(old.generation);
            if(!value?.enabled)return;
            controller.begin(value.generation);
            if(visible)controller.presented(value.generation);
            measure(true);refresh();
        },
        presented(){visible=true;if(session)controller.presented(session.generation);},
        /** The presentation's reveal hold; resolves at once when frost is off. */
        ready():Promise<void>{return stopped||!session?.enabled?Promise.resolve():controller.settled(session.generation);},
        async clear(generation:number){
            if(session?.generation!==generation)return;
            const stop=stopMeasurement;stopMeasurement=undefined;session=null;
            try{stop?.();}finally{await controller.end(generation);}
        },
        dispose(){
            if(stopped)return;stopped=true;clearInterval(timer);
            try{observer?.disconnect();}catch{/* The renderer may have closed. */}
            try{stopMeasurement?.();}catch{/* Retired observer handles must not interrupt host teardown. */}
            void controller.dispose();
        },
    };
}
