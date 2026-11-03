import {findTopBar} from './topBar';
const MARK='data-gh-header';
interface Claim {before:string|null;value:string;owners:Set<symbol>}
const claims=new WeakMap<Element,Map<string,Claim>>();
/** Native nodes stay mounted; each lease only owns a reversible marker attribute. */
export function acquireHomeHeader(root:HTMLElement,available:(ready:boolean)=>void):{suspend(value:boolean):void;dispose():void} {
    const doc=root.ownerDocument,view=doc.defaultView,owner=Symbol('home-header');
    let bound:Element|null=null;
    let owned=new Map<Element,Map<string,string>>(),suspended=false,disposed=false,queued=false,last:boolean|undefined;
    const apply=(next:Map<Element,Map<string,string>>)=>{
        for(const [node,attrs] of owned)for(const name of attrs.keys())if(!next.get(node)?.has(name)){
            const map=claims.get(node),claim=map?.get(name);if(!claim)continue;claim.owners.delete(owner);
            if(!claim.owners.size){if(node.getAttribute(name)===claim.value){if(claim.before===null)node.removeAttribute(name);else node.setAttribute(name,claim.before);}map!.delete(name);}
        }
        for(const [node,attrs] of next)for(const [name,value] of attrs){let map=claims.get(node);if(!map){map=new Map();claims.set(node,map);}let claim=map.get(name);if(!claim){claim={before:node.getAttribute(name),value,owners:new Set()};map.set(name,claim);}else if(node.getAttribute(name)!==claim.value){claim.before=node.getAttribute(name);}claim.owners.add(owner);if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
        owned=next;
    };
    const update=()=>{
        if(disposed)return;
        const bar=suspended?null:findTopBar(doc,view?.innerWidth??0),next=new Map<Element,Map<string,string>>();
        if(bar&&!bar.contains(root)){
            next.set(bar,new Map([[MARK,'true']]));
        }
        bound=bar;apply(next);const ready=next.size>0;if(last!==ready){last=ready;available(ready);}
    };
    const schedule=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;update();});};
    const relevant=(record:MutationRecord)=>{
        if(record.type==='attributes'&&record.attributeName){
            const claim=claims.get(record.target as Element)?.get(record.attributeName);
            if(claim&&(record.target as Element).getAttribute(record.attributeName)===claim.value)return false;
        }
        if(!bound?.isConnected||bound.contains(record.target))return true;
        return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(bound?.contains(node)||(node as Element).contains(bound)||!!(node as Element).querySelector('[class*=avatarHolder]')));
    };
    const observer=view?.MutationObserver?new view.MutationObserver(records=>{if(records.some(relevant))schedule();}):null;
    observer?.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style',MARK]});view?.addEventListener('resize',schedule);update();
    return {suspend(value){if(disposed||value===suspended)return;suspended=value;update();},dispose(){if(disposed)return;disposed=true;observer?.disconnect();view?.removeEventListener('resize',schedule);apply(new Map());}};
}
/** Descendants too: a Steam node with its own pointer-events:auto would still take touches over our bar (pointer-events never affects focus). */
export const homeHeaderCss=`[${MARK}=true]{opacity:0!important;pointer-events:none!important}[${MARK}=true] *{pointer-events:none!important}`;
