export interface NativeFooterControls {footer:HTMLElement;wrapper:HTMLElement;groups:readonly HTMLElement[];spacer:HTMLElement}
const grow=(element:HTMLElement)=>{try{return Number(element.ownerDocument.defaultView?.getComputedStyle?.(element).flexGrow??element.style.flexGrow)||0;}catch{return 0;}};
function discover(root:HTMLElement,measure:boolean):NativeFooterControls|null {
    const footer=root.ownerDocument.getElementById('Footer');
    if(!footer||footer.children.length!==1)return null;
    const wrapper=footer.firstElementChild as HTMLElement,children=[...wrapper.children] as HTMLElement[];
    const spacers=children.filter(e=>e.children.length===0&&!e.textContent?.trim()&&grow(e)>0);
    if(spacers.length!==1)return null;
    const groups=children.filter(e=>e!==spacers[0]);
    if(!groups.length||groups.some(e=>e.children.length!==2||!e.children[0].querySelector('img,svg')||!e.children[1].textContent?.trim()))return null;
    if(measure){const f=footer.getBoundingClientRect(),r=root.getBoundingClientRect();if(r.width<=0||r.height<=0||f.width<r.width*.9||f.height<=0||f.height>r.height*.3||Math.abs(f.bottom-r.bottom)>2)return null;}
    return {footer,wrapper,groups,spacer:spacers[0]};
}
export const discoverNativeFooter=(root:HTMLElement):NativeFooterControls|null=>discover(root,true);
interface Claim {before:string|null;value:string;owners:Set<symbol>}
const claims=new WeakMap<HTMLElement,Map<string,Claim>>();
type Markers=Map<HTMLElement,Map<string,string>>;
/** Share only our marker writes; native content, layout rules and handlers are never replaced. */
export function acquireHomeFooter(root:HTMLElement,onAvailability:(ready:boolean)=>void):{suspend(value:boolean):void;dispose():void} {
    const token=Symbol('home-footer'),doc=root.ownerDocument,view=doc.defaultView;
    let owned:Markers=new Map(),bound:HTMLElement|null=null,stopped=false,suspended=false,queued=false,ready:boolean|undefined,measure=true;
    const release=(element:HTMLElement,name:string)=>{const map=claims.get(element),claim=map?.get(name);if(!claim)return;claim.owners.delete(token);if(claim.owners.size)return;if(element.getAttribute(name)===claim.value){if(claim.before===null)element.removeAttribute(name);else element.setAttribute(name,claim.before);}map!.delete(name);if(!map!.size)claims.delete(element);};
    const apply=(next:Markers)=>{
        for(const [element,attrs] of owned)for(const name of attrs.keys())if(!next.get(element)?.has(name))release(element,name);
        for(const [element,attrs] of next)for(const [name,value] of attrs){let map=claims.get(element);if(!map){map=new Map();claims.set(element,map);}let claim=map.get(name);if(!claim){claim={before:element.getAttribute(name),value,owners:new Set()};map.set(name,claim);}claim.value=value;claim.owners.add(token);if(element.getAttribute(name)!==value)element.setAttribute(name,value);}
        owned=next;
    };
    const update=()=>{
        if(stopped)return;
        const next:Markers=new Map(),footer=doc.getElementById('Footer'),controls=suspended?null:discover(root,measure||footer!==bound);measure=!controls;bound=footer;
        const mark=(node:HTMLElement,name:string,value:string)=>{if(!next.has(node))next.set(node,new Map());next.get(node)!.set(name,value);};
        if(controls){mark(controls.footer,'data-gh-footer','true');mark(controls.wrapper,'data-gh-footer-wrapper','true');const before=controls.groups.filter(e=>[...controls.wrapper.children].indexOf(e)<[...controls.wrapper.children].indexOf(controls.spacer)),after=controls.groups.filter(e=>!before.includes(e));for(const [side,groups] of [['start',before],['end',after]] as const)groups.forEach((group,index)=>{mark(group,'data-gh-footer-side',side);mark(group,'data-gh-footer-edge',groups.length===1?'single':index===0?'first':index===groups.length-1?'last':'middle');});}
        apply(next);const value=!!controls;if(value!==ready){ready=value;onAvailability(value);}
    };
    const schedule=()=>{if(stopped||suspended||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;update();});};
    const observer=view?.MutationObserver?new view.MutationObserver(records=>{if(records.some(record=>{
        if(record.type!=='childList'&&record.type!=='characterData')return false;
        if(!bound?.isConnected||bound.contains(record.target))return true;
        return [...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&((node as Element).id==='Footer'||owned.has(node as HTMLElement)||!!(node as Element).querySelector('#Footer')||!!bound&&node.contains(bound)));
    }))schedule();}):undefined;
    observer?.observe(doc.body,{childList:true,subtree:true,characterData:true});
    const resize=()=>{measure=true;schedule();};view?.addEventListener('resize',resize);update();
    return {suspend(value){if(stopped||suspended===value)return;suspended=value;measure=true;update();},dispose(){if(stopped)return;stopped=true;observer?.disconnect();view?.removeEventListener('resize',resize);apply(new Map());}};
}
