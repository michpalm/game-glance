import {toaster} from '@decky/api';
import {PLUGIN_NAME} from '../constants';
import {GamepadButton as B,type GamepadEvent} from '@decky/ui';
import {useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {FOCUSABLE_SELECTOR} from '../menu/navigation';
import {useSettings} from '../data/settings';
import type {HomeStatusControls} from '../home/homeControls';
import {acquireHomeFooter} from '../home/homeControlsDom';
import {acquireHomeHeader} from '../home/homeHeaderDom';
import {focusElement} from '../home/homeNav';
import {createHomeSearch,searchOverlayOpen,type HomeSearchSession} from '../home/homeSearch';
import {getSteamUiState,subscribeSteamUiState} from '../home/steamUiState';
import {createTopBarFinder,findTopBar} from '../home/topBar';
import {createHomeStatusFocus,footerOptedIn,homeRuntimeSuspended,visibleHomeControl} from '../home/useHomeControls';
import {useScreensaverActive} from '../screensaver/steamScreensaver';
import {chromeClaims,type ChromeClaim} from './claims';
import {openStatusLink} from './statusLinks';
import {installHeaderRedirect} from './headerRedirect';
import {chromeLaunching,chromeMode,chromeReturn,chromeStatusHidden,type ChromeMode} from './policy';

/** Up from a page's action row enters the shared bar while its host owns input. */
export const chromeFocus:{actionUp(event:GamepadEvent,origin?:HTMLElement):boolean}={actionUp:()=>false};
/** True while the host draws its bar (active with the header lease ready), and latched across a suspension whose only cause
 * is a side menu (our own menu included): the bar keeps rendering and the menu's holds keep the page's look. Any other
 * cause (the window in the background or hidden, or the screensaver) clears it, as does going off or a suspension
 * that never owned the bar. */
let held=false;const heldListeners=new Set<()=>void>();
const setHeld=(value:boolean)=>{if(held===value)return;held=value;for(const fn of [...heldListeners])fn();};
export const chromeHeld=():boolean=>held;
export function subscribeChromeHeld(listener:()=>void):()=>void {heldListeners.add(listener);return()=>{heldListeners.delete(listener);};}
/** Pages that draw their own bar when the host does not read this: it stays true through a suspension, so the two never stack. */
export const useChromeHeld=():boolean=>useSyncExternalStore(subscribeChromeHeld,chromeHeld);

interface Inputs {optedIn:boolean;everyPage:boolean;claims:readonly ChromeClaim[];screensaver:boolean}
/** Window-level visual suspension. A foreground launch releases input while keeping the chrome visible. */
function suspendedIn(doc:Document,o:Inputs):boolean {
    const foreground=doc.hasFocus();
    return o.screensaver||homeRuntimeSuspended({foreground,menu:getSteamUiState(doc).menu,opening:false,launching:false,connected:!!doc.defaultView,hidden:doc.visibilityState==='hidden'});
}
/** A side menu is open and nothing else would suspend the host: the one suspension the bar latch holds through. */
function menuOnlyIn(doc:Document,o:Inputs):boolean {
    return getSteamUiState(doc).menu&&!o.screensaver&&!homeRuntimeSuspended({foreground:doc.hasFocus(),menu:false,opening:false,launching:chromeLaunching(o.claims),connected:!!doc.defaultView,hidden:doc.visibilityState==='hidden'});
}
const modeIn=(doc:Document,o:Inputs):ChromeMode=>chromeMode({...o,suspended:suspendedIn(doc,o)});
/** Entering from Steam's header is the status focus's own Up entry: Search first. */
const up=()=>({detail:{button:B.DIR_UP,is_repeat:false},preventDefault(){},stopPropagation(){}}) as unknown as GamepadEvent;
/** The page's first visible item: never Steam's hidden header (the redirect would pull focus back), our bar, Search or the footer. */
function firstPageItem(doc:Document):HTMLElement|null {
    const bar=findTopBar(doc,doc.defaultView?.innerWidth??0);
    return [...doc.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].find(node=>!bar?.contains(node)&&!node.closest('.gg-status-host,.gh-keyboard-surface,#Footer')&&visibleHomeControl(node))??null;
}
const ourBar=(target:Element|null)=>!!target?.closest?.('.gg-status-host:not(.gg-menu-status-host),[data-home-search],.gh-keyboard-surface');

/**
 * The window's one owner of the Game Glance bar, Search and footer: the header and footer leases (on the document, measured
 * against the viewport), status-cell focus and the redirect from Steam's hidden header. Pages only add claims (chrome/claims).
 */
export function useChrome(doc:Document|null):{mode:ChromeMode;interactive:boolean;controls:HomeStatusControls|undefined;bar:boolean;held:boolean;actionUp(event:GamepadEvent):boolean;ownsInput():boolean;search:HomeSearchSession;footer:boolean;statusHidden:boolean;returnToPage():void} {
    const s=useSettings(),claims=useSyncExternalStore(chromeClaims.subscribe,chromeClaims.get),screensaver=useScreensaverActive(),optedIn=footerOptedIn(s);
    const live=useRef<Inputs>({optedIn:false,everyPage:false,claims,screensaver});
    live.current={optedIn,everyPage:s.chromeEveryPage,claims,screensaver};
    const docRef=useRef(doc);docRef.current=doc;
    const ready=useRef(false),runtime=useRef<{sync():void}|null>(null),redirect=useRef<ReturnType<typeof installHeaderRedirect>|null>(null);
    const [mode,setMode]=useState<ChromeMode>('off');
    const [footer,setFooter]=useState(false);
    const [native,setNative]=useState(false);
    const search=useMemo(createHomeSearch,[]);
    const {focus,usable,hidden,back,returnToPage}=useMemo(()=>{
        // Down/B's last resort, and where focus goes when the host lets go while it is in our bar: Home's own target on Home, else the page's first item.
        const back=()=>{const d=docRef.current,home=chromeReturn(live.current.claims);if(home)home();else if(d)focusElement(firstPageItem(d),'the page');};
        const usable=()=>{const d=docRef.current;return !!d&&ready.current&&!chromeLaunching(live.current.claims)&&!chromeStatusHidden(live.current.claims)&&modeIn(d,live.current)==='active';};
        // Entry refused only because Home's feed sheet hides our bar: focus must not stay in Steam's invisible header.
        const hidden=()=>{const d=docRef.current;return !!d&&ready.current&&!chromeLaunching(live.current.claims)&&chromeStatusHidden(live.current.claims)&&modeIn(d,live.current)==='active';};
        const focus=createHomeStatusFocus({
            search:{busy:()=>searchOverlayOpen(search.get()),reveal:()=>search.dispatch({type:'enter'}),hide:()=>search.dispatch({type:'content'}),activate:()=>search.dispatch({type:'edit'}),editing:()=>search.get().phase==='editing',contains:target=>!!target?.closest('[data-home-search],.gh-keyboard-surface')},
            openStatusLink:id=>{
                const doc=docRef.current;
                if(doc)void openStatusLink(doc,id).catch(()=>toaster.toast({title:PLUGIN_NAME,body:'Could not open this Steam page.'}));
            },
            canUse:usable,focus:node=>focusElement(node,'the status item'),stopRepeats:()=>{},
            // Down/B: back where focus was before Up, else back().
            returnHome:()=>{if(redirect.current)redirect.current.leave(back);else back();},
            schedule:callback=>{const view=docRef.current?.defaultView;if(view?.requestAnimationFrame){const frame=view.requestAnimationFrame(callback);return ()=>view.cancelAnimationFrame(frame);}const timer=setTimeout(callback,0);return ()=>clearTimeout(timer);},
        });
        return {focus,usable,hidden,back,returnToPage:()=>{if(redirect.current)redirect.current.leave(back);else back();}};
    },[search]);
    useLayoutEffect(()=>{
        // Nothing but settings for anyone who has not opted in: no Steam UI poll, no focus listeners, no redirect.
        if(!doc||!optedIn)return undefined;
        const win=doc.defaultView,root=doc.documentElement,steamBar=createTopBarFinder(doc);
        let footerLease:ReturnType<typeof acquireHomeFooter>|null=null,header:ReturnType<typeof acquireHomeHeader>|null=null;
        let footerReady=false,headerReady=false,disposed=false,queued=false;
        const queue=()=>{if(disposed||queued)return;queued=true;void Promise.resolve().then(()=>{queued=false;sync();});};
        // Letting go with focus in our bar (also after a suspension, when the status focus no longer owns it): never strand it.
        const release=()=>{const inSearch=!!doc.activeElement?.closest('.gg-search-overlay,.gh-keyboard-surface');search.dispatch({type:'suspend'});focus.setActive(false,!inSearch);if(!inSearch&&ourBar(doc.activeElement))back();};
        const sync=()=>{
            if(disposed)return;
            const o=live.current,suspended=suspendedIn(doc,o),next=chromeMode({...o,suspended});
            // No document-wide observer for anyone who has not opted in.
            if(next!=='off'&&!redirect.current)redirect.current=installHeaderRedirect(doc,{enabled:usable,enter:()=>focus.actionUp(up()),inOurBar:ourBar,busy:()=>searchOverlayOpen(search.get()),hidden,back,focus:node=>focusElement(node,'the remembered item')});
            if(next==='off'&&redirect.current){release();redirect.current.dispose();redirect.current=null;}
            if(next==='off'){footerLease?.dispose();footerLease=null;footerReady=false;header?.dispose();header=null;headerReady=false;}
            if(next!=='off'&&!suspended&&!footerLease)footerLease=acquireHomeFooter(root,value=>{footerReady=value;queue();});
            footerLease?.suspend(suspended);
            // The header only once the footer is ours: a page whose footer is not Steam's usual one keeps Steam's bar too.
            if(next!=='off'&&!suspended&&footerReady&&!header)header=acquireHomeHeader(root,value=>{headerReady=value;queue();});
            header?.suspend(suspended||!footerReady);
            ready.current=footerReady&&headerReady;setHeld((next==='active'&&ready.current)||(next==='suspended'&&held&&menuOnlyIn(doc,o)));
            const launching=chromeLaunching(o.claims);
            const interactive=next==='active'&&!launching;
            if(!interactive)search.dispatch({type:'suspend'});
            focus.setActive(interactive&&ready.current&&!chromeStatusHidden(o.claims),!suspended&&!launching);
            setMode(previous=>previous===next?previous:next);
            setFooter(previous=>previous===footerReady?previous:footerReady);
            setNative(previous=>previous===ready.current?previous:ready.current);
        };
        // Focus landing in Steam's header is the redirect's (it enters our bar first, in the capture phase), not a move away.
        const onFocus=(event:FocusEvent)=>{const target=event.target as Element|null;if(!(target&&steamBar()?.contains(target)))focus.externalFocus(target);sync();};
        // Subscribed first: the shared store refreshes on its first listener, so the side-menu reading is current.
        const stopUi=subscribeSteamUiState(doc,sync);
        runtime.current={sync};sync();
        chromeFocus.actionUp=(event,origin)=>{
            if(origin && (origin.ownerDocument!==doc || !visibleHomeControl(origin)))return false;
            if(!focus.actionUp(event))return false;
            if(origin)redirect.current?.rememberFrom(origin);
            return true;
        };
        doc.addEventListener('focusin',onFocus);doc.addEventListener('visibilitychange',sync);win?.addEventListener('focus',sync);win?.addEventListener('blur',sync);
        return ()=>{
            disposed=true;runtime.current=null;stopUi();chromeFocus.actionUp=()=>false;
            doc.removeEventListener('focusin',onFocus);doc.removeEventListener('visibilitychange',sync);win?.removeEventListener('focus',sync);win?.removeEventListener('blur',sync);
            release();redirect.current?.dispose();redirect.current=null;footerLease?.dispose();header?.dispose();ready.current=false;setHeld(false);
            setMode('off');setFooter(false);setNative(false);
        };
    },[doc,optedIn,focus,search,usable,hidden,back]);
    useLayoutEffect(()=>()=>focus.dispose(),[focus]);
    useLayoutEffect(()=>()=>search.dispose(),[search]);
    useLayoutEffect(()=>runtime.current?.sync());
    const statusHidden=chromeStatusHidden(claims);
    const interactive=mode==='active'&&!chromeLaunching(claims);
    return {mode,interactive,controls:interactive&&native&&!statusHidden?focus:undefined,bar:native,held:useSyncExternalStore(subscribeChromeHeld,chromeHeld),actionUp:focus.actionUp,ownsInput:usable,search,footer,statusHidden,returnToPage};
}
