import {GamepadButton as B, type GamepadEvent} from '@decky/ui';
import {nextHomeControl,orderHomeControls,repairHomeControl,type HomeControlId,type HomeStatusControls} from './homeControls';

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
/** The footer's step-aside rules: the open transition does not count (the host keeps the footer through it). */
export const homeFooterSuspended=(p:Parameters<typeof homeRuntimeSuspended>[0]):boolean=>homeRuntimeSuspended({...p,opening:false});
export interface HomeSearchFocus {busy?():boolean;reveal():void;hide():void;activate():void;editing():boolean;contains(target:Element|null):boolean}
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
    const searchBusy=()=>!!(options.search?.busy?.()||options.search?.editing());
    // A on Search: armed on the press, opened on the release (a click). The radial keyboard reads the controller itself, and
    // opened while A was still down it took that A as its "Done" (Ally 2026-11-04).
    let pendingSearch=false,searchArmed=false;
    let active=false,owned=false,bypass=false,handoff=false,returning=false,disposed=false,last:HomeControlId|null=null,lastNode:HTMLElement|null=null,previous:HomeControlId[]=[],cancel:(()=>void)|null=null;
    const setHandoff=(value:boolean)=>{if(handoff===value)return;handoff=value;options.headerHandoff?.(value);};
    const order=()=>orderHomeControls([...nodes].filter(([,node])=>visible(node)).map(([id])=>id));
    const usable=()=>!disposed&&active&&options.canUse();
    const go=(id:HomeControlId|null)=>{const node=id?nodes.get(id):null;if(!node||!visible(node))return false;last=id;lastNode=node;owned=true;previous=order();options.focus(node);return true;};
    const home=()=>{pendingSearch=false;searchArmed=false;options.search?.hide();owned=false;lastNode=null;options.returnHome();};
    const scheduleRepair=()=>{
        if(cancel||!active||disposed||searchBusy())return;
        cancel=options.schedule(()=>{cancel=null;if(!usable()||searchBusy())return;if(pendingSearch){if(go('search'))pendingSearch=false;return;}if(!owned||!last)return;const next=order(),id=repairHomeControl(last,previous,next),node=id?nodes.get(id):null;previous=next;if(!id){home();return;}if(id!==last||node!==lastNode)go(id);});
    };
    const consume=(event:GamepadEvent)=>{event.preventDefault();event.stopPropagation();};
    return {
        register(id,node){if(disposed)return;if(node)nodes.set(id,node);else nodes.delete(id);scheduleRepair();},
        focused(id){if(!usable())return;const node=nodes.get(id);if(!node||!visible(node))return;last=id;lastNode=node;owned=true;previous=order();options.search?.reveal();},
        button(id,event){
            if(!usable()||!nodes.has(id)||searchBusy())return;
            const button=event.detail.button;
            if(button===B.DIR_LEFT||button===B.DIR_RIGHT){consume(event);go(nextHomeControl(id,button===B.DIR_LEFT?'left':'right',order()));}
            else if(button===B.DIR_DOWN||button===B.CANCEL){consume(event);home();}
            else if(button===B.DIR_UP&&options.search){consume(event);}
            else if(button===B.OK&&id==='search'&&options.search){consume(event);if(!event.detail.is_repeat)searchArmed=true;}
            else if(button===B.DIR_UP){consume(event);bypass=true;setHandoff(true);returning=true;try{home();}finally{returning=false;}}
            else if(button===B.OK||button===B.BUMPER_LEFT||button===B.BUMPER_RIGHT)consume(event);
        },
        buttonUp(id,event){
            if(event.detail.button!==B.OK||id!=='search'||!searchArmed)return;
            searchArmed=false;if(!usable()||!options.search)return;consume(event);options.search.activate();
        },
        actionUp(event){
            if(event.detail.button!==B.DIR_UP){bypass=false;setHandoff(false);return false;}
            if(!usable()||searchBusy())return false;
            if(options.search){options.stopRepeats();options.search.reveal();pendingSearch=!go('search');if(pendingSearch)scheduleRepair();consume(event);return true;}
            if(bypass){bypass=false;return false;}
            const ids=order(),target=last&&ids.includes(last)?last:ids[0];if(!target)return false;
            options.stopRepeats();if(!go(target))return false;consume(event);return true;
        },
        externalFocus(target){if(searchBusy()||options.search?.contains(target))return;if([...nodes.values()].some(node=>!!target&&(node===target||node.contains(target))))return;pendingSearch=false;options.search?.hide();owned=false;lastNode=null;if(!returning)setHandoff(false);if(!target?.closest('.gh-actions'))bypass=false;},
        setActive(value,repair){
            if(disposed)return;
            if(!value){pendingSearch=false;options.search?.hide();cancel?.();cancel=null;if(active&&owned&&repair)home();owned=false;bypass=false;setHandoff(false);lastNode=null;}
            active=value;
        },
        dispose(){disposed=true;active=false;owned=false;cancel?.();cancel=null;nodes.clear();},
    };
}
/** The chrome host's opt-in (chrome/useChrome). */
export const footerOptedIn=(o:{enabled:boolean;spotlightHome:boolean;homeStatusBar:boolean;homeExpandedControls:boolean})=>o.enabled&&o.spotlightHome&&o.homeStatusBar&&o.homeExpandedControls;
