import { REGION_IDS, type FrostFrame } from './types';

/** On Home the page's own status bar, on Home's frost, stays up under the menu (menu/host holdPageStatus): no surface for it. */
const HOME_REGIONS=REGION_IDS.filter(id=>id!=='status');

export interface HomeFrost { apply(frame:FrostFrame):boolean; clear():void; dispose():void }
/** The owner document must contain both the sampled backdrop and native viewport.
 * Never put a viewport-sized filter behind a CSS mask. */
export function createHomeFrost(owner:Document, placeholder:HTMLElement):HomeFrost {
    const parent=placeholder.parentElement, view=owner.defaultView;
    const surfaces:HTMLElement[]=[];
    let disposed=false;
    function clear(){for(const surface of surfaces.splice(0))surface.remove();}
    function supported(){
        if(disposed||!view||!parent||!placeholder.isConnected||placeholder.ownerDocument!==owner||placeholder.parentElement!==parent)return false;
        for(let e:HTMLElement|null=parent;e;e=e.parentElement){
            const style=view.getComputedStyle(e);
            if(style.transform&&style.transform!=='none'||style.filter&&style.filter!=='none'||style.perspective&&style.perspective!=='none'||
                style.opacity&&style.opacity!=='1'||style.isolation==='isolate')return false;
        }
        return true;
    }
    const Observer=(view as (Window & {MutationObserver?:typeof MutationObserver})|null)?.MutationObserver;
    const observer=Observer?new Observer(()=>{if(!supported())clear();}):undefined;
    observer?.observe(owner.documentElement,{childList:true,subtree:true});
    return {
        apply(frame){
            if(frame.context.background!=='steam'||!supported()){clear();return false;}
            for(let i=0;i<HOME_REGIONS.length;i++){
                const id=HOME_REGIONS[i],r=frame.regions[id];
                if(!Object.values(r).every(Number.isFinite)||r.width<=0||r.height<=0){clear();return false;}
                const e=surfaces[i]??owner.createElement('div');
                e.dataset.ggMenuFrost=id; e.setAttribute('aria-hidden','true');
                Object.assign(e.style,{position:'fixed',left:`${r.x*view!.innerWidth}px`,top:`${r.y*view!.innerHeight}px`,
                    width:`${r.width*view!.innerWidth}px`,height:`${r.height*view!.innerHeight}px`,borderRadius:`${r.radiusX*view!.innerWidth}px / ${r.radiusY*view!.innerHeight}px`,
                    pointerEvents:'none',background:'transparent',backdropFilter:'blur(8px)',webkitBackdropFilter:'blur(8px)',transition:'none'});
                if(!surfaces[i]){surfaces[i]=e;parent!.insertBefore(e,placeholder);}
            }
            return true;
        },
        clear,
        dispose(){if(disposed)return;disposed=true;observer?.disconnect();clear();},
    };
}
