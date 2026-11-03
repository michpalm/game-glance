import {GamepadButton as B,type GamepadEvent} from '@decky/ui';
import {useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {useSettings} from '../data/settings';
import type {HomeStatusControls} from '../home/homeControls';
import {acquireHomeFooter} from '../home/homeControlsDom';
import {acquireHomeHeader} from '../home/homeHeaderDom';
import {focusElement} from '../home/homeNav';
import {createHomeSearch,type HomeSearchSession} from '../home/homeSearch';
import {getSteamUiState,subscribeSteamUiState} from '../home/steamUiState';
import {createTopBarFinder} from '../home/topBar';
import {createHomeStatusFocus,footerOptedIn,homeRuntimeSuspended} from '../home/useHomeControls';
import {useScreensaverActive} from '../screensaver/steamScreensaver';
import {chromeClaims,type ChromeClaim} from './claims';
import {installHeaderRedirect} from './headerRedirect';
import {chromeLaunching,chromeMode,chromeReturn,chromeStatusHidden,type ChromeMode} from './policy';

let ownsBar=false;
/** Home's Up-from-actions entry into the host's bar (filled while a host is mounted). */
export const chromeFocus:{actionUp(event:GamepadEvent):boolean}={actionUp:()=>false};
/** Whether the host has the bar and footer right now (Home, the game page and the menu holds read it). */
export const chromeOwnsBar=():boolean=>ownsBar;

interface Inputs {optedIn:boolean;everyPage:boolean;claims:readonly ChromeClaim[];screensaver:boolean}
/** Home's step-aside rules for the whole window: no opening (that is Home's own), plus Steam's screensaver. */
function suspendedIn(doc:Document,o:Inputs):boolean {
    const foreground=doc.hasFocus();
    return o.screensaver||homeRuntimeSuspended({foreground,menu:getSteamUiState(doc).menu,opening:false,launching:chromeLaunching(o.claims),connected:!!doc.defaultView,hidden:doc.visibilityState==='hidden'});
}
const modeIn=(doc:Document,o:Inputs):ChromeMode=>chromeMode({...o,suspended:suspendedIn(doc,o)});
/** Entering from Steam's header is the status focus's own Up entry: Search first. */
const up=()=>({detail:{button:B.DIR_UP,is_repeat:false},preventDefault(){},stopPropagation(){}}) as unknown as GamepadEvent;
const ourBar=(target:Element|null)=>!!target?.closest?.('.gg-status-host:not(.gg-menu-status-host),[data-home-search],.gh-keyboard-surface');

/**
 * The window's one owner of the Game Glance bar, Search and footer: the header and footer leases (on the document, measured
 * against the viewport), status-cell focus and the redirect from Steam's hidden header. Pages only add claims (chrome/claims).
 */
export function useChrome(doc:Document|null):{mode:ChromeMode;controls:HomeStatusControls|undefined;actionUp(event:GamepadEvent):boolean;ownsInput():boolean;search:HomeSearchSession;footer:boolean;statusHidden:boolean} {
    const s=useSettings(),claims=useSyncExternalStore(chromeClaims.subscribe,chromeClaims.get),screensaver=useScreensaverActive();
    const live=useRef<Inputs>({optedIn:false,everyPage:false,claims,screensaver});
    live.current={optedIn:footerOptedIn(s),everyPage:s.chromeEveryPage,claims,screensaver};
    const docRef=useRef(doc);docRef.current=doc;
    const ready=useRef(false),runtime=useRef<{sync():void}|null>(null),redirect=useRef<ReturnType<typeof installHeaderRedirect>|null>(null);
    const [mode,setMode]=useState<ChromeMode>('off');
    const [footer,setFooter]=useState(false);
    const [native,setNative]=useState(false);
    const search=useMemo(createHomeSearch,[]);
    const {focus,usable}=useMemo(()=>{
        const usable=()=>{const d=docRef.current;return !!d&&ready.current&&!chromeStatusHidden(live.current.claims)&&modeIn(d,live.current)==='active';};
        const focus=createHomeStatusFocus({
            search:{reveal:()=>search.dispatch({type:'enter'}),hide:()=>search.dispatch({type:'content'}),activate:()=>search.dispatch({type:'edit'}),editing:()=>search.get().phase==='editing',contains:target=>!!target?.closest('[data-home-search],.gh-keyboard-surface')},
            canUse:usable,focus:node=>focusElement(node,'the status item'),stopRepeats:()=>{},
            // Down/B: back where focus was before Up; on Home, Home's own target when that is gone.
            returnHome:()=>redirect.current?.leave(chromeReturn(live.current.claims)),
            schedule:callback=>{const view=docRef.current?.defaultView;if(view?.requestAnimationFrame){const frame=view.requestAnimationFrame(callback);return ()=>view.cancelAnimationFrame(frame);}const timer=setTimeout(callback,0);return ()=>clearTimeout(timer);},
        });
        return {focus,usable};
    },[search]);
    useLayoutEffect(()=>{
        if(!doc)return undefined;
        const win=doc.defaultView,root=doc.documentElement,steamBar=createTopBarFinder(doc);
        let footerLease:ReturnType<typeof acquireHomeFooter>|null=null,header:ReturnType<typeof acquireHomeHeader>|null=null;
        let footerReady=false,headerReady=false,disposed=false,queued=false;
        const queue=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;sync();});};
        const sync=()=>{
            if(disposed)return;
            const o=live.current,suspended=suspendedIn(doc,o),next=chromeMode({...o,suspended});
            if(next==='off'){footerLease?.dispose();footerLease=null;footerReady=false;header?.dispose();header=null;headerReady=false;}
            if(next!=='off'&&!suspended&&!footerLease)footerLease=acquireHomeFooter(root,value=>{footerReady=value;queue();});
            footerLease?.suspend(suspended);
            // The header only once the footer is ours: a page whose footer is not Steam's usual one keeps Steam's bar too.
            if(next!=='off'&&!suspended&&footerReady&&!header)header=acquireHomeHeader(root,value=>{headerReady=value;queue();});
            header?.suspend(suspended||!footerReady);
            ready.current=footerReady&&headerReady;ownsBar=next==='active';
            focus.setActive(next==='active'&&ready.current&&!chromeStatusHidden(o.claims),!suspended);
            setMode(previous=>previous===next?previous:next);
            setFooter(previous=>previous===footerReady?previous:footerReady);
            setNative(previous=>previous===ready.current?previous:ready.current);
        };
        redirect.current=installHeaderRedirect(doc,{enabled:usable,enter:()=>focus.actionUp(up()),inOurBar:ourBar,busy:()=>search.get().phase==='editing'});
        // Focus landing in Steam's header is the redirect's (it enters our bar first, in the capture phase), not a move away.
        const onFocus=(event:FocusEvent)=>{const target=event.target as Element|null;if(!(target&&steamBar()?.contains(target)))focus.externalFocus(target);sync();};
        // Subscribed first: the shared store refreshes on its first listener, so the side-menu reading is current.
        const stopUi=subscribeSteamUiState(doc,sync);
        runtime.current={sync};sync();
        chromeFocus.actionUp=event=>focus.actionUp(event);
        doc.addEventListener('focusin',onFocus);doc.addEventListener('visibilitychange',sync);win?.addEventListener('focus',sync);win?.addEventListener('blur',sync);
        return ()=>{
            disposed=true;runtime.current=null;stopUi();redirect.current?.dispose();redirect.current=null;chromeFocus.actionUp=()=>false;
            doc.removeEventListener('focusin',onFocus);doc.removeEventListener('visibilitychange',sync);win?.removeEventListener('focus',sync);win?.removeEventListener('blur',sync);
            focus.setActive(false,false);footerLease?.dispose();header?.dispose();ready.current=false;ownsBar=false;
        };
    },[doc,focus,search,usable]);
    useLayoutEffect(()=>runtime.current?.sync());
    const statusHidden=chromeStatusHidden(claims);
    return {mode,controls:mode==='active'&&native&&!statusHidden?focus:undefined,actionUp:focus.actionUp,ownsInput:usable,search,footer,statusHidden};
}
