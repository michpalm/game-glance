import { createFrostBridge } from './backend';
import { createFrostController } from './controller';
import { observeFrostFrame } from './geometry';
import { createHomeFrost } from './home';
import { REGION_IDS, type FrostContext, type RegionId } from './types';

/** Owned by the native viewport lease. No process-wide DOM polling or state. */
export function createMenuFrostHost(owner:Document,source:Document,placeholder:HTMLElement,context:()=>FrostContext|null) {
    const controller=createFrostController({bridge:createFrostBridge(),home:createHomeFrost(owner,placeholder)});
    let session:{generation:number;enabled:boolean}|null=null,stopMeasurement:(()=>void)|undefined;
    let visible=false,stopped=false,lastContext='',lastElements:HTMLElement[]=[];
    function measure(force=false){
        if(stopped||!session?.enabled)return;
        const value=context(),root=source.querySelector('.gg-menu');
        const elements=REGION_IDS.map(id=>root?.querySelector<HTMLElement>(`[data-gg-frost-region="${id}"]`));
        const signature=JSON.stringify(value);
        if(!force&&signature===lastContext&&elements.every((e,i)=>e===lastElements[i]))return;
        stopMeasurement?.();stopMeasurement=undefined;
        lastContext=signature;lastElements=elements as HTMLElement[];
        if(!value||!source.defaultView||!owner.defaultView||elements.some(e=>!e)){controller.frame(null);return;}
        const regions=Object.fromEntries(REGION_IDS.map((id,i)=>[id,elements[i]!])) as Record<RegionId,HTMLElement>;
        stopMeasurement=observeFrostFrame({generation:session.generation,source:source.defaultView,owner:owner.defaultView,placeholder,elements:regions,context:value},frame=>controller.frame(frame));
    }
    // These are cheap context reads inside the active host lease. Geometry
    // measurement itself is observer-driven and coalesced to one RAF.
    const timer=setInterval(()=>{try{measure();}catch{controller.frame(null);}},250);
    const Observer=(source.defaultView as (Window & {MutationObserver?:typeof MutationObserver})|null)?.MutationObserver;
    const observer=Observer?new Observer(()=>{try{measure();}catch{controller.frame(null);}}):undefined;
    observer?.observe(source.body,{childList:true,subtree:true});
    return {
        setSession(value:typeof session){
            if(stopped)return;
            stopMeasurement?.();stopMeasurement=undefined;lastContext='';lastElements=[];
            const old=session;session=value;
            if(old)void controller.end(old.generation);
            if(!value?.enabled)return;
            controller.begin(value.generation);
            if(visible)controller.presented(value.generation);
            measure(true);
        },
        presented(){visible=true;if(session)controller.presented(session.generation);},
        async clear(generation:number){
            if(session?.generation!==generation)return;
            stopMeasurement?.();stopMeasurement=undefined;session=null;
            await controller.end(generation);
        },
        dispose(){
            if(stopped)return;stopped=true;clearInterval(timer);observer?.disconnect();stopMeasurement?.();
            void controller.dispose();
        },
    };
}
