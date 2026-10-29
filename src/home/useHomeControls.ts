import {GamepadButton as B, type GamepadEvent} from '@decky/ui';
import {type RefObject,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {homeControlsMode,nextHomeControl,orderHomeControls,repairHomeControl,type HomeControlId,type HomeControlsMode,type HomeStatusControls} from './homeControls';
import {acquireHomeFooter} from './homeControlsDom';
import {focusElement} from './homeNav';
import {menuOpen,steamMenuStore} from './steamMenu';
import {acquireHomeHeader} from './homeHeaderDom';
import {getSteamUiState,subscribeSteamUiState,type SteamUiState} from './steamUiState';

export function visibleHomeControl(node:HTMLElement):boolean {
    if(!node.isConnected||node.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
    const css=node.ownerDocument.defaultView?.getComputedStyle?.(node);
    return css?.visibility!=='hidden'&&css?.display!=='none'&&(typeof node.getClientRects!=='function'||node.getClientRects().length>0);
}
export function homeReturnTarget(root:HTMLElement,last:HTMLElement|null,recents:HTMLElement|null):HTMLElement|null {
    const candidates=[last,...root.querySelectorAll<HTMLElement>('.gh-actions .gh-btn'),recents];
    return candidates.find((node):node is HTMLElement=>!!node&&root.contains(node)&&visibleHomeControl(node))??null;
}
export function homeRuntimeSuspended(p:{foreground:boolean;menu:boolean;opening:boolean;launching:boolean;connected:boolean;hidden:boolean}):boolean {
    return !p.foreground||p.menu||p.opening||p.launching||!p.connected||p.hidden;
}
export interface HomeSearchFocus {reveal():void;hide():void;activate():void;editing():boolean;contains(target:Element|null):boolean}
interface FocusOptions {
    search?:HomeSearchFocus;
    canUse():boolean;focus(node:HTMLElement):void;returnHome():void;stopRepeats():void;
    headerHandoff?(pending:boolean):void;
    schedule(callback:()=>void):()=>void;visible?(node:HTMLElement):boolean;
}
/** The only extra input owner is a registered Home status cell. It has no activation destinations. */
export function createHomeStatusFocus(options:FocusOptions):HomeStatusControls & {
    setActive(value:boolean,repair:boolean):void;actionUp(event:GamepadEvent):boolean;externalFocus(target:Element|null):void;dispose():void;
} {
    const nodes=new Map<HomeControlId,HTMLElement>(),visible=options.visible??visibleHomeControl;
    let pendingSearch=false;
    let active=false,owned=false,bypass=false,handoff=false,returning=false,disposed=false,last:HomeControlId|null=null,lastNode:HTMLElement|null=null,previous:HomeControlId[]=[],cancel:(()=>void)|null=null;
    const setHandoff=(value:boolean)=>{if(handoff===value)return;handoff=value;options.headerHandoff?.(value);};
    const order=()=>orderHomeControls([...nodes].filter(([,node])=>visible(node)).map(([id])=>id));
    const usable=()=>!disposed&&active&&options.canUse();
    const go=(id:HomeControlId|null)=>{const node=id?nodes.get(id):null;if(!node||!visible(node))return false;last=id;lastNode=node;owned=true;previous=order();options.focus(node);return true;};
    const home=()=>{pendingSearch=false;options.search?.hide();owned=false;lastNode=null;options.returnHome();};
    const scheduleRepair=()=>{
        if(cancel||!active||disposed)return;
        cancel=options.schedule(()=>{cancel=null;if(!usable())return;if(pendingSearch){if(go('search'))pendingSearch=false;return;}if(!owned||!last)return;const next=order(),id=repairHomeControl(last,previous,next),node=id?nodes.get(id):null;previous=next;if(!id){home();return;}if(id!==last||node!==lastNode)go(id);});
    };
    const consume=(event:GamepadEvent)=>{event.preventDefault();event.stopPropagation();};
    return {
        register(id,node){if(disposed)return;if(node)nodes.set(id,node);else nodes.delete(id);scheduleRepair();},
        focused(id){if(!usable())return;const node=nodes.get(id);if(!node||!visible(node))return;last=id;lastNode=node;owned=true;previous=order();options.search?.reveal();},
        button(id,event){
            if(!usable()||!nodes.has(id))return;
            const button=event.detail.button;
            if(button===B.DIR_LEFT||button===B.DIR_RIGHT){consume(event);go(nextHomeControl(id,button===B.DIR_LEFT?'left':'right',order()));}
            else if(button===B.DIR_DOWN||button===B.CANCEL){consume(event);home();}
            else if(button===B.DIR_UP&&options.search){consume(event);}
            else if(button===B.OK&&id==='search'&&options.search){consume(event);if(!event.detail.is_repeat)options.search.activate();}
            else if(button===B.DIR_UP){consume(event);bypass=true;setHandoff(true);returning=true;try{home();}finally{returning=false;}}
            else if(button===B.OK||button===B.BUMPER_LEFT||button===B.BUMPER_RIGHT)consume(event);
        },
        actionUp(event){
            if(event.detail.button!==B.DIR_UP){bypass=false;setHandoff(false);return false;}
            if(!usable())return false;
            if(options.search){options.stopRepeats();options.search.reveal();pendingSearch=!go('search');if(pendingSearch)scheduleRepair();consume(event);return true;}
            if(bypass){bypass=false;return false;}
            const ids=order(),target=last&&ids.includes(last)?last:ids[0];if(!target)return false;
            options.stopRepeats();if(!go(target))return false;consume(event);return true;
        },
        externalFocus(target){if(options.search?.editing()||options.search?.contains(target))return;if([...nodes.values()].some(node=>!!target&&(node===target||node.contains(target))))return;pendingSearch=false;options.search?.hide();owned=false;lastNode=null;if(!returning)setHandoff(false);if(!target?.closest('.gh-actions'))bypass=false;},
        setActive(value,repair){
            if(disposed)return;
            if(!value){pendingSearch=false;options.search?.hide();cancel?.();cancel=null;if(active&&owned&&repair)home();owned=false;bypass=false;setHandoff(false);lastNode=null;}
            active=value;
        },
        dispose(){disposed=true;active=false;owned=false;cancel?.();cancel=null;nodes.clear();},
    };
}
interface HomeControlsOptions {
    search?:HomeSearchFocus;root:RefObject<HTMLElement|null>;enabled:boolean;spotlightHome:boolean;homeStatusBar:boolean;homeExpandedControls:boolean;mounted:boolean;statusHidden:boolean;
    launching():boolean;stopRepeats():void;returnHome():void;
}
const optedIn=(o:HomeControlsOptions)=>o.enabled&&o.spotlightHome&&o.homeStatusBar&&o.homeExpandedControls&&o.mounted;
function suspendedNow(o:HomeControlsOptions):boolean {
    const root=o.root.current,doc=root?.ownerDocument;
    return homeRuntimeSuspended({foreground:!!doc?.hasFocus(),menu:menuOpen(steamMenuStore(),!!doc?.hasFocus()),opening:!!root?.hasAttribute('data-gh-opening'),launching:o.launching(),connected:!!root?.isConnected,hidden:doc?.visibilityState==='hidden'||!!root?.closest('[hidden],[inert],[aria-hidden="true"]')});
}
/** One Home-owned footer lease and focus bridge; it never probes or edits the native header/Search. */
export function useHomeControls(options:HomeControlsOptions):{controls:HomeStatusControls|undefined;actionUp(event:GamepadEvent):boolean;footerActive:boolean;ui:SteamUiState|null} {
    const live=useRef(options);live.current=options;
    const ready=useRef(false),runtime=useRef<{sync():void}|null>(null);
    const [ui,setUi]=useState<SteamUiState|null>(null);
    const [mode,setMode]=useState<HomeControlsMode>('off');
    const [headerHandoff,setHeaderHandoff]=useState(false);
    const focus=useMemo(()=>createHomeStatusFocus({
        search:options.search?{reveal:()=>live.current.search?.reveal(),hide:()=>live.current.search?.hide(),activate:()=>live.current.search?.activate(),editing:()=>live.current.search?.editing()??false,contains:target=>live.current.search?.contains(target)??false}:undefined,
        canUse:()=>ready.current&&optedIn(live.current)&&!live.current.statusHidden&&!suspendedNow(live.current),
        headerHandoff:setHeaderHandoff,
        focus:node=>focusElement(node,'the Home status item'),returnHome:()=>live.current.returnHome(),stopRepeats:()=>live.current.stopRepeats(),
        schedule:callback=>{const view=live.current.root.current?.ownerDocument.defaultView;if(view?.requestAnimationFrame){const frame=view.requestAnimationFrame(callback);return ()=>view.cancelAnimationFrame(frame);}const timer=setTimeout(callback,0);return ()=>clearTimeout(timer);},
    }),[]);
    useLayoutEffect(()=>{
        const root=live.current.root.current;if(!root)return undefined;
        const doc=root.ownerDocument,win=doc.defaultView;
        let header:ReturnType<typeof acquireHomeHeader>|null=null,headerReady=false,footerReady=false;
        let disposed=false,queued=false,lease:ReturnType<typeof acquireHomeFooter>|null=null;
        const queue=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;if(!disposed)sync();});};
        const sync=()=>{
            if(disposed)return;
            const o=live.current,wanted=optedIn(o),suspended=suspendedNow(o);
            if(!wanted){lease?.dispose();lease=null;header?.dispose();header=null;footerReady=false;headerReady=false;}
            if(wanted&&!suspended&&!lease)lease=acquireHomeFooter(root,value=>{footerReady=value;queue();});
            lease?.suspend(suspended);
            if(wanted&&!suspended&&footerReady&&!header)header=acquireHomeHeader(root,value=>{headerReady=value;queue();});
            header?.suspend(suspended||!footerReady);ready.current=footerReady&&headerReady;
            setUi(getSteamUiState(doc));
            const next=homeControlsMode({...o,homeMounted:o.mounted,nativeReady:ready.current,suspended});
            focus.setActive(next==='active'&&!o.statusHidden,!suspended);
            setMode(previous=>previous===next?previous:next);
        };
        const onFocus=(event:FocusEvent)=>{focus.externalFocus(event.target as Element|null);sync();};
        runtime.current={sync};sync();
        doc.addEventListener('focusin',onFocus);doc.addEventListener('visibilitychange',sync);win?.addEventListener('focus',sync);win?.addEventListener('blur',sync);
        const observer=win?.MutationObserver?new win.MutationObserver(queue):null;
        for(let node:HTMLElement|null=root;node;node=node.parentElement)observer?.observe(node,{attributes:true,attributeFilter:['data-gh-opening','hidden','inert','aria-hidden']});
        const stopRuntime=subscribeSteamUiState(doc,sync);
        return ()=>{disposed=true;runtime.current=null;stopRuntime();observer?.disconnect();doc.removeEventListener('focusin',onFocus);doc.removeEventListener('visibilitychange',sync);win?.removeEventListener('focus',sync);win?.removeEventListener('blur',sync);focus.setActive(false,false);lease?.dispose();header?.dispose();ready.current=false;};
    },[focus]);
    useLayoutEffect(()=>runtime.current?.sync());
    return {controls:mode==='active'&&!options.statusHidden&&!headerHandoff?focus:undefined,actionUp:focus.actionUp,ui,footerActive:mode==='active'};
}
